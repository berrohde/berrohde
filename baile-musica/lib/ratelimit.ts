import { createHash } from "node:crypto";
import { query } from "./db";

// Limites fáceis de mudar.
export const DEVICE_COOLDOWN_MIN = 5; // 1 pedido a cada 5 minutos por aparelho
export const DEVICE_MAX_PER_NIGHT = 5; // 5 pedidos por noite por aparelho
export const NIGHT_HOURS = 12; // "uma noite" = últimas 12 horas
export const IP_MAX_PER_HOUR = 30; // por rede/IP, para quem troca o deviceId

export type LimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/** IP do cliente atrás da Vercel. Nunca é gravado: só o hash sai daqui. */
export function clientIp(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || null;
  return headers.get("x-real-ip");
}

let warnedSalt = false;

export function hashIp(ip: string | null): string | null {
  const salt = process.env.IP_HASH_SALT;
  if (!ip) return null;
  if (!salt) {
    if (!warnedSalt) console.warn("IP_HASH_SALT não configurado: limite por IP desligado");
    warnedSalt = true;
    return null;
  }
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function checkLimits(deviceId: string, ipHash: string | null): Promise<LimitResult> {
  const now = Date.now();
  const rows = await query<{ created_at: string | Date }>(
    `select created_at from requests
     where device_id = $1 and created_at > now() - make_interval(hours => $2)
     order by created_at desc`,
    [deviceId, NIGHT_HOURS],
  );
  const times = rows.map((r) => new Date(r.created_at).getTime());

  if (times.length > 0) {
    const nextAt = times[0] + DEVICE_COOLDOWN_MIN * 60_000;
    if (nextAt > now) return { ok: false, retryAfterSec: Math.ceil((nextAt - now) / 1000) };
  }
  if (times.length >= DEVICE_MAX_PER_NIGHT) {
    const oldest = times[DEVICE_MAX_PER_NIGHT - 1];
    const nextAt = oldest + NIGHT_HOURS * 3_600_000;
    return { ok: false, retryAfterSec: Math.max(60, Math.ceil((nextAt - now) / 1000)) };
  }

  if (ipHash) {
    const ipRows = await query<{ n: string; oldest: string | Date | null }>(
      `select count(*)::text as n, min(created_at) as oldest from requests
       where ip_hash = $1 and created_at > now() - interval '1 hour'`,
      [ipHash],
    );
    const n = Number(ipRows[0]?.n ?? 0);
    if (n >= IP_MAX_PER_HOUR) {
      const oldest = new Date(ipRows[0].oldest as string).getTime();
      return { ok: false, retryAfterSec: Math.max(60, Math.ceil((oldest + 3_600_000 - now) / 1000)) };
    }
  }
  return { ok: true };
}
