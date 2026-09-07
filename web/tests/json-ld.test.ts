import assert from "node:assert/strict";
import test from "node:test";

import { serializeJsonLd } from "../lib/serializeJsonLd";

test("JSON-LD escapes script breakout payloads without changing registry strings", () => {
  const payload = {
    "@context": "https://schema.org",
    "@type": "MedicalTrial",
    name: '</script><script>alert("trial")</script>',
    sponsor: { name: "</ScRiPt ><img src=x onerror=alert(1)>" },
    description: "<!-- <script> registry text < 5 & > 1 -->",
    "<registry-key>": "<value>",
  };

  const serialized = serializeJsonLd(payload);

  assert.ok(!serialized.includes("<"));
  assert.ok(serialized.includes("\\u003c/script>"));
  assert.deepEqual(JSON.parse(serialized), payload);
});

test("JSON-LD preserves nested arrays, Unicode, quotes, and literal escape sequences", () => {
  const payload = [
    {
      "@type": "Dataset",
      name: 'Étude 癌 🧬 "quoted" \\ path\nnew line\t tab\u2028\u2029',
      description: "Literal \\u003c is different from <",
      values: [null, true, false, 0, 12.5, { text: "<nested>" }],
    },
    { "@type": "BreadcrumbList", itemListElement: [] },
  ];

  const serialized = serializeJsonLd(payload);

  assert.ok(!serialized.includes("<"));
  assert.deepEqual(JSON.parse(serialized), payload);
});

test("JSON-LD retains standard JSON serialization semantics", () => {
  const payload = {
    name: "A normal trial",
    omitted: undefined,
    values: [undefined, Number.NaN],
    updated: new Date("2026-09-07T00:00:00Z"),
  };

  assert.equal(serializeJsonLd(payload), JSON.stringify(payload));
  assert.equal(serializeJsonLd(null), "null");
});
