// web/components/SampleCallout.tsx
//
// "See a complete report, free" was a link in a paragraph and nobody saw it. It is the single
// strongest argument the shop has — the product itself, unlocked — so it gets a block of its own
// that looks like nothing else on the page: dark, with the document's own section list in it.

import Link from "next/link";

import { PACKAGE_PRICE } from "@/components/BriefVsPackage";
import { SAMPLE_PACKAGE } from "@/lib/sample";

const SECTIONS = [
  "Your molecule against every molecule that failed",
  "Every stopped trial, and whether it was the trial's own result",
  "Completed trials that missed, with the posted result",
  "The cohort rules, the time-to-event curve, the limits",
];

export default function SampleCallout({ compact = false }: { compact?: boolean }) {
  const s = SAMPLE_PACKAGE;
  return (
    <aside className={compact ? "sc scCompact" : "sc"} aria-label="Free sample of a complete diligence report">
      <div className="scBody">
        <div className="scTags">
          <span className="scFree">Free</span>
          <span className="scNo">No sign-up required</span>
        </div>
        <div className="scTitle">View a complete {PACKAGE_PRICE} report</div>
        <p className="scText">
          Full sample for the {s.cohort} cohort, with {s.asset} as the example molecule.
        </p>
        <div className="scActions">
          <Link className="scButton" href="/packages/sample">
            Open the free sample →
          </Link>
        </div>
      </div>
      {compact ? null : (
        <div className="scDoc" aria-hidden="true">
          {/* Upper case written out: text-transform turns "TGF-β" into "TGF-Β", which reads as a B. */}
          <div className="scDocHead">DILIGENCE REPORT · {s.cohort}</div>
          {SECTIONS.map((line) => (
            <div className="scDocLine" key={line}>
              <span className="scTick">✓</span>
              {line}
            </div>
          ))}
        </div>
      )}
      <style jsx>{`
        .sc {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
          gap: 28px;
          align-items: center;
          margin: 28px 0;
          padding: 26px 28px;
          border-radius: 14px;
          background: #0f172a;
          color: #e2e8f0;
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.18);
        }
        .scCompact {
          grid-template-columns: 1fr;
          padding: 20px 22px;
          margin: 18px 0;
        }
        .scTags {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .scFree {
          padding: 3px 10px;
          border-radius: 999px;
          background: #fbbf24;
          color: #422006;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .scNo {
          font-size: 12px;
          color: #94a3b8;
        }
        .scTitle {
          margin-top: 12px;
          font-size: 23px;
          line-height: 1.2;
          font-weight: 850;
          color: #ffffff;
        }
        .scCompact .scTitle {
          font-size: 19px;
        }
        .scText {
          margin: 8px 0 0;
          font-size: 15px;
          line-height: 1.55;
          color: #cbd5e1;
        }
        .scActions {
          margin-top: 16px;
        }
        .sc :global(.scButton) {
          display: inline-block;
          padding: 11px 18px;
          border-radius: 8px;
          background: #fbbf24;
          color: #1c1917;
          font-size: 15px;
          font-weight: 800;
          text-decoration: none;
        }
        .sc :global(.scButton:hover) {
          background: #fcd34d;
        }
        .scDoc {
          padding: 16px 18px;
          border-radius: 10px;
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
        }
        .scDocHead {
          margin-bottom: 10px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: #4f46e5;
        }
        .scDocLine {
          display: flex;
          gap: 8px;
          padding: 7px 0;
          border-top: 1px solid #e2e8f0;
          font-size: 13px;
          line-height: 1.4;
        }
        .scTick {
          color: #16a34a;
          font-weight: 900;
        }
        @media (max-width: 760px) {
          .sc {
            grid-template-columns: 1fr;
            padding: 20px;
          }
        }
      `}</style>
    </aside>
  );
}
