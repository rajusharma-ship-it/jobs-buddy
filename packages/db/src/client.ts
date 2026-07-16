import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema.js";

function toLibsqlUrl(databaseUrl: string): string {
  if (databaseUrl.startsWith("file:")) return databaseUrl;
  return `file:${databaseUrl}`;
}

export function createDb(databaseUrl: string) {
  const path = databaseUrl.replace(/^file:/, "");
  mkdirSync(dirname(path), { recursive: true });
  const client = createClient({ url: toLibsqlUrl(databaseUrl) });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
export { schema };

export function getRawClient(databaseUrl: string): Client {
  return createClient({ url: toLibsqlUrl(databaseUrl) });
}
