import { Star } from 'lucide-react';

/** Stellina dei preferiti, nell'intestazione delle schede. */
export function StarButton({ on, name, onToggle }: { on: boolean; name: string; onToggle: () => void }) {
  return (
    <button
      className={`icon-btn star${on ? ' is-on' : ''}`}
      onClick={onToggle}
      aria-pressed={on}
      aria-label={on ? `Togli ${name} dai preferiti` : `Aggiungi ${name} ai preferiti`}
      title={on ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'}
    >
      <Star size={22} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}
