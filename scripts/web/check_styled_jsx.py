#!/usr/bin/env python3
"""Find styles that silently do nothing.

styled-jsx scopes every rule by appending a generated class, and it attaches that class only to
native elements written in the component's own JSX. A Next.js <Link> is a component, so
`<Link className="briefCard">` renders `<a class="briefCard">` with no scope class, and the rule
`.briefCard.jsx-HASH { ... }` never matches it. The children inside are plain divs and do get
scoped, so the text is styled and the container is not: the page renders as formatted text with
no card around it, which is what /briefs looked like for weeks.

Nothing fails when this happens — no build error, no warning, no type error. The only way to
catch it is to look for the pattern, so this looks for it.

A class used on a <Link> must either be defined globally (a stylesheet, or :global() inside the
block) or not be styled in the block at all.

Exit code 1 if anything is found, so it can run in CI.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PAGES = [ROOT / "web/pages", ROOT / "web/components"]

# Components that render a DOM node of their own, so styled-jsx cannot scope them.
WRAPPERS = ("Link", "Image")


def style_blocks(src: str) -> str:
    """Every scoped <style jsx> block in the file, concatenated. Global blocks are fine."""
    out = []
    for match in re.finditer(r"<style jsx>\{`", src):
        start = match.end()
        end = src.find("`}</style>", start)
        if end > 0:
            out.append(src[start:end])
    return "\n".join(out)


def styled_classes(css: str) -> set[str]:
    """Classes this block styles in a scoped way — :global() ones do not count."""
    without_global = re.sub(r":global\([^)]*\)", " ", css)
    # Strip declaration bodies so property values cannot look like selectors.
    selectors = re.sub(r"\{[^{}]*\}", " ", without_global)
    return set(re.findall(r"\.([A-Za-z][\w-]*)", selectors))


def wrapper_classes(src: str) -> dict[str, set[str]]:
    """Classes put on a component that renders its own DOM node."""
    found: dict[str, set[str]] = {}
    for tag in WRAPPERS:
        for m in re.finditer(rf"<{tag}\b[^>]*?className=(\{{)?[\"`]([^\"`]*)[\"`]", src, re.S):
            for cls in m.group(2).split():
                cls = cls.strip()
                if cls and not cls.startswith("$") and "{" not in cls:
                    found.setdefault(cls, set()).add(tag)
    return found


def main() -> int:
    problems = []
    for base in PAGES:
        for path in sorted(base.rglob("*.tsx")):
            src = path.read_text(encoding="utf-8")
            css = style_blocks(src)
            if not css:
                continue
            scoped = styled_classes(css)
            for cls, tags in wrapper_classes(src).items():
                if cls in scoped:
                    problems.append((path.relative_to(ROOT), cls, sorted(tags)[0]))

    if not problems:
        print("styled-jsx: no scoped rule is applied to a component that cannot receive it.")
        return 0
    print(f"{len(problems)} style rule(s) that will never apply:\n", file=sys.stderr)
    for path, cls, tag in problems:
        print(f"  {path}: .{cls} is styled in <style jsx> but sits on a <{tag}>, which gets no "
              f"scope class. Wrap the rule in :global(.{cls}) — and give it a name specific "
              f"enough to be safe globally.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
