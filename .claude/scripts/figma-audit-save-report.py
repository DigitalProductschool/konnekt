"""Save the report that figma-audit-reconciler returned as AUDIT_DIR/report.md.

Claude Code refuses report files written by subagents, so the reconciler returns
the report as text between the BEGIN and END marker lines. This copies it from the
subagent's transcript (the `output_file` of its Agent call), so the orchestrator
never has to retype it.

Usage: python3 -I .claude/scripts/figma-audit-save-report.py <output_file> <AUDIT_DIR>
"""

import json
import sys
from pathlib import Path

BEGIN = "=====BEGIN report.md====="
END = "=====END report.md====="
TITLE = "# Figma ↔ spec audit"


def strings(node: object):
    """Yield every string inside a parsed JSON value."""
    if isinstance(node, str):
        yield node
    elif isinstance(node, dict):
        for value in node.values():
            yield from strings(value)
    elif isinstance(node, list):
        for value in node:
            yield from strings(value)


def last_report(transcript: Path) -> str:
    """Return the last report in the transcript that has both marker lines."""
    found = None
    for line in transcript.read_text(encoding="utf-8").splitlines():
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        for text in strings(record):
            if BEGIN in text and END in text:
                found = text
    if found is None:
        sys.exit(f"No text between {BEGIN} and {END} in {transcript}")
    start = found.rindex(BEGIN) + len(BEGIN)
    end = found.index(END, start)
    return found[start:end].strip("\n") + "\n"


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    transcript, audit_dir = Path(sys.argv[1]), Path(sys.argv[2])
    report = last_report(transcript)
    if not report.startswith(TITLE) or "\n## Summary\n" not in report:
        sys.exit(
            f'The returned text does not start with "{TITLE}" or has no "## Summary"'
        )
    target = audit_dir / "report.md"
    target.write_text(report, encoding="utf-8")
    print(f"{target} written: {report.count(chr(10))} lines")


if __name__ == "__main__":
    main()
