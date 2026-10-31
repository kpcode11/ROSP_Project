import re
import subprocess
import pathlib


def sh(*args):
    r = subprocess.run(args, capture_output=True, text=True)
    return (r.stdout or r.stderr).strip()


def main():
    root = pathlib.Path(__file__).resolve().parents[1]
    progress_file = root / "PROGRESS.md"
    rows = []
    if progress_file.exists():
        for line in progress_file.read_text(encoding="utf-8").splitlines():
            m = re.match(
                r"^\|\s*(P\d+-\d+)\s*\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(TODO|IN_PROGRESS|BLOCKED|DONE|SKIPPED)\s*\|",
                line,
            )
            if m:
                rows.append(
                    dict(
                        id=m[1],
                        phase=int(m[2]),
                        text=m[3].strip(),
                        status=m[4],
                    )
                )

    print(
        "branch:",
        sh("git", "branch", "--show-current"),
        "| last:",
        sh("git", "log", "-1", "--oneline"),
    )
    counts = {}
    for r in rows:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    print("tasks:", counts)
    open_rows = [r for r in rows if r["status"] not in ("DONE", "SKIPPED")]
    print("current phase:", open_rows[0]["phase"] if open_rows else "all done")
    for r in rows:
        if r["status"] in ("IN_PROGRESS", "BLOCKED"):
            print(f"[{r['status']}] {r['id']} {r['text']}")
    nxt = next((r for r in rows if r["status"] == "TODO"), None)
    if nxt:
        print("next TODO:", nxt["id"], nxt["text"])
    print("\n--- HANDOFF.md (first 40 lines) ---")
    h = root / "HANDOFF.md"
    print(
        "\n".join(h.read_text(encoding="utf-8").splitlines()[:40])
        if h.exists()
        else "(missing)"
    )
    print("\n--- git status ---")
    print("\n".join(sh("git", "status", "--short").splitlines()[:20]) or "(clean)")
    print("\n--- recent commits ---")
    print(sh("git", "log", "-5", "--oneline"))


if __name__ == "__main__":
    main()
