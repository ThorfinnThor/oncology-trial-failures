// web/components/SalesFunnel.tsx
//
// The four steps from a free brief to a paid report, shown on the page where the reader is at
// step one. Everything before the last step is free, and saying so is most of the point: the
// reader can see where they are, what the next free step is, and what the paid one adds.

import Link from "next/link";

import { PACKAGE_PRICE } from "@/components/BriefVsPackage";

type Step = { key: string; label: string; detail: string; href: string; price: string };

const STEPS: Step[] = [
  { key: "brief", label: "Read the brief", detail: "The finding and the trials behind it", href: "/briefs", price: "Free" },
  { key: "sample", label: "View a sample report", detail: "One complete report, all sections", href: "/packages/sample", price: "Free" },
  { key: "check", label: "Check your molecule", detail: "Which failed molecules share its target", href: "/asset-check", price: "Free" },
  { key: "buy", label: "Get your report", detail: "Every matching cohort, your molecule placed in each", href: "/asset-check", price: PACKAGE_PRICE },
];

export default function SalesFunnel({ current = "brief", title }: { current?: string; title?: string }) {
  const at = STEPS.findIndex((s) => s.key === current);
  return (
    <nav className="sf" aria-label="From a free brief to a report">
      {title ? <div className="sfTitle">{title}</div> : null}
      <ol>
        {STEPS.map((s, i) => (
          <li key={s.key} className={i < at ? "done" : i === at ? "here" : i === at + 1 ? "next" : ""}>
            <Link className="sfStep" href={s.href}>
              <span className="sfNum">{i < at ? "✓" : i + 1}</span>
              <span className="sfText">
                <b>{s.label}</b>
                <span>{s.detail}</span>
              </span>
              <span className={s.price === "Free" ? "sfPrice sfFree" : "sfPrice"}>
                {i === at ? "You are here" : s.price}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <style jsx>{`
        .sf {
          margin: 24px 0;
        }
        .sfTitle {
          margin-bottom: 10px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #64748b;
        }
        ol {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        li {
          min-width: 0;
        }
        li :global(.sfStep) {
          display: grid;
          grid-template-columns: auto 1fr;
          grid-template-rows: auto auto;
          gap: 4px 10px;
          height: 100%;
          padding: 14px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #ffffff;
          color: #0f172a;
          text-decoration: none;
        }
        li :global(.sfStep:hover) {
          border-color: #a5b4fc;
        }
        li.here :global(.sfStep) {
          border-color: #4f46e5;
          box-shadow: 0 0 0 1px #4f46e5 inset;
        }
        li.next :global(.sfStep) {
          background: #fffbeb;
          border-color: #fbbf24;
        }
        li.done :global(.sfStep) {
          opacity: 0.75;
        }
        .sfNum {
          grid-row: 1 / span 2;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 13px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sfText b {
          display: block;
          font-size: 14px;
        }
        .sfText span {
          display: block;
          margin-top: 2px;
          font-size: 12.5px;
          line-height: 1.4;
          color: #475569;
        }
        .sfPrice {
          grid-column: 2;
          justify-self: start;
          padding: 2px 8px;
          border-radius: 999px;
          background: #eef2ff;
          color: #4338ca;
          font-size: 11px;
          font-weight: 800;
        }
        .sfFree {
          background: #dcfce7;
          color: #166534;
        }
        li.here .sfPrice {
          background: #4f46e5;
          color: #ffffff;
        }
        @media (max-width: 860px) {
          ol {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 520px) {
          ol {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </nav>
  );
}
