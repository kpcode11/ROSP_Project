import hashlib
import json
import math
import os
import re
from typing import Any
import httpx
from app.config import settings

# Semantic concept clusters used when USE_MOCK_AI=true or Ollama is unreachable
CONCEPT_SYNONYMS: list[set[str]] = [
    {"auth", "authenticate", "authentication", "login", "loginuser", "credentials", "password", "session", "user"},
    {"token", "jwt", "bearer", "verify", "verifytoken", "middleware", "protected", "route", "routes", "allowed", "access", "authorization"},
    {"admin", "administrator", "role", "getrole", "rbac", "requireadminrole", "privileges", "restricted", "permission"},
    {"payment", "processpayment", "checkout", "handlecheckout", "charge", "signature", "validatepaymentsignature", "gateway"},
    {"refund", "issuerefund", "handlerefund", "reverse", "reversecharge", "reversal", "refunded"},
    {"order", "orders", "createorder", "createandpayorder", "updatestatus", "pending", "paid"},
    {"fraud", "frauddetector", "risk", "velocity", "compute_velocity_score", "normalize_score", "scorer", "transaction", "threshold"},
    {"profile", "getuserprofile", "fetchprofile", "customer"},
]


STOPWORDS: set[str] = {
    "the", "a", "an", "to", "is", "are", "in", "on", "of", "and", "or", "for", "with", "by",
    "from", "as", "at", "be", "this", "that", "it", "const", "let", "var", "return", "async",
    "await", "function", "def", "class", "file", "signature", "calls", "none", "true", "false",
    "req", "res", "next", "self",
}


def deterministic_semantic_embed(text: str, dim: int = 1024) -> list[float]:
    """Computes a deterministic 1024-dim L2-normalized semantic vector using token + concept hashing."""
    vec = [0.0] * dim
    cleaned = re.sub(r"([a-z])([A-Z])", r"\1 \2", text).lower()
    raw_tokens = re.findall(r"[a-z0-9_]+", cleaned)
    tokens = [t for t in raw_tokens if t not in STOPWORDS and len(t) > 1]
    if not tokens:
        vec[0] = 1.0
        return vec

    token_set = set(tokens)
    # 1. Concept cluster activation (first 64 dimensions)
    for cluster_idx, cluster in enumerate(CONCEPT_SYNONYMS):
        overlap = len(token_set & cluster)
        if overlap > 0:
            weight = 1.2 * (1.0 + math.log1p(overlap))
            for offset in range(4):
                dim_idx = (cluster_idx * 4 + offset) % dim
                vec[dim_idx] += weight

    # 2. Sub-linear TF normalized unigram and bigram feature hashing across dimensions 64..1023
    features = list(token_set) + [f"{tokens[i]}_{tokens[i + 1]}" for i in range(len(tokens) - 1)]
    feat_scale = 4.0 / math.sqrt(max(1, len(features)))
    for feat in features:
        h = int(hashlib.md5(feat.encode("utf-8")).hexdigest()[:8], 16)
        idx = 64 + (h % (dim - 64))
        sign = 1.0 if (h & 1) == 0 else -1.0
        vec[idx] += sign * feat_scale

    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [round(v / norm, 6) for v in vec]


def _synthesize_deterministic_grounded_answer(user_prompt: str) -> dict[str, Any]:
    """Synthesizes a strictly grounded structured response from the numbered evidence blocks in user_prompt."""
    evidence_pattern = re.compile(
        r"\[E(\d+)\]\s*Node:\s*(?P<node>[^|\n]+)\|\s*File:\s*(?P<file>[^|\n]+)\|\s*Lines:\s*(?P<start>\d+)-(?P<end>\d+)\s*\|\s*Type:\s*(?P<type>[^|\n]+)\|\s*Signature:\s*(?P<sig>[^\n]+)\nCode:\n(?P<code>.*?)(?=\n\[E\d+\]|\n=== GRAPH|\Z)",
        re.DOTALL,
    )
    evidences = []
    for m in evidence_pattern.finditer(user_prompt):
        evidences.append(
            {
                "node": m.group("node").strip(),
                "file_path": m.group("file").strip(),
                "line_start": int(m.group("start")),
                "line_end": int(m.group("end")),
                "type": m.group("type").strip(),
                "signature": m.group("sig").strip(),
                "code": m.group("code").strip(),
            }
        )

    def _layer_rank(ev: dict[str, Any]) -> int:
        fp = ev["file_path"].lower()
        ntype = ev["type"].lower()
        if ntype == "api_endpoint" or "routes" in fp:
            return 1
        if "controller" in fp:
            return 2
        if "middleware" in fp or "service" in fp:
            return 3
        if ntype == "model" or "model" in fp:
            return 4
        return 5

    ordered = sorted(evidences, key=_layer_rank)

    steps = []
    citations = []
    bullets = []
    seen_files_symbols: set[tuple[str, str]] = set()

    for idx, ev in enumerate(ordered[:6], start=1):
        fp = ev["file_path"]
        sym = ev["node"].split("::")[-1]
        lstart = ev["line_start"]
        lend = ev["line_end"]
        first_code_line = ev["code"].splitlines()[0].strip() if ev["code"] else ev["signature"]

        desc = f"`{sym}` in `{fp}` (lines {lstart}-{lend}) executes `{ev['signature']}`."
        steps.append(
            {
                "step": idx,
                "component": sym,
                "file_path": fp,
                "description": desc,
            }
        )
        if (fp, sym) not in seen_files_symbols:
            seen_files_symbols.add((fp, sym))
            citations.append(
                {
                    "file_path": fp,
                    "symbol": sym,
                    "line_start": lstart,
                    "line_end": lend,
                    "snippet": first_code_line[:160],
                }
            )
            bullets.append(
                f"- **`{sym}`** (`{fp}:L{lstart}-L{lend}`): {desc}"
            )

    summary_md = (
        "### Grounded Architectural Analysis\n\n"
        "Based on the AST Knowledge Graph and retrieved source chunks, the execution flow proceeds across the following verified components:\n\n"
        + "\n".join(bullets)
    )
    return {
        "answer_markdown": summary_md,
        "execution_steps": steps,
        "citations": citations,
    }


class OllamaClient:
    def __init__(
        self,
        base_url: str | None = None,
        embedding_model: str | None = None,
        llm_model: str | None = None,
        use_mock: bool | None = None,
    ) -> None:
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.embedding_model = embedding_model or settings.EMBEDDING_MODEL
        self.llm_model = llm_model or settings.LLM_MODEL
        env_mock = os.environ.get("USE_MOCK_AI", "").lower() in ("true", "1", "yes")
        self.use_mock = use_mock if use_mock is not None else (settings.USE_MOCK_AI or env_mock)

    def check_health(self) -> dict[str, Any]:
        if self.use_mock:
            return {
                "reachable": False,
                "mode": "mock_fallback",
                "embedding_model": self.embedding_model,
                "llm_model": self.llm_model,
                "available_models": [],
            }
        try:
            with httpx.Client(timeout=2.5) as client:
                resp = client.get(f"{self.base_url}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                return {
                    "reachable": True,
                    "mode": "ollama_live",
                    "embedding_model": self.embedding_model,
                    "llm_model": self.llm_model,
                    "available_models": models,
                }
        except Exception:
            return {
                "reachable": False,
                "mode": "deterministic_fallback",
                "embedding_model": self.embedding_model,
                "llm_model": self.llm_model,
                "available_models": [],
            }

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        if self.use_mock:
            return [deterministic_semantic_embed(t, settings.EMBEDDING_DIM) for t in texts]

        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(
                    f"{self.base_url}/api/embed",
                    json={"model": self.embedding_model, "input": texts},
                )
                resp.raise_for_status()
                payload = resp.json()
                embeddings = payload.get("embeddings")
                if embeddings and len(embeddings) == len(texts):
                    return embeddings
        except Exception:
            pass

        return [deterministic_semantic_embed(t, settings.EMBEDDING_DIM) for t in texts]

    def generate_structured_answer(
        self,
        system_prompt: str,
        user_prompt: str,
        json_schema: dict[str, Any],
    ) -> tuple[dict[str, Any], str]:
        if self.use_mock:
            return _synthesize_deterministic_grounded_answer(user_prompt), f"{self.llm_model} (deterministic-grounded)"

        try:
            with httpx.Client(timeout=60.0) as client:
                resp = client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.llm_model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "format": json_schema,
                        "stream": False,
                        "options": {"temperature": 0.1, "num_ctx": 8192},
                    },
                )
                resp.raise_for_status()
                content = resp.json().get("message", {}).get("content", "{}")
                parsed = json.loads(content)
                if isinstance(parsed, dict) and parsed.get("answer_markdown"):
                    return parsed, self.llm_model
        except Exception:
            pass

        return _synthesize_deterministic_grounded_answer(user_prompt), f"{self.llm_model} (deterministic-grounded)"
