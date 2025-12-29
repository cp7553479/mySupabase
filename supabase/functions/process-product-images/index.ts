// process-product-images: upload to NocoDB instead of Supabase OSS
// Notes:
// - Sequential uploads (concurrency = 1)
// - path uses existing filePath logic: products/${productCode ?? "unknown"}/${fileName}
// - Store NocoDB upload results as serialized JSON text in productImg_oss
// - Filter nulls before DB update; log processedUrls after upload
// - Keep the rest of your logic (queue ack, etc.) unchanged
import { createClient } from "npm:@supabase/supabase-js@2.47.6";
// Env vars
const NOCODB_BASE_URL = Deno.env.get("NOCODB_BASE_URL") ?? "";
const NOCODB_XC_TOKEN = Deno.env.get("NOCODB_XC_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// Supabase client (service_role)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});
function inferMimeTypeFromUrl(url, respContentType) {
  // Prefer server provided Content-Type; fallback to extension-based inference
  if (respContentType && respContentType.trim() !== "") return respContentType.split(";")[0].trim();
  const lower = url.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}
async function uploadToNocoDB(url, filePath) {
  try {
    const fileResp = await fetch(url);
    if (!fileResp.ok) {
      console.error(`Download failed: HTTP ${fileResp.status} for ${url}`);
      return null;
    }
    const arrayBuf = await fileResp.arrayBuffer();
    const filename = (()=>{
      try {
        const u = new URL(url);
        const pathname = u.pathname;
        const base = pathname.split("/").filter(Boolean).pop() ?? "file";
        // strip query/fragment
        return base.replace(/[#?].*$/, "");
      } catch  {
        const parts = url.split("/");
        return (parts[parts.length - 1] || "file").split("?")[0].split("#")[0];
      }
    })();
    const mime = inferMimeTypeFromUrl(url, fileResp.headers.get("content-type"));
    const form = new FormData();
    const blob = new Blob([
      new Uint8Array(arrayBuf)
    ], {
      type: mime
    });
    form.append("file", blob, filename);
    const endpoint = `${NOCODB_BASE_URL.replace(/\/$/, "")}/api/v2/storage/upload?path=${encodeURIComponent(filePath)}`;
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "xc-token": NOCODB_XC_TOKEN
      },
      body: form
    });
    if (!resp.ok) {
      const text = await resp.text().catch(()=>"");
      console.error(`NocoDB upload failed: HTTP ${resp.status} for ${filename}; resp: ${text?.slice(0, 500)}`);
      return null;
    }
    const json = await resp.json().catch(()=>null);
    if (!json) {
      console.error(`NocoDB upload returned non-JSON for ${filename}`);
      return null;
    }
    return json; // caller will serialize before storing
  } catch (e) {
    console.error(`Error processing file ${url}:`, e);
    return null;
  }
}
// Remove a processed message from a pgmq queue via Supabase RPC wrapper
// Requires the SQL wrapper function:
// create or replace function public.pgmq_delete(queue_name text, message_id bigint)
// returns boolean language sql security definer set search_path = '' as $$
//   select pgmq.delete(queue_name, message_id);
// $$;
// revoke all on function public.pgmq_delete(text, bigint) from public, anon, authenticated;
// grant execute on function public.pgmq_delete(text, bigint) to service_role;
async function deleteFromQueue(queue_name, message_id) {
  try {
    const { data, error } = await supabase.rpc("pgmq_delete", {
      queue_name,
      message_id: Number(message_id)
    });
    if (error) {
      console.error(`❌ Failed to delete message ${message_id} from queue ${queue_name}:`, error);
      throw error;
    }
    if (data) {
      console.log(`✅ Successfully deleted message ${message_id} from queue ${queue_name}`);
      return true;
    } else {
      console.log(`⚠️ Message ${message_id} not found in queue ${queue_name}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ RPC error deleting message ${message_id} from queue ${queue_name}:`, error);
    throw error;
  }
}
/** Numeric status codes */ const STATUS = {
  SUCCESS: "SUCCESS",
  UNCHANGED: "UNCHANGED",
  SKIP: "SKIP",
  ERROR: "ERROR"
};
console.info("process-product-images started");
Deno.serve(async (req)=>{
  try {
    const payload = await req.json();
    // Always operate on an array – wrap single objects
    const items = Array.isArray(payload) ? payload : [
      payload
    ];
    const results = [];
    for (const item of items){
      const { table, record, old_record, message_id, queue_name } = item;
      // ---- required‑field validation ----
      if (!table || !record || !old_record || !message_id || !queue_name || !record["id"] || !record["mainProductImgList"] || !record["productCode"]) {
        console.error("❗ Missing required fields:", item);
        results.push({
          message: "missing required fields",
          image_urls: [],
          status: STATUS.ERROR,
          record_id: record?.["id"] ?? null
        });
        if (queue_name && message_id) {
          try {
            await deleteFromQueue(queue_name, message_id);
          } catch (e) {
            console.error(`⚠️ Failed to delete msg ${message_id} from queue ${queue_name}:`, e);
          }
        }
        continue;
      }
      // ---- detect unchanged image list ----
      const newImgList = record["mainProductImgList"];
      const oldImgList = old_record["mainProductImgList"] ?? [];
      if (JSON.stringify(newImgList) === JSON.stringify(oldImgList)) {
        results.push({
          message: "no image changes",
          image_urls: [],
          status: STATUS.UNCHANGED,
          record_id: record["id"]
        });
        if (queue_name && message_id) await deleteFromQueue(queue_name, message_id);
        console.log("status:", STATUS.UNCHANGED);
        continue;
      }
      // ---- build URL array ----
      const imageUrls = Array.isArray(newImgList) ? newImgList : newImgList ? [
        newImgList
      ] : [];
      if (!imageUrls.length) {
        results.push({
          message: "no image URLs to process",
          image_urls: [],
          status: STATUS.SKIP,
          record_id: record["id"]
        });
        if (queue_name && message_id) await deleteFromQueue(queue_name, message_id);
        console.log("status:", STATUS.SKIP);
        continue;
      }
      const productCode = record["productCode"]; // unified variable name
      // ---- process each image ----
      // 只保留第一个元素，其他元素删除
      imageUrls.splice(1);
      const processed = [];
      // Concurrency = 1: sequential
      for (const url of imageUrls){
        const fileName = (()=>{
          try {
            const u = new URL(url);
            const pathname = u.pathname;
            const base = pathname.split("/").filter(Boolean).pop() ?? "file";
            return base.replace(/[#?].*$/, "");
          } catch  {
            const parts = url.split("/");
            return (parts[parts.length - 1] || "file").split("?")[0].split("#")[0];
          }
        })();
        const filePath = `products/${productCode ?? "unknown"}/${fileName}`;
        const res = await uploadToNocoDB(url, filePath);
        if (res !== null) processed.push(res);
        else console.warn(`Upload skipped due to error: ${url}`);
      }
      // Print processedUrls (successful ones only)
      console.log("processedUrls:", processed);
      // Update DB: store serialized JSON in text column productImg_oss
      const { error: updateError } = await supabase.from(table).update({
        productImg_oss: JSON.stringify(processed)
      }).eq("id", record["id"]);
      if (updateError) {
        console.error("DB update error:", updateError);
        return new Response(JSON.stringify({
          ok: false,
          error: updateError.message
        }), {
          status: 500
        });
      }
      if (queue_name && message_id) await deleteFromQueue(queue_name, message_id); //删除队列消息
      // Keep the rest of your logic unchanged (e.g., ack queue message outside/after this handler)
      return new Response(JSON.stringify({
        ok: true,
        count: processed.length
      }));
    }
    // If we got here without returning, nothing processed
    return new Response(JSON.stringify({
      ok: true,
      count: 0
    }));
  } catch (e) {
    console.error("Unhandled error:", e);
    return new Response(JSON.stringify({
      ok: false,
      error: String(e)
    }), {
      status: 500
    });
  }
});
