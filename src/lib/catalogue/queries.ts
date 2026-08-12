import { cache } from "react";

import { getSupabasePublicEnvironment } from "@/lib/env/public";
import { createPublicSupabaseClient } from "@/lib/supabase/client";

export type CatalogueProduct = {
  filterAttributes: CatalogueFilterAttribute[];
  categories: string[];
  currencyCode: string;
  id: string;
  minimumOrderQuantity: number | null;
  name: string;
  primaryImage: CatalogueMedia | null;
  productNumber: string;
  productionLeadTimeMaxDays: number | null;
  productionLeadTimeMinDays: number | null;
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
  gallery: CatalogueMedia[];
  optionGroups: CatalogueOptionGroup[];
  priceTiers: CataloguePriceTier[];
  services: CatalogueService[];
  specifications: CatalogueSpecification[];
};

export type CatalogueService = {
  code: string;
  description: string | null;
  leadTimeDays: number | null;
  name: string;
};

export type CatalogueOptionGroup = {
  code: string;
  description: string | null;
  id: string;
  inputType: "file" | "multi_select" | "number" | "single_select" | "text";
  isRequired: boolean;
  label: string;
  maximumSelections: number | null;
  minimumSelections: number;
  values: CatalogueOptionValue[];
};

export type CatalogueOptionValue = { id: string; label: string };

export type CatalogueSpecification = {
  group: string | null;
  name: string;
  unit: string | null;
  value: string;
};

export type CatalogueFilterAttribute = {
  name: string;
  value: string;
};

type ProductRow = {
  default_currency_code: string;
  description: string | null;
  id: string;
  minimum_order_quantity: number | null;
  name: string;
  product_number: string;
  production_lead_time_max_days: number | null;
  production_lead_time_min_days: number | null;
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

type ProductTaxonomyTermRow = {
  product_id: string;
  sort_order: number;
  taxonomy_term_id: string;
};

type TaxonomyRow = {
  code: string;
  id: string;
};

type TaxonomyTermRow = {
  id: string;
  name: string;
  taxonomy_id: string;
};

type ProductSpecificationRow = {
  is_filterable: boolean;
  name: string;
  product_id: string;
  sort_order: number;
  specification_group: string | null;
  unit: string | null;
  value: string;
};

type ProductServiceRow = {
  description: string | null;
  lead_time_days: number | null;
  product_id: string;
  service_code: string;
};

type ServiceRow = {
  code: string;
  description: string | null;
  name: string;
};

type ProductOptionGroupRow = {
  code: string;
  description: string | null;
  id: string;
  input_type: "file" | "multi_select" | "number" | "single_select" | "text";
  is_required: boolean;
  maximum_selections: number | null;
  minimum_selections: number;
  name: string;
  product_id: string;
};

type ProductOptionValueRow = {
  id: string;
  label: string;
  option_group_id: string;
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

function toMediaAsset(asset: MediaAssetRow | undefined) {
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

  return toMediaAsset(asset);
}

function toGallery(
  productId: string,
  mediaById: Map<string, MediaAssetRow>,
  productMedia: ProductMediaRow[],
) {
  const seenUrls = new Set<string>();

  return productMedia
    .filter(
      (media) =>
        media.product_id === productId &&
        (media.usage_type === "primary" || media.usage_type === "gallery"),
    )
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((media) => toMediaAsset(mediaById.get(media.media_asset_id)))
    .filter((media): media is CatalogueMedia => media !== null)
    .filter((media) => {
      if (seenUrls.has(media.url)) {
        return false;
      }

      seenUrls.add(media.url);
      return true;
    });
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
      "id, product_number, slug, name, short_description, description, default_currency_code, minimum_order_quantity, production_lead_time_min_days, production_lead_time_max_days",
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
      optionGroups: [],
      optionValues: [],
      productTaxonomyTerms: [],
      products: productRows,
      serviceDefinitions: [],
      services: [],
      specifications: [],
      taxonomies: [],
      taxonomyTerms: [],
      tiers: [],
      translations: [],
    };
  }

  const [
    translationsResult,
    mediaResult,
    gridsResult,
    productTaxonomyResult,
    specificationsResult,
    servicesResult,
    taxonomiesResult,
    optionGroupsResult,
  ] = await Promise.all([
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
    supabase
      .from("product_taxonomy_terms")
      .select("product_id, taxonomy_term_id, sort_order")
      .in("product_id", productIds)
      .order("sort_order"),
    supabase
      .from("product_specifications")
      .select(
        "product_id, specification_group, name, value, unit, is_filterable, sort_order",
      )
      .in("product_id", productIds)
      .order("sort_order"),
    supabase
      .from("product_services")
      .select("product_id, service_code, lead_time_days, description")
      .in("product_id", productIds)
      .eq("is_available", true),
    supabase.from("taxonomies").select("id, code").eq("is_active", true),
    supabase
      .from("product_option_groups")
      .select(
        "id, product_id, code, name, description, input_type, is_required, minimum_selections, maximum_selections",
      )
      .in("product_id", productIds)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  for (const result of [
    translationsResult,
    mediaResult,
    gridsResult,
    productTaxonomyResult,
    specificationsResult,
    servicesResult,
    taxonomiesResult,
    optionGroupsResult,
  ]) {
    if (result.error) {
      throw new Error(`Could not read catalogue data: ${result.error.message}`);
    }
  }

  const media = mediaResult.data as ProductMediaRow[];
  const grids = gridsResult.data as PriceGridRow[];
  const productTaxonomyTerms =
    productTaxonomyResult.data as ProductTaxonomyTermRow[];
  const gridIds = grids.map((grid) => grid.id);
  const mediaAssetIds = media.map((item) => item.media_asset_id);
  const taxonomyTermIds = productTaxonomyTerms.map(
    (association) => association.taxonomy_term_id,
  );
  const optionGroups = optionGroupsResult.data as ProductOptionGroupRow[];
  const optionGroupIds = optionGroups.map((group) => group.id);
  const [
    assetsResult,
    tiersResult,
    taxonomyTermsResult,
    serviceDefinitionsResult,
    optionValuesResult,
  ] = await Promise.all([
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
    taxonomyTermIds.length
      ? supabase
          .from("taxonomy_terms")
          .select("id, taxonomy_id, name")
          .in("id", taxonomyTermIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("services")
      .select("code, name, description")
      .eq("is_active", true),
    optionGroupIds.length
      ? supabase
          .from("product_option_values")
          .select("id, option_group_id, label")
          .in("option_group_id", optionGroupIds)
          .eq("is_active", true)
          .order("sort_order")
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [
    assetsResult,
    tiersResult,
    taxonomyTermsResult,
    serviceDefinitionsResult,
    optionValuesResult,
  ]) {
    if (result.error) {
      throw new Error(`Could not read catalogue data: ${result.error.message}`);
    }
  }

  return {
    grids,
    media,
    optionGroups,
    optionValues: optionValuesResult.data as ProductOptionValueRow[],
    products: productRows,
    productTaxonomyTerms,
    services: servicesResult.data as ProductServiceRow[],
    serviceDefinitions: serviceDefinitionsResult.data as ServiceRow[],
    specifications: specificationsResult.data as ProductSpecificationRow[],
    taxonomies: taxonomiesResult.data as TaxonomyRow[],
    taxonomyTerms: taxonomyTermsResult.data as TaxonomyTermRow[],
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
  const taxonomyTermsById = new Map(
    rows.taxonomyTerms.map((term) => [term.id, term]),
  );
  const categoryTaxonomyId = rows.taxonomies.find(
    (taxonomy) => taxonomy.code === "category",
  )?.id;
  const serviceDefinitionsByCode = new Map(
    rows.serviceDefinitions.map((service) => [service.code, service]),
  );

  return rows.products.map((product) => {
    const translation = applyTranslation(
      product,
      translationsByProductId.get(product.id),
    );
    const priceTiers = toTiers(product.id, rows.grids, rows.tiers);
    const categories = rows.productTaxonomyTerms
      .filter((association) => association.product_id === product.id)
      .map((association) => taxonomyTermsById.get(association.taxonomy_term_id))
      .filter(
        (term): term is TaxonomyTermRow =>
          term !== undefined && term.taxonomy_id === categoryTaxonomyId,
      )
      .map((term) => term.name);
    const specifications = rows.specifications
      .filter((specification) => specification.product_id === product.id)
      .map((specification) => ({
        group: specification.specification_group,
        name: specification.name,
        unit: specification.unit,
        value: specification.value,
      }));
    const filterAttributes = rows.specifications
      .filter(
        (specification) =>
          specification.product_id === product.id &&
          specification.is_filterable,
      )
      .map((specification) => ({
        name: specification.name,
        value: specification.value,
      }));
    const services = rows.services
      .filter((service) => service.product_id === product.id)
      .map((service) => {
        const definition = serviceDefinitionsByCode.get(service.service_code);

        return definition
          ? {
              code: definition.code,
              description: service.description ?? definition.description,
              leadTimeDays: service.lead_time_days,
              name: definition.name,
            }
          : null;
      })
      .filter((service): service is CatalogueService => service !== null);
    const optionGroups = rows.optionGroups
      .filter((group) => group.product_id === product.id)
      .map((group) => ({
        code: group.code,
        description: group.description,
        id: group.id,
        inputType: group.input_type,
        isRequired: group.is_required,
        label: group.name,
        maximumSelections: group.maximum_selections,
        minimumSelections: group.minimum_selections,
        values: rows.optionValues
          .filter((value) => value.option_group_id === group.id)
          .map((value) => ({ id: value.id, label: value.label })),
      }));

    return {
      categories,
      currencyCode: product.default_currency_code,
      id: product.id,
      filterAttributes,
      gallery: toGallery(product.id, mediaById, rows.media),
      minimumOrderQuantity: product.minimum_order_quantity,
      name: translation.name,
      primaryImage: toMedia(product.id, mediaById, rows.media),
      productNumber: product.product_number,
      productionLeadTimeMaxDays: product.production_lead_time_max_days,
      productionLeadTimeMinDays: product.production_lead_time_min_days,
      slug: product.slug,
      startingPrice: priceTiers[0]?.unitPrice ?? null,
      summary: translation.summary,
      description: translation.description,
      optionGroups,
      priceTiers,
      services,
      specifications,
    };
  });
}

export const getPublishedCatalogueProducts = cache(async (locale: string) => {
  const rows = await getPublishedProductRows(locale);

  return toCatalogueProducts(rows).map((product) => ({
    categories: product.categories,
    currencyCode: product.currencyCode,
    id: product.id,
    filterAttributes: product.filterAttributes,
    minimumOrderQuantity: product.minimumOrderQuantity,
    name: product.name,
    primaryImage: product.primaryImage,
    productNumber: product.productNumber,
    productionLeadTimeMaxDays: product.productionLeadTimeMaxDays,
    productionLeadTimeMinDays: product.productionLeadTimeMinDays,
    slug: product.slug,
    startingPrice: product.startingPrice,
    summary: product.summary,
  }));
});

export const getPublishedCatalogueProductDetails = cache(
  async (locale: string): Promise<CatalogueProductDetail[]> => {
    const rows = await getPublishedProductRows(locale);
    return toCatalogueProducts(rows);
  },
);

export const getPublishedCatalogueProductBySlug = cache(
  async (
    locale: string,
    slug: string,
  ): Promise<CatalogueProductDetail | null> => {
    const product = (await getPublishedCatalogueProductDetails(locale)).find(
      (candidate) => candidate.slug === slug,
    );

    return product ?? null;
  },
);
