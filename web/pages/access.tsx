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
  rate: number;
  comparator_rate: number;
  counts: { closed: number; stopped: number; still_open: number; total_in_cohort: number };
  brief_slug: string | null;
  url: string;
};

type Library = {
  ok: true;
  /** Returned when the page was opened with a checkout id, so the address bar can be rewritten. */
  token?: string;
  scope: "molecule" | "cohort" | "all";
  asset: string;
  company: string;
  dataset_version: string;
  packages: Entry[];
  files: { label: string; href: string }[];
};

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
        <title>Your access — Clinical trial failures</title>
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
          {state === "loading" || state === "idle" ? <p className="muted">Opening your access…</p> : null}

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
                <div className="eyebrow">Your access</div>
                <h1>
                  {library.scope === "all"
                    ? "Everything, rebuilt every week"
                    : library.asset
                      ? `Every cohort that shares a target with ${library.asset}`
                      : "Your evidence package"}
                </h1>
                <p className="lead">
                  {library.packages.length} {library.packages.length === 1 ? "package" : "packages"} covering{" "}
                  {n(total)} trials. Release {library.dataset_version}. This page is rebuilt with the data, so the link
                  you saved always opens the current version — there is nothing to download and keep up to date.
                </p>
                {library.asset ? (
                  <p className="fine">
                    Each package opens with <b>{library.asset}</b> already compared against every molecule that failed
                    in that cohort. To compare a different one, add <code>&amp;asset=</code> and its name to any link
                    below.
                  </p>
                ) : null}
              </section>

              <section className="section">
                <div className="sectionHead">
                  <h2>Packages</h2>
                  <span className="count">largest cohort first</span>
                </div>
                <div className="rows">
                  {library.packages.map((entry) => (
                    <div className="row" key={entry.slug}>
                      <div className="rowMain">
                        <div className="rowArea">{entry.area}</div>
                        <div className="rowName">{entry.cohort}</div>
                        <div className="rowMeta">
                          <b>{pct(entry.rate)}</b> of {n(entry.counts.closed)} closed trials stopped early ·{" "}
                          {pct(entry.comparator_rate)} for {entry.area.toLowerCase()} ·{" "}
                          {n(entry.counts.total_in_cohort)} trials in the cohort · {entry.counts.stopped} stopped ·{" "}
                          {n(entry.counts.still_open)} still running
                        </div>
                      </div>
                      <div className="rowCta">
                        <a className="open" href={entry.url} target="_blank" rel="noopener noreferrer">
                          Open the package
                        </a>
                        {entry.brief_slug ? (
                          <Link className="ghost" href={`/briefs/${entry.brief_slug}`}>
                            Free brief
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="section">
                <div className="sectionHead">
                  <h2>Files</h2>
                  <span className="count">current release</span>
                </div>
                <div className="files">
                  {library.files.map((file) => (
                    <a className="file" key={file.href} href={file.href}>
                      {file.label}
                    </a>
                  ))}
                </div>
                <p className="fine">
                  Keep this link. It does not expire for a year and it never points at a stale copy. If you need it on
                  another address, or a cohort that is not here,{" "}
                  <a className="link" href={`mailto:${LICENSING_EMAIL}?subject=${encodeURIComponent("Access")}`}>
                    write to us
                  </a>
                  .
                </p>
              </section>
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
          margin-top: 14px;
        }
        .row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px 16px;
        }
        .rowArea {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
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
        .open,
        :global(.ghost) {
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
        :global(.ghost) {
          background: #fff;
          color: inherit;
          border: 1px solid var(--border);
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
