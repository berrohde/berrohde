import { PublicApp } from "./public-app";
import { Mask } from "./mask";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-6 pt-8">
      <header className="mb-6 text-center">
        <Mask className="brilho mx-auto h-12 w-28 drop-shadow-[0_4px_16px_rgba(217,178,91,0.35)]" />
        <p className="mt-3 text-[11px] uppercase tracking-[0.45em] text-gold">Baile de Máscaras</p>
        <h1 className="gold-text mt-1 font-display text-4xl font-bold leading-tight">Peça sua música</h1>
        <div className="ornament mx-auto mt-3 max-w-56 text-xs" aria-hidden="true">
          ◆
        </div>
        <p className="mt-2 text-sm text-mist-2">Busque, toque em “Pedir” e pronto.</p>
      </header>
      <PublicApp />
      <footer className="mt-auto pt-10 text-center text-xs text-mist-3">
        Sem músicas explícitas. O DJ decide o que toca.
      </footer>
    </main>
  );
}
