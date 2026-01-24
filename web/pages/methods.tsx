import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadMeta } from "@/lib/data";
import { DatasetMeta } from "@/lib/types";

export default function Methods() {
  const [meta, setMeta] = useState<DatasetMeta | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const m = await loadMeta();
        setMeta(m);
      } catch {
        // ignore
      }
    })();
  }, []);

  return (
    <>
      <Head>
        <title>Methods • Clinical trial failures</title>
        <meta name="description" content="Data sources, definitions, and labeling methods for Clinical trial failures." />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-4xl px-4 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">Methods</h1>
              <Link className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50" href="/">
                Back to Explore
              </Link>
            </div>

            <div className="mt-2 text-sm text-gray-600">
              This page explains where the data comes from, how “stopped” trials are defined, and how labels are inferred.
            </div>

            <div className="mt-3 text-xs text-gray-500">
              {meta ? (
                <>
                  Dataset version: <span className="font-medium">{meta.version}</span> • Generated:{" "}
                  <span className="font-medium">{meta.generated_at_utc}</span> • Source:{" "}
                  <span className="font-medium">{meta.source}</span>
                </>
              ) : (
                <>Loading dataset info…</>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-8 space-y-10">
          <section id="data-sources" className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">1) Data sources</h2>
            <p className="mt-2 text-sm text-gray-700">
              Primary source: ClinicalTrials.gov registry records. Each record contains the trial status and (when provided) a free-text field
              describing why the trial was stopped.
            </p>
          </section>

          <section id="update-frequency" className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">2) Update frequency</h2>
            <p className="mt-2 text-sm text-gray-700">
              The dataset is refreshed on a scheduled cadence via an automated pipeline. The dataset version shown in the app reflects the most recent refresh.
            </p>
          </section>

          <section id="definitions" className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">3) Definitions</h2>
            <p className="mt-2 text-sm text-gray-700">
              “Stopped” includes trials whose overall status is <strong>Suspended</strong> or <strong>Terminated</strong> (and “Withdrawn” if present in the registry response).
            </p>
          </section>

          <section id="reason-buckets" className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">4) Termination reason buckets</h2>
            <p className="mt-2 text-sm text-gray-700">
              We group recorded stop reasons into buckets to support analysis. These are inferred from registry text and should be interpreted cautiously.
            </p>
            <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-1">
              <li><strong>Efficacy</strong>: recorded text suggests lack of benefit, futility, endpoints not met.</li>
              <li><strong>Safety</strong>: recorded text suggests adverse events, toxicity, risk/benefit concerns.</li>
              <li><strong>Enrollment</strong>: recruitment or accrual issues.</li>
              <li><strong>Funding</strong>: budget or financing issues.</li>
              <li><strong>Strategic</strong>: sponsor prioritization, portfolio decisions, competitive landscape.</li>
              <li><strong>Regulatory</strong>: regulatory/ethics/authority constraints.</li>
              <li><strong>Operational</strong>: other operational/administrative/logistical reasons.</li>
              <li><strong>Other/Unknown</strong>: insufficient or ambiguous text.</li>
            </ul>
          </section>

          <section id="bio-failures" className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">5) Likely biological failures</h2>
            <p className="mt-2 text-sm text-gray-700">
              “Likely biological failures” is a filter that emphasizes trials whose recorded text more strongly supports an efficacy- or safety-related stop.
              This is computed using rule-based scoring of text signals and negations.
            </p>
            <div className="mt-3 text-sm text-gray-700">
              Examples:
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>“Terminated due to lack of efficacy.” → Efficacy</li>
                <li>“Stopped due to unacceptable toxicity.” → Safety</li>
                <li>“Stopped due to enrollment challenges.” → Enrollment (not biological)</li>
              </ul>
            </div>
          </section>

          <section id="limitations" className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">6) Limitations</h2>
            <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-1">
              <li>Registry fields are sometimes missing or vague; some trials do not report a reason.</li>
              <li>Text may describe operational decisions; “terminated” does not automatically imply biological failure.</li>
              <li>Classification is inferred from limited text and may be wrong for individual records.</li>
            </ul>
          </section>

          <section id="report-issues" className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">7) Contact / report issues</h2>
            <p className="mt-2 text-sm text-gray-700">
              If you find incorrect labeling or missing data, report it via your project’s GitHub issues page.
              Include the NCT ID and a short explanation.
            </p>
          </section>

          <div className="text-xs text-gray-500">
            Return to <Link className="text-blue-700 hover:underline" href="/">Explore</Link>.
          </div>
        </main>
      </div>
    </>
  );
}
