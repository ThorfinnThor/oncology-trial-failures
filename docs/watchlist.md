# Watchlists

A watchlist is a standing question — a molecule, a target, a mechanism, a sponsor — answered
every week the registry moves and never otherwise. It is the free end of the product and the
only part of it that collects an address.

Nobody is in the loop. `/watchlist` writes the list to KV, the weekly workflow matches it
against the change report and sends. The only thing that has to keep happening for it to keep
working is the workflow.

## What a subscriber is told, and what they are not

The weekly change report attributes every difference between two releases:

| origin             | what it means                                  | mailed |
| ------------------ | ---------------------------------------------- | ------ |
| `registry_event`   | a sponsor edited the record                    | yes    |
| `mixed`            | partly a sponsor edit                          | yes    |
| `reclassification` | our classifier moved                           | no     |
| `remapping`        | our drug, target or sponsor mappings moved     | no     |

A trial entering the dataset is mailed too. A reclassification is not news about a trial, and
a subscriber who is sent one as though it were competitive intelligence learns to ignore the
next mail — which is the only failure mode here that cannot be undone.

## Pieces

| file                                 | does                                                     |
| ------------------------------------ | -------------------------------------------------------- |
| `web/pages/watchlist/index.tsx`       | the subscribe page; suggested terms come from the release |
| `web/pages/watchlist/stop.tsx`        | the end of the link in every mail; one button, no auto-unsubscribe on load |
| `web/pages/api/watch.ts`              | POST creates a list in KV, GET `?stop=<key>` deletes it   |
| `scripts/signals/build_watch_terms.py`| the suggestible terms, from this release's own trials     |
| `scripts/signals/send_watchlists.py`  | matches and sends, at the end of the weekly workflow      |

The stop page does nothing on load on purpose: mail security gateways fetch every URL in a
message before the recipient sees it, and a list that unsubscribes itself because a scanner
opened the link is indistinguishable from a bug.

## Running it without a sending account

With no `BREVO_API_KEY`, `send_watchlists.py` writes the mails it would have sent to
`product/watchlist_mail/` and says so. The workflow uploads that directory as an artifact, so
the content can be read and judged before anyone signs up to anything.

```
python scripts/signals/send_watchlists.py --dry-run   # never sends, always writes
```

## Secrets

Two, both in GitHub → Settings → Secrets and variables → Actions:

| secret          | what for                                                                |
| --------------- | ----------------------------------------------------------------------- |
| `CF_API_TOKEN`  | reading the watchlists out of KV. A token with **Workers KV Storage: Read** is enough. |
| `BREVO_API_KEY` | sending. Until it exists, nothing is sent and the mails become an artifact. |

Neither the account id nor the namespace id needs a secret: the namespace is read from
`web/wrangler.jsonc`, which already names it, and the account is resolved from the token. A
step that asks someone to copy an id that is sitting in the repository is a step that can only
go wrong.

`MAIL_FROM` and `MAIL_FROM_NAME` are optional overrides; the default sender is
`contact@clinicaltrialfailures.com`, which has to be a domain verified with the sending
service or the mail lands in spam.

## Checking who is subscribed

The same KV namespace as the leads (`docs/leads.md`), under the `watch:` prefix:

```
npx wrangler kv key list --namespace-id 0601b1ee829841bf90a3ce764b4d958d --prefix watch:
```
