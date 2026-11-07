import { useState } from 'react';
import { type Layer, snowRadius, TEMP_STOPS, WIND_CLASSES, windLength } from './scales';

const LAYERS: { id: Layer; label: string }[] = [
  { id: 'temp', label: 'Temperatura' },
  { id: 'wind', label: 'Vento' },
  { id: 'snow', label: 'Neve' },
];

const KEY = 'meteo:layer';

/** Layer attivo, salvato in localStorage così resta dopo un refresh della pagina. */
export function useLayer() {
  const [layer, setLayer] = useState<Layer>(() => {
    const saved = localStorage.getItem(KEY);
    return LAYERS.some((l) => l.id === saved) ? (saved as Layer) : 'temp';
  });
  const set = (l: Layer) => {
    setLayer(l);
    localStorage.setItem(KEY, l);
  };
  return [layer, set] as const;
}

interface Props {
  layer: Layer;
  onChange: (l: Layer) => void;
  /** Quante stazioni hanno il dato del layer attivo. */
  count: number;
  /** Con una scheda aperta, su telefono la legenda si ripiega e restano solo i pulsanti. */
  folded?: boolean;
}

/** Selettore dei layer + legenda del layer attivo, nel cartiglio in alto a sinistra. */
export function LayerPanel({ layer, onChange, count, folded = false }: Props) {
  return (
    <div className={`layers${folded ? ' is-folded' : ''}`}>
      <div className="seg" role="radiogroup" aria-label="Layer meteo">
        {LAYERS.map((l) => (
          <button key={l.id} role="radio" aria-checked={layer === l.id} className={layer === l.id ? 'on' : undefined} onClick={() => onChange(l.id)}>
            {l.label}
          </button>
        ))}
      </div>
      <div className="legend" aria-live="polite">
        {layer === 'temp' && <TempLegend />}
        {layer === 'wind' && <WindLegend />}
        {layer === 'snow' && <SnowLegend />}
        <p className="legend-foot">
          <span><span className="key-st" aria-hidden="true" /> gruppo di stazioni</span> · <span><span className="key-wc" aria-hidden="true" /> webcam</span> ·{' '}
          <span><span className="legend-stale" aria-hidden="true" /> dato &gt; 1 h</span> · {count} con il dato
        </p>
      </div>
    </div>
  );
}

function TempLegend() {
  const min = TEMP_STOPS[0][0];
  const max = TEMP_STOPS[TEMP_STOPS.length - 1][0];
  const gradient = TEMP_STOPS.map(([v, c]) => `${c} ${((v - min) / (max - min)) * 100}%`).join(', ');
  return (
    <>
      <p className="legend-title">Temperatura dell'aria · °C</p>
      <div className="legend-bar" style={{ background: `linear-gradient(90deg, ${gradient})` }} />
      <div className="legend-ticks">
        {TEMP_STOPS.filter((_, i) => i % 1 === 0).map(([v]) => (
          <span key={v}>{v === max ? `${v} °C` : v}</span>
        ))}
      </div>
    </>
  );
}

function WindLegend() {
  return (
    <>
      <p className="legend-title">Vento · km/h, (raffica) · la freccia va dove soffia</p>
      <ul className="legend-wind">
        {WIND_CLASSES.map((c, i) => {
          const sample = [5, 15, 30, 50, 70][i];
          return (
            <li key={c.label}>
              <svg width="18" height="40" viewBox="0 0 18 40" aria-hidden="true">
                <g transform={`translate(9 ${20 - windLength(sample) / 4})`}>
                  <path d={`M0 0 V${windLength(sample) / 2 - 4}`} stroke={c.color} strokeWidth="3" strokeLinecap="round" />
                  <path d={`M-5 ${windLength(sample) / 2 - 6} L0 ${windLength(sample) / 2 + 2} L5 ${windLength(sample) / 2 - 6} Z`} fill={c.color} />
                </g>
              </svg>
              <span>{i === WIND_CLASSES.length - 1 ? `${c.label} km/h` : c.label}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function SnowLegend() {
  return (
    <>
      <p className="legend-title">Neve al suolo · cm · solo dove misurata</p>
      <ul className="legend-snow">
        {[10, 50, 150].map((cm) => (
          <li key={cm}>
            <span className="st-snow" style={{ width: snowRadius(cm) * 2, height: snowRadius(cm) * 2 }} />
            <span>{cm === 150 ? '150 cm' : cm}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
