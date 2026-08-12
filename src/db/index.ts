import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseUrl } from "@/lib/env/server";

type Database = ReturnType<typeof drizzle>;

let database: Database | undefined;

export function getDatabase(): Database {
  if (!database) {
    const client = postgres(getDatabaseUrl(), {
      max: 1,
      prepare: false,
    });

    database = drizzle({ client });
  }

  return database;
}
