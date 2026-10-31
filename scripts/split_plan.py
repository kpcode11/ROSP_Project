import re
import pathlib

root = pathlib.Path(__file__).resolve().parents[1]
master = root / "docs" / "MASTER_PLAN.md"
out = root / "docs" / "plan"
out.mkdir(parents=True, exist_ok=True)

text = master.read_text(encoding="utf-8")
sections = re.split(r"(?m)^(?=## )", text)
index = []

for i, sec in enumerate(sections):
    first = sec.split("\n", 1)[0]
    m_phase = re.match(r"## Phase (\d+)", first)
    m_app = re.match(r"## Appendix ([A-F])", first)
    m_num = re.match(r"## (\d+)\.", first)
    if m_phase:
        name = f"phase_{m_phase.group(1)}.md"
    elif m_app:
        name = f"appendix_{m_app.group(1).lower()}.md"
    elif m_num:
        name = f"section_{m_num.group(1)}.md"
    elif i == 0:
        name = "header.md"
    else:
        name = f"misc_{i}.md"
    (out / name).write_text(sec, encoding="utf-8")
    index.append(f"- `{name}`: {first.strip('# ').strip()}")

(out / "INDEX.md").write_text("# Split Plan Index\n\n" + "\n".join(index) + "\n", encoding="utf-8")
print(f"Split MASTER_PLAN.md into {len(index)} files under {out}")
