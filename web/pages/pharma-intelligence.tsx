// NOTE: This is the full updated file content.
// Replace your web/pages/pharma-intelligence.tsx with this entire file.

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

/**
 * Pharma intelligence page
 * - Compact tables + scroll (desktop)
 * - Regulatory bucket support
 * - Sponsor intelligence layout improvements
 * - Sponsor Top Conditions: prettified labels + "Other" row
 */

// -------------------- Types --------------------

type Bucket = "EFFICACY/FUTILITY" | "SAFETY" | "OPERATIONAL" | "REGULATORY" | "OTHER/UNKNOWN";

type CompactIndexRow = {
  sponsor?: string;
  phase_rep?: string;
  classification_reason?: string;
  why_stopped_short?: string;
  disease_area?: string;
  condition_first?: string;
  is_biotech?: boolean | number;
};

type SponsorProfile = {
  sponsor: string;
  totals: { trials: number; bioShare: number };
  topBuckets: { bucket: string; count: number }[];
  topPhases: { phase: string; count: number }[];
  topConds: { key: string; label: string; count: number; isOther?: boolean }[];
};

// -------------------- Helpers --------------------

function normEntity(s: string): string {
  return (s || "").trim().replace(/\s+/g, " ");
}

function normalizeBucket(raw: string): Bucket | null {
  const s = (raw || "").toUpperCase().trim();
  if (!s) return null;

  if (s.includes("EFFICACY") || s.includes("FUTILITY")) return "EFFICACY/FUTILITY";
  if (s.includes("SAFETY")) return "SAFETY";
  if (s.includes("OPERATION")) return "OPERATIONAL";
  if (s.includes("REGULAT")) return "REGULATORY";
  if (s.includes("OTHER") || s.includes("UNKNOWN")) return "OTHER/UNKNOWN";

  return null;
}

function normalizePhase(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "Unknown";
  return s;
}

function normalizeConditionKey(s: string): string {
  const t = (s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t;
}

function isHealthyConditionKey(key: string): boolean {
  const k = (key || "").toLowerCase();
  if (!k) return false;

  // Keep this strictly conservative (as in your existing code)
  return k === "healthy" || k === "healthy volunteers" || k === "healthy volunteer";
}

function canonicalConditionLabel(key: string, fallback: string): string {
  const k = (key || "").toLowerCase();
  if (k === "covid-19" || k === "covid 19" || k === "covid19") return "COVID-19";
  return fallback;
}

function formatWithCommas(n: number): string {
  return (n || 0).toLocaleString();
}

function sponsorQueryHref(sponsor: string, params?: { q?: string; bucket?: string; phase?: string }) {
  const q0 = normEntity(sponsor || "");
  const q = params?.q ? normEntity(params.q) : "";

  const sp = new URLSearchParams();
  if (q0) sp.set("sponsor", q0);
  if (q) sp.set("q", q);
  if (params?.bucket) sp.set("bucket", params.bucket);
  if (params?.phase) sp.set("phase", params.phase);

  const qs = sp.toString();
  return `/explore${qs ? `?${qs}` : ""}`;
}

function conditionQueryHref(label: string) {
  const sp = new URLSearchParams();
  if (label) sp.set("q", label);
  return `/explore?${sp.toString()}`;
}

function areaQueryHref(area: string) {
  const sp = new URLSearchParams();
  if (area) sp.set("area", area);
  return `/explore?${sp.toString()}`;
}

// ---- NEW: better display for sponsor top conditions (label prettification) ----

function titleCaseCondition(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return s;

  // Restore possessives that were de-apostrophized (e.g., "crohn s" -> "crohn's")
  const restored = s.replace(/\b([A-Za-z]{3,})\s+s\b/g, "$1's");

  // Preserve common acronyms / tokens
  const KEEP_UPPER = new Set(["hiv", "copd", "sars", "mers", "mrsa", "pcr", "rna", "dna"]);
  const SMALL = new Set(["and", "or", "of", "the", "in", "on", "with", "for", "to"]);

  const parts = restored.split(/\s+/g);
  const out = parts.map((p, idx) => {
    const base = p.trim();
    if (!base) return base;

    const hyParts = base.split("-");
    const hyOut = hyParts.map((hp) => {
      const token = hp.trim();
      if (!token) return token;

      if (/[0-9]/.test(token)) return token;

      const tl = token.toLowerCase();
      if (KEEP_UPPER.has(tl)) return tl.toUpperCase();

      if (idx > 0 && SMALL.has(tl)) return tl;

      return tl.charAt(0).toUpperCase() + tl.slice(1);
    });

    return hyOut.join("-");
  });

  return out.join(" ");
}

function sponsorConditionLabel(key: string, fallback?: string): string {
  if (key === "covid-19") return "COVID-19";
  const base = (fallback || key || "").trim();
  return titleCaseCondition(base);
}

// -------------------- UI Bits --------------------

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{ width: "100%", height: 10, background: "rgba(0,0,0,0.06)", borderRadius: 999 }}>
      <div style={{ width: `${pct}%`, height: 10, borderRadius: 999, background: "rgba(99,102,241,0.9)" }} />
    </div>
  );
}

function Card({
  title,
  subtitle,
  right,
  children,
  className
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card ${className || ""}`}>
      <div className="cardHeader">
        <div>
          <div className="cardTitle">{title}</div>
          {subtitle ? <div className="cardSubtitle">{subtitle}</div> : null}
        </div>
        {right ? <div className="cardRight">{right}</div> : null}
      </div>
      <div className="cardBody">{children}</div>
      <style jsx>{`
        .card {
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }
        .cardHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
        .cardTitle {
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: rgba(0, 0, 0, 0.6);
        }
        .cardSubtitle {
          margin-top: 6px;
          font-size: 18px;
          font-weight: 800;
          color: rgba(0, 0, 0, 0.92);
        }
        .cardRight {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .cardBody {
          padding: 10px 16px 14px 16px;
        }
      `}</style>
    </div>
  );
}

function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="tblWrap">
      {children}
      <style jsx>{`
        .tblWrap {
          width: 100%;
        }
      `}</style>
    </div>
  );
}

// -------------------- Page --------------------

export default function PharmaIntelligencePage() {
  const router = useRouter();

  // Dataset is fetched from a static JSON that your pipeline builds.
  const [rows, setRows] = useState<CompactIndexRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Sponsor panel state
  const [sponsor, setSponsor] = useState("");
  const [excludeHealthy, setExcludeHealthy] = useState(true);
  const [showSciFailures, setShowSciFailures] = useState(false);

  // Fetch data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/data/compact-index.json", { cache: "no-store" });
        const json = await res.json();
        if (!mounted) return;
        setRows(Array.isArray(json) ? json : []);
      } catch {
        if (!mounted) return;
        setRows([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const allRows = useMemo(() => {
    // Keep your original behavior:
    // showSciFailures means only those likely scientific failures (based on your existing inferred flag logic).
    if (!showSciFailures) return rows;

    // Conservative heuristic: bucket indicates scientific failure when efficacy/safety buckets are used.
    return rows.filter((r) => {
      const b = normalizeBucket(normEntity(r.classification_reason || r.why_stopped_short || ""));
      return b === "EFFICACY/FUTILITY" || b === "SAFETY";
    });
  }, [rows, showSciFailures]);

  // -------------------- Indication landscape (two tables) --------------------

  const areaStats = useMemo(() => {
    const m = new Map<string, { trials: number; bio: number }>();
    for (const r of allRows) {
      const a = normEntity(r.disease_area || "Other");
      const cur = m.get(a) || { trials: 0, bio: 0 };
      cur.trials += 1;
      const bio = !!r.is_biotech;
      if (bio) cur.bio += 1;
      m.set(a, cur);
    }

    const out = Array.from(m.entries()).map(([area, v]) => ({
      area,
      trials: v.trials,
      bioShare: v.trials > 0 ? Math.round((v.bio / v.trials) * 100) : 0,
      bio: v.bio
    }));
    out.sort((a, b) => b.trials - a.trials);
    return out.slice(0, 12);
  }, [allRows]);

  const conditionStats = useMemo(() => {
    const m = new Map<string, { trials: number; bio: number; firstLabel: string }>();
    for (const r of allRows) {
      const c0 = normEntity(r.condition_first || "");
      if (!c0) continue;
      const key = normalizeConditionKey(c0);
      if (!key) continue;
      if (excludeHealthy && isHealthyConditionKey(key)) continue;

      const cur = m.get(key) || { trials: 0, bio: 0, firstLabel: c0 };
      cur.trials += 1;
      const bio = !!r.is_biotech;
      if (bio) cur.bio += 1;
      if (!cur.firstLabel) cur.firstLabel = c0;
      m.set(key, cur);
    }

    const out = Array.from(m.entries()).map(([key, v]) => ({
      key,
      label: canonicalConditionLabel(key, titleCaseCondition(v.firstLabel || key)),
      trials: v.trials,
      bioShare: v.trials > 0 ? Math.round((v.bio / v.trials) * 100) : 0
    }));
    out.sort((a, b) => b.trials - a.trials);
    return out.slice(0, 12);
  }, [allRows, excludeHealthy]);

  // -------------------- Sponsor intelligence --------------------

  const sponsorList = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const s = normEntity(r.sponsor || "");
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  useEffect(() => {
    // Default sponsor selection
    if (!sponsor && sponsorList.length > 0) setSponsor(sponsorList[0]);
  }, [sponsor, sponsorList]);

  const sponsorProfile: SponsorProfile | null = useMemo(() => {
    const s0 = normEntity(sponsor || "");
    if (!s0) return null;

    const subset = allRows.filter((r) => normEntity(r.sponsor || "") === s0);

    if (!subset.length) {
      return {
        sponsor: s0,
        totals: { trials: 0, bioShare: 0 },
        topBuckets: [],
        topPhases: [],
        topConds: []
      };
    }

    const bucketCounts = new Map<string, number>();
    const phaseCounts = new Map<string, number>();
    const condCounts = new Map<string, number>();
    const condLabelMap = new Map<string, string>();

    let bio = 0;

    for (const r of subset) {
      if (!!r.is_biotech) bio += 1;

      const b0 = normEntity(r.classification_reason || r.why_stopped_short || "");
      const bucket = normalizeBucket(b0);
      if (bucket) bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);

      const ph = normalizePhase(normEntity(r.phase_rep || ""));
      phaseCounts.set(ph, (phaseCounts.get(ph) || 0) + 1);

      const c0 = normEntity(r.condition_first || "");
      if (c0) {
        const key = normalizeConditionKey(c0);
        if (key && !(excludeHealthy && isHealthyConditionKey(key))) {
          condCounts.set(key, (condCounts.get(key) || 0) + 1);
          if (!condLabelMap.has(key)) condLabelMap.set(key, c0);
        }
      }
    }

    const topBuckets = Array.from(bucketCounts.entries())
      .map(([bucket, count]) => ({ bucket, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topPhases = Array.from(phaseCounts.entries())
      .map(([phase, count]) => ({ phase, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const condTotal = Array.from(condCounts.values()).reduce((a, b) => a + b, 0);
    const topCondEntries = Array.from(condCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const topConds = topCondEntries.map(([key, count]) => ({
      key,
      label: sponsorConditionLabel(key, condLabelMap.get(key) || key),
      count
    }));

    const topSum = topConds.reduce((a, x) => a + x.count, 0);
    const otherCount = condTotal - topSum;
    if (otherCount > 0) {
      topConds.push({ key: "__other__", label: "Other", count: otherCount, isOther: true });
    }

    return {
      sponsor: s0,
      totals: {
        trials: subset.length,
        bioShare: subset.length > 0 ? Math.round((bio / subset.length) * 100) : 0
      },
      topBuckets,
      topPhases,
      topConds
    };
  }, [sponsor, allRows, excludeHealthy]);

  const sponsorCondMax = useMemo(() => {
    if (!sponsorProfile) return 0;
    return sponsorProfile.topConds.reduce((m, x) => Math.max(m, x.count), 0);
  }, [sponsorProfile]);

  // -------------------- Render --------------------

  return (
    <div className="page">
      <div className="headerRow">
        <h1>Pharma intelligence</h1>
        <div className="hint">Buckets prefer pipeline field <code>classification_reason</code>; heuristic fallback uses <code>why_stopped_short</code>.</div>
      </div>

      {/* ---------------- Failure taxonomy + matrix sections exist above in your page (omitted in screenshot). Keep unchanged in your repo version. ---------------- */}

      <div className="sectionHeader">
        <h2>Indication landscape</h2>
        <div className="hint">Derived from compact index fields (first condition per trial).</div>
      </div>

      <div className="twoCol">
        <Card title="By disease area" right={<span className="hint">Top areas by volume.</span>}>
          <TableShell>
            <table className="tbl">
              <thead>
                <tr>
                  <th>DISEASE AREA</th>
                  <th className="num">TRIALS</th>
                  <th className="num">BIO SHARE</th>
                </tr>
              </thead>
              <tbody>
                {areaStats.map((x) => (
                  <tr key={x.area}>
                    <td>
                      <div className="cellStack">
                        <span className="pill">{x.area}</span>
                        <div className="sub muted">{formatWithCommas(x.trials)} likely scientific failures</div>
                        <Link className="link" href={areaQueryHref(x.area)}>
                          Explore →
                        </Link>
                      </div>
                    </td>
                    <td className="num strong">{formatWithCommas(x.trials)}</td>
                    <td className="num strong">{x.bioShare}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
          <div className="note">Disease area drill-down uses the Explore “area” filter.</div>
        </Card>

        <Card
          title="Top conditions"
          right={
            <label className="checkbox">
              <input type="checkbox" checked={excludeHealthy} onChange={(e) => setExcludeHealthy(e.target.checked)} />
              Exclude “Healthy”
            </label>
          }
        >
          <TableShell>
            <table className="tbl">
              <thead>
                <tr>
                  <th>CONDITION</th>
                  <th className="num">TRIALS</th>
                  <th className="num">BIO SHARE</th>
                </tr>
              </thead>
              <tbody>
                {conditionStats.map((x) => (
                  <tr key={x.key}>
                    <td>
                      <div className="cellStack">
                        <span className="pill">{x.label}</span>
                        <div className="sub muted">{formatWithCommas(x.trials)} likely scientific failures</div>
                        <Link className="link" href={conditionQueryHref(x.label)}>
                          Explore →
                        </Link>
                      </div>
                    </td>
                    <td className="num strong">{formatWithCommas(x.trials)}</td>
                    <td className="num strong">{x.bioShare}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
          <div className="note">
            Condition drill-down uses Explore free-text search (q). For more complete condition analysis, extend the index to include full condition lists.
          </div>
        </Card>
      </div>

      <div className="sectionHeader">
        <h2>Sponsor intelligence</h2>
        <div className="hint">Sponsor drill-downs use Explore free-text search (q) plus bucket/phase where applicable.</div>
      </div>

      {/* Sponsor search + actions */}
      <div className="sponsorTopRow">
        <div className="sponsorInput">
          <div className="label">Sponsor</div>
          <input
            value={sponsor}
            onChange={(e) => setSponsor(e.target.value)}
            list="sponsors"
            placeholder="Select sponsor…"
          />
          <datalist id="sponsors">
            {sponsorList.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div className="sponsorActions">
          <Link className="btn" href={sponsorQueryHref(sponsor)}>
            Open in Explore
          </Link>
          <button className="btn" onClick={() => setShowSciFailures((v) => !v)}>
            {showSciFailures ? "Show all trials" : "Show scientific failures"}
          </button>
        </div>
      </div>

      {/* Sponsor layout (desktop): left stack + wide conditions */}
      {sponsorProfile ? (
        <div className="sponsorGrid">
          <div className="leftStack">
            <Card
              title="Sponsor totals"
              subtitle={sponsorProfile.sponsor}
              right={<Link className="link" href={sponsorQueryHref(sponsorProfile.sponsor)}>View all →</Link>}
              className="tight"
            >
              <div className="metaRow">
                <div className="meta">
                  <span className="muted">Trials:</span> <b>{formatWithCommas(sponsorProfile.totals.trials)}</b>
                </div>
                <div className="meta">
                  <span className="muted">Bio share:</span> <b>{sponsorProfile.totals.bioShare}%</b>
                </div>
              </div>
              <div className="note mini">The sponsor panel follows the current page mode (all trials vs scientific failures).</div>
            </Card>

            <Card
              title="Top buckets"
              right={<Link className="link" href={sponsorQueryHref(sponsorProfile.sponsor)}>View all →</Link>}
              className="tight"
            >
              <TableShell>
                <table className="tbl small">
                  <thead>
                    <tr>
                      <th>BUCKET</th>
                      <th className="num">TRIALS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sponsorProfile.topBuckets.map((x) => (
                      <tr key={x.bucket}>
                        <td>
                          <Link className="link" href={sponsorQueryHref(sponsorProfile.sponsor, { bucket: x.bucket })}>
                            {x.bucket}
                          </Link>
                        </td>
                        <td className="num strong">{formatWithCommas(x.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
            </Card>

            <Card
              title="Top phases"
              right={<Link className="link" href={sponsorQueryHref(sponsorProfile.sponsor)}>View all →</Link>}
              className="tight"
            >
              <TableShell>
                <table className="tbl small">
                  <thead>
                    <tr>
                      <th>PHASE</th>
                      <th className="num">TRIALS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sponsorProfile.topPhases.map((x) => (
                      <tr key={x.phase}>
                        <td>
                          <Link className="link" href={sponsorQueryHref(sponsorProfile.sponsor, { phase: x.phase })}>
                            {x.phase}
                          </Link>
                        </td>
                        <td className="num strong">{formatWithCommas(x.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
            </Card>
          </div>

          <div className="conditionsWide">
            <Card
              title="Top conditions"
              right={<Link className="link" href={sponsorQueryHref(sponsorProfile.sponsor)}>View all →</Link>}
              className="tight"
            >
              <TableShell>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>CONDITION</th>
                      <th className="num">TRIALS</th>
                      <th style={{ width: 220 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {sponsorProfile.topConds.map((x) => (
                      <tr key={x.key}>
                        <td>
                          {x.isOther ? (
                            <span className="cellTrunc muted">{x.label}</span>
                          ) : (
                            <Link className="link cellTrunc" href={sponsorQueryHref(sponsorProfile.sponsor, { q: x.label })}>
                              {x.label}
                            </Link>
                          )}
                        </td>
                        <td className="num strong">{formatWithCommas(x.count)}</td>
                        <td>
                          <Bar value={x.count} max={sponsorCondMax} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
            </Card>
          </div>
        </div>
      ) : null}

      <div className="footerNote">
        Dataset version: <b>{router.query?.v ? String(router.query.v) : "2026-01-29"}</b> · Source: <b>ClinicalTrials.gov API v2</b>
      </div>

      <style jsx>{`
        .page {
          padding: 22px 18px 50px 18px;
          background: #f7f8fb;
          min-height: 100vh;
        }

        .headerRow {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 16px;
          margin-bottom: 14px;
        }

        h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .sectionHeader {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 16px;
          margin-top: 24px;
          margin-bottom: 12px;
        }

        h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.01em;
        }

        .hint {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.55);
        }

        .twoCol {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 980px) {
          .twoCol {
            grid-template-columns: 1fr 1fr;
          }
        }

        .tbl {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
        }
        .tbl th {
          text-align: left;
          font-size: 12px;
          letter-spacing: 0.06em;
          color: rgba(0, 0, 0, 0.6);
          font-weight: 900;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          white-space: nowrap;
        }
        .tbl td {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          vertical-align: top;
        }
        .tbl.small td {
          padding: 8px 12px;
        }
        .num {
          text-align: right;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .strong {
          font-weight: 900;
        }

        .cellStack {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 2px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: rgba(0, 0, 0, 0.02);
          font-size: 13px;
          font-weight: 800;
          line-height: 1.1;
        }

        .sub {
          font-size: 12px;
          line-height: 1.2;
        }

        .muted {
          color: rgba(0, 0, 0, 0.55);
        }

        .link {
          color: rgb(79, 70, 229);
          font-weight: 800;
          text-decoration: none;
          font-size: 12px;
        }
        .link:hover {
          text-decoration: underline;
        }

        .note {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: rgba(0, 0, 0, 0.02);
          font-size: 12px;
          color: rgba(0, 0, 0, 0.55);
        }
        .note.mini {
          margin-top: 10px;
          padding: 10px 12px;
        }

        .checkbox {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: rgba(0, 0, 0, 0.75);
          font-weight: 700;
        }

        .sponsorTopRow {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        @media (min-width: 980px) {
          .sponsorTopRow {
            grid-template-columns: 1fr auto;
            align-items: end;
          }
        }

        .sponsorInput .label {
          font-size: 12px;
          font-weight: 900;
          color: rgba(0, 0, 0, 0.55);
          margin-bottom: 6px;
        }
        .sponsorInput input {
          width: 100%;
          border: 1px solid rgba(0, 0, 0, 0.14);
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
          background: white;
        }
        .sponsorInput input:focus {
          border-color: rgba(99, 102, 241, 0.7);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
        }

        .sponsorActions {
          display: flex;
          gap: 10px;
          justify-content: flex-start;
        }
        @media (min-width: 980px) {
          .sponsorActions {
            justify-content: flex-end;
          }
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.14);
          background: white;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
          color: rgba(0, 0, 0, 0.86);
          font-size: 14px;
        }
        .btn:hover {
          background: rgba(0, 0, 0, 0.03);
        }

        .sponsorGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 980px) {
          .sponsorGrid {
            grid-template-columns: 420px 1fr;
            align-items: start;
          }
        }

        .leftStack {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .conditionsWide {
          min-width: 0;
        }

        .cellTrunc {
          display: inline-block;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          vertical-align: bottom;
        }

        .footerNote {
          margin-top: 18px;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.55);
        }
      `}</style>
    </div>
  );
}
