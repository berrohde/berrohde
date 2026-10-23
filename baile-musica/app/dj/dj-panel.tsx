"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "pending" | "queued" | "played" | "skipped" | "rejected";

interface Req {
  id: string;
  track_id: string;
  track_name: string;
  artist_name: string;
  artwork_url: string | null;
  preview_url: string | null;
  explicitness: string;
  status: Status;
  reject_reason: string | null;
  flag_level: "ok" | "review_cleaned" | "review_explicit";
  flag_terms: string | null;
  censor: boolean;
  created_at: string;
}

interface Data {
  queued: Req[];
  pending: Req[];
  played: Req[];
  rejected: Req[];
  moderation: boolean;
  now: string;
}

type Tab = "fila" | "revisao" | "tocadas" | "recusadas";
type Change = { status: Exclude<Status, "pending">; reason?: string; censor?: boolean };

const POLL_MS = 3000;
const HIGHLIGHT_MS = 6000;
const REASONS = ["conteúdo impróprio", "fora do estilo", "outro"];

function minutesAgo(createdAt: string, serverNow: number, fetchedAt: number): string {
  const nowMs = serverNow + (Date.now() - fetchedAt);
  const min = Math.max(0, Math.floor((nowMs - new Date(createdAt).getTime()) / 60_000));
  return min === 0 ? "agora" : `há ${min} min`;
}

function lyricsUrl(r: Req): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`letra ${r.track_name} ${r.artist_name}`)}`;
}

/** Move o pedido para a lista do novo status, só na tela (atualização otimista). */
function applyLocal(data: Data, id: string, change: Change): Data {
  const all = [...data.queued, ...data.pending, ...data.played, ...data.rejected];
  const item = all.find((r) => r.id === id);
  if (!item) return data;
  const updated: Req = {
    ...item,
    status: change.status,
    reject_reason: change.status === "rejected" ? change.reason ?? null : null,
    censor: change.status === "queued" ? change.censor ?? item.censor : item.censor,
  };
  const without = (list: Req[]) => list.filter((r) => r.id !== id);
  const next: Data = {
    ...data,
    queued: without(data.queued),
    pending: without(data.pending),
    played: without(data.played),
    rejected: without(data.rejected),
  };
  if (updated.status === "queued") {
    next.queued = [...next.queued, updated].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || Number(a.id) - Number(b.id),
    );
  } else if (updated.status === "played") next.played = [updated, ...next.played];
  else next.rejected = [updated, ...next.rejected];
  return next;
}

export function DjPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [tab, setTab] = useState<Tab>("fila");
  const [offline, setOffline] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [, tick] = useState(0);

  const known = useRef<Set<string> | null>(null);
  const inflight = useRef(0);
  const audioCtx = useRef<AudioContext | null>(null);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 4000);
  }, []);

  const beep = useCallback(() => {
    if (mutedRef.current) return;
    try {
      const ctx = audioCtx.current ?? new AudioContext();
      audioCtx.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // navegador sem Web Audio: segue sem bipe
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dj/requests", { cache: "no-store" });
      if (res.status === 401) {
        window.location.reload(); // pede a senha de novo
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const next = (await res.json()) as Data;
      setOffline(false);
      if (inflight.current > 0) return; // não sobrescreve uma ação que ainda está salvando

      const active = [...next.queued, ...next.pending].map((r) => r.id);
      if (known.current) {
        const added = active.filter((id) => !known.current!.has(id));
        if (added.length) {
          beep();
          setFresh((prev) => new Set([...prev, ...added]));
          setTimeout(() => {
            setFresh((prev) => {
              const s = new Set(prev);
              added.forEach((id) => s.delete(id));
              return s;
            });
          }, HIGHLIGHT_MS);
        }
      }
      known.current = new Set([...(known.current ?? []), ...active]);
      setData(next);
      setFetchedAt(Date.now());
    } catch {
      setOffline(true);
    }
  }, [beep]);

  useEffect(() => {
    load();
    const poll = setInterval(load, POLL_MS);
    const clock = setInterval(() => tick((n) => n + 1), 30_000);
    // O navegador só libera som depois de um toque na página.
    const unlock = () => {
      try {
        audioCtx.current ??= new AudioContext();
        audioCtx.current.resume();
      } catch {}
    };
    window.addEventListener("pointerdown", unlock);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
      window.removeEventListener("pointerdown", unlock);
    };
  }, [load]);

  async function change(id: string, ch: Change) {
    if (!data) return;
    const before = data;
    setData(applyLocal(data, id, ch));
    setRejecting(null);
    inflight.current++;
    try {
      const res = await fetch(`/api/dj/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Não foi possível salvar.");
      }
    } catch (err) {
      setData(before);
      showToast(`Desfeito: ${(err as Error).message || "falha de conexão"}`);
    } finally {
      inflight.current--;
    }
  }

  async function toggleModeration() {
    if (!data) return;
    const next = !data.moderation;
    setData({ ...data, moderation: next });
    inflight.current++;
    try {
      const res = await fetch("/api/dj/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderation: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setData((d) => (d ? { ...d, moderation: !next } : d));
      showToast("Desfeito: não foi possível mudar o modo aprovação.");
    } finally {
      inflight.current--;
    }
  }

  async function wipe() {
    if (!confirm("Apagar TODOS os pedidos? Isso não tem volta.")) return;
    const typed = prompt('Para confirmar, digite APAGAR');
    if (typed?.trim().toUpperCase() !== "APAGAR") return;
    const res = await fetch("/api/dj/wipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "APAGAR" }),
    }).catch(() => null);
    if (res?.ok) {
      known.current = new Set();
      showToast("Tudo apagado.");
      load();
    } else showToast("Não foi possível apagar. Tente de novo.");
  }

  function togglePreview(r: Req) {
    const el = audioEl.current;
    if (!el || !r.preview_url) return;
    if (playingId === r.id) {
      el.pause();
      setPlayingId(null);
      return;
    }
    el.src = r.preview_url;
    el.play().then(
      () => setPlayingId(r.id),
      () => showToast("Não foi possível tocar a prévia."),
    );
  }

  if (!data) {
    return (
      <p className="p-6 text-center text-purple-200">
        {offline ? "Sem conexão com o servidor. Tentando de novo..." : "Carregando..."}
      </p>
    );
  }

  const serverNow = new Date(data.now).getTime();
  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "fila", label: "Fila", count: data.queued.length },
    {
      key: "revisao",
      label: data.moderation ? "Revisão / Aprovação" : "Revisão",
      count: data.pending.length,
    },
    { key: "tocadas", label: "Tocadas", count: data.played.length },
    { key: "recusadas", label: "Recusadas", count: data.rejected.length },
  ];
  const list =
    tab === "fila" ? data.queued : tab === "revisao" ? data.pending : tab === "tocadas" ? data.played : data.rejected;

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <audio ref={audioEl} onEnded={() => setPlayingId(null)} preload="none" />

      <header className="sticky top-0 z-10 border-b border-gold/30 bg-night/95 px-3 pb-2 pt-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-xl text-gold-2">Painel do DJ</h1>
          <span className="rounded-full bg-gold px-3 py-1 text-sm font-bold text-night">
            {data.queued.length} na fila
          </span>
          {data.pending.length > 0 && (
            <button
              onClick={() => setTab("revisao")}
              className="rounded-full bg-red-500/90 px-3 py-1 text-sm font-bold text-white"
            >
              {data.pending.length} p/ revisar
            </button>
          )}
          {offline && <span className="text-xs text-red-300">sem conexão…</span>}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setMuted((m) => !m)}
              className="min-h-10 rounded-lg border border-purple-400/40 px-3 text-sm"
              aria-pressed={muted}
            >
              {muted ? "🔇 Som desligado" : "🔔 Som ligado"}
            </button>
          </div>
        </div>
        <label className="mt-2 flex min-h-10 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={data.moderation} onChange={toggleModeration} className="h-5 w-5 accent-amber-400" />
          <span>
            Modo aprovação{" "}
            <span className="text-purple-300">
              {data.moderation ? "(ligado: todo pedido passa pelo grêmio)" : "(desligado: só as marcadas passam)"}
            </span>
          </span>
        </label>
        <nav className="mt-2 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold ${
                  tab === t.key ? "bg-gold text-night" : "bg-night-2 text-purple-100"
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
        </nav>
      </header>

      {list.length === 0 && (
        <p className="p-8 text-center text-purple-300">
          {tab === "fila" ? "Fila vazia. Os pedidos aparecem aqui sozinhos." : "Nada aqui."}
        </p>
      )}

      <ol className="space-y-2 px-3 pt-3">
        {list.map((r, i) => {
          const tone =
            tab === "revisao"
              ? r.flag_level === "review_explicit"
                ? "border-red-500/80 bg-red-950/40"
                : r.flag_level === "review_cleaned"
                  ? "border-amber-400/80 bg-amber-950/30"
                  : "border-purple-400/40 bg-night-2"
              : "border-transparent bg-night-2";
          return (
            <li key={r.id} className={`rounded-xl border-2 p-3 ${tone} ${fresh.has(r.id) ? "novo" : ""}`}>
              <div className="flex items-start gap-3">
                {tab === "fila" && <span className="w-7 pt-3 text-right font-display text-xl text-gold">{i + 1}</span>}
                {r.artwork_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.artwork_url} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-md" />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-md bg-night-3" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">{r.track_name}</p>
                  <p className="text-sm text-purple-200">{r.artist_name}</p>
                  <div className="mt-1 flex flex-wrap gap-1 text-xs">
                    <span className="text-purple-300">{minutesAgo(r.created_at, serverNow, fetchedAt)}</span>
                    {r.explicitness === "cleaned" && (
                      <span className="rounded bg-amber-400/20 px-1.5 text-amber-200">versão editada</span>
                    )}
                    {r.explicitness === "explicit" && (
                      <span className="rounded bg-red-500/30 px-1.5 text-red-200">explícita no iTunes</span>
                    )}
                    {r.flag_terms && (
                      <span className="rounded bg-red-500/30 px-1.5 text-red-200">termos: {r.flag_terms}</span>
                    )}
                    {r.censor && r.status === "queued" && (
                      <span className="rounded bg-red-600 px-1.5 font-bold text-white">CENSURAR NA TRANSIÇÃO</span>
                    )}
                    {r.status === "skipped" && <span className="rounded bg-purple-500/30 px-1.5">pulada</span>}
                    {r.status === "rejected" && (
                      <span className="rounded bg-red-500/30 px-1.5 text-red-200">
                        recusada{r.reject_reason ? `: ${r.reject_reason}` : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {tab === "fila" && (
                  <>
                    <Btn className="bg-green-600 text-white" onClick={() => change(r.id, { status: "played" })}>
                      ✓ Tocada
                    </Btn>
                    <Btn className="bg-purple-700 text-white" onClick={() => change(r.id, { status: "skipped" })}>
                      Pular
                    </Btn>
                    <Btn className="bg-red-600 text-white" onClick={() => setRejecting(rejecting === r.id ? null : r.id)}>
                      Recusar
                    </Btn>
                  </>
                )}
                {tab === "revisao" && (
                  <>
                    <Btn className="bg-green-600 text-white" onClick={() => change(r.id, { status: "queued", censor: false })}>
                      Aprovar
                    </Btn>
                    {r.flag_level !== "ok" && (
                      <Btn className="bg-amber-500 text-night" onClick={() => change(r.id, { status: "queued", censor: true })}>
                        Aprovar c/ censura
                      </Btn>
                    )}
                    <Btn className="bg-red-600 text-white" onClick={() => setRejecting(rejecting === r.id ? null : r.id)}>
                      Recusar
                    </Btn>
                  </>
                )}
                {tab === "recusadas" && (
                  <Btn className="bg-gold text-night" onClick={() => change(r.id, { status: "queued" })}>
                    Devolver à fila
                  </Btn>
                )}
                {r.preview_url && (
                  <Btn className="border border-purple-400/50" onClick={() => togglePreview(r)}>
                    {playingId === r.id ? "■ Parar" : "▶ Prévia"}
                  </Btn>
                )}
                <a
                  href={lyricsUrl(r)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-12 items-center rounded-lg border border-purple-400/50 px-4 text-sm font-semibold"
                >
                  Letra ↗
                </a>
              </div>

              {rejecting === r.id && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-night/60 p-2">
                  <span className="text-sm text-purple-200">Motivo:</span>
                  {REASONS.map((reason) => (
                    <Btn
                      key={reason}
                      className="bg-red-700 text-white"
                      onClick={() => change(r.id, { status: "rejected", reason })}
                    >
                      {reason}
                    </Btn>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-12 px-3 text-center">
        <button onClick={wipe} className="min-h-10 text-xs text-purple-400 underline">
          Apagar tudo (fim da festa)
        </button>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-3 bottom-4 z-20 mx-auto max-w-md rounded-xl bg-red-700 px-4 py-3 text-center text-sm font-semibold shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function Btn({
  className = "",
  onClick,
  children,
}: {
  className?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className={`min-h-12 rounded-lg px-4 text-sm font-semibold active:opacity-80 ${className}`}>
      {children}
    </button>
  );
}
