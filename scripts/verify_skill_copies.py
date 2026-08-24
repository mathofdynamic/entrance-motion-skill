#!/usr/bin/env python3
"""Verify that the Codex and Claude Code skill copies match the canonical skill."""

from __future__ import annotations

from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
CANONICAL = ROOT / "skills" / "entrance-motion" / "SKILL.md"
COPIES = (
    ROOT / ".agents" / "skills" / "entrance-motion" / "SKILL.md",
    ROOT / ".claude" / "skills" / "entrance-motion" / "SKILL.md",
)


def main() -> int:
    if not CANONICAL.is_file():
        print(f"Missing canonical skill: {CANONICAL}", file=sys.stderr)
        return 1

    canonical = CANONICAL.read_bytes()
    failed = False

    for copy in COPIES:
        if not copy.is_file():
            print(f"Missing integration copy: {copy}", file=sys.stderr)
            failed = True
            continue
        if copy.read_bytes() != canonical:
            print(f"Skill copy differs from canonical: {copy}", file=sys.stderr)
            failed = True
        else:
            print(f"OK {copy.relative_to(ROOT)}")

    if failed:
        print("Skill copy parity failed.", file=sys.stderr)
        return 1

    print("Skill copy parity passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
