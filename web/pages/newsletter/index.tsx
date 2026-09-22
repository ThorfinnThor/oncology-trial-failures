// web/pages/newsletter/index.tsx
//
// One list, one mail every two weeks. It replaced a per-subscriber watchlist, and the reason is
// worth writing down: a watchlist has to match every subscriber's terms against every change, and
// a thing with that many moving parts quietly stops working. One mail for everybody is written
// once by the workflow and sent. It keeps happening, which is the only property that matters for
// something published on a schedule.

import Head from "next/head";
import Link from "next/link";
import { FormEvent, useState } from "react";

import PrimaryNav from "@/components/PrimaryNav";
import productSummary from "@/data/product_summary.json";
import briefsIndex from "@/data/briefs_index.json";
import preview from "@/data/newsletter_preview.json";
import { LICENSING_EMAIL } from "@/lib/licensing";

const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/newsletter`;
const TITLE = "Every two weeks: the trials that stopped, and what changed";
const DESCRIPTION =
  "A short mail every second week: the trials that entered the dataset, the stop reasons sponsors posted, and the discontinuation rates that moved. No news, no commentary, no attachments.";

const n = (v: number) => v.toLocaleString("en-US");

type PreviewRow = { nct_id: string; title: string; sponsor: string; detail: string };

export default function NewsletterPage() {
  const p = preview as unknown as {
    release: string;
    last_sent_at: string;
    counts: { added: number; changed: number };
    added: PreviewRow[];
    changed: PreviewRow[];
    recent?: PreviewRow[];
  };
  const waiting = p.counts.added + p.counts.changed;
  const shown = waiting
    ? [
        ...p.added.map((row) => ({ ...row, kind: "added" as const })),
        ...p.changed.map((row) => ({ ...row, kind: "changed" as const })),
      ].slice(0, 8)
    : (p.recent || []).map((row) => ({ ...row, kind: "recent" as const }));

  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not sign you up.");
      setMessage(data.message || "");
      setStatus("done");
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message || "Could not sign you up. Please try again.");
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
            <PrimaryNav active="newsletter" />
          </div>
        </div>
      </header>

      <main className="page">
        <div className="wrap">
          <section className="hero">
            <div className="heroMain">
              <div className="eyebrow">Newsletter · free</div>
              <h1>Every two weeks: what stopped, and what changed</h1>
              <p className="heroLead">
                The dataset is rebuilt from ClinicalTrials.gov every week and each release is diffed against the last.
                Twice a month that diff becomes a short mail: the trials that entered the dataset with a stop reason,
                the records sponsors edited, and the mechanism classes whose discontinuation rate moved enough to
                mention. Written by the same job that builds the data, so it says what actually changed and nothing
                else.
              </p>
              <p className="ctaNote">Free. No account. Every mail carries a link that stops it for good.</p>
              <div className="sourceStrip">
                <span>{n(productSummary.trial_count)} stopped trials</span>
                <span>{briefsIndex.brief_count} mechanism classes</span>
                <span>Rebuilt weekly · mailed fortnightly</span>
              </div>
            </div>

            <div className="card form">
              {status === "done" ? (
                <>
                  <div className="formTitle">You are on the list</div>
                  <p className="formSub">{message}</p>
                  <Link className="ctaLink" href="/briefs">
                    Read the briefs while you wait
                  </Link>
                </>
              ) : (
                <form onSubmit={onSubmit}>
                  <div className="formTitle">Get it</div>
                  <p className="formSub">One mail per fortnight. Nothing else is ever sent to this address.</p>
                  <div className="field">
                    <label htmlFor="nl-email">Work email</label>
                    <input id="nl-email" className="input" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="field">
                    <label htmlFor="nl-company">
                      Company or institution <span className="opt">optional</span>
                    </label>
                    <input id="nl-company" className="input" name="company" type="text" autoComplete="organization" />
                  </div>
                  <input
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    style={{ position: "absolute", left: "-9999px" }}
                  />
                  <button className="submit" type="submit" disabled={status === "sending"}>
                    {status === "sending" ? "Signing you up…" : "Subscribe"}
                  </button>
                  {status === "error" ? <div className="formError">{message}</div> : null}
                  <p className="formFoot">
                    We use the address for this mail and nothing else. See our{" "}
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
            <h2>What is in it</h2>
            <div className="grid">
              <div className="card item">
                <div className="itemTitle">Trials that entered the dataset</div>
                <p>
                  Newly registered stops, with the reason the sponsor posted and a link to the record. This is the bulk
                  of most issues and the reason to read it at all.
                </p>
              </div>
              <div className="card item">
                <div className="itemTitle">Records a sponsor changed</div>
                <p>
                  A status, a stop reason or a completion date edited after the fact. Separated from our own
                  reclassifications, which are never reported as though a sponsor had done something.
                </p>
              </div>
              <div className="card item">
                <div className="itemTitle">Rates that moved</div>
                <p>
                  Where a mechanism class&rsquo;s discontinuation rate shifted by enough to be worth a line, with the
                  new figure and what it is measured against.
                </p>
              </div>
            </div>
            <p className="fine">
              What is not in it: opinion, industry news, conference coverage, or anything we did not compute ourselves.
              If a fortnight passes with nothing worth reporting, the mail says so in one line rather than padding.
              Questions go to{" "}
              <a className="link" href={`mailto:${LICENSING_EMAIL}`}>
                {LICENSING_EMAIL}
              </a>
              .
            </p>
          </section>

          {/* The mail itself, not a description of it. Written by the same job that sends it. */}
          <section className="section">
            <h2>{waiting ? "What is waiting for the next one" : "What an issue looks like"}</h2>
            <p className="previewSub">
              {waiting > 0 ? (
                <>
                  Release {p.release || productSummary.dataset_version}: {n(p.counts.added)}{" "}
                  {p.counts.added === 1 ? "trial entered the dataset" : "trials entered the dataset"} and{" "}
                  {n(p.counts.changed)} {p.counts.changed === 1 ? "record was" : "records were"} edited by their
                  sponsor. {shown.length < waiting ? `The first ${shown.length} are below; ` : "They are below; "}
                  the mail carries up to 25 of each.
                </>
              ) : (
                <>
                  Nothing has moved since the last release — the mail would say so in one line rather than padding it
                  out, which is most of the argument for reading it. So instead, here are the stopped trials whose
                  registry records changed most recently: the same rows, from the current release.
                </>
              )}
            </p>

            {shown.length ? (
              <div className="card previewBox">
                <table className="previewTable">
                  <tbody>
                    {shown.map((row) => (
                      <tr key={`${row.kind}-${row.nct_id}`}>
                        <td className="pKind">
                          <span className={row.kind === "added" ? "tag tagAdd" : "tag"}>
                            {row.kind === "added" ? "entered" : row.kind === "changed" ? "edited" : "stopped"}
                          </span>
                        </td>
                        <td className="pId">
                          <a
                            className="link"
                            href={`https://clinicaltrials.gov/study/${row.nct_id}`}
                            rel="nofollow noreferrer"
                            target="_blank"
                          >
                            {row.nct_id}
                          </a>
                          <div className="pSponsor">{row.sponsor}</div>
                        </td>
                        <td>
                          <div className="pTitle">{row.title}</div>
                          {row.detail ? <div className="pDetail">{row.detail}</div> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <p className="fine">
              The page and the mail are rendered from the same list, refreshed with every weekly release.{" "}
              {p.last_sent_at ? `The last mail went out on ${p.last_sent_at.slice(0, 10)}.` : ""}
            </p>
          </section>
        </div>
      </main>

      <style jsx>{`
        .wrap {
          max-width: 1060px;
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
          grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
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
        h1 {
          margin: 10px 0 0;
          font-size: 32px;
          line-height: 1.12;
          font-weight: 900;
          letter-spacing: -0.022em;
          max-width: 20ch;
        }
        .heroLead {
          margin: 12px 0 0;
          font-size: 15px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.76);
          max-width: 60ch;
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
        .form {
          padding: 22px;
        }
        .formTitle {
          font-size: 15px;
          font-weight: 850;
        }
        .formSub {
          margin: 4px 0 16px;
          font-size: 13px;
          line-height: 1.5;
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
        .opt {
          font-weight: 600;
          color: var(--text-muted);
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
        :global(.ctaLink) {
          display: block;
          text-align: center;
          text-decoration: none;
          background: var(--accent);
          color: #fff;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 800;
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
        .previewSub {
          color: var(--text-muted, #64748b);
          margin: 6px 0 12px;
          max-width: 78ch;
          line-height: 1.6;
        }
        .previewBox {
          padding: 6px 4px;
          overflow-x: auto;
        }
        .previewTable {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .previewTable td {
          padding: 10px 12px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: top;
        }
        .previewTable tr:last-child td {
          border-bottom: 0;
        }
        .pKind {
          width: 84px;
        }
        .tag {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 3px 7px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          white-space: nowrap;
        }
        .tagAdd {
          background: #eef2ff;
          color: #4338ca;
        }
        .pId {
          width: 148px;
          white-space: nowrap;
        }
        .pSponsor {
          color: var(--text-muted, #64748b);
          font-size: 11.5px;
          margin-top: 2px;
        }
        .pTitle {
          font-weight: 600;
        }
        .pDetail {
          color: var(--text-muted, #64748b);
          margin-top: 3px;
          line-height: 1.5;
        }
        .section {
          margin-top: 34px;
        }
        .section h2 {
          margin: 0;
          font-size: 21px;
          font-weight: 900;
          letter-spacing: -0.015em;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 16px;
        }
        .item {
          padding: 16px 18px;
        }
        .itemTitle {
          font-size: 14.5px;
          font-weight: 850;
          line-height: 1.3;
        }
        .item p {
          margin: 6px 0 0;
          font-size: 13px;
          line-height: 1.55;
          color: var(--text-muted);
        }
        .fine {
          margin-top: 16px;
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 96ch;
        }
        @media (max-width: 900px) {
          .hero {
            grid-template-columns: minmax(0, 1fr);
            padding: 24px;
          }
          h1 {
            font-size: 26px;
          }
          .grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </>
  );
}
