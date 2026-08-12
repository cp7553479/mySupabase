import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type FavoriteRequest = { productId?: unknown };

async function getAuthenticatedUserId() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  return { supabase, userId: typeof userId === "string" ? userId : null };
}

function getProductId(payload: FavoriteRequest) {
  return typeof payload.productId === "string" && payload.productId.length > 0
    ? payload.productId
    : null;
}

export async function GET() {
  const { supabase, userId } = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("product_favorites")
    .select("product_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Could not read saved products." },
      { status: 500 },
    );
  }

  return NextResponse.json({ productIds: data.map((item) => item.product_id) });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as FavoriteRequest;
  const productId = getProductId(payload);

  if (!productId) {
    return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  }

  const { supabase, userId } = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("status", "published")
    .maybeSingle();

  if (productError || !product) {
    return NextResponse.json(
      { error: "Product is unavailable." },
      { status: 404 },
    );
  }

  const { error } = await supabase
    .from("product_favorites")
    .upsert(
      { product_id: productId, user_id: userId },
      { onConflict: "user_id,product_id" },
    );

  if (error) {
    return NextResponse.json(
      { error: "Could not save this product." },
      { status: 500 },
    );
  }

  return NextResponse.json({ productId }, { status: 201 });
}

export async function DELETE(request: Request) {
  const payload = (await request.json()) as FavoriteRequest;
  const productId = getProductId(payload);

  if (!productId) {
    return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  }

  const { supabase, userId } = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { error } = await supabase
    .from("product_favorites")
    .delete()
    .eq("product_id", productId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json(
      { error: "Could not remove this saved product." },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
