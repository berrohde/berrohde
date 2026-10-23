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
          html, body { background: #0a0506 !important; }
          .cartaz { width: 210mm; height: 297mm; }
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
        style={{
          background:
            "radial-gradient(90% 55% at 50% 0%, #b01e2a 0%, #6e0d16 38%, #0a0506 78%), #0a0506",
        }}
      >
        <div>
          <Mask className="mx-auto h-[24mm] w-[56mm] drop-shadow-[0_2mm_6mm_rgba(0,0,0,0.5)]" />
          <p className="mt-3 text-[5mm] uppercase tracking-[0.45em] text-gold-2">Baile de Máscaras</p>
          <h1 className="gold-text mt-2 font-display text-[20mm] font-bold leading-none">Peça sua música</h1>
        </div>

        <div className="flex flex-col items-center">
          <div
            className="qr rounded-[4mm] border-[2.5mm] border-gold bg-white p-[3mm] shadow-[0_0_0_1mm_#7d0f19,0_3mm_10mm_rgba(0,0,0,0.6)]"
            style={{ width: "105mm", height: "105mm" }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p className="mt-6 text-[8mm] font-semibold text-mist">Aponte a câmera do celular</p>
          <p className="mt-1 text-[4.5mm] text-mist-2">ou acesse {display}</p>
          <p className="mt-1 text-[4mm] text-mist-3">Funciona no wifi e nos dados móveis</p>
        </div>

        <p className="btn-red rounded-full px-[9mm] py-[3.5mm] text-[5mm] font-semibold">
          Sem músicas explícitas. O DJ decide o que toca.
        </p>
      </main>
    </>
  );
}
