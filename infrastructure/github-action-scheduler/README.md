# GitHub data-update scheduler

This Cloudflare Worker dispatches `.github/workflows/update-data.yml` every Monday at 08:15 in
`Europe/Berlin`. Cloudflare Cron Triggers use UTC, so the Worker receives both possible UTC times
and dispatches only the one whose scheduled timestamp is 08:15 in Berlin. This keeps the local
time stable across daylight-saving changes.

`GITHUB_TOKEN` is a Worker secret. Use a fine-grained GitHub token limited to the
`ThorfinnThor/oncology-trial-failures` repository with repository permission `Actions: Read and
write`. Do not commit the token.

```bash
npm test
../../web/node_modules/.bin/wrangler secret put GITHUB_TOKEN
../../web/node_modules/.bin/wrangler deploy
```

The native GitHub `schedule` entry is intentionally disabled to prevent duplicate runs. Keep
`workflow_dispatch` as the API and manual entry point. The fine-grained token expires on
2027-10-12 and must be replaced before that date.
