import { z } from "zod";
import { getModeration, isUniqueViolation, query } from "@/lib/db";
import { classify } from "@/lib/filter";
import { json, MSG } from "@/lib/http";
import { getTrack, MusicBusyError } from "@/lib/music";
import { checkLimits, clientIp, hashIp } from "@/lib/ratelimit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const Body = z.object({
  trackId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  deviceId: z.string().regex(UUID),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: MSG.invalid }, 400);
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return json({ error: MSG.invalid }, 400);
  const { trackId } = parsed.data;
  const deviceId = parsed.data.deviceId.toLowerCase();

  try {
    // Nunca confia no celular: busca a faixa de novo e reaplica o filtro.
    const track = await getTrack(trackId);
    if (!track) return json({ error: MSG.notFound }, 404);

    const f = classify({
      trackName: track.trackName,
      artistName: track.artistName,
      collectionName: track.collectionName,
      trackExplicitness: track.explicitness,
    });
    if (!f.allowed) return json({ error: f.reason }, 422);

    const ipHash = hashIp(clientIp(req.headers));
    const limit = await checkLimits(deviceId, ipHash);
    if (!limit.ok) {
      return json({ error: MSG.rateLimit(limit.retryAfterSec), retryAfterSec: limit.retryAfterSec }, 429, {
        "Retry-After": String(limit.retryAfterSec),
      });
    }

    // Marcadas pelo filtro sempre passam pela Revisão; com o modo aprovação, todas passam.
    const moderation = await getModeration();
    const status = moderation || f.flagLevel !== "ok" ? "pending" : "queued";

    let inserted: { id: string }[];
    try {
      inserted = await query<{ id: string }>(
        `insert into requests
           (track_id, track_name, artist_name, artwork_url, preview_url, explicitness,
            status, flag_level, flag_terms, device_id, ip_hash)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         returning id::text`,
        [
          track.trackId,
          track.trackName,
          track.artistName,
          track.artworkUrl,
          track.previewUrl,
          track.explicitness,
          status,
          f.flagLevel,
          f.flagTerms.length ? f.flagTerms.join(", ") : null,
          deviceId,
          ipHash,
        ],
      );
    } catch (err) {
      if (isUniqueViolation(err)) return json({ error: MSG.duplicate }, 409);
      throw err;
    }

    if (status === "pending") return json({ status, position: null }, 201);

    const pos = await query<{ n: string }>(
      `select count(*)::text as n from requests r, requests me
       where me.id = $1 and r.status = 'queued' and (r.created_at, r.id) <= (me.created_at, me.id)`,
      [inserted[0].id],
    );
    return json({ status, position: Number(pos[0]?.n ?? 1) }, 201);
  } catch (err) {
    if (err instanceof MusicBusyError) return json({ error: MSG.searchBusy }, 503);
    console.error("create request failed", err);
    return json({ error: MSG.unexpected }, 500);
  }
}
