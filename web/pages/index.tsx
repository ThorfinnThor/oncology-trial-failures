import { GetStaticProps } from "next";
import Head from "next/head";
import { useMemo, useState } from "react";
import { TRIALS, splitSemicolonValues } from "@/lib/data";
import { TrialRow } from "@/lib/types";
import { Filters } from "@/components/Filters";
import { TrialTable } from "@/components/TrialTable";
import { Pagination } from "@/components/Pagination";

type Props = {
  trials: TrialRow[];
  facets: {
    reasons: string[];
    confidences: string[];
    statuses: string[];
    phases: string[];
  };
  meta: {
    total: number;
    maxLastUpdate: string;
  };
};

export const getStaticProps: GetStaticProps<Props> = async () => {
  const trials = TRIALS;

  const reasons = Array.from(new Set(trials.map((t) => t.classification_reason).filter(Boolean))).sort();
  const confidences = Array.from(new Set(trials.map((t) => t.classification_confidence).filter(Boolean))).sort();
  const statuses = Array.from(new Set(trials.map((t) => t.overall_status).filter(Boolean))).sort();

  const phaseSet = new Set<string>();
  for (const t of trials) {
    for (const p of splitSemicolonValues(t.phases || "")) phaseSet.add(p);
  }
  const phases = Array.from(phaseSet).sort();

  const maxLastUpdate = trials.reduce((acc, t) => (t.last_update_post_date > acc ? t.last_update_post_date : acc), "");

  return {
    props: {
      trials,
      facets: { reasons, confidences, statuses, phases },
      meta: { total: trials.length, maxLastUpdate },
    },
  };
};

function includesAny(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export default function Home({ trials, facets, meta }: Props) {
  const [q, setQ] = useState("");
  const [reason, setReason] = useState("");
  const [confidence, setConfidence] = useState("");
  const [status, setStatus] = useState("");
  const [phase, setPhase] = useState("");
  const [sort, setSort] = useState("updated_desc");

  const [page, setPage] = useState(1);
  const pageSize = 50;

  const filtered = useMemo(() => {
    let rows = trials;

    const qq = q.trim();
    if (qq) {
      rows = rows.filter((r) => {
        const blob = [
          r.nct_id,
          r.brief_title,
          r.lead_sponsor,
          r.collaborators,
          r.conditions,
          r.intervention_names,
          r.why_stopped,
        ]
          .filter(Boolean)
          .join(" | ");
        return includesAny(blob, qq);
      });
    }

    if (reason) rows = rows.filter((r) => r.classification_reason === reason);
    if (confidence) rows = rows.filter((r) => r.classification_confidence === confidence);
    if (status) rows = rows.filter((r) => r.overall_status === status);

    if (phase) {
      rows = rows.filter((r) => splitSemicolonValues(r.phases || "").includes(phase));
    }

    rows = [...rows];
    switch (sort) {
      case "updated_asc":
        rows.sort((a, b) => (a.last_update_post_date || "").localeCompare(b.last_update_post_date || ""));
        break;
      case "title_asc":
        rows.sort((a, b) => (a.brief_title || "").localeCompare(b.brief_title || ""));
        break;
      case "title_desc":
        rows.sort((a, b) => (b.brief_title || "").localeCompare(a.brief_title || ""));
        break;
      case "sponsor_asc":
        rows.sort((a, b) => (a.lead_sponsor || "").localeCompare(b.lead_sponsor || ""));
        break;
      case "sponsor_desc":
        rows.sort((a, b) => (b.lead_sponsor || "").localeCompare(a.lead_sponsor || ""));
        break;
      case "updated_desc":
      default:
        rows.sort((a, b) => (b.last_update_post_date || "").localeCompare(a.last_update_post_date || ""));
        break;
    }

    return rows;
  }, [trials, q, reason, confidence, status, phase, sort]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage]);

  return (
    <>
      <Head>
        <title>Oncology Trial Stop Reasons</title>
        <meta
          name="description"
          content="A static, searchable dataset of stopped oncology drug/biologic trials classified by stated stop reason."
        />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <h1 className="text-2xl font-semibold text-gray-900">Oncology Trial Stop Reasons</h1>
            <p className="mt-1 text-sm text-gray-600">
              Static dataset of interventional oncology drug/biologic trials (SUSPENDED/TERMINATED) classified from{" "}
              <span className="font-medium">why stopped</span> text. Always verify via the linked registry page.
            </p>
            <div className="mt-2 text-xs text-gray-500">
              Total records: <span className="font-medium">{meta.total}</span> • Latest update in dataset:{" "}
              <span className="font-medium">{meta.maxLastUpdate || "—"}</span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
          <Filters
            q={q}
            setQ={(v) => { setQ(v); setPage(1); }}
            reason={reason}
            setReason={(v) => { setReason(v); setPage(1); }}
            confidence={confidence}
            setConfidence={(v) => { setConfidence(v); setPage(1); }}
            status={status}
            setStatus={(v) => { setStatus(v); setPage(1); }}
            phase={phase}
            setPhase={(v) => { setPhase(v); setPage(1); }}
            sort={sort}
            setSort={(v) => { setSort(v); setPage(1); }}
            reasons={facets.reasons}
            confidences={facets.confidences}
            statuses={facets.statuses}
            phases={facets.phases}
          />

          <Pagination page={safePage} pageSize={pageSize} total={total} onPageChange={setPage} />

          <TrialTable rows={pageRows} />

          <Pagination page={safePage} pageSize={pageSize} total={total} onPageChange={setPage} />

          <div className="rounded-xl border bg-white p-4 text-xs text-gray-600 shadow-sm">
            <div className="font-medium text-gray-900">Disclosure</div>
            <p className="mt-1">
              “Biological failure” here is an automated heuristic based on registry text fields. Some terminations are operational,
              strategic, or ambiguous. Use the ClinicalTrials.gov link to confirm details.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
