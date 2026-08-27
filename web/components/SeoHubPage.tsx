import Head from "next/head";
import Link from "next/link";

import EvidenceStandard from "@/components/EvidenceStandard";
import PrimaryNav from "@/components/PrimaryNav";
import { areaHubPath, displayHubRows, hubStats, OG_IMAGE, phaseHubPathFromLabel, SITE_URL, trialListItem, type HubStats } from "@/lib/seoHubs";
import type { DatasetMeta, TrialIndexRow } from "@/lib/types";

type HubMeta = {
  title: string;
  h1: string;
  description: string;
  path: string;
  label: string;
  total: number;
  eyebrow: string;
  kind: "area" | "phase" | "reason";
};

type SeoHubPageProps = {
  hub: HubMeta;
  rows: TrialIndexRow[];
  stats?: HubStats;
  datasetMeta: DatasetMeta;
  parentHref: string;
  parentLabel: string;
};

const PHASE_PARAMS: Record<string, string> = {
  "Early Phase I": "EARLY_PHASE1",
  "Phase I": "PHASE1",
  "Phase I/II": "PHASE1%2FPHASE2",
  "Phase II": "PHASE2",
  "Phase II/III": "PHASE2%2FPHASE3",
  "Phase III": "PHASE3",
  "Phase IV": "PHASE4",
  Unknown: "UNKNOWN",
};

function percent(part: number, total: number): string {
  if (!total) return "0%";
  const value = (part / total) * 100;
  return `${value < 10 ? value.toFixed(1) : value.toFixed(0)}%`;
}

function exploreHref(hub: HubMeta): string {
  if (hub.kind === "area") return `/explore?area=${encodeURIComponent(hub.label)}`;
  if (hub.kind === "phase") return `/explore?phase=${PHASE_PARAMS[hub.label] || encodeURIComponent(hub.label)}`;
  return `/explore?bucket=${encodeURIComponent(hub.label)}`;
}

function interpretation(hub: HubMeta): { title: string; body: string } {
  if (hub.kind === "area") {
    return {
      title: "This is a disease-area evidence slice, not a drug failure rate.",
      body: `The denominator contains stopped records mapped to ${hub.label}. A termination does not by itself prove that an intervention failed biologically. V2 separates likely efficacy or safety signals from operational, strategic, regulatory, transitional, and unresolved source language.`,
    };
  }
  if (hub.kind === "phase") {
    return {
      title: "Phase context changes what a stopped record can tell you.",
      body: `${hub.label} records are grouped by the phase reported in ClinicalTrials.gov. The denominator excludes active and completed studies, so it must not be read as a phase-wide probability of success or failure. V2 preserves ambiguous records for review instead of forcing a causal conclusion.`,
    };
  }
  return {
    title: "This page groups source-language signals, not final clinical judgments.",
    body: `Records enter this slice because their registry language maps to ${hub.label.toLowerCase()}. The classification is an analytical screening signal. Read the original stop statement and surrounding trial context before drawing conclusions about an intervention, sponsor, or development program.`,
  };
}

export default function SeoHubPage({ hub, rows, stats: providedStats, datasetMeta, parentHref, parentLabel }: SeoHubPageProps) {
  const stats = providedStats || hubStats(rows);
  const items = displayHubRows(rows, 60).map(trialListItem);
  const canonicalUrl = `${SITE_URL}${hub.path}`;
  const filteredExploreHref = exploreHref(hub);
  const reading = interpretation(hub);
  const otherCount = stats.mixedCount + stats.transitionCount + stats.otherOutcomeCount;
  const secondaryContext = hub.kind === "area" ? stats.topPhases : stats.topAreas;
  const secondaryTitle = hub.kind === "area" ? "Phase distribution" : "Leading disease areas";
  const secondaryHref = (label: string) => hub.kind === "area" ? phaseHubPathFromLabel(label) : areaHubPath(label);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: parentLabel, item: `${SITE_URL}${parentHref}` },
        { "@type": "ListItem", position: 3, name: hub.label, item: canonicalUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: `${hub.label} stopped clinical trial evidence profile`,
      description: hub.description,
      url: canonicalUrl,
      isPartOf: {
        "@type": "Dataset",
        name: "Clinical Trial Failures database",
        description: "A source-linked database of terminated, suspended, and withdrawn ClinicalTrials.gov records classified by stated stop reason.",
        url: `${SITE_URL}/explore`,
      },
      creator: { "@type": "Organization", name: "Clinical Trial Failures" },
      dateModified: datasetMeta.version,
      citation: "https://clinicaltrials.gov/",
      measurementTechnique: "Classification V2 analysis of ClinicalTrials.gov stopped-study source language",
      temporalCoverage: `../${stats.latestRegistryUpdate}`,
      variableMeasured: ["Stopped clinical trial records", "Likely biological failure signals", "Non-biological stop reasons", "Unresolved stop reasons"],
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: items.length,
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${SITE_URL}${item.href}`,
          name: `${item.id}: ${item.title}`,
        })),
      },
    },
  ];

  return (
    <>
      <Head>
        <title>{hub.title}</title>
        <meta name="description" content={hub.description} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={hub.title} />
        <meta property="og:description" content={hub.description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Clinical Trial Failures database preview" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={hub.title} />
        <meta name="twitter:description" content={hub.description} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      <div className="min-h-screen">
        <header className="topbar"><div className="topbar-inner"><div className="topbar-left">
          <Link href="/" className="brand">Clinical trial failures</Link><PrimaryNav active="guides" />
        </div></div></header>

        <main className="page hubPage"><article className="hubArticle">
          <nav className="muted breadcrumb" aria-label="Breadcrumb">
            <Link className="link" href="/">Home</Link><span aria-hidden="true">/</span>
            <Link className="link" href={parentHref}>{parentLabel}</Link><span aria-hidden="true">/</span><span>{hub.label}</span>
          </nav>

          <section className="card heroSection">
            <div className="heroCopy">
              <p className="facet-title">{hub.eyebrow}</p><h1>{hub.h1}</h1><p className="heroDescription">{hub.description}</p>
              <div className="heroActions"><Link className="btn btn-primary" href={filteredExploreHref}>Explore this data slice</Link><Link className="btn" href="/methods">How classification works</Link></div>
            </div>
            <aside className="scopePanel" data-ai-summary="true" aria-label="Evidence summary">
              <p className="facet-title">V2 evidence summary</p>
              <dl>
                <div><dt>Data slice</dt><dd>{hub.label}</dd></div><div><dt>Stopped records</dt><dd>{stats.total.toLocaleString()}</dd></div>
                <div><dt>Likely biological signals</dt><dd>{stats.biologicalCount.toLocaleString()}</dd></div><div><dt>Biological share</dt><dd>{percent(stats.biologicalCount, stats.total)}</dd></div>
                <div><dt>Latest registry update</dt><dd>{stats.latestRegistryUpdate}</dd></div>
              </dl>
            </aside>
          </section>

          <section className="metricGrid" aria-label="V2 classification outcomes">
            <div className="metricCard biological"><span>Likely biological</span><strong>{stats.biologicalCount.toLocaleString()}</strong><p>{percent(stats.biologicalCount, stats.total)} of stopped records</p></div>
            <div className="metricCard"><span>Non-biological</span><strong>{stats.nonBiologicalCount.toLocaleString()}</strong><p>{percent(stats.nonBiologicalCount, stats.total)} of stopped records</p></div>
            <div className="metricCard"><span>Other outcomes</span><strong>{otherCount.toLocaleString()}</strong><p>Mixed, transition, or cause not stated</p></div>
            <div className="metricCard review"><span>Unresolved</span><strong>{stats.unresolvedCount.toLocaleString()}</strong><p>Retained for review, not forced</p></div>
          </section>

          <section className="interpretationBand"><div><p className="facet-title">How to read this page</p><h2>{reading.title}</h2></div><p>{reading.body}</p></section>

          <EvidenceStandard datasetVersion={datasetMeta.version} latestRegistryUpdate={stats.latestRegistryUpdate} source={datasetMeta.source} />

          <section className="evidenceGrid">
            <div className="card evidenceCard"><p className="facet-title">V2 outcomes</p><h2>How the stopped records resolve</h2><dl className="rankedList">
              {stats.outcomeBreakdown.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.count.toLocaleString()}</dd></div>)}
            </dl></div>
            <div className="card evidenceCard"><p className="facet-title">Resolved causes</p><h2>Most frequent primary reasons</h2>
              {stats.topResolvedReasons.length ? <dl className="rankedList">{stats.topResolvedReasons.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.count.toLocaleString()}</dd></div>)}</dl> : <p className="muted">No resolved primary reason is available for this data slice.</p>}
            </div>
          </section>

          <section className="contextGrid">
            <div className="card evidenceCard"><p className="facet-title">Source context</p><h2>Leading sponsors</h2><dl className="rankedList compact">{stats.topSponsors.map((item) => <div key={item.label}><dt><Link className="rankedLink" href={`/explore?sponsor=${encodeURIComponent(item.label)}`}>{item.label}</Link></dt><dd>{item.count.toLocaleString()}</dd></div>)}</dl></div>
            <div className="card evidenceCard"><p className="facet-title">Development context</p><h2>{secondaryTitle}</h2><dl className="rankedList compact">{secondaryContext.map((item) => <div key={item.label}><dt><Link className="rankedLink" href={secondaryHref(item.label)}>{item.label}</Link></dt><dd>{item.count.toLocaleString()}</dd></div>)}</dl></div>
          </section>

          <section className="card recordsSection">
            <div className="sectionHeader"><div><p className="facet-title">Source-level evidence</p><h2>Crawlable stopped-trial records</h2></div><Link className="btn" href={filteredExploreHref}>View all in Explore</Link></div>
            <p className="muted recordsIntro">Showing up to {items.length.toLocaleString()} recent records from this data slice. Open an NCT page to inspect its source statement, V2 interpretation, confidence, and ClinicalTrials.gov link.</p>
            <div className="trialList">{items.map((item) => <article className="trialCard" key={item.id}>
              <div className="trialMeta"><span>{item.id}</span><span>{item.phase}</span><span>{item.sponsor}</span></div><Link className="trialTitle" href={item.href}>{item.title}</Link><p><strong>{item.bucket}</strong> · {item.why}</p>
            </article>)}</div>
          </section>

          <p className="sourceNote muted">Dataset version: <strong>{datasetMeta.version}</strong> · Source: <strong>{datasetMeta.source || "ClinicalTrials.gov"}</strong> · Classifications are analytical screening signals and not medical advice.</p>
        </article></main>
      </div>

      <style jsx>{`
        .hubPage{padding-top:28px;padding-bottom:48px}.hubArticle{max-width:1120px;margin:0 auto}.breadcrumb{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px;font-size:13px}
        .heroSection{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.75fr);gap:28px;padding:30px}.heroCopy h1{max-width:760px;margin:0;font-size:clamp(30px,4vw,48px);line-height:1.06;letter-spacing:0}.heroDescription{max-width:760px;margin:16px 0 0;color:var(--text-muted);font-size:18px;line-height:1.65}.heroActions{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
        .scopePanel{align-self:stretch;border:1px solid #bfd5ff;border-left:4px solid var(--accent);border-radius:10px;padding:18px;background:#f4f8ff}.scopePanel dl{display:grid;gap:10px;margin:12px 0 0}.scopePanel dl div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;border-bottom:1px solid #d8e4f7;padding-bottom:9px}.scopePanel dl div:last-child{border-bottom:0;padding-bottom:0}.scopePanel dt{color:var(--text-muted);font-size:13px}.scopePanel dd{margin:0;max-width:190px;text-align:right;font-weight:850;overflow-wrap:anywhere}
        .metricGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}.metricCard{min-height:140px;border:1px solid var(--border);border-radius:10px;padding:17px;background:#fff}.metricCard.biological{border-top:4px solid #d69b00}.metricCard.review{border-top:4px solid #6b7280}.metricCard span{display:block;min-height:32px;color:var(--text-muted);font-size:12px;font-weight:850;text-transform:uppercase}.metricCard strong{display:block;margin-top:6px;font-size:30px;font-variant-numeric:tabular-nums}.metricCard p{margin:5px 0 0;color:var(--text-muted);font-size:13px;line-height:1.45}
        .interpretationBand{display:grid;grid-template-columns:minmax(240px,.8fr) minmax(0,1.2fr);gap:34px;align-items:start;margin:28px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:24px 2px}.interpretationBand h2{margin:5px 0 0;font-size:24px;line-height:1.2}.interpretationBand>p{margin:0;color:var(--text-muted);line-height:1.72}
        .evidenceGrid,.contextGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.contextGrid{margin-top:14px}.evidenceCard{padding:22px}.evidenceCard h2{margin:6px 0 16px;font-size:21px;line-height:1.25}.rankedList{display:grid;gap:0;margin:0}.rankedList div{display:flex;justify-content:space-between;gap:18px;border-top:1px solid var(--border);padding:11px 0}.rankedList dt{font-weight:720}.rankedLink{color:var(--accent)}.rankedLink:hover{text-decoration:underline}.rankedList dd{margin:0;font-weight:900;font-variant-numeric:tabular-nums}.rankedList.compact div{padding:9px 0}
        .recordsSection{margin-top:14px;padding:24px}.sectionHeader{display:flex;align-items:end;justify-content:space-between;gap:16px}.sectionHeader h2{margin:5px 0 0;font-size:24px}.recordsIntro{max-width:780px;margin:10px 0 0;line-height:1.6}.trialList{display:grid;gap:10px;margin-top:18px}.trialCard{border-top:1px solid var(--border);padding:16px 0 6px}.trialMeta{display:flex;flex-wrap:wrap;gap:7px 14px;color:var(--text-muted);font-size:12px;font-weight:800;text-transform:uppercase}.trialTitle{display:inline-block;margin-top:7px;color:var(--accent);font-size:17px;font-weight:850;line-height:1.35}.trialCard p{margin:7px 0 0;line-height:1.55}.sourceNote{margin:14px 2px 0;font-size:12px;line-height:1.5}
        @media(max-width:900px){.heroSection{grid-template-columns:1fr;padding:24px}.metricGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:640px){.hubPage{padding-top:18px;padding-bottom:34px}.heroSection{gap:20px;padding:19px}.heroCopy h1{font-size:32px}.heroDescription{font-size:16px}.heroActions .btn{width:100%;justify-content:center}.scopePanel dl div{grid-template-columns:1fr;gap:3px}.scopePanel dd{max-width:none;text-align:left}.metricGrid,.evidenceGrid,.contextGrid,.interpretationBand{grid-template-columns:1fr}.metricCard{min-height:128px}.interpretationBand{gap:12px;margin:22px 0}.recordsSection{padding:19px}.sectionHeader{align-items:stretch;flex-direction:column}.sectionHeader .btn{justify-content:center}}
      `}</style>
    </>
  );
}
