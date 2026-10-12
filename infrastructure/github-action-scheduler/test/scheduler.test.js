import assert from "node:assert/strict";
import test from "node:test";

import { dispatchUpdate, isMonday0815Berlin } from "../src/index.js";

test("selects 08:15 Berlin in summer and winter", () => {
  assert.equal(isMonday0815Berlin(Date.parse("2026-07-06T06:15:00Z")), true);
  assert.equal(isMonday0815Berlin(Date.parse("2026-12-07T07:15:00Z")), true);
  assert.equal(isMonday0815Berlin(Date.parse("2026-07-06T07:15:00Z")), false);
  assert.equal(isMonday0815Berlin(Date.parse("2026-12-07T06:15:00Z")), false);
});

test("dispatches only the reviewed workflow and branch", async () => {
  let request;
  await dispatchUpdate({
    GITHUB_TOKEN: "test-token",
    GITHUB_OWNER: "ThorfinnThor",
    GITHUB_REPO: "oncology-trial-failures",
    GITHUB_WORKFLOW: "update-data.yml",
    GITHUB_REF: "main",
  }, async (url, options) => {
    request = { url, options };
    return new Response(null, { status: 204 });
  });

  assert.equal(
    request.url,
    "https://api.github.com/repos/ThorfinnThor/oncology-trial-failures/actions/workflows/update-data.yml/dispatches"
  );
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.Authorization, "Bearer test-token");
  assert.deepEqual(JSON.parse(request.options.body), { ref: "main" });
});

test("fails loudly when GitHub rejects the dispatch", async () => {
  await assert.rejects(
    dispatchUpdate({
      GITHUB_TOKEN: "test-token",
      GITHUB_OWNER: "ThorfinnThor",
      GITHUB_REPO: "oncology-trial-failures",
      GITHUB_WORKFLOW: "update-data.yml",
      GITHUB_REF: "main",
    }, async () => new Response("denied", { status: 403 })),
    /failed \(403\): denied/
  );
});
