import "server-only";

import { selectVisibleDefaultPriceGrid } from "@/lib/catalogue/price-book-selection";
import type { createServerSupabaseClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

type PriceBookRow = {
  id: string;
  visibility: "authenticated" | "public" | "role";
};

type PriceGridRow = {
  id: string;
  price_book_id: string;
  product_id: string;
};

export async function getVisibleDefaultPriceGrid(
  supabase: ServerSupabaseClient,
  productId: string,
) {
  const { data: gridData, error: gridError } = await supabase
    .from("product_price_grids")
    .select("id, product_id, price_book_id")
    .eq("product_id", productId)
    .eq("is_default", true)
    .eq("is_active", true);

  if (gridError) {
    throw new Error(`Could not read product price grids: ${gridError.message}`);
  }

  const grids = (gridData ?? []) as PriceGridRow[];
  const priceBookIds = grids.map((grid) => grid.price_book_id);

  if (!priceBookIds.length) return null;

  const { data: priceBookData, error: priceBookError } = await supabase
    .from("price_books")
    .select("id, visibility")
    .in("id", priceBookIds);

  if (priceBookError) {
    throw new Error(
      `Could not read visible price books: ${priceBookError.message}`,
    );
  }

  return selectVisibleDefaultPriceGrid(
    productId,
    grids.map((grid) => ({
      id: grid.id,
      priceBookId: grid.price_book_id,
      productId: grid.product_id,
    })),
    ((priceBookData ?? []) as PriceBookRow[]).map((priceBook) => ({
      id: priceBook.id,
      visibility: priceBook.visibility,
    })),
  );
}
