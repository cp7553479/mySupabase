import { cache } from "react";

import { getPublishedCatalogueProducts } from "@/lib/catalogue/queries";
import { getSupabasePublicEnvironment } from "@/lib/env/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PublishedArticle = {
  attachments: ContentAttachment[];
  body: string;
  coverImage: ContentImage | null;
  excerpt: string | null;
  id: string;
  publishedAt: string | null;
  seoDescription: string | null;
  seoTitle: string | null;
  slug: string;
  title: string;
  topics: ContentTopic[];
};

export type ContentAttachment = {
  filename: string;
  mimeType: string | null;
  title: string | null;
  url: string;
};

export type ContentImage = { altText: string | null; url: string };

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

type ContentMediaRelationRow = {
  content_entry_id: string;
  media_asset_id: string;
  sort_order: number;
  usage_type: "attachment" | "cover" | "inline";
};

type ContentMediaAssetRow = {
  alt_text: string | null;
  bucket_id: string | null;
  external_url: string | null;
  filename: string | null;
  id: string;
  mime_type: string | null;
  object_path: string | null;
  title: string | null;
};

function toArticle(
  entry: ContentEntryRow,
  translation: ContentTranslationRow | undefined,
  topics: ContentTopic[],
  coverImage: ContentImage | null,
  attachments: ContentAttachment[],
): PublishedArticle {
  return {
    attachments,
    body: translation?.body ?? entry.body ?? "",
    coverImage,
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

function getMediaUrl(asset: ContentMediaAssetRow) {
  if (asset.external_url) {
    return asset.external_url;
  }

  if (!asset.bucket_id || !asset.object_path) {
    return null;
  }

  return `${getSupabasePublicEnvironment().url}/storage/v1/object/public/${asset.bucket_id}/${asset.object_path}`;
}

export const getPublishedContent = cache(
  async (contentType: PublicContentType, locale: string) => {
    const supabase = await createServerSupabaseClient();
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

    const entryIds = contentEntries.map((entry) => entry.id);
    const { data: mediaRelationsData, error: mediaRelationsError } =
      entryIds.length
        ? await supabase
            .from("content_media")
            .select("content_entry_id, media_asset_id, usage_type, sort_order")
            .in("content_entry_id", entryIds)
            .order("sort_order")
        : { data: [], error: null };

    if (mediaRelationsError) {
      throw new Error(
        `Could not read content media relations: ${mediaRelationsError.message}`,
      );
    }

    const mediaRelations = mediaRelationsData as ContentMediaRelationRow[];
    const mediaAssetIds = [
      ...new Set(mediaRelations.map((relation) => relation.media_asset_id)),
    ];
    const { data: mediaAssetsData, error: mediaAssetsError } =
      mediaAssetIds.length
        ? await supabase
            .from("media_assets")
            .select(
              "id, bucket_id, object_path, external_url, filename, mime_type, title, alt_text",
            )
            .in("id", mediaAssetIds)
        : { data: [], error: null };

    if (mediaAssetsError) {
      throw new Error(
        `Could not read content media: ${mediaAssetsError.message}`,
      );
    }

    const mediaAssetById = new Map(
      (mediaAssetsData as ContentMediaAssetRow[]).map((asset) => [
        asset.id,
        asset,
      ]),
    );
    const mediaByEntryId = new Map<string, ContentMediaRelationRow[]>();
    for (const relation of mediaRelations) {
      const entryMedia = mediaByEntryId.get(relation.content_entry_id) ?? [];
      entryMedia.push(relation);
      mediaByEntryId.set(relation.content_entry_id, entryMedia);
    }

    return contentEntries.map((entry) => {
      const assets = (mediaByEntryId.get(entry.id) ?? [])
        .map((relation) => ({
          asset: mediaAssetById.get(relation.media_asset_id),
          relation,
        }))
        .filter(
          (
            item,
          ): item is {
            asset: ContentMediaAssetRow;
            relation: ContentMediaRelationRow;
          } => item.asset !== undefined && getMediaUrl(item.asset) !== null,
        );
      const cover = assets.find((item) => item.relation.usage_type === "cover");
      const coverUrl = cover ? getMediaUrl(cover.asset) : null;
      const attachments = assets
        .filter((item) => item.relation.usage_type === "attachment")
        .flatMap((item) => {
          const url = getMediaUrl(item.asset);
          return url
            ? [
                {
                  filename:
                    item.asset.filename ?? item.asset.title ?? "resource",
                  mimeType: item.asset.mime_type,
                  title: item.asset.title,
                  url,
                },
              ]
            : [];
        });

      return toArticle(
        entry,
        translationByEntryId.get(entry.id),
        topicsByEntryId.get(entry.id) ?? [],
        coverUrl
          ? { altText: cover?.asset.alt_text ?? entry.title, url: coverUrl }
          : null,
        attachments,
      );
    });
  },
);

export const getPublishedArticles = cache(async (locale: string) =>
  getPublishedContent("blog", locale),
);

export const getPublishedContentBySlug = cache(
  async (contentType: PublicContentType, locale: string, slug: string) => {
    const entries = await getPublishedContent(contentType, locale);
    return entries.find((entry) => entry.slug === slug) ?? null;
  },
);

export const getPublishedArticleBySlug = cache(
  async (locale: string, slug: string) => {
    return getPublishedContentBySlug("blog", locale, slug);
  },
);

export const getPublishedContentProducts = cache(
  async (
    contentEntryId: string,
    locale: string,
  ): Promise<PublishedCatalogueProduct[]> => {
    const supabase = await createServerSupabaseClient();
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
