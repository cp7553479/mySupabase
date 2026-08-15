export type VisiblePriceBook = {
  id: string;
  visibility: "authenticated" | "public" | "role";
};

export type VisiblePriceGrid = {
  id: string;
  priceBookId: string;
  productId: string;
};

const visibilityRank: Record<VisiblePriceBook["visibility"], number> = {
  public: 1,
  authenticated: 2,
  role: 3,
};

/**
 * Selects the one default grid used throughout the catalogue and enquiry flow.
 * RLS has already limited the input to price books the current user may read.
 */
export function selectVisibleDefaultPriceGrid(
  productId: string,
  grids: VisiblePriceGrid[],
  priceBooks: VisiblePriceBook[],
): VisiblePriceGrid | null {
  const rankByPriceBookId = new Map(
    priceBooks.map((priceBook) => [
      priceBook.id,
      visibilityRank[priceBook.visibility],
    ]),
  );

  return (
    grids
      .filter(
        (grid) =>
          grid.productId === productId &&
          rankByPriceBookId.has(grid.priceBookId),
      )
      .sort((left, right) => {
        const rankDifference =
          (rankByPriceBookId.get(right.priceBookId) ?? 0) -
          (rankByPriceBookId.get(left.priceBookId) ?? 0);

        return (
          rankDifference || left.priceBookId.localeCompare(right.priceBookId)
        );
      })[0] ?? null
  );
}
