/** Freccia che indica dove va il vento (la direzione meteo indica da dove viene). */
export function WindArrow({ deg, size = 28 }: { deg: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${deg + 180}deg)` }}>
      <path d="M12 2 L18 14 L13 12.2 L13 22 L11 22 L11 12.2 L6 14 Z" fill="currentColor" />
    </svg>
  );
}
