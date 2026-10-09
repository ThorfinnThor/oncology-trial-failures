import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { GetStaticProps, GetStaticPropsContext } from "next";

import { OverviewServerSnapshot, getStaticProps as getOverviewStaticProps } from "../pages/overview";
import { OutliersServerSnapshot, getStaticProps as getOutliersStaticProps } from "../pages/outliers";
import { TopEntitiesServerSnapshot, getStaticProps as getTopEntitiesStaticProps } from "../pages/top-entities";

async function resolveStaticProps<Props extends Record<string, unknown>>(
  getStaticProps: GetStaticProps<Props>
): Promise<Props> {
  const result = await getStaticProps({} as GetStaticPropsContext);
  assert.ok("props" in result, "expected static props rather than a redirect or notFound response");
  return result.props;
}

test("overview exposes a substantive dataset snapshot before client hydration", async () => {
  const props = await resolveStaticProps(getOverviewStaticProps);
  const html = renderToStaticMarkup(createElement(OverviewServerSnapshot, { snapshot: props.initialSnapshot }));
  assert.match(html, /Clinical trial failure overview/);
  assert.match(html, /Leading stop-reason groups/);
  assert.match(html, /Largest disease-area slices/);
  assert.match(html, /23,868/);
});

test("outliers exposes the default statistical comparison before client hydration", async () => {
  const props = await resolveStaticProps(getOutliersStaticProps);
  const html = renderToStaticMarkup(createElement(OutliersServerSnapshot, { snapshot: props.initialSnapshot }));
  assert.match(html, /Phase II sponsor safety outliers/);
  assert.match(html, /Comparison baseline/);
  assert.match(html, /P\(&gt;baseline\)/);
});

test("top entities exposes sponsor and disease-area rankings before client hydration", async () => {
  const props = await resolveStaticProps(getTopEntitiesStaticProps);
  const html = renderToStaticMarkup(createElement(TopEntitiesServerSnapshot, { snapshot: props.initialSnapshot }));
  assert.match(html, /Efficacy and futility signal leaders/);
  assert.match(html, /Leading sponsors/);
  assert.match(html, /Leading disease areas/);
  assert.match(html, /23,868/);
});
