// web/pages/watchlist/index.tsx
//
// The free end of the product. A brief is a document about a mechanism; a watchlist is a
// standing question about a molecule, a target or a competitor, answered every week the
// registry moves and never otherwise.
//
// Nobody is in the loop on either side: the page writes the list to KV, the weekly workflow
// matches it against the change report and sends. The only thing that has to be true for it
// to keep working is that the workflow keeps running.

import Head from "next/head";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import PrimaryNav from "@/components/PrimaryNav";
import briefsIndex from "@/data/briefs_index.json";
import watchTerms from "@/data/watch_terms.json";
import { LICENSING_EMAIL } from "@/lib/licensing";

const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/watchlist`;
const TITLE = "Trial watchlist — an email the week a trial you follow changes";
const DESCRIPTION =
  "Name the molecules, targets, mechanisms or sponsors you follow. When a sponsor changes a status, a stop reason or a completion date on a matching trial, you get one email. Nothing in a quiet week.";

const MAX_TERMS = 25;

type Group = { key: string; label: string; terms: { term: string; trials: number }[] };

export default function WatchlistPage() {
  const groups = (watchTerms as any).groups as Group[];
  const [picked, setPicked] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  // A brief can send someone here with the mechanism already in the box, so the first thing
  // they see is their own subject rather than an empty field.
  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get("terms");
    if (!preset) return;
    setPicked(
      preset
        .split(/[\n,;]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, MAX_TERMS),
    );
  }, []);

  function toggle(term: string) {
    setPicked((current) =>
      current.includes(term)
        ? current.filter((t) => t !== term)
        : current.length >= MAX_TERMS
          ? current
          : [...current, term],
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const typed = String(form.get("terms") || "");
    const all = [...picked, ...typed.split(/[\n,;]+/).map((t) => t.trim()).filter(Boolean)];
    if (!all.length) {
      setStatus("error");
      setMessage("Pick at least one term, or type your own.");
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          company: form.get("company"),
          website: form.get("website"),
          terms: all.join("\n"),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not save the watchlist.");
      setMessage(data.message || "");
      setStatus("done");
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message || "Could not save it. Please try again.");
    }
  }

  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={CANONICAL_URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={CANONICAL_URL} />
      </Head>

      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <Link href="/" className="brand">
              Clinical trial failures
            </Link>
            <PrimaryNav active="watchlist" />
          </div>
        </div>
      </header>

      <main className="page">
        <div className="wrap">
          <section className="hero">
            <div className="heroMain">
              <div className="eyebrow">Trial watchlist</div>
              <h1>An email the week a trial you follow changes. Nothing the rest of the time.</h1>
              <p className="heroLead">
                Name the molecules, targets, mechanisms or sponsors you are tracking. Every week the dataset is rebuilt from the
                registry and the new release is diffed against the last one. If a sponsor has changed a status, a stop reason or a
                completion date on a trial that matches your list, you get one mail with the trials and what moved on each. If
                nothing moved, nothing is sent.
              </p>
              <p className="ctaNote">Free. No account. Every mail carries a link that stops it for good.</p>
              <div className="sourceStrip">
                <span>{(watchTerms as any).source_trials} stopped oncology trials</span>
                <span>Rebuilt weekly</span>
                <span>Registry events only</span>
              </div>
            </div>
            <div className="release">
              <div className="releaseHead">
                <div className="releaseTitle">What counts as a change</div>
              </div>
              <div className="releaseRow">
                <span>A sponsor changes the trial</span>
                <b>You are told</b>
              </div>
              <div className="releaseRow">
                <span>A trial enters the dataset</span>
                <b>You are told</b>
              </div>
              <div className="releaseRow">
                <span>Our classifier or mappings move</span>
                <b>You are not</b>
              </div>
              <p className="releaseNote">
                The weekly diff separates the two, because they look identical in a database and are not remotely the same news.
                Sent an ontology update dressed as competitive intelligence, anyone learns to ignore the next mail.
              </p>
            </div>
          </section>

          <section className="section" id="build">
            <div className="sectionHead">
              <h2>Build your watchlist</h2>
              <span className="count">
                {picked.length} of {MAX_TERMS} picked
              </span>
            </div>
            <p className="sectionSub">
              The suggestions are the terms that actually occur in the dataset, with the number of stopped trials carrying each
              one, so a pick is never a term that can never match. Anything else you type is matched the same way — against the
              molecule, target, mechanism, sponsor, title and registry id of every trial that moved.
            </p>

            <div className="buildGrid">
              <div className="picker">
                {groups.map((group) => (
                  <div key={group.key} className="group">
                    <div className="groupLabel">{group.label}</div>
                    <div className="chips">
                      {group.terms.map((t) => (
                        <button
                          key={t.term}
                          type="button"
                          className={`chip${picked.includes(t.term) ? " chipOn" : ""}`}
                          onClick={() => toggle(t.term)}
                          aria-pressed={picked.includes(t.term)}
                        >
                          {t.term}
                          <span className="chipCount">{t.trials}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {status === "done" ? (
                <div className="card form">
                  <div className="formTitle">Watchlist saved</div>
                  <p className="formSub">{message}</p>
                  <Link className="wlCta" href="/briefs">
                    Read the briefs while you wait
                  </Link>
                  <p className="formFoot">
                    Want a second list for a different programme?{" "}
                    <button type="button" className="linkBtn" onClick={() => { setStatus("idle"); setPicked([]); }}>
                      Start another
                    </button>
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="card form">
                  <div className="formTitle">Where should it go?</div>
                  <p className="formSub">One mail per week at most, only when something matched.</p>
                  <div className="field">
                    <label htmlFor="w-email">Work email</label>
                    <input id="w-email" className="input" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="field">
                    <label htmlFor="w-company">Company or institution</label>
                    <input id="w-company" className="input" name="company" type="text" autoComplete="organization" />
                  </div>
                  <div className="field">
                    <label htmlFor="w-terms">Anything else you follow</label>
                    <textarea
                      id="w-terms"
                      className="input area"
                      name="terms"
                      rows={4}
                      placeholder={"sotorasib\nKRAS\nDaiichi Sankyo"}
                    />
                    <span className="hint">One per line, or separated by commas.</span>
                  </div>
                  {picked.length ? (
                    <div className="pickedBox">
                      <div className="pickedLabel">Picked</div>
                      <div className="chips">
                        {picked.map((term) => (
                          <button key={term} type="button" className="chip chipOn" onClick={() => toggle(term)}>
                            {term}
                            <span className="chipX" aria-hidden="true">
                              ×
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <input
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    style={{ position: "absolute", left: "-9999px" }}
                  />
                  <button className="submit" type="submit" disabled={status === "sending"}>
                    {status === "sending" ? "Saving…" : "Watch these"}
                  </button>
                  {status === "error" ? <div className="formError">{message}</div> : null}
                  <p className="formFoot">
                    We use the address for these mails and nothing else. See our{" "}
                    <Link className="link" href="/privacy">
                      privacy notice
                    </Link>
                    .
                  </p>
                </form>
              )}
            </div>
          </section>

          <section className="section">
            <div className="sectionHead">
              <h2>Where the mail comes from</h2>
              <Link className="btnGhostDark" href="/methods">
                Methods
              </Link>
            </div>
            <div className="steps">
              <div className="step">
                <div className="stepNo">1</div>
                <h3>The registry is re-read every week</h3>
                <p>
                  Every oncology trial that stopped early is fetched again, reclassified, and written as a dated release. Nothing
                  in that step is manual, so it happens whether or not anyone is looking.
                </p>
              </div>
              <div className="step">
                <div className="stepNo">2</div>
                <h3>The new release is diffed against the last</h3>
                <p>
                  Each difference is attributed: a sponsor edited the record, or our own classifier or mappings changed. Only the
                  first kind is news about a trial.
                </p>
              </div>
              <div className="step">
                <div className="stepNo">3</div>
                <h3>Your terms are matched against what moved</h3>
                <p>
                  Matching ignores punctuation and case, so <code>PD-(L)1</code> and <code>pd l1</code> are the same term. Each
                  mail names which of your terms matched which trial and links the registry record.
                </p>
              </div>
            </div>
            <p className="fine">
              The watchlist tells you that something changed. The{" "}
              <Link className="link" href="/briefs">
                {briefsIndex.brief_count} discontinuation briefs
              </Link>{" "}
              tell you how often trials of a mechanism stop early and against what baseline, and an{" "}
              <Link className="link" href="/data-licensing#evidence-package">
                evidence package
              </Link>{" "}
              gives you every trial behind that rate. Need the change report as a file rather than a mail, or a watchlist across a
              whole portfolio?{" "}
              <a className="link" href={`mailto:${LICENSING_EMAIL}?subject=${encodeURIComponent("Watchlist for a portfolio")}`}>
                {LICENSING_EMAIL}
              </a>
            </p>
          </section>
        </div>
      </main>

      <style jsx>{`
        .wrap {
          max-width: 1120px;
          margin: 0 auto;
        }
        .hero {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          color: #fff;
          background: radial-gradient(1100px 380px at 88% -10%, rgba(79, 70, 229, 0.55), transparent 60%),
            linear-gradient(160deg, #0f172a 0%, #131f38 60%, #172447 100%);
          padding: 34px;
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.85fr);
          gap: 30px;
          align-items: start;
        }
        .heroMain {
          min-width: 0;
        }
        .eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #a5b4fc;
        }
        .hero h1 {
          margin: 10px 0 0;
          font-size: 34px;
          line-height: 1.12;
          font-weight: 900;
          letter-spacing: -0.022em;
          max-width: 24ch;
        }
        .heroLead {
          margin: 12px 0 0;
          font-size: 15px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.76);
          max-width: 58ch;
        }
        .ctaNote {
          margin: 12px 0 0;
          font-size: 12.5px;
          color: rgba(255, 255, 255, 0.55);
        }
        .sourceStrip {
          margin-top: 22px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.14);
          display: flex;
          flex-wrap: wrap;
          gap: 8px 18px;
          font-size: 11.5px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.5);
        }
        .release {
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 16px;
          padding: 18px;
        }
        .releaseHead {
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.14);
        }
        .releaseTitle {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.62);
        }
        .releaseRow {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          padding: 9px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 13px;
        }
        .releaseRow span {
          color: rgba(255, 255, 255, 0.6);
        }
        .releaseRow b {
          font-weight: 800;
          white-space: nowrap;
        }
        .releaseNote {
          margin: 12px 0 0;
          font-size: 12px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.5);
        }

        .section {
          margin-top: 34px;
        }
        .sectionHead {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .section h2 {
          margin: 0;
          font-size: 21px;
          font-weight: 900;
          letter-spacing: -0.015em;
        }
        .count {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
        }
        .sectionSub {
          margin: 6px 0 0;
          color: var(--text-muted);
          font-size: 14px;
          line-height: 1.55;
          max-width: 76ch;
        }
        :global(.btnGhostDark) {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          color: inherit;
          background: var(--surface);
        }

        .buildGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(330px, 0.85fr);
          gap: 24px;
          margin-top: 18px;
          align-items: start;
        }
        .picker {
          display: grid;
          gap: 18px;
        }
        .groupLabel {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: inherit;
          border-radius: 999px;
          padding: 6px 11px;
          font-size: 12.5px;
          font-weight: 650;
          font-family: inherit;
          cursor: pointer;
          line-height: 1.2;
        }
        .chip:hover {
          border-color: rgba(79, 70, 229, 0.45);
        }
        .chipOn {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
        }
        .chipCount {
          font-size: 10.5px;
          font-weight: 800;
          opacity: 0.55;
          font-variant-numeric: tabular-nums;
        }
        .chipX {
          font-size: 13px;
          font-weight: 800;
          opacity: 0.8;
        }

        .form {
          padding: 22px;
          position: sticky;
          top: 16px;
        }
        .formTitle {
          font-size: 15px;
          font-weight: 850;
        }
        .formSub {
          margin: 4px 0 16px;
          font-size: 13px;
          color: var(--text-muted);
        }
        .field {
          display: grid;
          gap: 6px;
          margin-bottom: 12px;
        }
        .field label {
          font-size: 12.5px;
          font-weight: 700;
          color: rgba(15, 23, 42, 0.72);
        }
        .area {
          font-family: inherit;
          resize: vertical;
          min-height: 84px;
          padding: 9px 11px;
          line-height: 1.5;
        }
        .hint {
          font-size: 11.5px;
          color: var(--text-muted);
        }
        .pickedBox {
          border-top: 1px solid var(--border);
          padding-top: 12px;
          margin: 4px 0 14px;
        }
        .pickedLabel {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .submit {
          width: 100%;
          background: var(--accent);
          color: #fff;
          border: 0;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit;
        }
        .submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        :global(.wlCta) {
          display: block;
          text-align: center;
          text-decoration: none;
          width: 100%;
          background: var(--accent);
          color: #fff;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 800;
          box-sizing: border-box;
        }
        .formError {
          margin-top: 10px;
          color: #b91c1c;
          font-size: 13px;
        }
        .formFoot {
          margin: 10px 0 0;
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
        }
        .linkBtn {
          background: none;
          border: 0;
          padding: 0;
          font: inherit;
          color: var(--accent);
          font-weight: 700;
          cursor: pointer;
        }

        .steps {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }
        .step {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px 18px;
        }
        .stepNo {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: rgba(79, 70, 229, 0.12);
          color: var(--accent);
          font-size: 12px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .step h3 {
          margin: 10px 0 0;
          font-size: 14.5px;
          font-weight: 850;
          line-height: 1.3;
        }
        .step p {
          margin: 6px 0 0;
          font-size: 13px;
          line-height: 1.55;
          color: var(--text-muted);
        }
        .step code {
          font-size: 12px;
          background: rgba(15, 23, 42, 0.06);
          border-radius: 5px;
          padding: 1px 5px;
        }
        .fine {
          margin-top: 16px;
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 96ch;
        }

        @media (max-width: 960px) {
          .hero {
            grid-template-columns: minmax(0, 1fr);
            padding: 24px;
          }
          .hero h1 {
            font-size: 27px;
          }
          .buildGrid {
            grid-template-columns: minmax(0, 1fr);
          }
          .form {
            position: static;
          }
          .steps {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </>
  );
}
