// web/pages/atlas.tsx
//
// The atlas of stopped trials: every stopped trial as one light, clustered by disease area and
// coloured by why it stopped. The statement and the legend render on the server; the map itself is
// a canvas drawn in the browser from public/atlas/data.json (lib/atlas.ts, built in data:optimize).
//
// Tone: these are studies people volunteered for. No graveyard imagery, no red for "dead"; the page
// shows how few trials stop because a treatment failed, which is the point the whole site makes.

import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps } from "next";
import { useEffect, useRef } from "react";

import { ATLAS_DATA_URL, atlasSummary, type AtlasData, type AtlasSummary } from "@/lib/atlas";
import { DATA_LICENSE_URL, DATASET_CREATOR } from "@/lib/licensing";
import { serializeJsonLd } from "@/lib/serializeJsonLd";

const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/atlas`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;

type AtlasPageProps = {
  summary: AtlasSummary;
  version: string;
};

const fmt = (n: number) => n.toLocaleString("en-US");

export const getStaticProps: GetStaticProps<AtlasPageProps> = async () => {
  const { loadIndexServer, loadMetaServer } = await import("@/lib/server-data");
  const [rows, meta] = await Promise.all([loadIndexServer(), loadMetaServer()]);
  return { props: { summary: atlasSummary(rows), version: meta.version || "" } };
};

export default function AtlasPage({ summary, version }: AtlasPageProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const oneIn = Math.round(summary.total / Math.max(1, summary.biological));
  const title = `Atlas of stopped clinical trials: ${fmt(summary.total)} trials, one light each`;
  const description = `Every stopped clinical trial on ClinicalTrials.gov as one light, grouped by disease area. Only about 1 in ${oneIn} stopped because the treatment showed too little benefit or raised safety concerns.`;

  useEffect(() => {
    if (!rootRef.current) return;
    return startAtlas(rootRef.current);
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Atlas of stopped clinical trials",
    description,
    url: CANONICAL_URL,
    license: DATA_LICENSE_URL,
    creator: DATASET_CREATOR,
    isBasedOn: "https://clinicaltrials.gov",
    isAccessibleForFree: true,
    ...(version ? { dateModified: version } : {}),
    variableMeasured: summary.groups.map((group) => group.label),
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={CANONICAL_URL} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={CANONICAL_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <meta name="theme-color" content="#0a0e16" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      </Head>

      <div className="atlasRoot" ref={rootRef}>
        <canvas className="atlasStage" data-atlas="stage" aria-label={`Map of ${fmt(summary.total)} stopped clinical trials, one light per trial, grouped by disease area`} />

        <div className="atlasLoading" data-atlas="loading">Gathering {fmt(summary.total)} lights…</div>

        <header className="atlasOverlay atlasIntro">
          <div className="atlasEyebrow">
            <Link href="/">Clinical Trial Failures</Link> · Atlas of stopped trials
          </div>
          <h1>{fmt(summary.total)} lessons</h1>
          <p className="atlasThesis">
            Every light is a clinical trial that stopped early. Only about <strong>1 in {oneIn}</strong> stopped because the treatment{" "}
            <em>did not show enough benefit</em> or raised safety concerns. Most stopped for reasons that say nothing about the medicine.
          </p>
          <p className="atlasTribute">
            Behind most of these lights are people who volunteered to take part. What they made possible is part of what medicine knows today.
          </p>
        </header>

        <div className="atlasOverlay atlasControls">
          <input className="atlasField" data-atlas="search" id="atlas-search" type="search" placeholder="Search sponsor, drug or NCT ID" autoComplete="off" aria-label="Search sponsor, drug or NCT ID" />
          <select className="atlasField" data-atlas="phase" id="atlas-phase" aria-label="Filter by phase" defaultValue="">
            <option value="">All phases</option>
          </select>
          <button className="atlasBtn" data-atlas="share" type="button">Copy link</button>
          <button className="atlasBtn" data-atlas="reset" type="button">Show all</button>
        </div>

        <nav className="atlasOverlay atlasLegend" data-atlas="legend" aria-label="Why the trials stopped">
          <div className="atlasLegendHead">
            <span className="atlasEyebrow">Why it stopped</span>
            <span className="atlasCount">tap to filter</span>
          </div>
          {summary.groups.map((group, index) => (
            <div key={group.key} className="atlasLegendRow">
              {index === 2 || index === 6 ? <div className="atlasDivider" /> : null}
              <button type="button" data-group={index} aria-pressed="true">
                <span className="atlasDot" style={{ color: `var(--atlas-${group.key})`, background: `var(--atlas-${group.key})` }} />
                <span>{group.label}</span>
                <span className="atlasCount">{fmt(group.count)}</span>
              </button>
            </div>
          ))}
        </nav>

        <div className="atlasOverlay atlasStatus">
          <div className="atlasMatch" data-atlas="match">{fmt(summary.total)} stopped trials</div>
          <div className="atlasHint">Scroll or pinch to zoom · drag to move · click a light</div>
        </div>

        <div className="atlasCard" data-atlas="card" hidden>
          <button className="atlasClose" data-atlas="card-close" type="button" aria-label="Close">×</button>
          <div className="atlasReason" data-atlas="card-reason" />
          <h2 data-atlas="card-title" />
          <blockquote data-atlas="card-why" />
          <div className="atlasSponsor" data-atlas="card-sponsor" />
          <div className="atlasMeta" data-atlas="card-meta" />
          <div className="atlasLinks" data-atlas="card-links" />
          <div className="atlasPinHint">Click to open the record</div>
        </div>

        <div className="atlasToast" data-atlas="toast" hidden />
      </div>

      <style jsx global>{`
        .atlasRoot {
          --atlas-night: #0a0e16;
          --atlas-night-2: #111827;
          --atlas-panel: rgba(14, 19, 30, 0.86);
          --atlas-line: rgba(160, 178, 214, 0.16);
          --atlas-ink: #e8ecf4;
          --atlas-ink-soft: #a6b0c3;
          --atlas-ink-faint: #6f7a90;
          --atlas-focus: #f2c879;
          --atlas-efficacy: #f2b45a;
          --atlas-safety: #ec8f8a;
          --atlas-transition: #94d6ae;
          --atlas-recruitment: #6fa9f3;
          --atlas-business: #b49ef2;
          --atlas-operational: #6ccbc5;
          --atlas-unclear: #6c7891;
          --atlas-display: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
          position: fixed;
          inset: 0;
          overflow: hidden;
          background: var(--atlas-night);
          color: var(--atlas-ink);
          color-scheme: dark;
        }
        .atlasRoot * { box-sizing: border-box; }
        .atlasStage { position: absolute; inset: 0; display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
        .atlasStage.dragging { cursor: grabbing; }
        .atlasStage.pointing { cursor: pointer; }
        .atlasOverlay { position: absolute; z-index: 2; pointer-events: none; }
        .atlasOverlay > * { pointer-events: auto; }

        .atlasIntro {
          top: calc(env(safe-area-inset-top, 0px) + 20px);
          left: max(16px, env(safe-area-inset-left, 0px));
          max-width: min(440px, calc(100vw - 32px));
          display: grid;
          gap: 10px;
          text-shadow: 0 0 14px var(--atlas-night), 0 0 6px var(--atlas-night), 0 0 2px var(--atlas-night);
        }
        .atlasRoot .atlasEyebrow {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--atlas-ink-faint);
        }
        .atlasRoot .atlasEyebrow a { color: var(--atlas-ink-soft); text-decoration: none; }
        .atlasRoot .atlasEyebrow a:hover { color: var(--atlas-ink); text-decoration: underline; text-underline-offset: 3px; }
        .atlasRoot h1 {
          margin: 0;
          font-family: var(--atlas-display);
          font-weight: 400;
          font-size: clamp(2.2rem, 4.4vw, 3.6rem);
          line-height: 1;
          letter-spacing: -0.01em;
          color: var(--atlas-ink);
          text-wrap: balance;
        }
        .atlasThesis { margin: 0; font-size: 15px; line-height: 1.55; color: var(--atlas-ink-soft); }
        .atlasThesis strong { color: var(--atlas-ink); font-weight: 600; }
        .atlasThesis em { color: var(--atlas-efficacy); }
        .atlasTribute {
          margin: 2px 0 0;
          padding-left: 12px;
          border-left: 1px solid var(--atlas-line);
          font-family: var(--atlas-display);
          font-style: italic;
          font-size: 15px;
          line-height: 1.5;
          color: var(--atlas-ink-soft);
        }

        .atlasControls {
          top: calc(env(safe-area-inset-top, 0px) + 20px);
          right: max(16px, env(safe-area-inset-right, 0px));
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
          max-width: min(520px, calc(100vw - 32px));
        }
        .atlasField, .atlasBtn {
          height: 36px;
          border: 1px solid var(--atlas-line);
          border-radius: 6px;
          background: var(--atlas-panel);
          color: var(--atlas-ink);
          font-size: 13px;
          font-weight: 500;
          backdrop-filter: blur(8px);
        }
        .atlasField { padding: 0 12px; }
        .atlasField::placeholder { color: var(--atlas-ink-faint); }
        #atlas-search { width: 220px; }
        .atlasBtn { padding: 0 14px; cursor: pointer; }
        .atlasBtn:hover { border-color: rgba(160, 178, 214, 0.4); }
        .atlasRoot :is(.atlasField, .atlasBtn, .atlasLegend button, .atlasCard a, .atlasEyebrow a):focus-visible { outline: 2px solid var(--atlas-focus); outline-offset: 2px; }

        .atlasLegend {
          bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
          left: max(16px, env(safe-area-inset-left, 0px));
          padding: 12px;
          border: 1px solid var(--atlas-line);
          border-radius: 8px;
          background: var(--atlas-panel);
          backdrop-filter: blur(8px);
          display: grid;
          gap: 2px;
          width: min(300px, calc(100vw - 32px));
        }
        .atlasLegendRow { display: contents; }
        .atlasLegendHead { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 0 6px 6px; }
        .atlasLegendHead .atlasEyebrow { font-size: 10px; }
        .atlasLegend button {
          display: grid;
          grid-template-columns: 12px 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 6px;
          border: 0;
          border-radius: 4px;
          background: transparent;
          color: var(--atlas-ink);
          font-size: 13px;
          line-height: 1.2;
          text-align: left;
          cursor: pointer;
        }
        .atlasLegend button:hover { background: rgba(160, 178, 214, 0.08); }
        .atlasLegend button[aria-pressed="false"] { color: var(--atlas-ink-faint); }
        .atlasLegend button[aria-pressed="false"] .atlasDot { opacity: 0.25; box-shadow: none; }
        .atlasDot { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 8px currentColor; }
        .atlasRoot .atlasCount { font-family: var(--font-mono); font-size: 12px; color: var(--atlas-ink-faint); font-variant-numeric: tabular-nums; }
        .atlasDivider { height: 1px; margin: 4px 6px; background: var(--atlas-line); }

        .atlasStatus {
          bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
          right: max(16px, env(safe-area-inset-right, 0px));
          display: grid;
          justify-items: end;
          gap: 8px;
        }
        .atlasMatch { font-family: var(--font-mono); font-size: 12px; color: var(--atlas-ink-soft); font-variant-numeric: tabular-nums; }
        .atlasHint { font-size: 12px; color: var(--atlas-ink-faint); }

        .atlasCard {
          position: absolute;
          z-index: 3;
          width: min(340px, calc(100vw - 32px));
          padding: 14px 16px;
          border: 1px solid var(--atlas-line);
          border-radius: 8px;
          background: rgba(12, 16, 26, 0.95);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
          display: grid;
          gap: 8px;
          pointer-events: none;
        }
        .atlasCard[hidden] { display: none; }
        .atlasCard.pinned { pointer-events: auto; }
        .atlasMeta { display: flex; flex-wrap: wrap; gap: 6px 10px; font-family: var(--font-mono); font-size: 11px; color: var(--atlas-ink-faint); }
        .atlasReason { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; letter-spacing: 0.02em; }
        .atlasCard h2 { margin: 0; font-size: 15px; font-weight: 600; line-height: 1.35; color: var(--atlas-ink); }
        .atlasCard blockquote {
          margin: 0;
          padding-left: 10px;
          border-left: 2px solid var(--atlas-line);
          font-family: var(--atlas-display);
          font-style: italic;
          font-size: 15px;
          line-height: 1.45;
          color: var(--atlas-ink-soft);
        }
        .atlasSponsor { font-size: 12px; color: var(--atlas-ink-soft); }
        .atlasLinks { display: none; gap: 14px; font-size: 13px; font-weight: 600; }
        .atlasCard.pinned .atlasLinks { display: flex; flex-wrap: wrap; }
        .atlasCard a { color: var(--atlas-focus); text-decoration: none; }
        .atlasCard a:hover { text-decoration: underline; text-underline-offset: 3px; }
        .atlasClose { position: absolute; top: 6px; right: 8px; display: none; border: 0; background: transparent; color: var(--atlas-ink-faint); font-size: 18px; cursor: pointer; }
        .atlasCard.pinned .atlasClose { display: block; }
        .atlasPinHint { font-size: 11px; color: var(--atlas-ink-faint); }
        .atlasCard.pinned .atlasPinHint { display: none; }

        .atlasLoading {
          position: absolute; inset: 0; z-index: 4;
          display: grid; place-items: center;
          font-family: var(--atlas-display); font-style: italic; font-size: 20px; color: var(--atlas-ink-soft);
          background: var(--atlas-night);
          transition: opacity 600ms ease;
        }
        .atlasLoading.done { opacity: 0; pointer-events: none; }
        .atlasToast {
          position: absolute; z-index: 5; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
          transform: translateX(-50%);
          padding: 8px 14px; border-radius: 6px; border: 1px solid var(--atlas-line);
          background: var(--atlas-night-2); color: var(--atlas-ink); font-size: 13px;
        }
        .atlasToast[hidden] { display: none; }

        @media (max-width: 760px) {
          .atlasIntro { gap: 8px; }
          .atlasRoot h1 { font-size: 2rem; }
          .atlasThesis { font-size: 13px; }
          .atlasTribute { display: none; }
          .atlasControls {
            top: auto; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
            left: max(16px, env(safe-area-inset-left, 0px));
            max-width: none; display: grid; grid-template-columns: minmax(0, 1fr) auto auto;
          }
          #atlas-search { grid-column: 1 / -1; width: auto; min-width: 0; }
          #atlas-phase { min-width: 0; }
          .atlasLegend { bottom: calc(env(safe-area-inset-bottom, 0px) + 104px); width: calc(100vw - 32px); grid-template-columns: 1fr 1fr; column-gap: 4px; padding: 8px; }
          .atlasLegendHead, .atlasDivider { grid-column: 1 / -1; }
          .atlasLegend button { font-size: 12px; padding: 4px; }
          .atlasStatus { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .atlasLoading { transition: none; }
        }
      `}</style>
    </>
  );
}

/** Wires the canvas map to the server-rendered shell. Returns a cleanup function. */
function startAtlas(root: HTMLElement): () => void {
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = <T extends HTMLElement>(name: string) => root.querySelector(`[data-atlas="${name}"]`) as T;
  const canvas = el<HTMLCanvasElement>("stage");
  const ctx = canvas.getContext("2d")!;
  const css = getComputedStyle(root);
  const token = (name: string) => css.getPropertyValue(name).trim();
  const fontMono = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || "monospace";

  let alive = true;
  let D: AtlasData | null = null;
  let N = 0;
  let colors: string[] = [];
  let sprites: HTMLCanvasElement[] = [];
  let active = new Uint8Array(0);
  let groupOn: boolean[] = [];
  let phaseFilter = "";
  let query = "";
  let areaFocus = -1;
  let hover = -1;
  let pinned = -1;
  let view = { x: 0, y: 0, k: 1 };
  let target: { from: typeof view; to: typeof view; t0: number; dur: number } | null = null;
  let W = 0, H = 0, dpr = 1;
  let introStart = 0;
  let introDone = REDUCED;
  let startX = new Float32Array(0), startY = new Float32Array(0), twinkle = new Float32Array(0);
  const grid = new Map<string, number[]>();
  const cell = 40;
  let dirty = true;
  let labels: Array<{ x: number; y: number; w: number; h: number } | null> = [];
  const cleanups: Array<() => void> = [];

  const on = <E extends Event>(target: EventTarget, type: string, fn: (ev: E) => void, opts?: AddEventListenerOptions) => {
    const handler = fn as unknown as EventListener;
    target.addEventListener(type, handler, opts);
    cleanups.push(() => target.removeEventListener(type, handler, opts));
  };

  const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function makeSprite(color: string) {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.12, color);
    grad.addColorStop(0.35, `${color}88`);
    grad.addColorStop(1, `${color}00`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = root.clientWidth;
    H = root.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    dirty = true;
  }

  function setView(v: typeof view, animate: boolean) {
    if (!animate || REDUCED) { view = v; target = null; }
    else target = { from: { ...view }, to: v, t0: performance.now(), dur: 900 };
    dirty = true;
  }

  function fitAll(animate: boolean) {
    if (!D) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const a of D.areas) {
      minX = Math.min(minX, a.x - a.r); maxX = Math.max(maxX, a.x + a.r);
      minY = Math.min(minY, a.y - a.r); maxY = Math.max(maxY, a.y + a.r);
    }
    // wide screens: the statement sits left of the map; medium screens: above it;
    // phones: statement above, legend and controls below
    const narrow = W < 760;
    const wide = W >= 1180;
    const padTop = narrow ? 200 : wide ? 70 : 230;
    const padBottom = narrow ? 340 : 70;
    const padSide = wide ? Math.min(520, W * 0.36) : narrow ? 20 : 300;
    const availW = W - padSide - 40, availH = H - padTop - padBottom;
    const k = Math.min(availW / (maxX - minX), availH / (maxY - minY));
    const cx = (minX + maxX) / 2 - (narrow ? 0 : (padSide - 40) / 2 / k);
    const cy = (minY + maxY) / 2 - (padTop - padBottom) / 2 / k;
    setView({ x: cx, y: cy, k }, animate);
  }

  function focusArea(i: number, animate = true) {
    const a = D!.areas[i];
    setView({ x: a.x, y: a.y, k: (Math.min(W, H) * 0.42) / a.r }, animate);
  }

  function buildGrid() {
    for (let i = 0; i < N; i++) {
      const key = `${Math.floor(D!.x[i] / cell)},${Math.floor(D!.y[i] / cell)}`;
      let list = grid.get(key);
      if (!list) grid.set(key, (list = []));
      list.push(i);
    }
  }

  function nearest(wx: number, wy: number, maxDist: number) {
    const gx = Math.floor(wx / cell), gy = Math.floor(wy / cell);
    const reach = Math.ceil(maxDist / cell);
    let best = -1, bestD = maxDist * maxDist;
    for (let dx = -reach; dx <= reach; dx++) for (let dy = -reach; dy <= reach; dy++) {
      const list = grid.get(`${gx + dx},${gy + dy}`);
      if (!list) continue;
      for (const i of list) {
        if (!active[i]) continue;
        const ex = D!.x[i] - wx, ey = D!.y[i] - wy, d = ex * ex + ey * ey;
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    return best;
  }

  function matchesQuery(i: number, q: string, nct: number | null, sponsorHits: Set<number> | null) {
    if (!q) return true;
    if (nct !== null) return D!.id[i] === nct;
    return sponsorHits!.has(D!.s[i]) || D!.d[i].toLowerCase().includes(q) || D!.t[i].toLowerCase().includes(q);
  }

  function applyFilters() {
    const data = D!;
    const q = query.trim().toLowerCase();
    const m = q.match(/^nct\s*0*(\d{1,8})$/);
    const nct = m ? Number(m[1]) : null;
    const sponsorHits = q && nct === null ? new Set(data.sponsors.map((s, i) => (s.toLowerCase().includes(q) ? i : -1)).filter((i) => i >= 0)) : null;
    let count = 0;
    const perGroup = new Array(data.groups.length).fill(0);
    for (let i = 0; i < N; i++) {
      // the legend counts follow every filter except the reason toggles themselves
      const base = (phaseFilter === "" || data.p[i] === Number(phaseFilter)) && (areaFocus < 0 || data.a[i] === areaFocus) && matchesQuery(i, q, nct, sponsorHits);
      if (base) perGroup[data.g[i]]++;
      const ok = base && groupOn[data.g[i]];
      active[i] = ok ? 1 : 0;
      if (ok) count++;
    }
    data.groups.forEach((_, g) => {
      const countEl = root.querySelector(`[data-group="${g}"] .atlasCount`);
      if (countEl) countEl.textContent = perGroup[g].toLocaleString("en-US");
    });
    const scope = areaFocus >= 0 ? ` in ${data.areas[areaFocus].name}` : "";
    el("match").textContent = count === N ? `${N.toLocaleString("en-US")} stopped trials` : `${count.toLocaleString("en-US")} of ${N.toLocaleString("en-US")} trials${scope}`;
    if (hover >= 0 && !active[hover]) hideCard();
    dirty = true;
    return count;
  }

  const worldToScreen = (wx: number, wy: number) => [(wx - view.x) * view.k + W / 2, (wy - view.y) * view.k + H / 2];
  const screenToWorld = (sx: number, sy: number) => [(sx - W / 2) / view.k + view.x, (sy - H / 2) / view.k + view.y];
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const clampK = (k: number) => Math.max(0.05, Math.min(40, k));

  function draw(now: number) {
    if (!alive || !D) return;
    if (target) {
      const t = Math.min(1, (now - target.t0) / target.dur), e = easeOutCubic(t);
      const lk = Math.log(target.from.k) + (Math.log(target.to.k) - Math.log(target.from.k)) * e;
      view = { x: target.from.x + (target.to.x - target.from.x) * e, y: target.from.y + (target.to.y - target.from.y) * e, k: Math.exp(lk) };
      if (t >= 1) target = null;
      dirty = true;
    }
    let p = 1;
    if (!introDone) {
      p = Math.min(1, (now - introStart) / 2600);
      if (p >= 1) introDone = true;
      dirty = true;
    }
    if (!dirty) { requestAnimationFrame(draw); return; }
    dirty = false;

    const data = D;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = token("--atlas-night");
    ctx.fillRect(0, 0, W, H);

    const k = view.k;
    const r = Math.max(1.3, Math.min(20, k * 10 * 0.8));
    const anyFilter = areaFocus >= 0 || phaseFilter !== "" || query.trim() !== "" || groupOn.some((v) => !v);
    const e = easeOutCubic(p);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < N; i++) {
      let wx = data.x[i], wy = data.y[i];
      if (!introDone) {
        // each light drifts in from a scattered start, later lights a little later
        const delay = ((i % 97) / 97) * 0.35;
        const q = easeOutCubic(Math.max(0, Math.min(1, (p - delay) / (1 - delay))));
        wx = startX[i] + (wx - startX[i]) * q;
        wy = startY[i] + (wy - startY[i]) * q;
      }
      const sx = (wx - view.x) * k + W / 2, sy = (wy - view.y) * k + H / 2;
      if (sx < -r || sy < -r || sx > W + r || sy > H + r) continue;
      const lit = active[i];
      const g = data.g[i];
      let alpha = lit ? (g === 6 ? 0.55 : 0.95) : anyFilter ? 0.08 : 0.95;
      if (!introDone) alpha *= Math.min(1, e * 1.4);
      const size = (g === 6 ? r * 0.8 : r) * (lit || !anyFilter ? 1 : 0.7) * twinkle[i];
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprites[g], sx - size, sy - size, size * 2, size * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    for (const i of [hover, pinned]) {
      if (i < 0) continue;
      const [sx, sy] = worldToScreen(data.x[i], data.y[i]);
      ctx.strokeStyle = token("--atlas-focus");
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(7, r * 0.9), 0, Math.PI * 2);
      ctx.stroke();
    }

    // area labels: above the cluster, or below it when that spot is taken; skipped if neither fits
    labels = data.areas.map(() => null);
    if (introDone || p > 0.75) {
      ctx.globalAlpha = introDone ? 1 : (p - 0.75) * 4;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      const taken: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
      const overlaps = (b: (typeof taken)[number]) => taken.some((t) => b.x0 < t.x1 && b.x1 > t.x0 && b.y0 < t.y1 && b.y1 > t.y0);
      data.areas.forEach((a, i) => {
        const rr = a.r * k;
        if (rr < (W < 760 ? 26 : 18)) return;
        ctx.font = `500 ${rr > 120 ? 12 : 11}px ${fontMono}`;
        const name = a.name.toUpperCase();
        const w = ctx.measureText(name).width + 8, h = 30;
        const [cx] = worldToScreen(a.x, a.y);
        const top = worldToScreen(a.x, a.y - a.r)[1] - 6;
        const bottom = worldToScreen(a.x, a.y + a.r)[1] + 6 + h;
        let base: number | null = null;
        for (const y of [top, bottom]) {
          const box = { x0: cx - w / 2, x1: cx + w / 2, y0: y - h, y1: y };
          if (!overlaps(box)) { taken.push(box); base = y; break; }
        }
        if (base === null) return;
        const dim = areaFocus >= 0 && areaFocus !== i;
        // a dark halo keeps a label readable where it crosses a neighbouring cluster
        ctx.strokeStyle = token("--atlas-night");
        ctx.lineWidth = 4;
        ctx.lineJoin = "round";
        ctx.strokeText(name, cx, base);
        ctx.fillStyle = dim ? "rgba(166,176,195,0.35)" : token("--atlas-ink-soft");
        ctx.fillText(name, cx, base);
        ctx.font = `400 11px ${fontMono}`;
        const n = a.n.toLocaleString("en-US");
        ctx.strokeText(n, cx, base - 15);
        ctx.fillStyle = dim ? "rgba(111,122,144,0.35)" : token("--atlas-ink-faint");
        ctx.fillText(n, cx, base - 15);
        labels[i] = { x: cx, y: base, w, h };
      });
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(draw);
  }

  // ---------- card ----------
  function fillCard(i: number) {
    const data = D!;
    const group = data.groups[data.g[i]];
    const color = colors[data.g[i]];
    const reason = el("card-reason");
    reason.replaceChildren();
    const dot = document.createElement("span");
    dot.className = "atlasDot";
    dot.style.color = color;
    dot.style.background = color;
    const label = document.createElement("span");
    label.textContent = group.label;
    label.style.color = color;
    reason.append(dot, label);
    el("card-title").textContent = data.t[i] || "Untitled study";
    el("card-why").textContent = data.w[i] ? `“${data.w[i]}”` : "The registry record gives no reason for stopping.";
    el("card-sponsor").textContent = data.sponsors[data.s[i]];
    const nct = `NCT${String(data.id[i]).padStart(8, "0")}`;
    const parts = [nct, data.statuses[data.st[i]], data.phases[data.p[i]], data.areas[data.a[i]].name];
    if (data.yr[i]) parts.push(String(data.yr[i]));
    const meta = el("card-meta");
    meta.replaceChildren(...parts.map((part) => Object.assign(document.createElement("span"), { textContent: part })));
    const evidence = Object.assign(document.createElement("a"), { href: `/trial/${nct}`, textContent: "Read the evidence →" });
    const registry = Object.assign(document.createElement("a"), { href: `https://clinicaltrials.gov/study/${nct}`, target: "_blank", rel: "noopener", textContent: "ClinicalTrials.gov" });
    el("card-links").replaceChildren(evidence, registry);
  }

  function placeCard(sx: number, sy: number) {
    const card = el("card");
    const w = card.offsetWidth || 340, h = card.offsetHeight || 200;
    let x = sx + 18, y = sy + 18;
    if (x + w > W - 16) x = sx - w - 18;
    if (y + h > H - 16) y = Math.max(16, H - h - 16);
    card.style.left = `${Math.max(16, x)}px`;
    card.style.top = `${Math.max(16, y)}px`;
  }

  function showCard(i: number, sx: number, sy: number, pin: boolean) {
    const card = el("card");
    fillCard(i);
    card.hidden = false;
    card.classList.toggle("pinned", pin);
    if (W < 760) {
      card.style.left = "16px";
      card.style.top = "auto";
      card.style.bottom = "calc(env(safe-area-inset-bottom, 0px) + 16px)";
    } else {
      card.style.bottom = "auto";
      placeCard(sx, sy);
    }
  }

  function hideCard() {
    el("card").hidden = true;
    hover = -1;
    pinned = -1;
    dirty = true;
  }

  // ---------- interaction ----------
  const pointers = new Map<number, { x: number; y: number }>();
  let dragMoved = false;
  let pinch: { d: number; k: number; mid: number[]; view: typeof view } | null = null;

  function localPoint(ev: { clientX: number; clientY: number }) {
    const rect = root.getBoundingClientRect();
    return [ev.clientX - rect.left, ev.clientY - rect.top];
  }

  function areaAt(sx: number, sy: number) {
    for (let i = 0; i < labels.length; i++) {
      const l = labels[i];
      if (l && Math.abs(sx - l.x) < l.w / 2 && sy < l.y + 2 && sy > l.y - l.h) return i;
    }
    return null;
  }

  function setHash(name: string) {
    try { history.replaceState(history.state, "", name ? `#${name}` : location.pathname + location.search); } catch { /* ignore */ }
  }

  function readHash() {
    const data = D!;
    const name = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (!name) return;
    const ai = data.areas.findIndex((a) => slug(a.name) === name);
    if (ai >= 0) { areaFocus = ai; applyFilters(); focusArea(ai, false); return; }
    const gi = data.groups.findIndex((g) => g.key === name);
    if (gi >= 0) { groupOn = data.groups.map((_, j) => j === gi); syncLegend(); applyFilters(); }
  }

  function selectArea(i: number) {
    areaFocus = areaFocus === i ? -1 : i;
    hideCard();
    applyFilters();
    if (areaFocus >= 0) { focusArea(i); setHash(slug(D!.areas[i].name)); }
    else { fitAll(true); setHash(""); }
  }

  function syncLegend() {
    root.querySelectorAll<HTMLButtonElement>("[data-group]").forEach((b) => b.setAttribute("aria-pressed", groupOn[Number(b.dataset.group)] ? "true" : "false"));
  }

  function toast(text: string) {
    const t = el("toast");
    t.textContent = text;
    t.hidden = false;
    window.setTimeout(() => { t.hidden = true; }, 1800);
  }

  on(canvas, "pointerdown", (ev: PointerEvent) => {
    canvas.setPointerCapture(ev.pointerId);
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    dragMoved = false;
    target = null;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const [mx, my] = localPoint({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.k, mid: [mx, my], view: { ...view } };
    }
  });

  on(canvas, "pointermove", (ev: PointerEvent) => {
    if (!D) return;
    const prev = pointers.get(ev.pointerId);
    if (prev) {
      const dx = ev.clientX - prev.x, dy = ev.clientY - prev.y;
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pointers.size === 1) {
        if (!dragMoved && Math.hypot(dx, dy) < 2) return;
        dragMoved = true;
        canvas.classList.add("dragging");
        view = { ...view, x: view.x - dx / view.k, y: view.y - dy / view.k };
        dirty = true;
      } else if (pointers.size === 2 && pinch) {
        dragMoved = true;
        const [a, b] = [...pointers.values()];
        const k = clampK((pinch.k * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d);
        const wx = (pinch.mid[0] - W / 2) / pinch.view.k + pinch.view.x;
        const wy = (pinch.mid[1] - H / 2) / pinch.view.k + pinch.view.y;
        const [mx, my] = localPoint({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
        view = { k, x: wx - (mx - W / 2) / k, y: wy - (my - H / 2) / k };
        dirty = true;
      }
      return;
    }
    if (pinned >= 0 || !introDone || ev.pointerType === "touch") return;
    const [sx, sy] = localPoint(ev);
    const [wx, wy] = screenToWorld(sx, sy);
    const i = nearest(wx, wy, Math.max(8, 14 / view.k));
    canvas.classList.toggle("pointing", i >= 0 || areaAt(sx, sy) !== null);
    if (i !== hover) {
      hover = i;
      dirty = true;
      if (i >= 0) showCard(i, sx, sy, false);
      else el("card").hidden = true;
    } else if (i >= 0) placeCard(sx, sy);
  });

  const endPointer = (ev: PointerEvent) => {
    const wasDrag = dragMoved;
    pointers.delete(ev.pointerId);
    if (pointers.size < 2) pinch = null;
    canvas.classList.remove("dragging");
    if (!D || wasDrag || pointers.size > 0 || ev.type === "pointercancel") return;
    const [sx, sy] = localPoint(ev);
    const area = areaAt(sx, sy);
    if (area !== null) { selectArea(area); return; }
    const [wx, wy] = screenToWorld(sx, sy);
    const i = nearest(wx, wy, Math.max(8, 18 / view.k));
    if (i >= 0) { pinned = i; hover = i; showCard(i, sx, sy, true); dirty = true; }
    else hideCard();
  };
  on(canvas, "pointerup", endPointer);
  on(canvas, "pointercancel", endPointer);
  on(canvas, "pointerleave", () => {
    if (pinned < 0 && hover >= 0) { hover = -1; el("card").hidden = true; dirty = true; }
  });

  on(canvas, "wheel", (ev: WheelEvent) => {
    ev.preventDefault();
    target = null;
    const [sx, sy] = localPoint(ev);
    const [wx, wy] = screenToWorld(sx, sy);
    // normalise line/page scrolling and cap a single step, so one wheel notch is a gentle zoom
    const px = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaMode === 2 ? ev.deltaY * H : ev.deltaY;
    const k = clampK(view.k * Math.exp(-Math.max(-120, Math.min(120, px)) * 0.0025));
    view = { k, x: wx - (sx - W / 2) / k, y: wy - (sy - H / 2) / k };
    dirty = true;
  }, { passive: false });

  on(canvas, "dblclick", (ev: MouseEvent) => {
    const [sx, sy] = localPoint(ev);
    const [wx, wy] = screenToWorld(sx, sy);
    const k = clampK(view.k * 2.4);
    setView({ k, x: wx - (sx - W / 2) / k, y: wy - (sy - H / 2) / k }, true);
  });

  let searchTimer = 0;
  on(el("search"), "input", (ev: Event) => {
    window.clearTimeout(searchTimer);
    const value = (ev.target as HTMLInputElement).value;
    searchTimer = window.setTimeout(() => {
      if (!D) return;
      query = value;
      hideCard();
      const n = applyFilters();
      if (query.trim() && n > 0 && n <= 40) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < N; i++) if (active[i]) {
          minX = Math.min(minX, D.x[i]); maxX = Math.max(maxX, D.x[i]);
          minY = Math.min(minY, D.y[i]); maxY = Math.max(maxY, D.y[i]);
        }
        // keep enough of the surroundings in view to see which cluster the matches sit in
        const k = clampK(Math.min(W / Math.max(1600, (maxX - minX) * 1.6), H / Math.max(1600, (maxY - minY) * 1.6)));
        setView({ x: (minX + maxX) / 2, y: (minY + maxY) / 2, k }, true);
      }
    }, 180);
  });

  on(el("phase"), "change", (ev: Event) => {
    if (!D) return;
    phaseFilter = (ev.target as HTMLSelectElement).value;
    hideCard();
    applyFilters();
  });

  on(el("reset"), "click", () => {
    if (!D) return;
    groupOn = D.groups.map(() => true);
    phaseFilter = "";
    query = "";
    areaFocus = -1;
    el<HTMLSelectElement>("phase").value = "";
    el<HTMLInputElement>("search").value = "";
    syncLegend();
    hideCard();
    applyFilters();
    fitAll(true);
    setHash("");
  });

  on(el("share"), "click", async () => {
    try { await navigator.clipboard.writeText(location.href); toast("Link copied"); }
    catch { toast(location.href); }
  });

  root.querySelectorAll<HTMLButtonElement>("[data-group]").forEach((button) => {
    on(button, "click", (ev: MouseEvent) => {
      if (!D) return;
      const i = Number(button.dataset.group);
      // the first click on a full legend shows only that reason; later clicks toggle
      if (ev.altKey || groupOn.every(Boolean)) groupOn = D.groups.map((_, j) => j === i);
      else {
        groupOn[i] = !groupOn[i];
        if (!groupOn.some(Boolean)) groupOn = D.groups.map(() => true);
      }
      syncLegend();
      applyFilters();
      const single = groupOn.filter(Boolean).length === 1 ? D.groups[groupOn.indexOf(true)].key : "";
      setHash(single || (areaFocus >= 0 ? slug(D.areas[areaFocus].name) : ""));
    });
  });

  on(el("card-close"), "click", hideCard);
  on(document, "keydown", (ev: KeyboardEvent) => { if (ev.key === "Escape") hideCard(); });
  on(window, "resize", () => { resize(); if (D && areaFocus < 0 && !query) fitAll(false); });
  on(window, "hashchange", () => { if (D) readHash(); });

  resize();
  fetch(ATLAS_DATA_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`atlas data: ${res.status}`);
      return res.json() as Promise<AtlasData>;
    })
    .then((data) => {
      if (!alive) return;
      D = data;
      N = data.x.length;
      active = new Uint8Array(N).fill(1);
      groupOn = data.groups.map(() => true);
      colors = data.groups.map((g) => token(`--atlas-${g.key}`));
      sprites = colors.map(makeSprite);
      const phaseSelect = el<HTMLSelectElement>("phase");
      data.phases.forEach((label, i) => phaseSelect.append(Object.assign(document.createElement("option"), { value: String(i), textContent: label })));
      buildGrid();
      let seed = 7;
      const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      startX = new Float32Array(N);
      startY = new Float32Array(N);
      twinkle = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const angle = rand() * Math.PI * 2, radius = 2600 + rand() * 1800;
        startX[i] = Math.cos(angle) * radius;
        startY[i] = Math.sin(angle) * radius * 0.7;
        twinkle[i] = 0.7 + rand() * 0.5;   // so the field is not a uniform grid
      }
      fitAll(false);
      applyFilters();
      readHash();
      el("loading").classList.add("done");
      introStart = performance.now();
      requestAnimationFrame(draw);
    })
    .catch((error) => {
      console.error(error);
      el("loading").textContent = "The map could not be loaded. Reload the page to try again.";
    });

  return () => {
    alive = false;
    window.clearTimeout(searchTimer);
    cleanups.forEach((fn) => fn());
  };
}
