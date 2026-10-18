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
    <section className="evidenceStandard" aria-label="Source and limits">
      <p className="evidenceStandardNote">
        Study facts and stop statements come from {source}; check important findings against the current
        registry record. Classifications read the stated stop reason and are screening signals, not medical
        conclusions.
      </p>

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
        .evidenceStandardNote {
          max-width: 760px;
          margin: 0;
          color: var(--muted, inherit);
          line-height: 1.5;
        }
        .evidenceStandardHeading {
          max-width: 760px;
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
