# Payment

Two things can be bought: one molecule's evidence packages (€99, once) and access to everything
(€999 a year). Both go through **Stripe Payment Links**, not the Stripe API.

That choice is the whole design. A Payment Link is created once in the dashboard and needs no
secret key in our Worker, so the one credential worth stealing never leaves Stripe. What we do
need — the webhook signing secret — can only be used to *send* us messages, not to move money.

## The flow

```
/asset-check  →  POST /api/order   mints token, writes grant:{token} with paid:false
                                   returns the Payment Link + ?client_reference_id={token}
              →  Stripe checkout   customer pays
              →  POST /api/stripe  checkout.session.completed → grant.paid = true
              →  /access?token=…   library opens
```

The token is minted **before** the payment, not after. That is why the webhook has nothing to
create and nothing to guess: it looks up `grant:{client_reference_id}` and flips one bit. A
webhook that has to work out which customer it belongs to is a webhook that will one day get it
wrong.

While the payment is outstanding, `/access?token=…` returns HTTP 402 and the page says the
payment is still confirming, with a "Check again" button. Stripe normally delivers the webhook in
a second or two.

## What is verified

`verifySignature()` in `web/lib/server/payment.ts` implements Stripe's own scheme: HMAC-SHA256
over `` `${t}.${body}` ``, compared in constant time against every `v1=` signature in the header.

The timestamp is checked as well, with a five-minute tolerance. This is not decoration: without
it a captured `checkout.session.completed` stays valid forever, and replaying it grants access
again. The request really is from Stripe — which is exactly why the signature alone cannot be the
whole test.

`/api/stripe` sets `config.api.bodyParser = false`, because Stripe signs the bytes it sent and
Next's JSON parser would re-serialise them.

## Behaviour when it is not configured

`isConfigured(tier)` is false while the link for that tier is unset, and then an order is granted
immediately, exactly as before any of this existed. The site keeps working; nothing is charged.

This is deliberate. A half-connected checkout that takes an order and then refuses to deliver is
worse than no checkout at all. It also means the switch is one-way and instant: the moment the
links are set, every new order goes through Stripe, and no deploy is needed.

The inverse is enforced too, and there is a test for it: once a tier is configured, an **unpaid**
grant opens nothing (`isUnlocked()` in `web/lib/server/grants.ts`).

## Setup — Schayan, once, ~20 minutes

**1. Two Payment Links** — dashboard.stripe.com → Product catalogue → Payment Links → Create.

| | Evidence packages, one molecule | Full access |
|---|---|---|
| Price | €99, one-off | €999, recurring yearly |
| After payment | Redirect to `https://clinicaltrialfailures.com/access` | same |
| Collect | Email (on by default), business name | same |

Do **not** tick "Let customers adjust quantity". One order is one molecule.

Copy each link's URL (`https://buy.stripe.com/…`).

**2. The webhook** — dashboard.stripe.com → Developers → Webhooks → Add endpoint.

- Endpoint URL: `https://clinicaltrialfailures.com/api/stripe`
- Events: **`checkout.session.completed`** only.
- After creating it, click "Reveal" under Signing secret and copy the `whsec_…` value.

**3. Three secrets** — github.com/ThorfinnThor/oncology-trial-failures → Settings → Secrets and
variables → Actions → New repository secret:

| Name | Value |
|---|---|
| `STRIPE_LINK_PACKAGE` | the €99 link |
| `STRIPE_LINK_ACCESS` | the €999 link |
| `STRIPE_WEBHOOK_SECRET` | the `whsec_…` value |

The deploy workflow passes them to the Worker as secrets. Nothing else changes; the next release
picks them up.

**4. Check it once.** Order a package for a molecule you know resolves, pay with Stripe's test
card `4242 4242 4242 4242` in test mode, and confirm `/access` opens by itself. In the Stripe
dashboard the webhook attempt should show 200.

## Failure modes, and what happens

| | |
|---|---|
| Webhook secret missing | `/api/stripe` returns 503 and logs `stripe_not_configured`. Orders still work — they are simply not charged. |
| Bad signature or old timestamp | 400, logged as `stripe_signature_rejected` with the reason. Terse to the caller on purpose: a rejected webhook is either a misconfiguration or somebody probing. |
| KV unreachable | 500, so Stripe retries. The payment is real and the grant must eventually settle. |
| Unknown token | 200 with `ignored: "unknown grant"` — retrying will not help. |
| Duplicate delivery | 200 with `already: true`. Stripe retries by design; settling is idempotent. |
| Session completed but unpaid (e.g. bank transfer pending) | 200, nothing granted, logged. The webhook fires again when it settles. |

## What is still by hand

Full access (€999) is sold in a conversation, not self-serve: `/api/order` always mints the
`molecule` tier. `STRIPE_LINK_ACCESS` exists so that link can be sent directly, and a grant with
`scope: "all"` is written by hand in KV against the same token. Fewer than ten customers a year
do not justify a second funnel.

Refunds are manual as well — refund in Stripe, then delete `grant:{token}` in KV.
