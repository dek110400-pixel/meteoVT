import { useEffect, useMemo, useRef, useState } from 'react';
import type { History, Point } from '../server/history';
import { cardinal, fmt } from './format';
import { WindArrow } from './WindArrow';

// Colori delle serie (validati con lo script dataviz su fondo carta: contrasto ≥ 3:1, separazione CVD ΔE 19).
const INK = 'var(--ink)';
const BLUE = 'var(--water)';
const RED = 'var(--trail)';

const hhmm = (t: number) => new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

/** Il punto più vicino a t (null se il più vicino dista più di maxGap: in quel punto non c'è misura). */
function at(p: Point[], t: number, maxGap: number): Point | null {
  let best: Point | null = null;
  for (const x of p) if (!best || Math.abs(x[0] - t) < Math.abs(best[0] - t)) best = x;
  return best && Math.abs(best[0] - t) <= maxGap ? best : null;
}

/** Passo tipico tra due misure; serve a capire dove i dati mancano (buchi da non unire con una linea). */
const step = (p: Point[]) => {
  const d = p.slice(1).map((x, i) => x[0] - p[i][0]).sort((a, b) => a - b);
  return d.length ? d[Math.floor(d.length / 2)] : 30 * 60_000;
};

/** Pioggia per ora intera (somma delle misure dell'ora), per le barre. */
function hourly(p: Point[]): Point[] {
  const m = new Map<number, number>();
  for (const [t, v] of p) {
    const h = Math.floor(t / 3_600_000) * 3_600_000;
    m.set(h, (m.get(h) ?? 0) + v);
  }
  return [...m].sort((a, b) => a[0] - b[0]).map(([t, v]) => [t, Math.round(v * 10) / 10]);
}

interface Frame { from: number; to: number; hover: number | null; ticks: number[] }

const W = 1000; // coordinate SVG orizzontali (la linea non si deforma: vector-effect non-scaling-stroke)
const H = 100;

function path(p: Point[], f: Frame, y: (v: number) => number): string {
  const gap = step(p) * 2.5;
  return p
    .map(([t, v], i) => `${i && t - p[i - 1][0] <= gap ? 'L' : 'M'}${(((t - f.from) / (f.to - f.from)) * W).toFixed(1)},${y(v).toFixed(1)}`)
    .join('');
}

function scaleY(values: number[], zeroBased = false) {
  let lo = Math.min(...values, ...(zeroBased ? [0] : []));
  let hi = Math.max(...values);
  if (hi - lo < 2) [lo, hi] = [lo - 1, hi + 1];
  const pad = (hi - lo) * 0.12;
  const a = zeroBased ? 0 : lo - pad;
  const b = hi + pad;
  return { lo, hi, y: (v: number) => H - ((v - a) / (b - a)) * H };
}

interface Series { key: string; label: string; color: string; points: Point[]; unit: string; dashed?: boolean }

function LineChart({ title, series, f, zeroBased }: { title: string; series: Series[]; f: Frame; zeroBased?: boolean }) {
  const all = series.flatMap((s) => s.points.map((p) => p[1]));
  const { lo, hi, y } = scaleY(all, zeroBased);
  // senza dito sul grafico: l'ultima misura (anche se ARPAV è in ritardo); scorrendo: la misura vicina a quell'ora, se c'è
  const reads = series.map((s) => ({ s, p: f.hover == null ? (s.points.at(-1) ?? null) : at(s.points, f.hover, step(s.points) * 1.5) }));
  const x = (tt: number) => ((tt - f.from) / (f.to - f.from)) * 100;
  return (
    <figure className="hc">
      <figcaption className="hc-head">
        <span className="hc-title">{title}</span>
        <span className="hc-read">
          {reads.map(({ s, p }) => (
            <span key={s.key} className="hc-val">
              {series.length > 1 && <span className="hc-sw" style={{ background: s.color }} aria-hidden="true" />}
              {series.length > 1 && <span className="hc-lbl">{s.label}</span>}
              <strong>{p ? fmt(p[1]) : 'n.d.'}</strong> {s.unit}
            </span>
          ))}
        </span>
      </figcaption>
      <div className="hc-plot">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          {f.ticks.map((tk) => {
            const gx = ((tk - f.from) / (f.to - f.from)) * W; // griglia sulle stesse ore delle etichette
            return <line key={tk} x1={gx} x2={gx} y1={0} y2={H} className="hc-grid" />;
          })}
          {series.map((s) => (
            <path key={s.key} d={path(s.points, f, y)} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? '5 4' : undefined} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          ))}
        </svg>
        <span className="hc-y hc-y--hi">{fmt(Math.round(hi * 10) / 10)}</span>
        <span className="hc-y hc-y--lo">{fmt(Math.round(lo * 10) / 10)}</span>
        {f.hover != null && <span className="hc-cross" style={{ left: `${x(f.hover)}%` }} />}
        {reads.map(({ s, p }) =>
          p ? <span key={s.key} className="hc-dot" style={{ left: `${x(p[0])}%`, top: `${y(p[1])}%`, borderColor: s.color }} /> : null,
        )}
      </div>
    </figure>
  );
}

function RainChart({ points, f }: { points: Point[]; f: Frame }) {
  const bars = hourly(points);
  const total = Math.round(points.reduce((a, p) => a + p[1], 0) * 10) / 10;
  const max = Math.max(...bars.map((b) => b[1]), 0.5);
  const t = f.hover ?? f.to;
  const cur = bars.find((b) => t >= b[0] && t < b[0] + 3_600_000) ?? null;
  const x = (tt: number) => ((tt - f.from) / (f.to - f.from)) * 100;
  const bw = (3_600_000 / (f.to - f.from)) * 100;
  return (
    <figure className="hc">
      <figcaption className="hc-head">
        <span className="hc-title">Pioggia · mm all'ora</span>
        <span className="hc-read">
          <span className="hc-val">
            {f.hover != null ? (
              <>
                <strong>{cur ? fmt(cur[1]) : 'n.d.'}</strong> mm alle {hhmm(cur?.[0] ?? t)}
              </>
            ) : (
              <>
                <strong>{fmt(total)}</strong> mm in 24 h
              </>
            )}
          </span>
        </span>
      </figcaption>
      {total === 0 ? (
        <p className="hc-empty">Nessuna pioggia misurata nelle ultime 24 ore.</p>
      ) : (
        <div className="hc-plot hc-plot--bars">
          {bars.map(([bt, v]) =>
            v > 0 ? (
              <span
                key={bt}
                className={`hc-bar${cur && cur[0] === bt && f.hover != null ? ' is-on' : ''}`}
                style={{ left: `calc(${x(bt)}% + 1px)`, width: `calc(${bw}% - 2px)`, height: `${(v / max) * 100}%` }}
              />
            ) : null,
          )}
          <span className="hc-y hc-y--hi">{fmt(Math.round(max * 10) / 10)}</span>
          {f.hover != null && <span className="hc-cross" style={{ left: `${x(f.hover)}%` }} />}
        </div>
      )}
    </figure>
  );
}

/** Frecce della direzione, una ogni 2 ore, sopra il grafico del vento. */
function DirRow({ points, f }: { points: Point[]; f: Frame }) {
  const marks: Point[] = [];
  for (let t = Math.ceil(f.from / 7_200_000) * 7_200_000; t <= f.to; t += 7_200_000) {
    const p = at(points, t, 45 * 60_000);
    if (p) marks.push([t, p[1]]);
  }
  if (!marks.length) return null;
  return (
    <div className="hc-dirs" aria-hidden="true">
      {marks.map(([t, d]) => (
        <span key={t} style={{ left: `${((t - f.from) / (f.to - f.from)) * 100}%` }}>
          <WindArrow deg={d} size={14} />
        </span>
      ))}
    </div>
  );
}

export function HistoryCharts({ id }: { id: string }) {
  const [h, setH] = useState<History | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ac = new AbortController();
    setState('loading');
    setH(null);
    setHover(null);
    fetch(`/api/station-history?id=${encodeURIComponent(id)}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: History) => {
        setH(j);
        setState('ok');
      })
      .catch(() => !ac.signal.aborted && setState('error'));
    return () => ac.abort();
  }, [id]);

  const ticks = useMemo(() => {
    if (!h) return [];
    // etichette alle 0/6/12/18 ora italiana
    const out: number[] = [];
    for (let t = Math.ceil(h.from / 3_600_000) * 3_600_000; t <= h.to; t += 3_600_000) {
      const hr = Number(new Date(t).toLocaleString('it-IT', { hour: '2-digit', hour12: false, timeZone: 'Europe/Rome' }));
      if (hr % 6 === 0) out.push(t);
    }
    return out;
  }, [h]);

  if (state === 'loading')
    return (
      <section className="hist" aria-busy="true">
        <h3 className="hist-title">Ultime 24 ore</h3>
        <div className="hist-skel" />
        <div className="hist-skel" />
      </section>
    );
  if (state === 'error' || !h)
    return (
      <section className="hist">
        <h3 className="hist-title">Ultime 24 ore</h3>
        <p className="hc-empty">Storico non disponibile ora: la fonte non ha risposto. Riprova tra poco.</p>
      </section>
    );

  const f: Frame = { from: h.from, to: h.to, hover, ticks };
  const has = (p: Point[]) => p.length >= 2;
  const scrub = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const k = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    setHover(h.from + k * (h.to - h.from));
  };
  const nothing = ![h.temp, h.windSpeed, h.rain, h.snow].some(has);

  return (
    <section className="hist">
      <h3 className="hist-title">
        Ultime 24 ore <span>{hover != null ? `· ${hhmm(hover)}` : '· tocca e scorri per i valori'}</span>
      </h3>
      {nothing ? (
        <p className="hc-empty">Nessuna misura nelle ultime 24 ore.</p>
      ) : (
        <div className="hist-charts" ref={box} onPointerDown={scrub} onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons) && scrub(e)} onPointerLeave={() => setHover(null)}>
          {has(h.temp) && <LineChart title="Temperatura · °C" series={[{ key: 't', label: 'temperatura', color: INK, points: h.temp, unit: '°C' }]} f={f} />}
          {has(h.windSpeed) && (
            <>
              <LineChart
                title={`Vento · km/h${(() => {
                  const d = hover == null ? (h.windDir.at(-1) ?? null) : at(h.windDir, hover, 45 * 60_000);
                  return d ? ` · da ${cardinal(d[1])}` : '';
                })()}`}
                series={[
                  { key: 'v', label: 'vento', color: BLUE, points: h.windSpeed, unit: 'km/h' },
                  ...(has(h.windGust) ? [{ key: 'g', label: 'raffica', color: RED, points: h.windGust, unit: 'km/h', dashed: true }] : []),
                ]}
                f={f}
                zeroBased
              />
              <DirRow points={h.windDir} f={f} />
            </>
          )}
          {has(h.rain) && <RainChart points={h.rain} f={f} />}
          {has(h.snow) && <LineChart title="Neve al suolo · cm" series={[{ key: 's', label: 'neve', color: BLUE, points: h.snow, unit: 'cm' }]} f={f} zeroBased />}
          <div className="hc-axis" aria-hidden="true">
            {ticks.map((t) => (
              <span key={t} style={{ left: `${((t - h.from) / (h.to - h.from)) * 100}%` }}>
                {hhmm(t)}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
