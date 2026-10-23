// npm run qr  → gera qr/pedir-musica.png (1000x1000) e qr/pedir-musica.svg a partir de NEXT_PUBLIC_SITE_URL.
import { config } from "dotenv";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!url || !/^https?:\/\//.test(url)) {
    throw new Error("Defina NEXT_PUBLIC_SITE_URL com a URL de produção (ex.: https://baile.vercel.app)");
  }
  const dir = join(__dirname, "..", "qr");
  mkdirSync(dir, { recursive: true });
  const opts = { errorCorrectionLevel: "M" as const, margin: 4, color: { dark: "#000000", light: "#ffffff" } };

  await QRCode.toFile(join(dir, "pedir-musica.png"), url, { ...opts, type: "png", width: 1000 });
  await QRCode.toFile(join(dir, "pedir-musica.svg"), url, { ...opts, type: "svg" });
  console.log(`QR codes gerados em qr/ apontando para ${url}`);
}

main().catch((err) => {
  console.error("Falhou:", err.message ?? err);
  process.exit(1);
});
