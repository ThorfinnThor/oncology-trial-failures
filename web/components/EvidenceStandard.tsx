import Link from "next/link";

type EvidenceStandardProps = {
  datasetVersion: string;
  latestRegistryUpdate?: string;
  source?: string;
};

export default function EvidenceStandard({
  datasetVersion,
  latestRegistryUpdate,
  source = "ClinicalTrials.gov",
}: EvidenceStandardProps) {
  return (
    <section className="evidenceStandard" aria-labelledby="evidence-standard-title">
      <div className="evidenceStandardHeading">
        <p className="facet-title">Evidence standard</p>
        <h2 id="evidence-standard-title">Source-linked, transparent, and reviewable</h2>
      </div>

      <div className="evidenceStandardGrid">
        <div>
          <strong>Primary registry source</strong>
          <p>
            Study facts and stop statements come from {source}. Important findings should be checked
            against the current registry record.
          </p>
        </div>
        <div>
          <strong>Conservative V2 classification</strong>
          <p>
            V2 maps stated source language into evidence categories and retains ambiguous records for
            review instead of forcing a causal label.
          </p>
        </div>
        <div>
          <strong>Defined analytical limits</strong>
          <p>
            These are stopped-record screening signals, not success rates, medical conclusions, or
            investment recommendations.
          </p>
        </div>
      </div>

      <div className="evidenceStandardMeta">
        <span>Dataset {datasetVersion || "current build"}</span>
        {latestRegistryUpdate ? <span>Latest registry update {latestRegistryUpdate}</span> : null}
        <Link href="/methods">Methods</Link>
        <Link href="/about">About the data</Link>
        <Link href="/disclaimer">Limitations and disclaimer</Link>
      </div>

      <style jsx>{`
        .evidenceStandard {
          margin: 28px 0;
          padding: 24px 2px;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .evidenceStandardHeading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 24px;
        }
        .evidenceStandardHeading h2 {
          max-width: 680px;
          margin: 5px 0 0;
          font-size: 24px;
          line-height: 1.2;
        }
        .evidenceStandardGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0;
          margin-top: 20px;
        }
        .evidenceStandardGrid > div {
          min-width: 0;
          padding: 0 22px;
          border-left: 1px solid var(--border);
        }
        .evidenceStandardGrid > div:first-child {
          padding-left: 0;
          border-left: 0;
        }
        .evidenceStandardGrid > div:last-child {
          padding-right: 0;
        }
        .evidenceStandardGrid strong {
          display: block;
          font-size: 14px;
        }
        .evidenceStandardGrid p {
          margin: 7px 0 0;
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.55;
        }
        .evidenceStandardMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 18px;
          margin-top: 20px;
          padding-top: 14px;
          border-top: 1px solid var(--border);
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 700;
        }
        .evidenceStandardMeta :global(a) {
          color: var(--accent);
        }
        .evidenceStandardMeta :global(a:hover) {
          text-decoration: underline;
        }
        @media (max-width: 720px) {
          .evidenceStandardHeading {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
          }
          .evidenceStandardGrid {
            grid-template-columns: 1fr;
          }
          .evidenceStandardGrid > div,
          .evidenceStandardGrid > div:first-child,
          .evidenceStandardGrid > div:last-child {
            padding: 14px 0;
            border-top: 1px solid var(--border);
            border-left: 0;
          }
          .evidenceStandardGrid > div:first-child {
            border-top: 0;
          }
        }
      `}</style>
    </section>
  );
}
