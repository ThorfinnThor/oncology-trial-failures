// web/pages/packages/sample.tsx
//
// What €99 buys, shown rather than described: one complete package, unlocked, with every
// section named and explained next to it. A feature list asks to be believed; the document
// itself does not.

import Head from "next/head";
import Link from "next/link";

import PrimaryNav from "@/components/PrimaryNav";
import { PACKAGE_PRICE } from "@/components/BriefVsPackage";
import { SAMPLE_PACKAGE } from "@/lib/sample";

const SITE_URL = "https://clinicaltrialfailures.com";
const TITLE = "A complete evidence package, unlocked — Clinical Trial Failures";
const DESCRIPTION =
  "See exactly what an evidence package contains before buying one: a full package for one cohort, published without a paywall, with a real molecule in the comparison.";

const SECTIONS: { name: string; what: string }[] = [
  {
    name: "What we read from this",
    what: "Our interpretation in a few sentences, labelled as ours and kept apart from the facts: how many independent programmes the stops really are, how much rests on one sponsor, the honest range.",
  },
  {
    name: "How the cohort was defined",
    what: "Every rule that decides which trial is in and which is out. No rule is applied that is not listed, so the cohort can be rebuilt and argued with.",
  },
  {
    name: "Time to discontinuation",
    what: "The probability of a biological stop at 12 to 60 months against a like-for-like comparator — a figure that does not move with how mature the cohort is.",
  },
  {
    name: "Your molecule against the molecules that failed",
    what: "Every molecule that failed in the cohort, placed against yours: same target and modality, same target only, overlapping mechanism, or unrelated — and what the comparison cannot see.",
  },
  {
    name: "Every stopped trial, and what caused it",
    what: "Each stop with the sponsor's own reason, and whether it was the trial's own result or a decision taken elsewhere — with the evidence for that verdict.",
  },
  {
    name: "Ran to the end and missed",
    what: "Completed trials that missed their primary endpoint, each with the posted numbers or the sponsor's sentence it was read from and a link to the results. Shown where the cohort has any.",
  },
  {
    name: "Terminations with no readable cause, and trials still open",
    what: "Listed, not dropped: the upper edge of the rate if every unexplained stop were biological, and what is still to come.",
  },
  {
    name: "Limits",
    what: "What the analysis is not, in plain words, so nobody has to find out in a meeting.",
  },
];

export default function SamplePackagePage() {
  const s = SAMPLE_PACKAGE;
  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={`${SITE_URL}/packages/sample`} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
      </Head>

      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <Link href="/" className="brand">
              Clinical trial failures
            </Link>
            <PrimaryNav active="packages" />
          </div>
        </div>
      </header>

      <main className="page">
        <div className="wrap">
          <nav className="crumbs">
            <Link className="link" href="/packages">
              Packages
            </Link>
            <span aria-hidden="true"> · </span>
            <span className="muted">Sample</span>
          </nav>

          <section className="intro">
            <div className="eyebrow">What {PACKAGE_PRICE} buys</div>
            <h1>A complete evidence package, unlocked</h1>
            <p className="lead">
              This is one package exactly as a buyer receives it — the <b>{s.cohort}</b> cohort, with{" "}
              <b>{s.asset}</b> in the place where your own molecule goes. Nothing is removed or blurred. Every other
              package has the same sections for its own cohort.
            </p>
            <div className="actions">
              <a className="btn btn-primary" href={s.path} target="_blank" rel="noopener">
                Open the full sample ↗
              </a>
              <Link className="btn" href="/asset-check">
                Get one for your molecule — {PACKAGE_PRICE}
              </Link>
            </div>
          </section>

          <section className="section">
            <h2>What is in every package, in the order it appears</h2>
            <ol className="sections">
              {SECTIONS.map((sec) => (
                <li key={sec.name}>
                  <b>{sec.name}</b>
                  <span>{sec.what}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="section">
            <h2>The sample itself</h2>
            <p className="sub">
              Scroll inside the frame, or{" "}
              <a className="link" href={s.path} target="_blank" rel="noopener">
                open it on its own page
              </a>
              . It is rebuilt with every weekly release, like every package.
            </p>
            <div className="frame">
              <iframe src={s.path} title={`Sample evidence package: ${s.cohort}`} loading="lazy" />
            </div>
          </section>

          <section className="section">
            <div className="buy">
              <div>
                <h2>Yours, for your molecule</h2>
                <p className="sub">
                  Name a drug in the asset check. You see for free which cohorts contain molecules that share its target;
                  the package is every one of them, each opening with your molecule placed against the ones that failed.
                  One payment, delivered immediately, current for a year.
                </p>
              </div>
              <Link className="btn btn-primary" href="/asset-check">
                Check your molecule
              </Link>
            </div>
          </section>
        </div>
      </main>

      <style jsx>{`
        .wrap {
          max-width: 1000px;
          margin: 0 auto;
        }
        .crumbs {
          font-size: 13px;
          margin-bottom: 18px;
        }
        .eyebrow {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--accent);
        }
        h1 {
          margin: 8px 0 12px;
          font-size: clamp(28px, 4vw, 40px);
          line-height: 1.1;
        }
        .lead {
          max-width: 760px;
          font-size: 17px;
          line-height: 1.6;
          color: #334155;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }
        .section {
          margin-top: 40px;
        }
        h2 {
          font-size: 21px;
          margin: 0 0 12px;
        }
        .sub {
          color: #475569;
          font-size: 15px;
          line-height: 1.6;
          margin: 0 0 14px;
        }
        .sections {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin: 0;
          padding: 0;
          list-style: none;
          counter-reset: sec;
        }
        .sections li {
          counter-increment: sec;
          position: relative;
          padding: 16px 16px 16px 50px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: #fff;
        }
        .sections li::before {
          content: counter(sec);
          position: absolute;
          left: 16px;
          top: 15px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #eef2ff;
          color: var(--accent);
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sections b {
          display: block;
          font-size: 15px;
          margin-bottom: 4px;
        }
        .sections span {
          display: block;
          font-size: 13.5px;
          line-height: 1.55;
          color: #475569;
        }
        .frame {
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: #fbfaf7;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
        }
        .frame iframe {
          display: block;
          width: 100%;
          height: 820px;
          border: 0;
        }
        .buy {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 22px 24px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: #f8fafc;
        }
        @media (max-width: 720px) {
          .sections {
            grid-template-columns: 1fr;
          }
          .frame iframe {
            height: 640px;
          }
          .buy {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </>
  );
}
