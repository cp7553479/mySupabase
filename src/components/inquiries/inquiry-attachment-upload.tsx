"use client";

import { type ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const maximumBytes = 25 * 1024 * 1024;

export function InquiryAttachmentUpload({
  inquiryId,
  locale,
}: Readonly<{ inquiryId: string; locale: string }>) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const copy =
    locale === "zh"
      ? {
          failed: "附件上传失败。",
          label: "上传 Logo、图稿或参考文件",
          saved: "附件已加入询单。",
          uploading: "上传中…",
        }
      : {
          failed: "Attachment upload failed.",
          label: "Upload logo, artwork or reference",
          saved: "Attachment added to enquiry.",
          uploading: "Uploading…",
        };

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (file.size > maximumBytes) {
      setMessage(copy.failed);
      return;
    }
    setPending(true);
    setMessage(null);
    const supabase = createBrowserSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setPending(false);
      setMessage(copy.failed);
      return;
    }
    const filename = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const objectPath = `${userId}/${crypto.randomUUID()}-${filename}`;
    const { error: uploadError } = await supabase.storage
      .from("inquiry-attachments")
      .upload(objectPath, file, { contentType: file.type || undefined });
    if (uploadError) {
      setPending(false);
      setMessage(copy.failed);
      return;
    }
    const response = await fetch(`/api/inquiries/${inquiryId}/attachments`, {
      body: JSON.stringify({
        attachmentKind: "reference",
        byteSize: file.size,
        filename: file.name,
        mimeType: file.type,
        objectPath,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setPending(false);
    if (!response.ok) {
      await supabase.storage.from("inquiry-attachments").remove([objectPath]);
      setMessage(copy.failed);
      return;
    }
    setMessage(copy.saved);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <label className="inline-flex cursor-pointer items-center gap-2">
        <input
          className="sr-only"
          disabled={pending}
          onChange={upload}
          type="file"
        />
        <Button asChild disabled={pending} type="button" variant="outline">
          <span>{pending ? copy.uploading : copy.label}</span>
        </Button>
      </label>
      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
