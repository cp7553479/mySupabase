import "server-only";

export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "Missing required server environment variable: DATABASE_URL",
    );
  }

  return databaseUrl;
}

/** Reads the key used only by trusted server routes for Supabase Auth administration. */
export function getSupabaseSecretKey(): string {
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "Missing required server environment variable: SUPABASE_SECRET_KEY",
    );
  }

  return secretKey;
}
