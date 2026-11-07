import { useState } from 'react';
import { ChevronLeft, ChevronRight, Snowflake, Thermometer, Wind } from 'lucide-react';
import { type Layer, snowRadius, tempColor, WIND_CLASSES, windLength } from './scales';
export { tempRange } from './scales';

const LAYERS: { id: Layer; label: string; Icon: typeof Wind }[] = [
  { id: 'temp', label: 'Temperatura', Icon: Thermometer },
  { id: 'wind', label: 'Vento', Icon: Wind },
  { id: 'snow', label: 'Neve', Icon: Snowflake },
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

const gradient = ([lo, hi]: [number, number], dir: 'to top' | '90deg') =>
  `linear-gradient(${dir}, ${Array.from({ length: 9 }, (_, i) => `${tempColor(lo + ((hi - lo) * i) / 8)} ${(i / 8) * 100}%`).join(', ')})`;

interface Props {
  layer: Layer;
  onChange: (l: Layer) => void;
  /** Quante stazioni hanno il dato del layer attivo. */
  count: number;
  range: [number, number];
}

/** Banda stretta sul bordo sinistro: 3 layer e la scala compatta. Toccando la scala si apre la legenda completa. */
export function LayerPanel({ layer, onChange, count, range }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`band${open ? ' is-open' : ''}`}>
      <div className="band-col">
        <div role="radiogroup" aria-label="Layer meteo" className="band-layers">
          {LAYERS.map(({ id, label, Icon }) => (
            <button key={id} role="radio" aria-checked={layer === id} aria-label={label} title={label} className={layer === id ? 'on' : undefined} onClick={() => onChange(id)}>
              <Icon size={22} aria-hidden="true" />
            </button>
          ))}
        </div>
        <button className="band-scale" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Chiudi la legenda' : 'Apri la legenda'}>
          {layer === 'temp' && <TempMini range={range} />}
          {layer === 'wind' && <WindMini />}
          {layer === 'snow' && <SnowMini />}
          {open ? <ChevronLeft size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div className="band-detail" aria-live="polite">
          {layer === 'temp' && <TempLegend range={range} />}
          {layer === 'wind' && <WindLegend />}
          {layer === 'snow' && <SnowLegend />}
          <p className="legend-foot">
            <span>
              <StationKey layer={layer} /> stazione
            </span>
            <span>
              <span className="key-st" aria-hidden="true" /> gruppo di stazioni
            </span>
            <span>
              <span className="key-wc" aria-hidden="true" /> webcam
            </span>
            <span>
              <span className="key-wcg" aria-hidden="true" /> gruppo di webcam (da zoom 9)
            </span>
            <span>
              <span className="legend-stale" aria-hidden="true" /> dato più vecchio di 1 h
            </span>
            <span>{count} stazioni con il dato</span>
          </p>
        </div>
      )}
    </div>
  );
}

/** Piccola freccia del vento, la stessa forma usata sulla mappa (punta in basso = va verso sud). */
function Arrow({ color, len = 12 }: { color: string; len?: number }) {
  return (
    <svg width="10" height={len + 2} viewBox={`-5 0 10 ${len + 2}`} aria-hidden="true">
      <path d={`M0 0 V${len - 4}`} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d={`M-4 ${len - 5} L0 ${len + 1} L4 ${len - 5} Z`} fill={color} />
    </svg>
  );
}

/** Il simbolo della stazione nel layer attivo, per la chiave della legenda. */
function StationKey({ layer }: { layer: Layer }) {
  return (
    <span className="key-sym" aria-hidden="true">
      {layer === 'temp' && <span className="key-dia" style={{ background: tempColor(10), outlineColor: 'var(--ink)' }} />}
      {layer === 'wind' && <Arrow color={WIND_CLASSES[1].color} />}
      {layer === 'snow' && <span className="st-snow" style={{ width: 14, height: 14 }} />}
    </span>
  );
}

// --- scale compatte (nella banda) ---

function TempMini({ range: [lo, hi] }: { range: [number, number] }) {
  const mid = (lo + hi) / 2;
  return (
    <span className="mini mini--temp">
      <span className="mini-bar" style={{ background: gradient([lo, hi], 'to top') }} />
      <span className="mini-ticks">
        <span>{hi}°</span>
        <span>{mid % 1 ? '' : `${mid}°`}</span>
        <span>{lo}°</span>
      </span>
    </span>
  );
}

function WindMini() {
  return (
    <span className="mini mini--wind">
      {[...WIND_CLASSES].reverse().map((c) => (
        <span key={c.label} className="mini-row">
          <Arrow color={c.color} />
          {c.label.replace('–', '-').split('-').pop()}
        </span>
      ))}
      <span className="mini-unit">km/h</span>
    </span>
  );
}

function SnowMini() {
  return (
    <span className="mini mini--snow">
      {[150, 50, 10].map((cm) => (
        <span key={cm} className="mini-row">
          <span className="st-snow" style={{ width: snowRadius(cm), height: snowRadius(cm) }} />
          {cm}
        </span>
      ))}
      <span className="mini-unit">cm</span>
    </span>
  );
}

// --- legende complete (pannello aperto) ---

function TempLegend({ range: [lo, hi] }: { range: [number, number] }) {
  const ticks = Array.from({ length: (hi - lo) / 5 + 1 }, (_, i) => lo + i * 5);
  return (
    <>
      <p className="legend-title">Temperatura dell'aria · °C</p>
      <div className="legend-bar" style={{ background: gradient([lo, hi], '90deg') }} />
      <div className="legend-ticks">
        {ticks.map((v) => (
          <span key={v}>{v}</span>
        ))}
      </div>
      <p className="legend-note">Scala adattata ai valori di oggi; i colori restano fissi (es. 0 °C è sempre azzurro chiaro).</p>
    </>
  );
}

function WindLegend() {
  return (
    <>
      <p className="legend-title">Vento · km/h, tra parentesi la raffica · la freccia va dove soffia, più lunga = più forte</p>
      <ul className="legend-wind">
        {WIND_CLASSES.map((c, i) => {
          const len = windLength([5, 15, 30, 50, 70][i]);
          return (
            <li key={c.label}>
              <svg width="18" height="40" viewBox="0 0 18 40" aria-hidden="true">
                <g transform={`translate(9 ${20 - len / 4})`}>
                  <path d={`M0 0 V${len / 2 - 4}`} stroke={c.color} strokeWidth="3" strokeLinecap="round" />
                  <path d={`M-5 ${len / 2 - 6} L0 ${len / 2 + 2} L5 ${len / 2 - 6} Z`} fill={c.color} />
                </g>
              </svg>
              <span>{c.label}</span>
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
            <span>{cm} cm</span>
          </li>
        ))}
      </ul>
    </>
  );
}
