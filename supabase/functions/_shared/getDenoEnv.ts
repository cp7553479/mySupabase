// 环境变量获取工具模块
// 统一管理所有环境变量的获取和验证

export function getAppId(): string {
  const id = Deno.env.get("FEISHU_Lesstaking-ERP_APP_ID");
  if (!id) throw new Error("缺少 飞书 App Id");
  return id;
}

export function getAppSecret(): string {
  const secret = Deno.env.get("FEISHU_Lesstaking-ERP_APP_SECRET");
  if (!secret) throw new Error("缺少 飞书 App Secret");
  return secret;
}

export function getEncryptKey(): string {
  const key = Deno.env.get("FEISHU_supabase-feishu-bridge_ENCRYPT_KEY");
  if (!key) throw new Error("缺少加密密钥");
  return key;
}

export function getSupabaseUrl(): string {
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) throw new Error("缺少 Supabase URL");
  return url;
}

export function getSupabaseServiceRoleKey(): string {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) throw new Error("缺少 Supabase Service Role Key");
  return key;
}