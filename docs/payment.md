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
                                   and session:{checkout id} → token
              →  /access?session=cs_…   resolves to the token, rewrites the URL to ?token=…
```

The last step needs saying. A Payment Link redirects to **one fixed URL** — it cannot carry the
token back, because the link is the same for every buyer. So the redirect carries Stripe's own
`{CHECKOUT_SESSION_ID}`, the webhook leaves a `session:{id} → token` index behind, and `/access`
trades one for the other and then replaces the address bar with the token link, which keeps
working for a year. Without that index a customer who closed the tab they ordered from would come
back from Stripe to a page that cannot tell who they are.

The token is minted **before** the payment, not after. That is why the webhook has nothing to
create and nothing to guess: it looks up `grant:{client_reference_id}` and flips one bit. A
webhook that has to work out which customer it belongs to is a webhook that will one day get it
wrong.

While the payment is outstanding, `/access` returns HTTP 402 and the page says the payment is
still confirming. Arriving from the checkout it retries by itself every 2.5 seconds, up to eight
times, because the redirect regularly beats the webhook by a second or two; there is a "Check
again" button underneath for the rest.

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
| After payment | Redirect to `https://clinicaltrialfailures.com/access?session={CHECKOUT_SESSION_ID}` | same |
| Collect | Email (on by default), business name | same |

Do **not** tick "Let customers adjust quantity". One order is one molecule.

Copy each link's URL (`https://buy.stripe.com/…`).

**2. The webhook** — dashboard.stripe.com → Developers → Webhooks → Add endpoint.

- Endpoint URL: `https://clinicaltrialfailures.com/api/stripe`
- Events: **`checkout.session.completed`** and **`checkout.session.async_payment_succeeded`**. The
  second is how a delayed method (SEPA Direct Debit, bank transfer) settles days later; without it
  such a customer pays and never gets access.
- After creating it, click "Reveal" under Signing secret and copy the `whsec_…` value.

**3. Three secrets — in Cloudflare, not in GitHub.** The site is deployed by Cloudflare Workers
Builds on push; GitHub Actions only builds and checks. Runtime configuration therefore lives on
the Worker: dash.cloudflare.com → Compute (Workers) → `oncology-trial-failures` → Settings →
Variables and Secrets → Add.

| Name | Type | Value |
|---|---|---|
| `STRIPE_LINK_PACKAGE` | Secret | the €99 link |
| `STRIPE_LINK_ACCESS` | Secret | the €999 link |
| `STRIPE_WEBHOOK_SECRET` | Secret | the `whsec_…` value |

All three as **Secret**, including the two links, which are not secret at all. A deploy replaces
the Worker's plaintext variables with whatever `wrangler.jsonc` declares — and it declares none —
so a link stored as a plaintext variable disappears at the next release and every order silently
goes back to being free. Secrets survive deploys. That is the whole reason.

They take effect immediately, without a deploy. `payment.ts` reads the Cloudflare context env at
request time.

**4. Check it once — without money moving.** Stripe → Product catalogue → Coupons → create a
100 % coupon, add a promotion code (e.g. `CTFTEST`, max. 1 redemption), and switch on "Allow
promotion codes" on the €99 Payment Link. A checkout brought to €0 completes with
`payment_status: no_payment_required`, which settles the grant exactly like `paid`
(`isSettled()` in `payment.ts`). The same mechanism serves complimentary reports. The older route:
 Order a package for a molecule you know resolves, pay with Stripe's test
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
| Session completed but unpaid (e.g. bank transfer pending) | 200, nothing granted, logged. Stripe sends `checkout.session.async_payment_succeeded` when it settles, and that grants access. |

## What is still by hand

Full access (€999) is sold in a conversation, not self-serve: `/api/order` always mints the
`molecule` tier. `STRIPE_LINK_ACCESS` exists so that link can be sent directly, and a grant with
`scope: "all"` is written by hand in KV against the same token. Fewer than ten customers a year
do not justify a second funnel.

Refunds are manual as well — refund in Stripe, then delete `grant:{token}` in KV.
