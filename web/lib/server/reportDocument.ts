// web/lib/server/reportDocument.ts
//
// What a buyer receives, as one document.
//
// A purchase is one diligence report on one molecule or target. Inside it, each mechanism cohort
// in which a failed drug acts on that target is a chapter. Which chapter is the main one matters:
// a report bought for BCMA opens with the BCMA cohort, and the Microtubule cohort is there only
// because an anti-BCMA antibody–drug conjugate with a tubulin payload failed and is counted in it.
// That reason is stated next to the chapter instead of leaving the buyer to wonder why a report on
// BCMA contains 1,900 taxane trials.
//
// The chapters are prebuilt by the weekly workflow; this file only orders them, fills in the
// comparison against the buyer's own molecule, and — for the download — binds them into one file
// with a cover and a table of contents.

import {
  compareAsset,
  renderComparison,
  renderUnresolved,
  resolveSubject,
  type Subject,
} from "@/lib/server/assetComparison";
import { PACKAGES } from "@/lib/server/grants";

const SLOT = "<!--ASSET_COMPARISON-->";

export type Chapter = {
  slug: string;
  cohort: string;
  area: string;
  /** "main": the cohort is defined by the subject's own target. "further": a failed drug on the subject's target also sits here. */
  role: "main" | "further";
  /** Why a further chapter is in the report, in one sentence. Empty for a main chapter. */
  reason: string;
  counts: { closed: number; stopped: number; still_open: number; total_in_cohort: number };
  rate: number;
  comparator_rate: number;
};

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The chapters of a report, main chapters first, each with the reason it is there. */
export function chaptersFor(slugs: string[], asset: string): Chapter[] {
  const subject = asset ? resolveSubject(asset) : null;
  const genes = new Set(subject?.target_genes || []);
  const label = subject?.label || asset;

  const chapters = slugs
    .filter((slug) => slug in PACKAGES)
    .map((slug): Chapter => {
      const pkg = PACKAGES[slug] as (typeof PACKAGES)[string] & { genes?: string[] };
      const own = (pkg.genes || []).some((g) => genes.has(g));
      let reason = "";
      if (!own && genes.size) {
        const carriers = (pkg.failed_assets || [])
          .filter((f) => (f.target_genes || []).some((g) => genes.has(g)))
          .map((f) => f.asset)
          .slice(0, 3);
        reason = carriers.length
          ? `Included because ${listNames(carriers)}, which ${carriers.length === 1 ? "acts" : "act"} on ${label}, `
            + `${carriers.length === 1 ? "is" : "are"} also counted in this cohort through ${carriers.length === 1 ? "its" : "their"} other target. `
            + `Read it for ${carriers.length === 1 ? "that molecule" : "those molecules"}; the rest of the cohort is context.`
          : `Included because a failed drug in this cohort acts on ${label}.`;
      }
      return {
        slug,
        cohort: pkg.cohort,
        area: pkg.area,
        role: !genes.size || own ? "main" : "further",
        reason,
        counts: pkg.counts,
        rate: pkg.headline.rate,
        comparator_rate: pkg.headline.comparator_rate,
      };
    });

  // Main chapters first, then the rest; within each, the cohort with the most trials first.
  return chapters.sort((a, b) =>
    (a.role === b.role ? 0 : a.role === "main" ? -1 : 1) || b.counts.total_in_cohort - a.counts.total_in_cohort);
}

/** One chapter as a standalone page, with the comparison against the buyer's molecule filled in. */
export function renderChapter(slug: string, asset: string): { html: string; resolution: "none" | "resolved" | "unresolved" } {
  const pkg = PACKAGES[slug];
  if (!pkg) return { html: "", resolution: "none" };
  let section = "";
  let resolution: "none" | "resolved" | "unresolved" = "none";
  if (asset) {
    const subject: Subject | null = resolveSubject(asset);
    if (subject) {
      section = renderComparison(subject, compareAsset(subject, pkg.failed_assets || [], pkg.area));
      resolution = "resolved";
    } else {
      section = renderUnresolved(asset);
      resolution = "unresolved";
    }
  }
  return { html: pkg.html.replace(SLOT, section), resolution };
}

function bodyOf(html: string): string {
  const start = html.indexOf("<body>");
  const end = html.lastIndexOf("</body>");
  return start >= 0 && end > start ? html.slice(start + 6, end) : html;
}

function stylesOf(html: string): string {
  return (html.match(/<style>[\s\S]*?<\/style>/g) || []).join("\n");
}

const DOCUMENT_CSS = `<style>
.cover { max-width:1000px; margin:0 auto 34px; padding:0 0 26px; border-bottom:2px solid var(--ink); }
.cover .brand { font-size:12px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--acc); }
.cover h1 { margin:18px 0 0; font-size:34px; line-height:1.15; letter-spacing:-.02em; }
.cover .sub { margin:8px 0 0; font-size:15px; color:var(--ink2); }
.cover dl { display:grid; grid-template-columns:max-content 1fr; gap:6px 18px; margin:22px 0 0; font-size:13px; }
.cover dt { color:var(--ink2); }
.cover dd { margin:0; font-weight:600; }
.toc { max-width:1000px; margin:0 auto 10px; }
.toc h2 { font-size:16px; margin:0 0 10px; }
.toc ol { margin:0; padding-left:20px; }
.toc li { margin:0 0 10px; font-size:13.5px; }
.toc li a { color:var(--ink); font-weight:700; text-decoration:none; }
.toc .why { display:block; color:var(--ink2); font-size:12.5px; margin-top:2px; }
.toc .role { font-size:10.5px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--acc); margin-left:6px; }
.chapter { margin-top:46px; padding-top:30px; border-top:1px solid var(--line); }
.chapterHead { max-width:1000px; margin:0 auto 6px; font-size:11px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--acc); }
.chapterWhy { max-width:1000px; margin:0 auto 14px; font-size:13px; color:var(--ink2); }
.legal { max-width:1000px; margin:40px auto 0; padding-top:14px; border-top:1px solid var(--line); font-size:11.5px; color:var(--ink2); }
@page { size:A4; margin:14mm 12mm; }
@media print {
  body { background:#fff; padding:0; font-size:11.5px; }
  .sheet, .cover, .toc, .chapterHead, .chapterWhy, .legal { max-width:none; }
  table { width:100%; font-size:9.5px; }
  th, td { padding:4px 5px !important; overflow-wrap:break-word; hyphens:auto; }
  th { word-break:keep-all; }
  figure.chart svg { max-width:100%; height:auto; }
  .wrap, .tablewrap, .scroll { overflow:visible !important; }
  .chapter { break-before:page; margin-top:0; border-top:0; padding-top:0; }
  .toc { break-after:page; }
  a { color:inherit; }
  h2, h3 { break-after:avoid; }
  tr, figure { break-inside:avoid; }
}
</style>`;

function fmtDate(iso: string): string {
  const d = iso ? new Date(iso) : new Date();
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** The whole report as one self-contained HTML file: cover, contents, every chapter. */
export function renderReportDocument(opts: {
  slugs: string[];
  asset: string;
  preparedFor: string;
  issuedAt: string;
  release: string;
  print?: boolean;
}): { html: string; title: string } {
  const chapters = chaptersFor(opts.slugs, opts.asset);
  const subject = opts.asset ? resolveSubject(opts.asset) : null;
  const name = subject?.label || opts.asset || (chapters[0]?.cohort ?? "Diligence report");
  const title = `Diligence report — ${name}`;
  const first = chapters.length ? PACKAGES[chapters[0].slug]?.html || "" : "";
  const until = opts.issuedAt ? new Date(new Date(opts.issuedAt).getTime() + 365 * 86400000).toISOString() : "";

  const cover = `<div class="cover">
<div class="brand">Clinical Trial Failures · Diligence report</div>
<h1>${esc(name)}</h1>
<p class="sub">${subject ? esc(subject.note) : ""}</p>
<dl>
${opts.preparedFor ? `<dt>Prepared for</dt><dd>${esc(opts.preparedFor)}</dd>` : ""}
<dt>Issued</dt><dd>${esc(fmtDate(opts.issuedAt))}</dd>
<dt>Data release</dt><dd>${esc(opts.release)} · ClinicalTrials.gov registry</dd>
<dt>Chapters</dt><dd>${chapters.length}</dd>
${until ? `<dt>Online access until</dt><dd>${esc(fmtDate(until))}</dd>` : ""}
</dl>
</div>`;

  const toc = `<div class="toc"><h2>Contents</h2><ol>${chapters.map((c, i) => `<li><a href="#chapter-${i + 1}">${esc(c.cohort)}</a>`
    + `<span class="role">${c.role === "main" ? "Main chapter" : "Further chapter"}</span>`
    + `<span class="why">${c.counts.total_in_cohort.toLocaleString("en-US")} trials · ${c.counts.stopped} stopped early · `
    + `${(c.rate * 100).toFixed(1)}% of closed trials against ${(c.comparator_rate * 100).toFixed(1)}% for ${esc(c.area.toLowerCase())}`
    + `${c.reason ? `<br>${esc(c.reason)}` : ""}</span></li>`).join("")}</ol></div>`;

  const body = chapters.map((c, i) => {
    const chapter = renderChapter(c.slug, opts.asset).html;
    return `<section class="chapter" id="chapter-${i + 1}">
<div class="chapterHead">Chapter ${i + 1} of ${chapters.length} · ${c.role === "main" ? "Main chapter" : "Further chapter"}</div>
${c.reason ? `<p class="chapterWhy">${esc(c.reason)}</p>` : ""}
${bodyOf(chapter)}
</section>`;
  }).join("\n");

  const legal = `<p class="legal">Automated analysis of public registry records (ClinicalTrials.gov); no clinician has reviewed them. `
    + `Comparisons are unadjusted. Not medical advice. © Clinical Trial Failures — licensed to the purchaser for internal use.</p>`;

  const printScript = opts.print
    ? `<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},400)});</script>`
    : "";

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
${stylesOf(first)}
${DOCUMENT_CSS}
</head><body>
${cover}
${toc}
${body}
${legal}
${printScript}
</body></html>`;
  return { html, title };
}
