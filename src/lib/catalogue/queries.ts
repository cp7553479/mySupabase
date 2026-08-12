import { cache } from "react";

import { getSupabasePublicEnvironment } from "@/lib/env/public";
import { createPublicSupabaseClient } from "@/lib/supabase/client";

export type CatalogueProduct = {
  currencyCode: string;
  minimumOrderQuantity: number | null;
  name: string;
  primaryImage: CatalogueMedia | null;
  productNumber: string;
  slug: string;
  startingPrice: number | null;
  summary: string | null;
};

export type CatalogueMedia = {
  altText: string | null;
  url: string;
};

export type CataloguePriceTier = {
  maximumQuantity: number | null;
  minimumQuantity: number;
  unitPrice: number;
};

export type CatalogueProductDetail = CatalogueProduct & {
  description: string | null;
  priceTiers: CataloguePriceTier[];
};

type ProductRow = {
  default_currency_code: string;
  description: string | null;
  id: string;
  minimum_order_quantity: number | null;
  name: string;
  product_number: string;
  short_description: string | null;
  slug: string;
};

type ProductTranslationRow = {
  description: string | null;
  name: string;
  product_id: string;
  short_description: string | null;
};

type ProductMediaRow = {
  media_asset_id: string;
  product_id: string;
  sort_order: number;
  usage_type: "gallery" | "primary";
};

type MediaAssetRow = {
  alt_text: string | null;
  bucket_id: string | null;
  external_url: string | null;
  id: string;
  object_path: string | null;
};

type PriceGridRow = {
  id: string;
  product_id: string;
};

type PriceTierRow = {
  maximum_quantity: number | null;
  minimum_quantity: number;
  price_grid_id: string;
  unit_price: number;
};

function applyTranslation(
  product: ProductRow,
  translation: ProductTranslationRow | undefined,
) {
  return {
    description: translation?.description ?? product.description,
    name: translation?.name ?? product.name,
    summary: translation?.short_description ?? product.short_description,
  };
}

function toMedia(
  productId: string,
  mediaById: Map<string, MediaAssetRow>,
  productMedia: ProductMediaRow[],
) {
  const primary = productMedia
    .filter((media) => media.product_id === productId)
    .sort((left, right) => {
      if (left.usage_type !== right.usage_type) {
        return left.usage_type === "primary" ? -1 : 1;
      }

      return left.sort_order - right.sort_order;
    })[0];

  if (!primary) {
    return null;
  }

  const asset = mediaById.get(primary.media_asset_id);

  if (!asset) {
    return null;
  }

  const url =
    asset.external_url ??
    (asset.bucket_id && asset.object_path
      ? `${getSupabasePublicEnvironment().url}/storage/v1/object/public/${asset.bucket_id}/${asset.object_path}`
      : null);

  return url ? { altText: asset.alt_text, url } : null;
}

function toTiers(
  productId: string,
  grids: PriceGridRow[],
  tiers: PriceTierRow[],
) {
  const gridIds = new Set(
    grids
      .filter((grid) => grid.product_id === productId)
      .map((grid) => grid.id),
  );

  return tiers
    .filter((tier) => gridIds.has(tier.price_grid_id))
    .map((tier) => ({
      maximumQuantity: tier.maximum_quantity,
      minimumQuantity: tier.minimum_quantity,
      unitPrice: Number(tier.unit_price),
    }))
    .sort((left, right) => left.minimumQuantity - right.minimumQuantity);
}

async function getPublishedProductRows(locale: string) {
  const supabase = createPublicSupabaseClient();
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      "id, product_number, slug, name, short_description, description, default_currency_code, minimum_order_quantity",
    )
    .eq("status", "published")
    .order("product_number");

  if (productsError) {
    throw new Error(
      `Could not read published products: ${productsError.message}`,
    );
  }

  const productRows = products as ProductRow[];
  const productIds = productRows.map((product) => product.id);

  if (productIds.length === 0) {
    return {
      assets: [],
      grids: [],
      media: [],
      products: productRows,
      tiers: [],
      translations: [],
    };
  }

  const [translationsResult, mediaResult, gridsResult] = await Promise.all([
    supabase
      .from("product_translations")
      .select("product_id, name, short_description, description")
      .in("product_id", productIds)
      .eq("locale", locale),
    supabase
      .from("product_media")
      .select("product_id, media_asset_id, usage_type, sort_order")
      .in("product_id", productIds),
    supabase
      .from("product_price_grids")
      .select("id, product_id")
      .in("product_id", productIds)
      .eq("is_default", true)
      .eq("is_active", true),
  ]);

  for (const result of [translationsResult, mediaResult, gridsResult]) {
    if (result.error) {
      throw new Error(`Could not read catalogue data: ${result.error.message}`);
    }
  }

  const media = mediaResult.data as ProductMediaRow[];
  const grids = gridsResult.data as PriceGridRow[];
  const gridIds = grids.map((grid) => grid.id);
  const mediaAssetIds = media.map((item) => item.media_asset_id);
  const [assetsResult, tiersResult] = await Promise.all([
    mediaAssetIds.length
      ? supabase
          .from("media_assets")
          .select("id, bucket_id, object_path, external_url, alt_text")
          .in("id", mediaAssetIds)
      : Promise.resolve({ data: [], error: null }),
    gridIds.length
      ? supabase
          .from("product_price_tiers")
          .select(
            "price_grid_id, minimum_quantity, maximum_quantity, unit_price",
          )
          .in("price_grid_id", gridIds)
          .order("minimum_quantity")
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [assetsResult, tiersResult]) {
    if (result.error) {
      throw new Error(`Could not read catalogue data: ${result.error.message}`);
    }
  }

  return {
    grids,
    media,
    products: productRows,
    tiers: tiersResult.data as PriceTierRow[],
    translations: translationsResult.data as ProductTranslationRow[],
    assets: assetsResult.data as MediaAssetRow[],
  };
}

function toCatalogueProducts(
  rows: Awaited<ReturnType<typeof getPublishedProductRows>>,
) {
  const translationsByProductId = new Map(
    rows.translations.map((translation) => [
      translation.product_id,
      translation,
    ]),
  );
  const mediaById = new Map(rows.assets.map((asset) => [asset.id, asset]));

  return rows.products.map((product) => {
    const translation = applyTranslation(
      product,
      translationsByProductId.get(product.id),
    );
    const priceTiers = toTiers(product.id, rows.grids, rows.tiers);

    return {
      currencyCode: product.default_currency_code,
      minimumOrderQuantity: product.minimum_order_quantity,
      name: translation.name,
      primaryImage: toMedia(product.id, mediaById, rows.media),
      productNumber: product.product_number,
      slug: product.slug,
      startingPrice: priceTiers[0]?.unitPrice ?? null,
      summary: translation.summary,
      description: translation.description,
      priceTiers,
    };
  });
}

export const getPublishedCatalogueProducts = cache(async (locale: string) => {
  const rows = await getPublishedProductRows(locale);

  return toCatalogueProducts(rows).map((product) => ({
    currencyCode: product.currencyCode,
    minimumOrderQuantity: product.minimumOrderQuantity,
    name: product.name,
    primaryImage: product.primaryImage,
    productNumber: product.productNumber,
    slug: product.slug,
    startingPrice: product.startingPrice,
    summary: product.summary,
  }));
});

export const getPublishedCatalogueProductBySlug = cache(
  async (
    locale: string,
    slug: string,
  ): Promise<CatalogueProductDetail | null> => {
    const rows = await getPublishedProductRows(locale);
    const product = toCatalogueProducts(rows).find(
      (candidate) => candidate.slug === slug,
    );

    return product ?? null;
  },
);
