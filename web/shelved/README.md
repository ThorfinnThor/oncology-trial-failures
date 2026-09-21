# Shelved

Working code that is not currently part of the site.

Nothing here is reachable: `pages/` is what Next.js routes, and these files sit outside it and
outside the TypeScript build. They are kept because the decision to take them off the site was a
decision about focus, not about quality, and rebuilding them from scratch later would be waste.

## watchlist/ and api-watch.ts

A per-subscriber alert: name the molecules, targets or sponsors you follow and get one mail in the
week a sponsor changes a matching trial. Taken off the site in favour of one newsletter for
everybody, which needs no per-subscriber matching and no second sending list.

Still live elsewhere: `scripts/signals/send_watchlists.py`, its tests in
`scripts/signals/run_signals_tests.py`, `scripts/signals/build_watch_terms.py` and
`docs/watchlist.md`. The KV records it wrote use the `watch:` prefix and are untouched.

To put it back: move `watchlist/` to `web/pages/watchlist/` and `api-watch.ts` to
`web/pages/api/watch.ts`, add the nav entry, and restore the workflow step that runs
`send_watchlists.py`.
