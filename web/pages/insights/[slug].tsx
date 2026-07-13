import type { GetStaticPaths, GetStaticProps } from "next";

import InsightArticlePage from "@/components/InsightArticlePage";
import { getInsightBySlug, INSIGHT_ARTICLES, type InsightArticle } from "@/lib/insights";
import { buildInsightStats } from "@/lib/insightStats";

type InsightPageProps = {
  article: InsightArticle;
};

export default function InsightPage({ article }: InsightPageProps) {
  return <InsightArticlePage article={article} />;
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: INSIGHT_ARTICLES.map((article) => ({
      params: { slug: article.slug },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<InsightPageProps> = async (ctx) => {
  const slug = String(ctx.params?.slug || "");
  const stats = await buildInsightStats();
  const article = getInsightBySlug(slug, stats);
  if (!article) return { notFound: true };

  return {
    props: {
      article,
    },
  };
};
