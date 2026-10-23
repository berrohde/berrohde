import type { Metadata } from "next";
import QRCode from "qrcode";
import { siteUrl } from "@/lib/site";
import { Mask } from "../mask";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Cartaz · Peça sua música" };
export const dynamic = "force-dynamic";

export default async function Cartaz() {
  const url = await siteUrl();
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 4,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const display = url.replace(/^https?:\/\//, "");

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { background: #120a24 !important; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .cartaz { width: 210mm; height: 297mm; }
        @media screen and (max-width: 220mm) { .cartaz { width: 100%; height: auto; min-height: 100dvh; } }
        .qr svg { width: 100%; height: 100%; display: block; }
      `}</style>
      <PrintButton />
      <main
        className="cartaz mx-auto flex flex-col items-center justify-between overflow-hidden px-[14mm] py-[16mm] text-center"
        style={{ background: "radial-gradient(ellipse at top, #2a1850 0%, #120a24 65%)" }}
      >
        <div>
          <Mask className="mx-auto h-[22mm] w-[52mm] text-gold" />
          <p className="mt-3 text-[5mm] uppercase tracking-[0.4em] text-gold">Baile de Máscaras</p>
          <h1 className="mt-2 font-display text-[19mm] font-bold leading-none text-gold-2">Peça sua música</h1>
        </div>

        <div className="flex flex-col items-center">
          <div
            className="qr rounded-[4mm] border-[2mm] border-gold bg-white p-[3mm]"
            style={{ width: "105mm", height: "105mm" }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p className="mt-5 text-[8mm] font-semibold text-white">Aponte a câmera do celular</p>
          <p className="mt-1 text-[4.5mm] text-purple-200">ou acesse {display}</p>
          <p className="mt-1 text-[4mm] text-purple-300">Funciona no wifi e nos dados móveis</p>
        </div>

        <p className="rounded-full border border-gold/60 px-[8mm] py-[3mm] text-[5mm] text-gold-2">
          Sem músicas explícitas. O DJ decide o que toca.
        </p>
      </main>
    </>
  );
}
