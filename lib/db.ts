import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function buildPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL no esta configurada.");
  }

  const requiresSsl =
    connectionString.includes("sslmode=require") ||
    connectionString.includes("supabase.") ||
    connectionString.includes("neon.tech");

  if (requiresSsl) {
    const databaseUrl = new URL(connectionString);

    return new Pool({
      host: databaseUrl.hostname,
      port: databaseUrl.port ? Number(databaseUrl.port) : 5432,
      database: databaseUrl.pathname.replace(/^\//, ""),
      user: decodeURIComponent(databaseUrl.username),
      password: decodeURIComponent(databaseUrl.password),
      max: 10,
      ssl: { rejectUnauthorized: false }
    });
  }

  return new Pool({
    connectionString,
    max: 10,
    ssl: false
  });
}

export function getPool() {
  const pool = globalThis.__pgPool ?? buildPool();
  if (process.env.NODE_ENV !== "production") {
    globalThis.__pgPool = pool;
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  return getPool().query<T>(text, params);
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function advisoryTenantLock(client: PoolClient, tenantId: string, resource: string) {
  // pg_advisory_xact_lock supports (bigint) or (int, int). 
  // hashtext returns int, so we use the (int, int) variant.
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
    [tenantId, resource]
  );
}

export type DbResult<T extends QueryResultRow = QueryResultRow> = QueryResult<T>;
