import { BLOCKED_ARTISTS, BLOCKED_TERMS } from "./blocklist";
import type { FlagLevel } from "./db";

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s",
};

// minúsculas, sem acento, números/símbolos trocados por letras quando estão no meio de uma
// palavra ("p0rra", "f0d@"), e o resto da pontuação vira espaço.
export function normalize(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return base
    .split(/\s+/)
    .map((word) =>
      /[a-z]/.test(word) ? word.replace(/[013457@$]/g, (c) => LEET[c] ?? c) : word,
    )
    .join(" ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const NORMALIZED_TERMS = Array.from(new Set(BLOCKED_TERMS.map(normalize).filter(Boolean)));
const NORMALIZED_ARTISTS = BLOCKED_ARTISTS.map(normalize).filter(Boolean);

function containsWord(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `);
}

export function findTerms(...texts: (string | undefined | null)[]): string[] {
  const hay = texts.filter(Boolean).map((t) => normalize(t as string)).join(" | ");
  const found = NORMALIZED_TERMS.filter((term) => containsWord(hay, term));
  // Título já censurado pela gravadora, tipo "F**k" ou "P*rra".
  if (texts.some((t) => t && /[a-z]\*+[a-z]?/i.test(t))) found.push("palavra censurada (*)");
  return found;
}

export function isBlockedArtist(artistName: string): boolean {
  const artist = normalize(artistName);
  return NORMALIZED_ARTISTS.some((blocked) => containsWord(artist, blocked));
}

export interface FilterInput {
  trackName: string;
  artistName: string;
  collectionName?: string | null;
  trackExplicitness?: string | null;
}

export interface FilterResult {
  /** false só para artistas bloqueados (única recusa automática). */
  allowed: boolean;
  reason: string | null;
  flagLevel: FlagLevel;
  flagTerms: string[];
}

export const BLOCKED_MESSAGE = "Não permitida no baile";

export function classify(track: FilterInput): FilterResult {
  if (isBlockedArtist(track.artistName)) {
    return { allowed: false, reason: BLOCKED_MESSAGE, flagLevel: "review_explicit", flagTerms: [] };
  }
  const terms = findTerms(track.trackName, track.artistName, track.collectionName);
  if (track.trackExplicitness === "explicit" || terms.length > 0) {
    return { allowed: true, reason: null, flagLevel: "review_explicit", flagTerms: terms };
  }
  if (track.trackExplicitness === "cleaned") {
    return { allowed: true, reason: null, flagLevel: "review_cleaned", flagTerms: [] };
  }
  return { allowed: true, reason: null, flagLevel: "ok", flagTerms: [] };
}
