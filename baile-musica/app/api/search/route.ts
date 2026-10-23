import { z } from "zod";
import { classify } from "@/lib/filter";
import { json, MSG } from "@/lib/http";
import { MusicBusyError, searchTracks } from "@/lib/music";

const Query = z.string().trim().min(2).max(80);

export async function GET(req: Request) {
  const parsed = Query.safeParse(new URL(req.url).searchParams.get("q") ?? "");
  if (!parsed.success) return json({ results: [] });

  try {
    const tracks = await searchTracks(parsed.data, 10);
    const results = tracks.map((t) => {
      const f = classify({
        trackName: t.trackName,
        artistName: t.artistName,
        collectionName: t.collectionName,
        trackExplicitness: t.explicitness,
      });
      return {
        trackId: t.trackId,
        trackName: t.trackName,
        artistName: t.artistName,
        artworkUrl: t.artworkUrl,
        allowed: f.allowed,
        reason: f.reason,
        review: f.flagLevel !== "ok",
      };
    });
    // Buscas iguais saem do cache da Vercel por 10 min (poupa o limite do iTunes).
    return json({ results }, 200, { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=600" });
  } catch (err) {
    if (err instanceof MusicBusyError) return json({ error: MSG.searchBusy }, 503);
    console.error("search failed", err);
    return json({ error: MSG.searchFailed }, 502);
  }
}
