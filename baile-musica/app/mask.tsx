// Máscara desenhada em SVG (sem imagem para baixar).
export function Mask({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 50" className={className} aria-hidden="true">
      <path
        d="M4 10c18-8 38-6 56 6 18-12 38-14 56-6-2 22-14 36-32 36-12 0-18-8-24-14-6 6-12 14-24 14C18 46 6 32 4 10z"
        fill="currentColor"
      />
      <ellipse cx="34" cy="24" rx="11" ry="7" fill="#120a24" />
      <ellipse cx="86" cy="24" rx="11" ry="7" fill="#120a24" />
    </svg>
  );
}
