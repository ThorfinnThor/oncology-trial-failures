import Head from "next/head";
import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";

import EvidenceStandard from "@/components/EvidenceStandard";
import PrimaryNav from "@/components/PrimaryNav";
import { bucketLabel, drugPageMetadata, statusLabel, type DrugPage } from "@/lib/drugPages";
import { OG_IMAGE, SITE_URL } from "@/lib/seoHubs";
import type { SeoIndexingState } from "@/lib/seoIndexingPolicy";
import { serializeJsonLd } from "@/lib/serializeJsonLd";
import type { DatasetMeta } from "@/lib/types";

type DrugPageProps = {
  drug: DrugPage;
  seo: SeoIndexingState;
  datasetMeta: DatasetMeta;
};

export default function DrugStoppedTrialsPage({ drug, seo, datasetMeta }: DrugPageProps) {
  const canonicalUrl = seo.canonical || `${SITE_URL}${drug.path}`;
  const { title, description } = drugPageMetadata(drug);
  const shown = drug.trials.length;
  const exploreHref = `/explore?q=${encodeURIComponent(drug.name)}`;
  const assetCheckHref = `/asset-check?q=${encodeURIComponent(drug.name)}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Drugs", item: `${SITE_URL}/drugs` },
        { "@type": "ListItem", position: 3, name: drug.name, item: canonicalUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: `${drug.name}: stopped clinical trials`,
      description,
      url: canonicalUrl,
      isPartOf: {
        "@type": "Dataset",
        name: "Clinical Trial Failures database",
        description: "A source-linked database of terminated, suspended, and withdrawn ClinicalTrials.gov records classified by stated stop reason.",
        url: `${SITE_URL}/explore`,
      },
      about: { "@type": "Drug", name: drug.name },
      creator: { "@type": "Organization", name: "Clinical Trial Failures" },
      dateModified: datasetMeta.version,
      citation: "https://clinicaltrials.gov/",
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: shown,
        itemListElement: drug.trials.map((trial, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${SITE_URL}${trial.href}`,
          name: `${trial.nct_id}: ${trial.title}`,
        })),
      },
    },
  ];

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content={seo.robots} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      </Head>

      <div className="min-h-screen">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand">
                Clinical trial failures
              </Link>
              <PrimaryNav active="guides" />
            </div>
          </div>
        </header>

        <main className="page drugPage">
          <article className="drugArticle">
            <nav className="muted breadcrumb" aria-label="Breadcrumb">
              <Link className="link" href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <Link className="link" href="/drugs">Drugs</Link>
              <span aria-hidden="true">/</span>
              <span>{drug.name}</span>
            </nav>

            <section className="card heroSection">
              <div className="heroCopy">
                <p className="facet-title">Drug record</p>
                <h1>{drug.name}: stopped clinical trials and why they stopped</h1>
                <p className="heroDescription">
                  {drug.total.toLocaleString()} terminated, suspended or withdrawn ClinicalTrials.gov records list{" "}
                  {drug.name} among their interventions. Each entry shows the sponsor&apos;s own stop statement,
                  quoted from the registry, and next to it our classification of that statement.
                </p>
                <div className="heroActions">
                  <Link className="sevBtn btn-primary" href={assetCheckHref}>Compare against drugs with the same target</Link>
                  <Link className="sevBtn" href="/methods">How classification works</Link>
                </div>
              </div>

              <aside className="scopePanel" data-ai-summary="true" aria-label="Drug record summary">
                <p className="facet-title">Registry counts</p>
                <dl>
                  <div><dt>Stopped trials listing {drug.name}</dt><dd>{drug.total.toLocaleString()}</dd></div>
                  <div><dt>With a stop reason in the registry</dt><dd>{drug.withStopReason.toLocaleString()}</dd></div>
                  <div><dt>Stop reason classified as efficacy/futility or safety</dt><dd>{drug.efficacyOrSafety.toLocaleString()}</dd></div>
                </dl>
              </aside>
            </section>

            <section className="readBand">
              <div>
                <p className="facet-title">What this page does not say</p>
                <h2>A listing is not a verdict on the drug.</h2>
              </div>
              <p>
                The registry lists every intervention a trial uses and does not say which one was under test, so{" "}
                {drug.name} may be the investigational drug, the comparator or background therapy. A stop statement
                describes one trial; where a sponsor gives no reason, none is inferred. Counting stopped trials is not a
                failure rate: completed and ongoing trials of {drug.name} are not in this dataset.
              </p>
            </section>

            <section className="card recordsSection" aria-labelledby="drug-trials-title">
              <div className="sectionHeader">
                <div>
                  <p className="facet-title">Source-level evidence</p>
                  <h2 id="drug-trials-title">The stopped trials</h2>
                </div>
                <Link className="sevBtn" href={exploreHref}>Search in Explore</Link>
              </div>
              <p className="muted recordsIntro">
                {shown < drug.total
                  ? `Showing the ${shown.toLocaleString()} most recently ended of ${drug.total.toLocaleString()} records. `
                  : ""}
                &ldquo;Registry stop reason&rdquo; is the sponsor&apos;s text as filed; &ldquo;Our classification&rdquo; is how
                our rules read that text. Open a trial for the full record and the ClinicalTrials.gov link.
              </p>

              <ol className="drugTrialList">
                {drug.trials.map((trial) => (
                  <li className="drugTrial" key={trial.nct_id}>
                    <div className="trialMeta">
                      <span>{trial.nct_id}</span>
                      <span>{trial.phase}</span>
                      <span>{statusLabel(trial.status)}</span>
                      {trial.ended ? <span>Ended {trial.ended}</span> : null}
                    </div>
                    <Link className="sevTrialtitle" href={trial.href}>{trial.title}</Link>
                    <p className="trialSponsor">Sponsor: {trial.sponsor}</p>
                    <dl className="trialFacts">
                      <div>
                        <dt>{trial.why_from === "description" ? "Registry description" : "Registry stop reason"}</dt>
                        <dd>{trial.why ? <q>{trial.why}</q> : <span className="muted">No reason given in the registry</span>}</dd>
                      </div>
                      <div>
                        <dt>Our classification</dt>
                        <dd>{bucketLabel(trial.bucket)}</dd>
                      </div>
                      {trial.listed_with.length ? (
                        <div>
                          <dt>Also listed on this trial</dt>
                          <dd>{trial.listed_with.join(", ")}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </li>
                ))}
              </ol>
            </section>

            <EvidenceStandard datasetVersion={datasetMeta.version} source={datasetMeta.source} />

            <p className="sourceNote muted">
              Dataset version: <strong>{datasetMeta.version}</strong> · Source: <strong>{datasetMeta.source || "ClinicalTrials.gov"}</strong> · Drug names are grouped from the registry&apos;s intervention names with dose and formulation removed; brand names and code names are not merged. Classifications are analytical screening signals and not medical advice.
            </p>
          </article>
        </main>
      </div>

      <style jsx>{`
        .drugPage { padding-top: 28px; padding-bottom: 48px; }
        .drugArticle { max-width: 1120px; margin: 0 auto; }
        .breadcrumb { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 14px; font-size: 13px; }
        .heroSection { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.75fr); gap: 28px; padding: 30px; }
        .heroCopy h1 { max-width: 760px; margin: 0; font-size: clamp(30px, 4vw, 44px); line-height: 1.08; letter-spacing: 0; overflow-wrap: anywhere; }
        .heroDescription { max-width: 760px; margin: 16px 0 0; color: var(--text-muted); font-size: 18px; line-height: 1.65; }
        .heroActions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
        .scopePanel { align-self: stretch; border: 1px solid #bfd5ff; border-left: 4px solid var(--accent); border-radius: 10px; padding: 18px; background: #f4f8ff; }
        .scopePanel dl { display: grid; gap: 10px; margin: 12px 0 0; }
        .scopePanel dl div { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; border-bottom: 1px solid #d8e4f7; padding-bottom: 9px; }
        .scopePanel dl div:last-child { border-bottom: 0; padding-bottom: 0; }
        .scopePanel dt { color: var(--text-muted); font-size: 13px; }
        .scopePanel dd { margin: 0; text-align: right; font-weight: 850; font-variant-numeric: tabular-nums; }
        .readBand { display: grid; grid-template-columns: minmax(240px, 0.8fr) minmax(0, 1.2fr); gap: 34px; align-items: start; margin: 28px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 24px 2px; }
        .readBand h2 { margin: 5px 0 0; font-size: 24px; line-height: 1.2; }
        .readBand > p { margin: 0; color: var(--text-muted); line-height: 1.72; }
        .recordsSection { padding: 24px; }
        .sectionHeader { display: flex; align-items: end; justify-content: space-between; gap: 16px; }
        .sectionHeader h2 { margin: 5px 0 0; font-size: 24px; }
        .recordsIntro { max-width: 780px; margin: 10px 0 0; line-height: 1.6; }
        .drugTrialList { display: grid; gap: 10px; margin: 18px 0 0; padding: 0; list-style: none; }
        .drugTrial { border-top: 1px solid var(--border); padding: 16px 0 6px; }
        .trialMeta { display: flex; flex-wrap: wrap; gap: 7px 14px; color: var(--text-muted); font-size: 12px; font-weight: 800; text-transform: uppercase; }
        :global(.sevTrialtitle) { display: inline-block; margin-top: 7px; color: var(--accent); font-size: 17px; font-weight: 850; line-height: 1.35; }
        .trialSponsor { margin: 5px 0 0; color: var(--text-muted); font-size: 14px; }
        .trialFacts { display: grid; gap: 6px; margin: 10px 0 0; }
        .trialFacts div { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 12px; }
        .trialFacts dt { color: var(--text-muted); font-size: 13px; font-weight: 750; }
        .trialFacts dd { margin: 0; line-height: 1.55; overflow-wrap: anywhere; }
        .sourceNote { margin: 14px 2px 0; font-size: 12px; line-height: 1.5; }
        @media (max-width: 900px) {
          .heroSection { grid-template-columns: 1fr; padding: 24px; }
        }
        @media (max-width: 640px) {
          .drugPage { padding-top: 18px; padding-bottom: 34px; }
          .heroSection { gap: 20px; padding: 19px; }
          .heroCopy h1 { font-size: 30px; }
          .heroDescription { font-size: 16px; }
          .heroActions :global(.sevBtn) { box-sizing: border-box; width: 100%; max-width: 100%; justify-content: center; white-space: normal; text-align: center; }
          .scopePanel dl div { grid-template-columns: 1fr; gap: 3px; }
          .scopePanel dd { text-align: left; }
          .readBand { grid-template-columns: 1fr; gap: 12px; margin: 22px 0; }
          .recordsSection { padding: 19px; }
          .sectionHeader { align-items: stretch; flex-direction: column; }
          .sectionHeader :global(.sevBtn) { justify-content: center; }
          .trialFacts div { grid-template-columns: 1fr; gap: 2px; }
        }
      `}</style>
    </>
  );
}

// Indexable drug pages are rendered at build time; the rest on first request, then cached.
export const getStaticPaths: GetStaticPaths = async () => {
  const { loadDrugCatalogServer } = await import("@/lib/server-data");
  const catalog = await loadDrugCatalogServer();
  return {
    paths: catalog.filter((entry) => entry.indexable).map((entry) => ({ params: { slug: entry.slug } })),
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<DrugPageProps> = async (ctx) => {
  const slug = String(ctx.params?.slug || "");
  const { loadDrugPageServer, loadMetaServer } = await import("@/lib/server-data");
  const { readSeoIndexingFeatures, resolveSeoIndexingPolicy } = await import("@/lib/seoIndexingPolicy");
  const [drug, datasetMeta] = await Promise.all([loadDrugPageServer(slug), loadMetaServer()]);
  if (!drug) return { notFound: true, revalidate: 3600 };

  const canonicalUrl = `${SITE_URL}${drug.path}`;
  const policy = resolveSeoIndexingPolicy(
    canonicalUrl,
    {
      httpStatus: 200,
      robots: drug.indexable ? "index,follow" : "noindex,follow",
      canonical: canonicalUrl,
      sitemap: drug.indexable,
      redirectTo: null,
      editorialStatus: drug.indexable ? "ready" : "hold",
    },
    readSeoIndexingFeatures(process.env)
  );

  return {
    props: { drug, seo: policy.effective, datasetMeta },
    revalidate: 24 * 60 * 60,
  };
};
