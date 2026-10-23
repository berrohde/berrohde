import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";

// Uma única função de consulta, sempre parametrizada ($1, $2...).
// Em produção usa o driver HTTP do Neon; com um Postgres local (localhost) usa o "pg".
type Row = Record<string, unknown>;
type QueryFn = (text: string, params?: unknown[]) => Promise<Row[]>;

let cached: QueryFn | null = null;

function isLocal(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

function getQuery(): QueryFn {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada");

  if (isLocal(url)) {
    const pool = new Pool({ connectionString: url, max: 5 });
    cached = async (text, params = []) => (await pool.query(text, params)).rows;
  } else {
    const sql = neon(url);
    cached = async (text, params = []) => (await sql.query(text, params)) as Row[];
  }
  return cached;
}

export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await getQuery()(text, params)) as T[];
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

export type RequestStatus = "pending" | "queued" | "played" | "skipped" | "rejected";
export type FlagLevel = "ok" | "review_cleaned" | "review_explicit";

export interface RequestRow {
  id: string;
  track_id: string;
  track_name: string;
  artist_name: string;
  artwork_url: string | null;
  preview_url: string | null;
  explicitness: string;
  status: RequestStatus;
  reject_reason: string | null;
  flag_level: FlagLevel;
  flag_terms: string | null;
  censor: boolean;
  created_at: string;
  updated_at: string;
}

export async function getModeration(): Promise<boolean> {
  const rows = await query<{ value: string }>("select value from settings where key = 'moderation'");
  return rows[0]?.value === "on";
}

export async function setModeration(on: boolean): Promise<void> {
  await query(
    `insert into settings (key, value) values ('moderation', $1)
     on conflict (key) do update set value = excluded.value`,
    [on ? "on" : "off"],
  );
}
