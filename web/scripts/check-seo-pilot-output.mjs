import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://clinicaltrialfailures.com";
const pagesDirectory = path.join(process.cwd(), ".next", "server", "pages");
const config = JSON.parse(
  await readFile(new URL("./seo-pilot.json", import.meta.url), "utf8")
);

function pageFile(route) {
  const relative = route === "/" ? "index" : route.replace(/^\//, "");
  return path.join(pagesDirectory, `${relative}.html`);
}

async function readPage(route) {
  return readFile(pageFile(route), "utf8");
}

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]])
  );
}

function tagWithAttribute(html, tagName, attribute, value) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "g"))]
    .map((match) => attributes(match[0]))
    .find((attrs) => attrs[attribute] === value);
}

function jsonLdObjects(html) {
  return [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .flatMap((match) => {
      const value = JSON.parse(match[1]);
      return Array.isArray(value) ? value : [value];
    });
}

function datasetMarkup(html) {
  return jsonLdObjects(html).find((item) => item?.["@type"] === "Dataset");
}

function assertIndexableHub(html, route) {
  const robots = tagWithAttribute(html, "meta", "name", "robots");
  assert.equal(robots?.content, config.expected.robots, `${route} must remain index,follow`);

  const canonical = tagWithAttribute(html, "link", "rel", "canonical");
  assert.equal(canonical?.href, `${SITE_URL}${route}`, `${route} must remain self-canonical`);
}

const pilotHtml = await readPage(config.pilotPath);
assertIndexableHub(pilotHtml, config.pilotPath);
assert.equal(
  tagWithAttribute(pilotHtml, "link", "rel", "canonical")?.href,
  config.expected.canonical,
  "Pilot canonical changed from the release contract"
);

const description = tagWithAttribute(pilotHtml, "meta", "name", "description")?.content || "";
assert.match(description, /source-linked evidence/i, "Pilot description must explain its evidence value");
assert.ok(!description.endsWith("..."), "Pilot description must not be truncated");
assert.ok(
  pilotHtml.includes("What the ophthalmology evidence slice actually shows"),
  "Pilot analysis heading is missing"
);

const editorialStart = pilotHtml.indexOf("What the ophthalmology evidence slice actually shows");
const editorialEnd = pilotHtml.indexOf("Evidence standard", editorialStart);
assert.ok(editorialStart >= 0 && editorialEnd > editorialStart, "Pilot editorial block is incomplete");
const editorialHtml = pilotHtml.slice(editorialStart, editorialEnd);
for (const label of ["Efficacy / futility example", "Safety example", "Unresolved example"]) {
  assert.ok(editorialHtml.includes(label), `Pilot evidence label is missing: ${label}`);
}
const evidenceLinks = new Set(
  [...editorialHtml.matchAll(/href="(\/trial\/NCT[^"]+)"/g)].map((match) => match[1])
);
assert.equal(
  evidenceLinks.size,
  config.expected.editorialEvidenceLinks,
  "Pilot must link the configured number of distinct trial examples"
);

const pilotDataset = datasetMarkup(pilotHtml);
assert.ok(pilotDataset, "Pilot Dataset JSON-LD is missing");
assert.equal(
  pilotDataset.mainEntity?.numberOfItems,
  config.expected.structuredTrialItems,
  "Pilot Dataset ItemList count changed"
);
assert.equal(
  pilotDataset.mainEntity?.itemListElement?.length,
  config.expected.structuredTrialItems,
  "Pilot Dataset ItemList entries do not match numberOfItems"
);
assert.ok(
  pilotDataset.mainEntity.itemListElement.every((item) => item.url?.startsWith(`${SITE_URL}/trial/`)),
  "Pilot Dataset ItemList must contain canonical trial URLs"
);

const pilotSize = (await stat(pageFile(config.pilotPath))).size;
assert.ok(
  pilotSize <= config.expected.maximumHtmlBytes,
  `Pilot HTML is ${pilotSize} bytes; maximum is ${config.expected.maximumHtmlBytes}`
);

const failureIndexHtml = await readPage("/failures");
assert.ok(
  failureIndexHtml.includes(`href="${config.pilotPath}"`),
  "Failure hub index must link to the Ophthalmology pilot"
);

for (const route of config.controlPaths) {
  const html = await readPage(route);
  assertIndexableHub(html, route);
  assert.ok(
    !html.includes("What the ophthalmology evidence slice actually shows"),
    `${route} must remain an unchanged control page`
  );
  assert.equal(
    datasetMarkup(html)?.mainEntity?.numberOfItems,
    60,
    `${route} structured ItemList changed from the control baseline`
  );
}

console.log(
  `SEO pilot output verified: ${config.pilotPath}, ${config.controlPaths.length} controls, ${pilotSize} HTML bytes.`
);
