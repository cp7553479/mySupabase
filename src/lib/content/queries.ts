import { cache } from "react";

import { getPublishedCatalogueProducts } from "@/lib/catalogue/queries";
import { createPublicSupabaseClient } from "@/lib/supabase/client";

export type PublishedArticle = {
  body: string;
  excerpt: string | null;
  id: string;
  publishedAt: string | null;
  seoDescription: string | null;
  seoTitle: string | null;
  slug: string;
  title: string;
  topics: ContentTopic[];
};

export type ContentTopic = {
  name: string;
  slug: string;
};

type PublishedCatalogueProduct = Awaited<
  ReturnType<typeof getPublishedCatalogueProducts>
>[number];

export type PublicContentType =
  "blog" | "case_study" | "faq" | "page" | "resource";

type ContentEntryRow = {
  body: string | null;
  excerpt: string | null;
  id: string;
  published_at: string | null;
  seo_description: string | null;
  seo_title: string | null;
  slug: string;
  title: string;
};

type ContentTranslationRow = {
  body: string | null;
  content_entry_id: string;
  excerpt: string | null;
  seo_description: string | null;
  seo_title: string | null;
  title: string;
};

type ContentTopicRelationRow = {
  content_entry_id: string;
  taxonomy_term_id: string;
};

type ContentTopicRow = {
  id: string;
  name: string;
  slug: string;
};

function toArticle(
  entry: ContentEntryRow,
  translation: ContentTranslationRow | undefined,
  topics: ContentTopic[],
): PublishedArticle {
  return {
    body: translation?.body ?? entry.body ?? "",
    excerpt: translation?.excerpt ?? entry.excerpt,
    id: entry.id,
    publishedAt: entry.published_at,
    seoDescription: translation?.seo_description ?? entry.seo_description,
    seoTitle: translation?.seo_title ?? entry.seo_title,
    slug: entry.slug,
    title: translation?.title ?? entry.title,
    topics,
  };
}

export const getPublishedContent = cache(
  async (contentType: PublicContentType, locale: string) => {
    const supabase = createPublicSupabaseClient();
    const { data: entries, error: entriesError } = await supabase
      .from("content_entries")
      .select(
        "id, slug, title, excerpt, body, seo_title, seo_description, published_at",
      )
      .eq("content_type", contentType)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (entriesError) {
      throw new Error(
        `Could not read published content: ${entriesError.message}`,
      );
    }

    const contentEntries = entries as ContentEntryRow[];
    const { data: translations, error: translationsError } = await supabase
      .from("content_translations")
      .select(
        "content_entry_id, title, excerpt, body, seo_title, seo_description",
      )
      .in(
        "content_entry_id",
        contentEntries.map((entry) => entry.id),
      )
      .eq("locale", locale);

    if (translationsError) {
      throw new Error(
        `Could not read content translations: ${translationsError.message}`,
      );
    }

    const translationByEntryId = new Map(
      (translations as ContentTranslationRow[]).map((translation) => [
        translation.content_entry_id,
        translation,
      ]),
    );

    const { data: topicRelations, error: topicRelationsError } = await supabase
      .from("content_taxonomy_terms")
      .select("content_entry_id, taxonomy_term_id")
      .in(
        "content_entry_id",
        contentEntries.map((entry) => entry.id),
      );

    if (topicRelationsError) {
      throw new Error(
        `Could not read content topics: ${topicRelationsError.message}`,
      );
    }

    const relations = topicRelations as ContentTopicRelationRow[];
    const topicIds = [
      ...new Set(relations.map((relation) => relation.taxonomy_term_id)),
    ];
    const { data: topicRows, error: topicRowsError } = topicIds.length
      ? await supabase
          .from("taxonomy_terms")
          .select("id, name, slug")
          .in("id", topicIds)
      : { data: [], error: null };

    if (topicRowsError) {
      throw new Error(
        `Could not read topic definitions: ${topicRowsError.message}`,
      );
    }

    const topicById = new Map(
      (topicRows as ContentTopicRow[]).map((topic) => [topic.id, topic]),
    );
    const topicsByEntryId = new Map<string, ContentTopic[]>();
    for (const relation of relations) {
      const topic = topicById.get(relation.taxonomy_term_id);
      if (topic) {
        const entryTopics =
          topicsByEntryId.get(relation.content_entry_id) ?? [];
        entryTopics.push({ name: topic.name, slug: topic.slug });
        topicsByEntryId.set(relation.content_entry_id, entryTopics);
      }
    }

    return contentEntries.map((entry) =>
      toArticle(
        entry,
        translationByEntryId.get(entry.id),
        topicsByEntryId.get(entry.id) ?? [],
      ),
    );
  },
);

export const getPublishedArticles = cache(async (locale: string) =>
  getPublishedContent("blog", locale),
);

export const getPublishedArticleBySlug = cache(
  async (locale: string, slug: string) => {
    const articles = await getPublishedArticles(locale);
    return articles.find((article) => article.slug === slug) ?? null;
  },
);

export const getPublishedContentProducts = cache(
  async (
    contentEntryId: string,
    locale: string,
  ): Promise<PublishedCatalogueProduct[]> => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("content_products")
      .select("product_id, sort_order")
      .eq("content_entry_id", contentEntryId)
      .order("sort_order");

    if (error) {
      throw new Error(`Could not read related products: ${error.message}`);
    }

    const links = data as { product_id: string; sort_order: number }[];
    const productsById = new Map(
      (await getPublishedCatalogueProducts(locale)).map((product) => [
        product.id,
        product,
      ]),
    );

    return links
      .map((link) => productsById.get(link.product_id))
      .filter(
        (product): product is PublishedCatalogueProduct =>
          product !== undefined,
      );
  },
);
