# What is next

Ordered by what stands between the site and its first paying customer. Everything above the line
in each section is blocked on nothing but time.

---

## Blocking revenue

### 1. There is no way to pay — code done, account missing

The code is finished: `/api/order` mints the token first and sends the customer to a Stripe
Payment Link carrying it, `/api/stripe` verifies the signature and the timestamp and flips
`paid: true`, and a configured-but-unpaid grant opens nothing (tested). While no link is set the
site behaves exactly as before — orders are granted and nothing is charged — so this switches on
without a deploy.

**Schayan, ~20 minutes, once:** two Payment Links (€99 one-off, €999/year), one webhook endpoint
at `https://clinicaltrialfailures.com/api/stripe` for `checkout.session.completed`, and three
GitHub secrets: `STRIPE_LINK_PACKAGE`, `STRIPE_LINK_ACCESS`, `STRIPE_WEBHOOK_SECRET`.
Step by step, with the exact dashboard paths: **docs/payment.md**.

Until those secrets exist, every order is still free.

### 2. The newsletter cannot send

Two secrets are missing and the sending account does not exist.

**Schayan, ~15 minutes, once:**
1. dash.cloudflare.com → My Profile → API Tokens → Create Token → Create Custom Token.
   Permissions **Account / Workers KV Storage / Edit** (Edit, not Read — the pending list lives in
   KV between runs). Save as GitHub secret `CF_API_TOKEN`.
2. brevo.com → Senders, Domains & Dedicated IPs → Domains → `clinicaltrialfailures.com` → put the
   DNS records it shows into Cloudflare → SMTP & API → API Keys. Save as `BREVO_API_KEY`.

Until then every run writes the mail it would have sent to the `newsletter-…` artifact. Read one
before signing up for anything.

---

## Product gaps that cost sales

### 3. Coverage is thin where it matters commercially

61 mechanism classes carry a signature; 40 of them can be sold. `KRAS` has 2 stops in 15 closed
trials, `CD19` 2 in 76 — real classes, real trials, too few stops to publish a rate on. Someone
evaluating a KRAS asset now gets an honest answer and nothing to buy.

Three ways out, in order of how much they are worth:

- **Widen the window.** The cohorts are Phase 2/3, 2015–2024. Phase 1 and pre-2015 would roughly
  double the closed count in the young classes. It weakens comparability across eras, so it needs
  saying plainly rather than quietly.
- **Sell a cohort built around an asset rather than a class** — one molecule, its target, any
  phase. That is the thing buyers actually ask for, and the machinery already resolves it.
- **Accept the gap and say so louder.** The current behaviour is honest; it just does not earn.

### 4. Two classes are missing from the ontology entirely

`EZH2` (75 trials) and `GLP-1` resolve to a gene and hit no class, so they return nothing at all.
Adding them to `scripts/universe/mechanism_classes.py` is a few lines each. Worth doing while
adding whatever else a look at the most-searched targets turns up.

### 5. No package covers a combination the buyer actually has

Eleven combination cohorts exist (`TGF-β + PD-(L)1` and so on) and they were chosen by us. A buyer
with a doublet not on that list gets the two single-agent cohorts and has to read across them.

---

## Things that are true but unproven

### 6. The Cloudflare build has never been verified from here

`opennextjs-cloudflare build` cannot run on the mounted folder — a permissions error when it
copies, not a code fault. So the Worker bundle size is a calculation, not a measurement: the
private data sits at **0.73 MB compressed against a self-imposed 2 MB budget**, checked on every
build by `scripts/web/check_private_data.py`. The real limit is Cloudflare's, and which one
applies depends on the plan.

**Watch the Cloudflare build after the next push.** If it fails on size, that check is where to
look.

### 7. The delivery path has never run against a real KV binding

`/api/order`, `/api/library` and `/api/report` are covered by unit tests on the logic that decides
what a token opens, but the KV reads and writes have only ever run in production shape once —
never end to end. The first real order is also the first real test.

Worth doing: order a package on the live site, open the link, check the document, and stop the
newsletter from the link in the mail.

---

## Smaller, once the above is done

- **`/data-licensing` should be `/pricing`.** The nav says Pricing, the URL and the browser tab
  still say Data & licensing. Needs a redirect so nothing Google has indexed breaks.
- **The evidence package has no PDF of its own.** It prints cleanly to A4 — verified — but a
  buyer who wants a file has to use the browser's print dialogue.
- **The watchlist is shelved, not deleted** (`web/shelved/`). It is a per-subscriber alert and it
  works. Worth restoring once there is a list worth segmenting.
- **`LRRK2` does not resolve** — ChEMBL carries no mechanism for it, so it is dropped from the
  molecule index. One of 51 test queries.
- **A stray `ctf_mirror.tgz`** sits in `~/Projects/Claude outputs/` from screenshot runs. I cannot
  delete files in your folders.

---

## Deliberately not doing

- **Lifetime access.** A one-off payment for something rebuilt every week is a liability, and a
  data business is worth a multiple of what recurs.
- **Accounts and passwords.** The token in the URL is exactly as strong as the mailbox it was sent
  to, which is what a password reset reduces to anyway.
- **The cohort CSV.** Built, then removed: it was my guess at what a buyer wants, and it cost a
  megabyte in the Worker. The distinction it uncovered — withdrawn and abandoned registrations are
  not running trials — was kept.
