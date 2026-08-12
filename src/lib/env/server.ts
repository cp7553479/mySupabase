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
