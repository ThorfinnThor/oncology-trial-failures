# Shelved: the per-cohort order form

Removed from `web/pages/packages/[slug].tsx` on 2026-09-27.

It sold **one cohort** for €99 through `/api/order` with `slug`, while the asset check sells
**every cohort that shares a molecule's target** for the same €99 through the same Payment Link.
Two products at one price, reached by two paths, is one product too many — and its opt-in
checkbox ("tell me when this cohort changes") promised the per-cohort watchlist, which is itself
shelved (`web/shelved/`, `docs/watchlist.md`).

The package pages now send the buyer into the asset check with the class pre-filled
(`/asset-check?q=<class>`), which for every one of the 52 cohorts resolves and includes the cohort
itself — checked when this was shelved.

`/api/order` still accepts `slug` (scope `"cohort"`), so this form works again as it was if it is
put back. What it would need first: handling `payment: true` in the response the way
`asset-check.tsx` does, instead of linking straight to `/access`.

## The submit handler

```tsx
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(form.entries()), slug: pkg.slug }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Request failed");
      setUrl(data.url || "");
      setMessage(data.message || "");
      setStatus("done");
    } catch (error: any) {
      setMessage(error?.message || "Request failed. Please email us instead.");
      setStatus("error");
    }
  }
```

## The section

```tsx
          {adds > 0 ? (
          <section className="section" id="get">
            <div className="box">
              {status === "done" ? (
                <div>
                  <h2>Ready</h2>
                  <p className="lead">{message}</p>
                  <Link className="btnPrimary" href={url}>
                    Open your access
                  </Link>
                  <p className="fine">
                    Keep that link. It opens everything this order covers, it does not expire for a year, and it always
                    shows the current release — there is nothing to download and keep up to date.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <h2>Get this package</h2>
                    <p className="lead">
                      Delivered the moment you ask — it is already built, rebuilt every week with the registry. No call, no
                      waiting.
                    </p>
                    <ul className="list">
                      <li>Automated analysis. No clinician has reviewed these records, and we do not price as though one has</li>
                      <li>Every figure traces to a trial, and every trial to its registry record</li>
                      <li>
                        Name the asset you are evaluating and the package opens with it compared against every molecule
                        that failed here — same target, same pathway, same modality, or none of the three.{" "}
                        <Link className="link" href="/asset-check">
                          Not sure this is the right cohort? Check your molecule free first
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <form className="form" onSubmit={submit}>
                    <div className="field">
                      <label htmlFor="pk-email">Work email</label>
                      <input id="pk-email" className="input" name="email" type="email" required autoComplete="email" />
                    </div>
                    <div className="field">
                      <label htmlFor="pk-company">Company or institution</label>
                      <input id="pk-company" className="input" name="company" type="text" required autoComplete="organization" />
                    </div>
                    <div className="field">
                      <label htmlFor="pk-asset">
                        The asset you are evaluating <span className="opt">optional</span>
                      </label>
                      <input id="pk-asset" className="input" name="asset" type="text" placeholder="Name, INN or research code" />
                      <span className="hint">
                        Resolved against ChEMBL&rsquo;s clinical-stage molecules. A preclinical or unnamed asset will not
                        be in it, and the package says so rather than guessing.
                      </span>
                    </div>
                    <input
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      style={{ position: "absolute", left: "-9999px" }}
                    />
                    <label className="consent">
                      <input name="marketing" type="checkbox" />
                      <span>Optional: tell me when this cohort changes. You get the package either way.</span>
                    </label>
                    <button className="submit" type="submit" disabled={status === "sending"}>
                      {status === "sending" ? "Preparing…" : "Get the package"}
                    </button>
                    {status === "error" ? <div className="formError">{message}</div> : null}
                    <p className="fine">
                      Or email{" "}
                      <a className="link" href={`mailto:${LICENSING_EMAIL}`}>
                        {LICENSING_EMAIL}
                      </a>
                      .
                    </p>
                  </form>
                </>
              )}
            </div>
          </section>
```
