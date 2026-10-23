// Máscara desenhada em SVG (sem imagem para baixar), dourada com brilho.
export function Mask({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 50" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="mask-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff1c4" />
          <stop offset="40%" stopColor="#e2bd66" />
          <stop offset="60%" stopColor="#b8893a" />
          <stop offset="100%" stopColor="#f0cf7a" />
        </linearGradient>
      </defs>
      <path
        d="M4 10c18-8 38-6 56 6 18-12 38-14 56-6-2 22-14 36-32 36-12 0-18-8-24-14-6 6-12 14-24 14C18 46 6 32 4 10z"
        fill="url(#mask-gold)"
        stroke="#7d0f19"
        strokeWidth="0.8"
      />
      <path d="M60 16c-2 4-2 8 0 12 2-4 2-8 0-12z" fill="#b01e2a" />
      <ellipse cx="34" cy="24" rx="11" ry="7" fill="#0a0506" />
      <ellipse cx="86" cy="24" rx="11" ry="7" fill="#0a0506" />
    </svg>
  );
}
