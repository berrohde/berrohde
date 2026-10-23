"use client";

export function PrintButton() {
  return (
    <div className="no-print flex justify-center gap-3 p-3">
      <button
        onClick={() => window.print()}
        className="btn-gold min-h-12 rounded-xl px-6 font-semibold"
      >
        Imprimir (A4)
      </button>
    </div>
  );
}
