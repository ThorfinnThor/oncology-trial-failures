import { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { TRIALS } from "@/lib/data";
import { TrialRow } from "@/lib/types";

type Props = {
  trial: TrialRow;
};

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = TRIALS.map((t) => ({ params: { nct_id: t.nct_id } }));
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<Props> = async (ctx) => {
  const nct_id = String(ctx.params?.nct_id || "");
  const trial = TRIALS.find((t) => t.nct_id === nct_id);
  if (!trial) return { notFound: true };
  return { props: { trial } };
};

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{value || "—"}</div>
    </div>
  );
}

export default function TrialPage({ trial }: Props) {
  return (
    <>
      <Head>
        <title>{trial.nct_id} • Oncology Trial Stop Reasons</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-4xl px-4 py-6">
            <div className="text-sm">
              <Link className="text-blue-700 hover:underline" href="/">
                ← Back to list
              </Link>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">{trial.nct_id}</h1>
            <p className="mt-1 text-gray-700">{trial.brief_title}</p>
            <div className="mt-3 text-sm text-gray-600">
              <a className="text-blue-700 hover:underline" href={trial.url} target="_blank" rel="noreferrer">
                Open on ClinicalTrials.gov
              </a>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Status" value={trial.overall_status} />
              <Field label="Reason" value={trial.classification_reason} />
              <Field label="Confidence" value={trial.classification_confidence} />
            </div>
            <div className="mt-4">
              <Field label="Why stopped (raw)" value={trial.why_stopped} />
            </div>
            <div className="mt-4">
              <Field label="Classifier evidence" value={trial.classification_evidence} />
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Lead sponsor" value={trial.lead_sponsor} />
              <Field label="Collaborators" value={trial.collaborators} />
              <Field label="Conditions" value={trial.conditions} />
              <Field label="Interventions" value={trial.intervention_names} />
              <Field label="Intervention types" value={trial.intervention_types} />
              <Field label="Phase(s)" value={trial.phases} />
              <Field label="Study type" value={trial.study_type} />
              <Field label="Last update" value={trial.last_update_post_date} />
              <Field label="Start date" value={trial.start_date} />
              <Field label="Primary completion" value={trial.primary_completion_date} />
              <Field label="Completion" value={trial.completion_date} />
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4 text-xs text-gray-600 shadow-sm">
            <div className="font-medium text-gray-900">Important</div>
            <p className="mt-1">
              This site is statically generated from your repo’s dataset at deploy time. The registry may change after that.
              Always verify on ClinicalTrials.gov.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
