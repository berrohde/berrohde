import { PublicApp } from "./public-app";
import { Mask } from "./mask";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-6 pt-6">
      <header className="mb-5 text-center">
        <Mask className="mx-auto h-10 w-24 text-gold" />
        <h1 className="mt-2 font-display text-3xl font-bold text-gold-2">Peça sua música</h1>
        <p className="mt-1 text-sm text-purple-200">Baile de Máscaras do Grêmio</p>
      </header>
      <PublicApp />
      <footer className="mt-auto pt-8 text-center text-xs text-purple-300/80">
        Sem músicas explícitas. O DJ decide o que toca.
      </footer>
    </main>
  );
}
