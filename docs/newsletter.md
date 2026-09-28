# Newsletter

One list, one mail every second week: the trials that entered the stopped-trial database — the
whole database, every disease area, about 24,000 records — and the records a sponsor changed. It replaced a per-subscriber watchlist (`web/shelved/`, `docs/watchlist.md`),
because a mail written once by the workflow and sent to everyone is a thing that keeps happening,
and that is the only property that matters for something published on a schedule.

## Why there is a pending list

The data is rebuilt weekly; the mail goes out fortnightly. The source is the workflow's own diff of
the database against the snapshot the run started from (`data/ingest_changes.json`, written by
`scripts/ingest_changes.py`). Until 28 Sep 2026 it read the oncology signal set's change report
instead — about 985 trials, one area — which is not what the sign-up page promises. A change report
covers exactly one run, so a mail that only ever carried the latest one would drop half of what happened. Each
run folds its report into `newsletter:pending` in KV, keyed by trial, and the key is cleared only
after a send actually succeeded — a failed send is told next time rather than lost.

Cadence is measured, not assumed: a mail goes out when at least twelve days have passed since the
last one. "Every other run" breaks the first time a run is skipped or re-run.

## What is in it, and what is not

| in | out |
| --- | --- |
| trials that entered the dataset, with the sponsor's stop reason | our own reclassifications |
| records a sponsor edited: status, stop reason, as before → after | our own disease-area re-derivations |
| a line saying nothing moved, when nothing moved | padding on a quiet fortnight |

A subscriber sent an ontology update as though a sponsor had done something learns to ignore the
next mail. That is the one failure here that cannot be undone, so the split is enforced in
`merge()` and checked by a test.

## Signing up does not subscribe anybody

Double opt-in. A POST writes `pending:<token>` with a seven-day TTL and sends one mail; only the
click on the link in that mail writes `news:<token>`, which is the prefix the sender reads. An
address that never confirms expires on its own and leaves nothing behind.

It is not a formality. Anybody can type anybody's address into a form, so a single-opt-in list is
a claim that somebody consented with nothing behind it — and for a mail like this to German
recipients, double opt-in is what the law expects. The pair of timestamps on each record,
`requested_at` and `confirmed_at`, is the evidence.

Both the confirm and the stop page do nothing on load and need a click. Corporate mail gateways
fetch every URL in a message before the recipient sees it: a page that acted on load would
manufacture consent for somebody who never opened the mail, and unsubscribe people who never
asked to leave.

If `BREVO_API_KEY` is missing from the **Worker** the signup is refused with a 503 rather than
subscribing anybody, because the confirmation could never arrive.

| key | what it is |
| --- | --- |
| `pending:<token>` | signed up, not confirmed. Expires after seven days. |
| `news:<token>` | confirmed. The only prefix `newsletter.py` reads. |
| `sub:<sha256(email)>` | where an address's subscription can be found again, so a second signup does not make a second copy of it. Written on confirmation, removed on unsubscribe. |

A signup with an address that is already confirmed answers exactly as a new one does and sends
nothing. The form must not become a way to find out whether somebody is on the list.

## Pieces

| file | does |
| --- | --- |
| `web/pages/newsletter/index.tsx` | the signup page |
| `web/pages/newsletter/confirm.tsx` | the link in the confirmation mail; one button, nothing on load |
| `web/pages/newsletter/stop.tsx` | the link in every issue; one button, nothing on load |
| `web/pages/api/newsletter.ts` | POST starts a signup, GET `?confirm=<key>` subscribes, GET `?stop=<key>` removes |
| `web/lib/server/mail.ts` | the one place the site sends a mail from |
| `scripts/signals/newsletter.py` | accumulates, composes, sends, at the end of the weekly workflow |

## What the mail looks like, and why

One 600px table with inline styles (Outlook reads `bgcolor`, Gmail reads CSS, so both are set), no
images (nothing blocked, nothing fetched on open), colour scheme pinned to light so Apple Mail does
not invert the dark header. Dark header with the issue's headline numbers, then new stops as cards
— reason chip, phase, drug, the sponsor's own stop reason quoted — then sponsor edits in words
("Status: Active not recruiting → Terminated"), then one call to action. Titles link to the trial's
page on the site; the registry record is one click further.

Every mail also carries:

- a **plain-text part** (`render_text`), for readers who see nothing else and for spam scoring;
- **one-click unsubscribe headers** (`List-Unsubscribe` + `List-Unsubscribe-Post`, RFC 8058), which
  Gmail and Yahoo expect from anybody sending a list. The mail client POSTs to
  `/api/newsletter?stop=<key>`, which ends the subscription with no confirmation step;
- at most 15 rows per section: Gmail clips a mail over 102 KB and hides the rest — the unsubscribe
  link with it. A test keeps a 400-row fortnight under 100 KB.

`product/newsletter/next.html` and `next.txt` are written on every run that does not send, so the
next issue can be looked at before it goes.

## Running it without a sending account

With no `BREVO_API_KEY` — or no subscribers — nothing is sent and the mail that would have gone
out is written to `product/newsletter/next.html`. The workflow uploads that as an artifact.

```
python scripts/signals/newsletter.py --dry-run   # never sends, never clears
python scripts/signals/newsletter.py --force     # ignores the twelve-day wait
```

## Secrets

Two, both in GitHub → Settings → Secrets and variables → Actions:

| secret | where | what for |
| --- | --- | --- |
| `CF_API_TOKEN` | GitHub | the subscriber list and the pending changes. Needs **Workers KV Storage: Read and Write** — write, because what is waiting to be mailed is kept in KV between runs. |
| `BREVO_API_KEY` | GitHub | sending the fortnightly mail from the workflow. Until it exists, nothing is sent and the mail becomes an artifact. |
| `BREVO_API_KEY` | **Cloudflare Worker** | the confirmation mail, and the waiting-list notice. The same key, and it has to be in both places: the workflow cannot read the Worker's secrets and the Worker cannot read GitHub's. |

Neither the account id nor the namespace id needs a secret: the namespace is read from
`web/wrangler.jsonc` and the account is resolved from the token.

`NEWSLETTER_NOTIFY_TO` (Worker, type Text or Secret) is where the "New Newsletter Registration CTF"
note goes when somebody confirms — one mail per new subscriber, carrying their address. It is a
Worker variable and not a line in the code because the repository is public; without it the note
goes to `LEAD_NOTIFY_TO`, then `contact@clinicaltrialfailures.com`.

`MAIL_FROM` and `MAIL_FROM_NAME` are optional overrides; the default sender is
`contact@clinicaltrialfailures.com`, which has to be a domain verified with the sending service
or the mail lands in spam.

## Checking who is subscribed

In the dashboard: https://dash.cloudflare.com/?to=/:account/workers/kv/namespaces/0601b1ee829841bf90a3ce764b4d958d
→ KV Pairs → search `news:` (confirmed) or `pending:` (not yet confirmed). From a terminal:

```
npx wrangler kv key list --namespace-id 0601b1ee829841bf90a3ce764b4d958d --prefix news:
npx wrangler kv key list --namespace-id 0601b1ee829841bf90a3ce764b4d958d --prefix pending:
```

The second list is people who signed up and have not clicked yet. A large gap between the two is
worth looking at: it usually means the confirmation is landing in spam.
