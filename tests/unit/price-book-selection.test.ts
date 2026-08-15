import { describe, expect, it } from "vitest";

import { selectVisibleDefaultPriceGrid } from "@/lib/catalogue/price-book-selection";

describe("selectVisibleDefaultPriceGrid", () => {
  const grids = [
    { id: "public-grid", priceBookId: "public", productId: "product" },
    { id: "member-grid", priceBookId: "member", productId: "product" },
  ];

  it("uses the public grid when it is the only visible price", () => {
    expect(
      selectVisibleDefaultPriceGrid("product", grids, [
        { id: "public", visibility: "public" },
      ]),
    ).toMatchObject({ id: "public-grid" });
  });

  it("uses the one member grid when the member price is visible", () => {
    expect(
      selectVisibleDefaultPriceGrid("product", grids, [
        { id: "public", visibility: "public" },
        { id: "member", visibility: "role" },
      ]),
    ).toMatchObject({ id: "member-grid" });
  });
});
