#!/usr/bin/env python3
"""Make sure the paid packages never reach the browser.

web/data/private/ holds the full evidence packages. An API route may import it, because API
routes run on the server. A page component may not: Next.js bundles whatever a page imports
into the client bundle, and the file would be served to anyone who opens the page — every
package, free, with no way to notice it happened.

Nothing about that failure is visible. The site looks the same, the build succeeds, and the
only symptom is that the product is being given away. So it is checked instead.

The build output is checked too, because an import can arrive indirectly through a shared
module. If a marker string from the private file turns up in a client chunk, the bundle has
it however it got there.

Exit code 1 on any finding, so it can run in CI.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "web"
PRIVATE_DIR = "data/private"
# A string that appears in the private bundle and nowhere else.
MARKER = "Server-side only. This file is imported by the API route"
ALLOWED = {"pages/api", "app/api", "lib/server", "server"}
# Directories Next never compiles into the site. A test that reads the private bundle is how the
# delivery path is verified at all, and refusing it would push that check out of the repository.
NOT_BUILT = ("tests/", "test/", "__tests__/", ".scratch/", "scripts/")


def imports_private(path: Path) -> bool:
    text = path.read_text(encoding="utf-8", errors="ignore")
    return bool(re.search(r"""from\s+["'][^"']*data/private/""", text) or
                re.search(r"""import\s*\(\s*["'][^"']*data/private/""", text))


# Everything in data/private/ is bundled into the Cloudflare Worker, and a Worker has a hard
# limit on its compressed size. Going over it does not degrade anything — the deploy simply
# fails, and the site stops getting the weekly release. So the budget is checked here, where it
# is cheap to notice, rather than in a deploy log nobody reads.
COMPRESSED_BUDGET_MB = 2.0


def private_data_budget() -> list[str]:
    import gzip

    private = WEB / PRIVATE_DIR
    if not private.exists():
        return []
    total = 0
    detail = []
    for path in sorted(private.glob("*.json")):
        compressed = len(gzip.compress(path.read_bytes()))
        total += compressed
        detail.append(f"{path.name} {compressed / 1e6:.2f} MB")
    if total / 1e6 <= COMPRESSED_BUDGET_MB:
        print(f"private data: {total / 1e6:.2f} MB compressed of a {COMPRESSED_BUDGET_MB:.1f} MB budget "
              f"({', '.join(detail)})")
        return []
    return [f"data/private/ is {total / 1e6:.2f} MB compressed, over the {COMPRESSED_BUDGET_MB:.1f} MB budget "
            f"({', '.join(detail)}). A Worker that exceeds its size limit does not deploy at all."]


def main() -> int:
    problems: list[str] = private_data_budget()

    for path in sorted(WEB.rglob("*.ts*")):
        rel = path.relative_to(WEB).as_posix()
        if rel.startswith("node_modules") or rel.startswith(".next") or "/node_modules/" in rel:
            continue
        if any(rel.startswith(prefix) for prefix in NOT_BUILT):
            continue
        if not imports_private(path):
            continue
        if any(rel.startswith(prefix) for prefix in ALLOWED):
            continue
        problems.append(f"{rel} imports {PRIVATE_DIR}/ but is not a server-only module. "
                        f"Next.js will ship it to the browser.")

    # Whatever the imports say, the built client bundle is the evidence.
    client = WEB / ".next/static"
    if client.exists():
        for chunk in client.rglob("*.js"):
            try:
                if MARKER in chunk.read_text(encoding="utf-8", errors="ignore"):
                    problems.append(f"the private bundle reached the client chunk {chunk.name}")
                    break
            except OSError:
                continue
    else:
        print("note: no client build to inspect — run `npm run build` for the full check")

    if problems:
        print(f"{len(problems)} problem(s) with private data:\n", file=sys.stderr)
        for p in problems:
            print(f"  {p}", file=sys.stderr)
        return 1
    print("private data: the paid packages are server-side only.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
