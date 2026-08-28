#!/usr/bin/env python3
"""Verify that the Glasses Shop before/after fixture changes motion only."""

from __future__ import annotations

from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1] / "examples" / "glasses-shop"
BEFORE = ROOT / "before"
AFTER = ROOT / "after"
SHARED_FILES = ("index.html", "collection.html", "story.html", "styles.css")


def main() -> int:
    failed = False
    for name in SHARED_FILES:
        before = (BEFORE / name).read_bytes()
        after = (AFTER / name).read_bytes()
        if before != after:
            print(f"Fixture differs outside motion layer: {name}", file=sys.stderr)
            failed = True
        else:
            print(f"OK identical {name}")

    before_js = (BEFORE / "app.js").read_text(encoding="utf-8")
    after_js = (AFTER / "app.js").read_text(encoding="utf-8")
    if before_js == after_js:
        print("Before and after JavaScript unexpectedly match.", file=sys.stderr)
        failed = True
    elif "IntersectionObserver" not in after_js or "motion-enabled" not in after_js:
        print("After fixture does not contain the expected motion implementation.", file=sys.stderr)
        failed = True
    else:
        print("OK after fixture contains the motion layer")

    if failed:
        return 1
    print("Glasses Shop parity passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
