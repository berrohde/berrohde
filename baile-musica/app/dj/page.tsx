import type { Metadata } from "next";
import { DjPanel } from "./dj-panel";

export const metadata: Metadata = { title: "Painel do DJ · Baile de Máscaras" };

// Protegida por senha no proxy.ts (Basic Auth com DJ_PASSWORD).
export default function DjPage() {
  return <DjPanel />;
}
