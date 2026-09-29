// web/pages/access.tsx
//
// One link, everything it opens. No account, no password, no "forgot your login" — the token in
// the URL is exactly as strong as the mailbox it was sent to, which is what a password reset
// reduces to anyway, and a login would have been the largest thing built here and the least used.
//
// The list is computed from the grant on every load, so a buyer sees this week's release through
// a link they saved last month. That is the whole promise of the page: it does not go stale.

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

import PrimaryNav from "@/components/PrimaryNav";
import { LICENSING_EMAIL } from "@/lib/licensing";

const n = (v: number) => v.toLocaleString("en-US");
const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;

type Entry = {
  slug: string;
  cohort: string;
  area: string;
  role: "main" | "further";
  reason: string;
  rate: number;
  comparator_rate: number;
  counts: { closed: number; stopped: number; still_open: number; total_in_cohort: number };
  url: string;
};

type Library = {
  ok: true;
  /** Returned when the page was opened with a checkout id, so the address bar can be rewritten. */
  token?: string;
  scope: "molecule" | "cohort" | "all";
  asset: string;
  company: string;
  email: string;
  issued_at: string;
  document: { html: string; print: string } | null;
  dataset_version: string;
  packages: Entry[];
  files: { label: string; format: string; detail: string; href: string }[];
};

function date(iso: string, plusDays = 0): string {
  const d = new Date(new Date(iso).getTime() + plusDays * 86400000);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function AccessPage() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error" | "awaiting">("idle");
  const [library, setLibrary] = useState<Library | null>(null);
  const [message, setMessage] = useState("");
  const loadedFor = useRef("");
  const retries = useRef(0);
  const [tick, setTick] = useState(0);

  // The token is read from the address bar as well as from the router. Waiting only on
  // router.isReady is how this page ends up showing a paying customer a spinner that never
  // resolves: the flag depends on the router having hydrated its query, and anything that stops
  // that — a stale manifest, a cached shell — turns the whole of what they bought into a blank
  // screen with no way to tell that the link itself was fine.
  useEffect(() => {
    const query = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
    const fromRouter = typeof router.query.token === "string" ? router.query.token : "";
    const token = fromRouter || (query ? query.get("token") || "" : "");
    // Coming back from Stripe. A Payment Link redirects to one fixed URL, so what the customer
    // arrives with is the checkout id, not the token they left with.
    const session = (typeof router.query.session === "string" ? router.query.session : "")
      || (query ? query.get("session") || "" : "");

    if (!token && !session) {
      if (!router.isReady) return; // the router may still be filling in the query
      setState("error");
      setMessage("This page needs the link from your order. Open the link we sent you, or write to us and we will send it again.");
      return;
    }
    const key = token || `session:${session}`;
    if (loadedFor.current === key) return;
    loadedFor.current = key;

    setState("loading");
    const url = token
      ? `/api/library?token=${encodeURIComponent(token)}`
      : `/api/library?session=${encodeURIComponent(session)}`;
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (data.awaiting_payment) {
          // Not an error: the order is real, Stripe has simply not confirmed yet. Allow another
          // attempt rather than making somebody who has just paid think their link is broken.
          loadedFor.current = "";
          setMessage(data.error || "");
          setState("awaiting");
          // Arriving from the checkout, the webhook is usually seconds behind the redirect, so
          // the page tries again by itself before asking anyone to press a button.
          if (session && retries.current < 8) {
            retries.current += 1;
            window.setTimeout(() => setTick((n) => n + 1), 2500);
          }
          return;
        }
        if (!data.ok) throw new Error(data.error || "That link is not valid.");
        setLibrary(data as Library);
        setState("ready");
        // Leave the customer with a link that keeps working: the checkout id is spent, the token
        // opens this page for a year.
        if (!token && data.token && typeof window !== "undefined") {
          window.history.replaceState({}, "", `/access?token=${encodeURIComponent(data.token)}`);
        }
      })
      .catch((error: Error) => {
        setMessage(error.message || "That link is not valid.");
        setState("error");
      });
  }, [router.isReady, router.query.token, router.query.session, tick]);

  const total = library ? library.packages.reduce((sum, p) => sum + p.counts.total_in_cohort, 0) : 0;

  return (
    <>
      <Head>
        <title>Your diligence report — Clinical trial failures</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <Link href="/" className="brand">
              Clinical trial failures
            </Link>
            <PrimaryNav />
          </div>
        </div>
      </header>

      <main className="page">
        <div className="wrap">
          {state === "loading" || state === "idle" ? <p className="muted">Opening your report…</p> : null}

          {state === "awaiting" ? (
            <div className="card note">
              <h1>Waiting for your payment to confirm</h1>
              <p>{message}</p>
              <button className="again" type="button" onClick={() => router.replace(router.asPath)}>
                Check again
              </button>
              <p className="fine">
                Nothing is lost if you close this page — the link keeps working, and everything opens as soon as the
                payment lands.
              </p>
            </div>
          ) : null}

          {state === "error" ? (
            <div className="card note">
              <h1>This link does not open anything</h1>
              <p>{message}</p>
              <p className="fine">
                Write to{" "}
                <a className="link" href={`mailto:${LICENSING_EMAIL}?subject=${encodeURIComponent("Access link")}`}>
                  {LICENSING_EMAIL}
                </a>{" "}
                from the address you ordered with and we will send a new one.
              </p>
            </div>
          ) : null}

          {state === "ready" && library ? (
            <>
              <section className="head">
                <div className="eyebrow">{library.scope === "all" ? "Full access" : "Diligence report"}</div>
                <h1>
                  {library.scope === "all"
                    ? "Every diligence report, rebuilt every week"
                    : library.asset || library.packages[0]?.cohort || "Your diligence report"}
                </h1>
                <dl className="meta">
                  {library.company || library.email ? (
                    <>
                      <dt>Prepared for</dt>
                      <dd>{library.company || library.email}</dd>
                    </>
                  ) : null}
                  {library.issued_at ? (
                    <>
                      <dt>Issued</dt>
                      <dd>{date(library.issued_at)}</dd>
                      <dt>Online until</dt>
                      <dd>{date(library.issued_at, 365)}</dd>
                    </>
                  ) : null}
                  <dt>Data release</dt>
                  <dd>{library.dataset_version} · ClinicalTrials.gov</dd>
                </dl>

                {library.document ? (
                  <div className="download">
                    <div className="downloadText">
                      <div className="downloadTitle">The complete report</div>
                      <p>
                        Cover, contents and all {library.packages.length}{" "}
                        {library.packages.length === 1 ? "chapter" : "chapters"} in one document.
                      </p>
                    </div>
                    <div className="downloadActions">
                      <a className="primary" href={library.document.html}>
                        Download (HTML)
                      </a>
                      <a className="secondary" href={library.document.print} target="_blank" rel="noopener">
                        Save as PDF
                      </a>
                    </div>
                    <p className="downloadFine">
                      The HTML file opens in any browser and works offline. &ldquo;Save as PDF&rdquo; opens the report
                      with your browser&rsquo;s print dialog — choose &ldquo;Save as PDF&rdquo; as the destination.
                    </p>
                  </div>
                ) : null}
              </section>

              <section className="section">
                <div className="sectionHead">
                  <h2>{library.scope === "all" ? "Reports" : "Contents"}</h2>
                  <span className="count">
                    {library.packages.length} {library.packages.length === 1 ? "chapter" : "chapters"} ·{" "}
                    {n(total)} trials
                  </span>
                </div>
                {library.scope !== "all" && library.packages.some((p) => p.role === "further") ? (
                  <p className="intro">
                    The main chapter is the cohort defined by <b>{library.asset}</b> itself. Further chapters are
                    cohorts in which a failed drug acting on {library.asset} also appears; each says why it is there.
                  </p>
                ) : null}
                <ol className="rows">
                  {library.packages.map((entry, i) => (
                    <li className="row" key={entry.slug}>
                      <div className="rowNum">{i + 1}</div>
                      <div className="rowMain">
                        {library.scope !== "all" ? (
                          <div className={entry.role === "main" ? "rowRole rowRoleMain" : "rowRole"}>
                            {entry.role === "main" ? "Main chapter" : "Further chapter"} · {entry.area}
                          </div>
                        ) : (
                          <div className="rowRole">{entry.area}</div>
                        )}
                        <div className="rowName">{entry.cohort}</div>
                        <div className="rowMeta">
                          {n(entry.counts.total_in_cohort)} trials · {entry.counts.stopped} stopped early ·{" "}
                          <b>{pct(entry.rate)}</b> of closed trials, against {pct(entry.comparator_rate)} for{" "}
                          {entry.area.toLowerCase()}
                        </div>
                        {entry.reason ? <div className="rowWhy">{entry.reason}</div> : null}
                      </div>
                      <div className="rowCta">
                        <a className="open" href={entry.url} target="_blank" rel="noopener noreferrer">
                          Read online
                        </a>
                      </div>
                    </li>
                  ))}
                </ol>
                {library.asset ? (
                  <p className="fine">
                    Every chapter opens by placing each molecule that failed in that cohort against{" "}
                    <b>{library.asset}</b>: same target and modality, same target, same pathway, or unrelated.
                  </p>
                ) : null}
              </section>

              {library.files.length ? (
                <section className="section">
                  <div className="sectionHead">
                    <h2>Data exports</h2>
                    <span className="count">current release</span>
                  </div>
                  <div className="files">
                    {library.files.map((file) => (
                      <a className="file" key={file.href} href={file.href}>
                        <span className="fileTop">
                          <span className="fileLabel">{file.label}</span>
                          <span className="fileFormat">{file.format}</span>
                        </span>
                        <span className="fileDetail">{file.detail}</span>
                      </a>
                    ))}
                  </div>
                </section>
              ) : null}

              <p className="fine keep">
                Keep this page&rsquo;s link: it is your access for a year, and every chapter is rebuilt with each weekly
                data release. For another address, another molecule or a question about the report,{" "}
                <a className="link" href={`mailto:${LICENSING_EMAIL}?subject=${encodeURIComponent("Diligence report")}`}>
                  write to us
                </a>
                .
              </p>
            </>
          ) : null}
        </div>
      </main>

      <style jsx>{`
        .wrap {
          max-width: 1000px;
          margin: 0 auto;
        }
        .muted {
          color: var(--text-muted);
          font-size: 14px;
        }
        .note {
          padding: 24px 26px;
          max-width: 620px;
          margin-top: 30px;
        }
        .note h1 {
          margin: 0;
          font-size: 21px;
          font-weight: 900;
        }
        .note p {
          margin: 10px 0 0;
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-muted);
        }
        .head {
          padding: 12px 0 0;
        }
        .eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent);
        }
        h1 {
          margin: 10px 0 0;
          font-size: 30px;
          line-height: 1.15;
          font-weight: 900;
          letter-spacing: -0.02em;
          max-width: 26ch;
        }
        .lead {
          margin: 12px 0 0;
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 80ch;
        }
        .section {
          margin-top: 30px;
        }
        .sectionHead {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 14px;
        }
        .section h2 {
          margin: 0;
          font-size: 19px;
          font-weight: 900;
          letter-spacing: -0.015em;
        }
        .count {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .rows {
          display: grid;
          gap: 10px;
          margin: 14px 0 0;
          padding: 0;
          list-style: none;
        }
        .row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 18px;
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px 16px;
        }
        .rowName {
          margin-top: 3px;
          font-size: 16px;
          font-weight: 850;
        }
        .rowMeta {
          margin-top: 5px;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--text-muted);
        }
        .rowMeta b {
          color: var(--text);
          font-weight: 850;
          font-variant-numeric: tabular-nums;
        }
        .rowCta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .open {
          border-radius: 10px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
        }
        .open {
          background: var(--accent);
          color: #fff;
        }
        .meta {
          display: grid;
          grid-template-columns: max-content 1fr;
          gap: 4px 16px;
          margin: 14px 0 0;
          font-size: 13.5px;
        }
        .meta dt {
          color: var(--text-muted);
        }
        .meta dd {
          margin: 0;
          font-weight: 700;
        }
        .download {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px 20px;
          align-items: center;
          margin-top: 22px;
          padding: 18px 20px;
          border: 1px solid rgba(79, 70, 229, 0.3);
          background: rgba(79, 70, 229, 0.04);
          border-radius: 16px;
        }
        .downloadTitle {
          font-size: 16px;
          font-weight: 900;
        }
        .downloadText p {
          margin: 4px 0 0;
          font-size: 13.5px;
          color: var(--text-muted);
        }
        .downloadActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .primary,
        .secondary {
          border-radius: 12px;
          padding: 11px 18px;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
        }
        .primary {
          background: var(--accent);
          color: #fff;
        }
        .secondary {
          background: #fff;
          color: inherit;
          border: 1px solid var(--border);
        }
        .downloadFine {
          grid-column: 1 / -1;
          margin: 4px 0 0;
          font-size: 12px;
          line-height: 1.55;
          color: var(--text-muted);
        }
        .intro {
          margin: 8px 0 0;
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 90ch;
        }
        .intro b {
          color: var(--text);
        }
        .rowNum {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: rgba(79, 70, 229, 0.1);
          color: var(--accent);
          font-weight: 900;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rowRole {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .rowRoleMain {
          color: var(--accent);
        }
        .rowWhy {
          margin-top: 6px;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--text-muted);
          border-left: 2px solid var(--border);
          padding-left: 10px;
        }
        .fileTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }
        .fileFormat {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }
        .fileDetail {
          display: block;
          margin-top: 4px;
          font-size: 12.5px;
          font-weight: 500;
          line-height: 1.5;
          color: var(--text-muted);
        }
        .keep {
          margin-top: 30px;
        }
        .files {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 10px;
          margin-top: 14px;
        }
        .file {
          display: block;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          color: inherit;
        }
        .file:hover {
          border-color: rgba(79, 70, 229, 0.45);
        }
        .again {
          margin-top: 16px;
          background: var(--accent);
          color: #fff;
          border: 0;
          border-radius: 12px;
          padding: 11px 18px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit;
        }
        .fine {
          margin-top: 14px;
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 96ch;
        }
        code {
          font-size: 12px;
          background: rgba(15, 23, 42, 0.06);
          border-radius: 5px;
          padding: 1px 5px;
        }
        @media (max-width: 760px) {
          .row {
            grid-template-columns: auto minmax(0, 1fr);
          }
          .rowCta {
            grid-column: 2;
          }
          .download {
            grid-template-columns: minmax(0, 1fr);
          }
          .rowCta {
            justify-content: flex-start;
          }
        }
      `}</style>
    </>
  );
}
