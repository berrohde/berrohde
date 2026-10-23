// Camada de busca de músicas. O resto do app só conhece searchTracks e getTrack,
// então dá para trocar o iTunes (ou somar o Deezer) mexendo só aqui.

export interface Track {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string | null;
  artworkUrl: string | null;
  previewUrl: string | null;
  /** explicit, cleaned ou notExplicit */
  explicitness: string;
}

/** O provedor recusou por excesso de buscas (403/429). */
export class MusicBusyError extends Error {}
/** Falha de rede ou resposta inesperada do provedor. */
export class MusicUnavailableError extends Error {}

const ITUNES = "https://itunes.apple.com";
const TIMEOUT_MS = 6000;

interface ItunesResult {
  wrapperType?: string;
  kind?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl60?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackExplicitness?: string;
}

async function itunes(path: string, params: Record<string, string>): Promise<ItunesResult[]> {
  const url = `${ITUNES}${path}?${new URLSearchParams(params)}`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new MusicUnavailableError("iTunes fora do ar");
  }
  if (res.status === 403 || res.status === 429) throw new MusicBusyError("iTunes limitou as buscas");
  if (!res.ok) throw new MusicUnavailableError(`iTunes respondeu ${res.status}`);
  try {
    const data = (await res.json()) as { results?: ItunesResult[] };
    return data.results ?? [];
  } catch {
    throw new MusicUnavailableError("resposta inválida do iTunes");
  }
}

function toTrack(r: ItunesResult): Track | null {
  if (r.wrapperType !== "track" || r.kind !== "song" || !r.trackId || !r.trackName || !r.artistName) {
    return null;
  }
  return {
    trackId: r.trackId,
    trackName: r.trackName,
    artistName: r.artistName,
    collectionName: r.collectionName ?? null,
    artworkUrl: r.artworkUrl100 ?? r.artworkUrl60 ?? null,
    previewUrl: r.previewUrl ?? null,
    explicitness: r.trackExplicitness ?? "notExplicit",
  };
}

export async function searchTracks(term: string, limit = 10): Promise<Track[]> {
  const results = await itunes("/search", {
    term,
    country: "BR",
    media: "music",
    entity: "song",
    limit: String(limit),
  });
  return results.map(toTrack).filter((t): t is Track => t !== null).slice(0, limit);
}

export async function getTrack(trackId: number): Promise<Track | null> {
  const results = await itunes("/lookup", { id: String(trackId), country: "BR", entity: "song" });
  return results.map(toTrack).find((t) => t?.trackId === trackId) ?? null;
}
