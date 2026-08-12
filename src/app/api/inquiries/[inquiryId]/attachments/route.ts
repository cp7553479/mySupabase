import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type AttachmentPayload = {
  attachmentKind?: unknown;
  byteSize?: unknown;
  filename?: unknown;
  mimeType?: unknown;
  objectPath?: unknown;
};

const attachmentKinds = new Set([
  "artwork",
  "logo",
  "reference",
  "proof",
  "other",
]);

export async function POST(
  request: Request,
  { params }: Readonly<{ params: Promise<{ inquiryId: string }> }>,
) {
  const { inquiryId } = await params;
  const payload = (await request.json()) as AttachmentPayload;
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  const filename =
    typeof payload.filename === "string" ? payload.filename : null;
  const objectPath =
    typeof payload.objectPath === "string" ? payload.objectPath : null;
  const byteSize =
    typeof payload.byteSize === "number" && payload.byteSize >= 0
      ? payload.byteSize
      : null;
  const attachmentKind =
    typeof payload.attachmentKind === "string" &&
    attachmentKinds.has(payload.attachmentKind)
      ? payload.attachmentKind
      : "other";

  if (typeof userId !== "string") {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }
  if (
    !filename ||
    !objectPath ||
    !objectPath.startsWith(`${userId}/`) ||
    !byteSize
  ) {
    return NextResponse.json(
      { error: "Invalid attachment metadata." },
      { status: 400 },
    );
  }

  const { data: inquiry, error: inquiryError } = await supabase
    .from("inquiries")
    .select("id")
    .eq("id", inquiryId)
    .eq("customer_user_id", userId)
    .eq("status", "draft")
    .maybeSingle();

  if (inquiryError || !inquiry) {
    return NextResponse.json(
      { error: "Draft enquiry is unavailable." },
      { status: 404 },
    );
  }

  const { error } = await supabase.from("inquiry_attachments").insert({
    attachment_kind: attachmentKind,
    byte_size: byteSize,
    filename,
    inquiry_id: inquiryId,
    mime_type: typeof payload.mimeType === "string" ? payload.mimeType : null,
    object_path: objectPath,
    uploaded_by: userId,
  });

  return error
    ? NextResponse.json(
        { error: "Could not attach the file." },
        { status: 500 },
      )
    : new NextResponse(null, { status: 201 });
}
