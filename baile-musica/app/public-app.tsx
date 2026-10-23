"use client";

import { useEffect, useRef, useState } from "react";

interface Result {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl: string | null;
  allowed: boolean;
  reason: string | null;
  review: boolean;
}

type Confirm = { kind: "queued"; position: number } | { kind: "pending" };

const DEVICE_KEY = "baile.deviceId";
const NEXT_KEY = "baile.nextAllowedAt";
const COOLDOWN_MS = 5 * 60_000;
const UNEXPECTED = "Algo deu errado. Fale com o DJ.";
const SEARCH_FAILED = "A busca falhou. Tente de novo em alguns segundos.";

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // modo anônimo ou armazenamento bloqueado: segue sem guardar
  }
}

function newUuid(): string {
  // randomUUID só existe em HTTPS e navegadores recentes.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

let memoryDeviceId: string | null = null;

function deviceId(): string {
  const saved = storageGet(DEVICE_KEY);
  if (saved) return saved;
  memoryDeviceId ??= newUuid();
  storageSet(DEVICE_KEY, memoryDeviceId);
  return memoryDeviceId;
}

export function PublicApp() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sending, setSending] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; msg: string } | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [nextAllowedAt, setNextAllowedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setNextAllowedAt(Number(storageGet(NEXT_KEY) ?? 0));
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Busca 400 ms depois da última tecla, com pelo menos 2 letras.
  useEffect(() => {
    const term = q.trim();
    abortRef.current?.abort();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      setSearchError(null);
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term.toLowerCase())}`, {
          signal: ctrl.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSearchError(data.error ?? SEARCH_FAILED);
          setResults([]);
        } else {
          setSearchError(null);
          setResults(data.results ?? []);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setSearchError(SEARCH_FAILED);
        setResults([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  const waitMs = Math.max(0, nextAllowedAt - now);
  const waitMin = Math.ceil(waitMs / 60_000);

  function startCooldown(ms: number) {
    const at = Date.now() + ms;
    setNextAllowedAt(at);
    storageSet(NEXT_KEY, String(at));
  }

  async function pedir(r: Result) {
    setSending(r.trackId);
    setRowError(null);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: r.trackId, deviceId: deviceId() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201) {
        startCooldown(COOLDOWN_MS);
        setConfirm(data.status === "queued" ? { kind: "queued", position: data.position } : { kind: "pending" });
        setQ("");
        setResults([]);
        return;
      }
      if (res.status === 429 && data.retryAfterSec) startCooldown(data.retryAfterSec * 1000);
      setRowError({ id: r.trackId, msg: data.error ?? UNEXPECTED });
    } catch {
      setRowError({ id: r.trackId, msg: "Sem conexão. Tente de novo em alguns segundos." });
    } finally {
      setSending(null);
    }
  }

  if (confirm) {
    return (
      <section className="rounded-2xl border border-gold/40 bg-night-2 p-6 text-center">
        <p className="text-4xl" aria-hidden="true">
          🎶
        </p>
        <h2 className="mt-2 font-display text-2xl text-gold-2">
          {confirm.kind === "queued" ? "Pedido enviado!" : "Pedido recebido!"}
        </h2>
        <p className="mt-2 text-lg">
          {confirm.kind === "queued"
            ? `Você é o nº ${confirm.position} da fila.`
            : "Seu pedido está em análise."}
        </p>
        {waitMs > 0 && (
          <p className="mt-3 text-sm text-purple-200">Você pode pedir outra em {waitMin} min.</p>
        )}
        <button
          onClick={() => setConfirm(null)}
          className="mt-5 min-h-12 w-full rounded-xl bg-gold px-4 font-semibold text-night active:bg-gold-2"
        >
          Voltar para a busca
        </button>
      </section>
    );
  }

  return (
    <section>
      <label htmlFor="busca" className="sr-only">
        Buscar música ou artista
      </label>
      <input
        id="busca"
        type="search"
        inputMode="search"
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Busque a música ou o artista"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        maxLength={80}
        className="min-h-12 w-full rounded-xl border border-gold/50 bg-night-2 px-4 text-lg text-white placeholder:text-purple-300/70 focus:border-gold focus:outline-none"
      />

      {waitMs > 0 && (
        <p className="mt-3 rounded-lg bg-night-3 px-3 py-2 text-center text-sm text-gold-2">
          Calma! Você pode pedir de novo em {waitMin} min.
        </p>
      )}

      {q.trim().length > 0 && q.trim().length < 2 && (
        <p className="mt-4 text-center text-sm text-purple-200">Digite pelo menos 2 letras.</p>
      )}
      {loading && <p className="mt-4 text-center text-sm text-purple-200">Buscando...</p>}
      {searchError && !loading && <p className="mt-4 text-center text-sm text-red-300">{searchError}</p>}
      {!loading && !searchError && q.trim().length >= 2 && results.length === 0 && (
        <p className="mt-4 text-center text-sm text-purple-200">Nada encontrado. Tente outro nome.</p>
      )}

      <ul className="mt-4 space-y-2">
        {results.map((r) => (
          <li
            key={r.trackId}
            className={`rounded-xl bg-night-2/90 p-2 ${r.allowed ? "" : "opacity-50"}`}
          >
            <div className="flex items-center gap-3">
              {r.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.artworkUrl}
                  alt=""
                  width={52}
                  height={52}
                  loading="lazy"
                  className="h-13 w-13 shrink-0 rounded-md bg-night-3"
                />
              ) : (
                <div className="h-13 w-13 shrink-0 rounded-md bg-night-3" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.trackName}</p>
                <p className="truncate text-sm text-purple-200">{r.artistName}</p>
                {r.allowed && r.review && (
                  <p className="text-xs text-gold/80">Passa pela análise do grêmio</p>
                )}
              </div>
              {r.allowed ? (
                <button
                  onClick={() => pedir(r)}
                  disabled={sending !== null || waitMs > 0}
                  className="min-h-12 shrink-0 rounded-xl bg-gold px-4 font-semibold text-night active:bg-gold-2 disabled:bg-gold/40"
                >
                  {sending === r.trackId ? "Enviando..." : "Pedir"}
                </button>
              ) : (
                <span className="shrink-0 px-2 text-right text-xs font-semibold text-red-300">
                  {r.reason ?? "Não permitida no baile"}
                </span>
              )}
            </div>
            {rowError?.id === r.trackId && (
              <p className="mt-2 px-1 text-sm text-red-300" role="alert">
                {rowError.msg}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
