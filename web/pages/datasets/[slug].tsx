import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";

import DatasetPageShell, { DatasetNextSteps } from "@/components/DatasetPageShell";
import { DATASETS, RELEASE, SITE_URL, datasetJsonLd, getDataset } from "@/lib/datasets";

type Props = { slug: string };

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: DATASETS.map((d) => ({ params: { slug: d.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props> = async (ctx) => {
  const slug = String(ctx.params?.slug || "");
  return getDataset(slug) ? { props: { slug } } : { notFound: true };
};

export default function DatasetPage({ slug }: Props) {
  const d = getDataset(slug)!;
  const canonical = `${SITE_URL}/datasets/${d.slug}`;
  const jsonLd = [
    datasetJsonLd(d),
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Datasets", item: `${SITE_URL}/datasets` },
        { "@type": "ListItem", position: 3, name: d.name, item: canonical },
      ],
    },
  ];
  const card = { maxWidth: 920, margin: "16px auto 0" } as const;
  return (
    <DatasetPageShell title={`${d.name} | Dataset`} description={d.short} canonical={canonical} jsonLd={jsonLd}>
      <section className="card p-4" style={{ maxWidth: 920, margin: "0 auto" }}>
        <p className="facet-title">
          <Link className="link" href="/datasets">
            Datasets
          </Link>{" "}
          · release {RELEASE}
        </p>
        <h1 style={{ margin: "0 0 12px", fontSize: 30, lineHeight: 1.15 }}>{d.name}</h1>
        <p className="muted" style={{ fontSize: 16, lineHeight: 1.7, margin: "0 0 12px" }}>
          {d.description}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {d.downloads.map((x, i) => (
            <a key={x.href} className={i === 0 ? "btn btn-primary" : "btn"} href={x.href} download>
              {x.label}
            </a>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 13, margin: "8px 0 0" }}>
          {d.downloads.map((x) => `${x.label}: ${x.note}`).join(" · ")}. No form, no account.
        </p>
      </section>

      <section className="card p-4" style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>What is in it</h2>
        <p style={{ margin: "0 0 6px", lineHeight: 1.6 }}>
          <strong>One row:</strong> {d.rowIs}
        </p>
        <p style={{ margin: "0 0 6px", lineHeight: 1.6 }}>
          <strong>Size:</strong> {d.size}
        </p>
        <ul className="muted" style={{ lineHeight: 1.7, paddingLeft: 20, margin: "0 0 12px" }}>
          {d.coverage.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <dl style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8, margin: 0 }}>
          {d.variables.map((v) => (
            <div key={v.name}>
              <dt style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, overflowWrap: "anywhere" }}>{v.name}</dt>
              <dd className="muted" style={{ margin: "2px 0 0", lineHeight: 1.6 }}>
                {v.text}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card p-4" style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>What it is for, and its limits</h2>
        <ul style={{ lineHeight: 1.7, paddingLeft: 20, margin: "0 0 10px" }}>
          {d.uses.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
        <ul className="muted" style={{ lineHeight: 1.7, paddingLeft: 20, margin: 0 }}>
          {d.limits.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="muted" style={{ margin: "10px 0 0", lineHeight: 1.6 }}>
          How the labels are checked:{" "}
          <Link className="link" href="/validation">
            validation
          </Link>
          . Free for non-commercial use under CC BY-NC 4.0; commercial use needs a licence.
        </p>
      </section>

      {d.elsewhere.length > 0 && (
        <section className="card p-4" style={card}>
          <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>Also available</h2>
          <ul style={{ lineHeight: 1.7, paddingLeft: 20, margin: 0 }}>
            {d.elsewhere.map((e) => (
              <li key={e.href}>
                {e.href.startsWith("http") ? (
                  <a className="link" href={e.href} rel="noopener">
                    {e.label}
                  </a>
                ) : (
                  <Link className="link" href={e.href}>
                    {e.label}
                  </Link>
                )}
                : <span className="muted">{e.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DatasetNextSteps datasetName={d.name} />
    </DatasetPageShell>
  );
}
