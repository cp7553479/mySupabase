import { cache } from "react";

import { createPublicSupabaseClient } from "@/lib/supabase/client";

export type PublishedArticle = {
  body: string;
  excerpt: string | null;
  publishedAt: string | null;
  seoDescription: string | null;
  seoTitle: string | null;
  slug: string;
  title: string;
};

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

function toArticle(
  entry: ContentEntryRow,
  translation: ContentTranslationRow | undefined,
): PublishedArticle {
  return {
    body: translation?.body ?? entry.body ?? "",
    excerpt: translation?.excerpt ?? entry.excerpt,
    publishedAt: entry.published_at,
    seoDescription: translation?.seo_description ?? entry.seo_description,
    seoTitle: translation?.seo_title ?? entry.seo_title,
    slug: entry.slug,
    title: translation?.title ?? entry.title,
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

    return contentEntries.map((entry) =>
      toArticle(entry, translationByEntryId.get(entry.id)),
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
