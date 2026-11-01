import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps } from "next";

import PrimaryNav from "@/components/PrimaryNav";
import type { DrugCatalogEntry } from "@/lib/drugPages";
import { OG_IMAGE, SITE_URL } from "@/lib/seoHubs";
import { serializeJsonLd } from "@/lib/serializeJsonLd";

type DrugListEntry = Pick<DrugCatalogEntry, "name" | "path" | "total">;

type DrugDirectoryProps = {
  groups: Array<{ letter: string; drugs: DrugListEntry[] }>;
  count: number;
};

const TITLE = "Drugs with stopped clinical trials, A to Z";
const DESCRIPTION =
  "Every drug listed on enough terminated, suspended or withdrawn ClinicalTrials.gov trials to have its own page: the stopped trials and the sponsors' stated stop reasons.";
const CANONICAL_URL = `${SITE_URL}/drugs`;

function letterOf(name: string): string {
  const first = name.charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
}

export default function DrugDirectoryPage({ groups, count }: DrugDirectoryProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Drugs", item: CANONICAL_URL },
    ],
  };

  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={CANONICAL_URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={CANONICAL_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
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
        <main className="page drugDirectoryPage">
          <section className="card p-4 directoryHero">
            <p className="facet-title">Drugs</p>
            <h1>Drugs with stopped clinical trials</h1>
            <p className="muted directoryIntro">
              {count.toLocaleString()} drugs, each listed on at least two terminated, suspended or withdrawn
              ClinicalTrials.gov records with stated stop reasons. A drug&apos;s page lists those trials with the
              sponsor&apos;s own stop statement and our classification of it. Being listed on a stopped trial does not mean
              the drug failed: the registry names every intervention, including comparators and background therapy.
            </p>
            <nav className="letterNav" aria-label="Jump to letter">
              {groups.map((group) => (
                <a href={`#letter-${group.letter === "#" ? "num" : group.letter}`} key={group.letter}>
                  {group.letter}
                </a>
              ))}
            </nav>
            {groups.map((group) => (
              <section className="letterGroup" key={group.letter} id={`letter-${group.letter === "#" ? "num" : group.letter}`}>
                <h2>{group.letter}</h2>
                <ul>
                  {group.drugs.map((drug) => (
                    <li key={drug.path}>
                      <Link href={drug.path}>{drug.name}</Link> <span>{drug.total.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </section>
        </main>
      </div>
      <style jsx>{`
        .drugDirectoryPage .directoryHero { max-width: 1120px; margin: 0 auto; }
        h1 { margin: 0 0 10px; font-size: 30px; line-height: 1.12; letter-spacing: 0; }
        .directoryIntro { max-width: 860px; line-height: 1.65; }
        .letterNav { display: flex; flex-wrap: wrap; gap: 6px; margin: 18px 0 6px; }
        .letterNav a { min-width: 30px; border: 1px solid var(--border); border-radius: 8px; padding: 4px 8px; text-align: center; color: var(--accent); font-weight: 800; text-decoration: none; }
        .letterGroup { border-top: 1px solid var(--border); margin-top: 18px; padding-top: 12px; }
        .letterGroup h2 { margin: 0 0 10px; font-size: 20px; }
        .letterGroup ul { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px 18px; margin: 0; padding: 0; list-style: none; }
        .letterGroup li { display: flex; justify-content: space-between; gap: 10px; min-width: 0; line-height: 1.4; }
        .letterGroup li :global(a) { color: var(--accent); font-weight: 700; overflow-wrap: anywhere; }
        .letterGroup li span { color: var(--text-muted); font-variant-numeric: tabular-nums; }
        @media (max-width: 640px) {
          h1 { font-size: 26px; }
        }
      `}</style>
    </>
  );
}

export const getStaticProps: GetStaticProps<DrugDirectoryProps> = async () => {
  const { loadDrugCatalogServer } = await import("@/lib/server-data");
  const catalog = (await loadDrugCatalogServer()).filter((entry) => entry.indexable);
  const byLetter = new Map<string, DrugListEntry[]>();
  for (const entry of catalog) {
    const letter = letterOf(entry.name);
    const list = byLetter.get(letter) || [];
    list.push({ name: entry.name, path: entry.path, total: entry.total });
    byLetter.set(letter, list);
  }
  const groups = [...byLetter.entries()]
    .sort(([a], [b]) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)))
    .map(([letter, drugs]) => ({ letter, drugs }));
  return { props: { groups, count: catalog.length } };
};
