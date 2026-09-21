// web/components/BriefVsPackage.tsx
//
// One component, because the two products were being described in different words on every
// page they appeared on, and a reader who has to work out from context whether "the cohort"
// means this mechanism or the whole disease area has already stopped reading.
//
// Three things have to be on the page before either product makes sense: what the cohort is
// (in a sentence, with its rules named), how many trials are in it, and which of those two
// documents covers which part of it. Everything else is detail.

import Link from "next/link";

export type PackageSummary = {
  slug: string;
  cohort: string;
  area: string;
  counts: {
    stopped: number;
    unreadable_terminations: number;
    still_open: number;
    total_in_cohort: number;
    closed: number;
    listed_unreadable: number;
    listed_open: number;
    brief_lists_stops: number;
  };
  window: { phases: string[]; start_from: number; start_to: number };
  headline: { rate: number; comparator_rate: number; comparator_label: string };
};

export const PACKAGE_PRICE = "€100";
export const CUSTOM_COHORT_MAILTO =
  "mailto:contact@clinicaltrialfailures.com?subject=" + encodeURIComponent("Evidence package for a custom cohort");

/** Trials in the cohort that the brief does not cover: closed without a biological stop, or still running.
 *
 * This is the whole of what a package adds in trials, and in a couple of very small cohorts it is zero —
 * every trial in the class stopped, so the free brief already lists all of them. Selling a package there
 * would be selling the same four trials twice, so the number decides whether one is offered at all.
 */
export function trialsBeyondTheBrief(pkg: PackageSummary) {
  return pkg.counts.closed - pkg.counts.stopped + pkg.counts.still_open;
}

const n = (v: number) => v.toLocaleString("en-US");
const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;

/** The cohort in one sentence, with every rule that decides membership named in it. */
export function cohortSentence(pkg: PackageSummary) {
  const phases = pkg.window.phases.length === 1
    ? `phase ${pkg.window.phases[0]}`
    : `phase ${pkg.window.phases.slice(0, -1).join(", ")} and ${pkg.window.phases.slice(-1)}`;
  return `Every ${pkg.area.toLowerCase()} trial in ${phases} that started between ${pkg.window.start_from} and `
    + `${pkg.window.start_to} whose drug acts on ${pkg.cohort}.`;
}

export default function BriefVsPackage({
  pkg,
  briefSlug,
  emphasis = "package",
}: {
  pkg: PackageSummary;
  briefSlug: string | null;
  /** Which of the two the reader is already looking at; the other one gets the button. */
  emphasis?: "brief" | "package";
}) {
  const c = pkg.counts;
  const adds = trialsBeyondTheBrief(pkg);

  return (
    <section className="bvp">
      <div className="bvpHead">
        <h2>Two documents, one cohort</h2>
        <p className="bvpCohort">
          <b>{pkg.cohort}</b> — {cohortSentence(pkg)} <b>{n(c.total_in_cohort)} trials</b>, of which {n(c.closed)} have
          closed, {n(c.still_open)} are still running, and {c.stopped} of the closed ones were stopped early for an
          efficacy, safety or benefit–risk reason — {pct(pkg.headline.rate)} against {pct(pkg.headline.comparator_rate)}{" "}
          for {pkg.headline.comparator_label}.
        </p>
      </div>

      <div className="bvpGrid">
        <div className={`bvpCard${emphasis === "brief" ? " bvpHere" : ""}`}>
          <div className="bvpTag">
            <span className="bvpNameWrap">
              The brief
              {emphasis === "brief" ? <span className="bvpHereTag">This page</span> : null}
            </span>
            <span className="bvpPrice bvpFree">Free</span>
          </div>
          <div className="bvpOne">
            The finding, and the {Math.min(c.brief_lists_stops, c.stopped)} most recent of the {c.stopped} stopped
            trials.
          </div>
          <ul>
            <li>The rate, the comparison, and whether it survives a correction for having screened every class</li>
            <li>
              How many distinct molecules are behind the stops, how concentrated they are in one sponsor, and what the
              rate becomes without the largest programme
            </li>
            <li>The worst case if every unreadable termination were biological</li>
            <li>Two pages. PDF or web page, no form</li>
          </ul>

          {emphasis !== "brief" && briefSlug ? (
            <div className="bvpFoot">
              <Link className="bvpGhost" href={`/briefs/${briefSlug}`}>
                Read the brief first
              </Link>
            </div>
          ) : null}
        </div>

        <div className={`bvpCard${emphasis === "package" && adds > 0 ? " bvpHere" : ""}`}>
          <div className="bvpTag">
            <span className="bvpNameWrap">
              The evidence package
              {emphasis === "package" && adds > 0 ? <span className="bvpHereTag">This page</span> : null}
            </span>
            <span className={`bvpPrice${adds > 0 ? "" : " bvpFree"}`}>{adds > 0 ? PACKAGE_PRICE : "Not sold here"}</span>
          </div>

          {adds > 0 ? (
            <>
              <div className="bvpOne">
                The same cohort, itemised: every trial named instead of counted.
              </div>
              <ul>
                <li>
                  All {c.stopped} stopped trials, not the {Math.min(c.brief_lists_stops, c.stopped)} the brief has room
                  for — and each one attributed to its own result or to a decision taken elsewhere, with the words that
                  produced the verdict
                </li>
                <li>
                  The {c.unreadable_terminations} terminations with no readable cause{" "}
                  {c.unreadable_terminations > c.listed_unreadable ? `(${c.listed_unreadable} most recent) ` : ""}
                  with their registry records — the brief gives only the count and the worst case
                </li>
                <li>
                  {c.still_open > 0
                    ? `${n(Math.min(c.listed_open, c.still_open))} of the ${n(c.still_open)} trials still running, named, so you can see what is about to move the rate`
                    : "Every trial in the cohort accounted for"}
                </li>
                <li>
                  The probability of a stop at 12, 24, 36, 48 and 60 months with intervals and the comparator&rsquo;s own
                  curve beside it — the brief gives a single point
                </li>
                <li>
                  Every rule that defines the cohort, with the reason for each, and the limits in full rather than in a
                  box
                </li>
              </ul>
            </>
          ) : (
            <>
              <div className="bvpOne">
                Not sold for this cohort: every trial in it is already in the brief.
              </div>
              <ul>
                <li>
                  All {n(c.total_in_cohort)} trials have closed and all {c.stopped} of them stopped early, so there is no
                  remainder for a package to add — the free brief is the whole cohort
                </li>
                <li>
                  Which means the {pct(pkg.headline.rate)} rests on {c.stopped} trials and should be read as a lead, not
                  as a finding
                </li>
                <li>
                  A package is worth buying where most of the cohort is <i>not</i> in the brief — or built around your
                  own asset, sponsor or indication
                </li>
              </ul>
            </>
          )}

          {adds === 0 ? (
            <div className="bvpFoot">
              <Link className="bvpGhost" href="/packages">
                Cohorts where a package adds something
              </Link>
            </div>
          ) : emphasis !== "package" ? (
            <div className="bvpFoot">
              <Link className="bvpCta" href={`/packages/${pkg.slug}`}>
                See the package
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <p className="bvpWhy">
        {adds > 0 ? (
          <>
            The brief is the finding and is meant to be read in five minutes. The package is the file underneath it: the
            same {pct(pkg.headline.rate)}, with every trial named, so the number can be checked rather than believed —
            which is what anyone has to do before it goes into a diligence memo.
          </>
        ) : (
          <>
            A cohort this small cannot carry a rate on its own, and we would rather say so than sell the same{" "}
            {c.stopped} trials twice.{" "}
            <a className="bvpLink" href={CUSTOM_COHORT_MAILTO}>
              Tell us what you are evaluating
            </a>{" "}
            and we will say whether the data can answer it before anything is built.
          </>
        )}
      </p>

      <style jsx>{`
        .bvp {
          margin-top: 34px;
        }
        .bvpHead h2 {
          margin: 0;
          font-size: 21px;
          font-weight: 900;
          letter-spacing: -0.015em;
        }
        .bvpCohort {
          margin: 8px 0 0;
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 92ch;
        }
        .bvpCohort b {
          color: var(--text);
          font-weight: 800;
        }
        .bvpGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
          align-items: stretch;
        }
        .bvpCard {
          display: flex;
          flex-direction: column;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 18px 20px;
        }
        .bvpHere {
          background: rgba(79, 70, 229, 0.04);
          border-color: rgba(79, 70, 229, 0.28);
        }
        .bvpTag {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 15px;
          font-weight: 850;
        }
        .bvpPrice {
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.02em;
          padding: 3px 9px;
          border-radius: 999px;
          background: var(--accent);
          color: #fff;
          white-space: nowrap;
        }
        .bvpFree {
          background: rgba(15, 23, 42, 0.08);
          color: var(--text-muted);
        }
        .bvpOne {
          margin-top: 8px;
          font-size: 13.5px;
          line-height: 1.55;
          font-weight: 700;
        }
        .bvpCard ul {
          margin: 12px 0 0;
          padding-left: 18px;
          display: grid;
          gap: 6px;
        }
        .bvpCard li {
          font-size: 13px;
          line-height: 1.55;
          color: var(--text-muted);
        }
        .bvpFoot {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid var(--border);
        }
        .bvpNameWrap {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .bvpHereTag {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 7px;
          border-radius: 6px;
          background: rgba(79, 70, 229, 0.12);
          color: var(--accent);
          white-space: nowrap;
        }
        :global(.bvpCta),
        :global(.bvpGhost) {
          display: inline-block;
          border-radius: 12px;
          padding: 10px 16px;
          font-size: 13.5px;
          font-weight: 800;
          text-decoration: none;
        }
        :global(.bvpCta) {
          background: var(--accent);
          color: #fff;
        }
        :global(.bvpGhost) {
          background: #fff;
          color: inherit;
          border: 1px solid var(--border);
        }
        :global(.bvpLink) {
          color: var(--accent);
          font-weight: 700;
        }
        .bvpWhy {
          margin: 16px 0 0;
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 96ch;
        }
        @media (max-width: 860px) {
          .bvpGrid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </section>
  );
}
