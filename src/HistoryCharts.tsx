import { useEffect, useMemo, useRef, useState } from 'react';
import type { History, Point } from '../server/history';
import type { Forecast } from '../server/forecast';
import { cardinalWord, fmt } from './format';
import { WindArrow } from './WindArrow';

// Colori delle serie (validati con lo script dataviz su fondo carta: contrasto ≥ 3:1, separazione CVD ΔE 19).
const INK = 'var(--ink)';
const BLUE = 'var(--water)';
const RED = 'var(--trail)';
const BROWN = 'var(--contour)';
const HOUR = 3_600_000;

const tz = { timeZone: 'Europe/Rome' } as const;
const hhmm = (t: number) => new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', ...tz });
const dayHour = (t: number) => `${new Date(t).toLocaleDateString('it-IT', { weekday: 'short', ...tz })} ${hhmm(t)}`;

/** Il punto più vicino a t (null se il più vicino dista più di maxGap: in quel punto non c'è dato). */
function at(p: Point[], t: number, maxGap: number): Point | null {
  let best: Point | null = null;
  for (const x of p) if (!best || Math.abs(x[0] - t) < Math.abs(best[0] - t)) best = x;
  return best && Math.abs(best[0] - t) <= maxGap ? best : null;
}

/** Passo tipico tra due punti; serve a capire dove i dati mancano (buchi da non unire con una linea). */
const step = (p: Point[]) => {
  const d = p.slice(1).map((x, i) => x[0] - p[i][0]).sort((a, b) => a - b);
  return d.length ? d[Math.floor(d.length / 2)] : 30 * 60_000;
};

/** Somma per ora intera, per le barre di pioggia. */
function hourly(p: Point[]): Point[] {
  const m = new Map<number, number>();
  for (const [t, v] of p) {
    const h = Math.floor(t / HOUR) * HOUR;
    m.set(h, (m.get(h) ?? 0) + v);
  }
  return [...m].sort((a, b) => a[0] - b[0]).map(([t, v]) => [t, Math.round(v * 10) / 10]);
}
const sum = (p: Point[]) => Math.round(p.reduce((a, x) => a + x[1], 0) * 10) / 10;

/** Finestra temporale condivisa: [from, now] misurato, [now, to] previsione. */
interface Frame { from: number; now: number; to: number; hover: number | null; ticks: number[] }
const X = (f: Frame, t: number) => ((t - f.from) / (f.to - f.from)) * 100; // in %

const W = 1000; // coordinate SVG orizzontali (la linea non si deforma: vector-effect non-scaling-stroke)
const H = 100;

function path(p: Point[], f: Frame, y: (v: number) => number): string {
  const gap = step(p) * 2.5;
  return p.map(([t, v], i) => `${i && t - p[i - 1][0] <= gap ? 'L' : 'M'}${(X(f, t) * (W / 100)).toFixed(1)},${y(v).toFixed(1)}`).join('');
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

interface Series { key: string; label: string; color: string; points: Point[]; fc: Point[]; unit: string; dashed?: boolean }

/** Valore da mostrare: senza dito l'ultima misura (o la prima previsione se non ci sono misure); scorrendo, il dato più vicino a quell'ora. */
function readOf(s: Series, f: Frame, chartHasMeasures: boolean): { p: Point; fc: boolean } | null {
  if (f.hover == null) {
    const m = s.points.at(-1);
    if (m) return { p: m, fc: false };
    // previsione solo se il grafico non ha misure (es. zero termico): non si mescola misurato e previsto nella stessa lettura
    return !chartHasMeasures && s.fc[0] ? { p: s.fc[0], fc: true } : null;
  }
  if (f.hover <= f.now) {
    const m = at(s.points, f.hover, step(s.points) * 1.5);
    return m ? { p: m, fc: false } : null;
  }
  const p = at(s.fc, f.hover, HOUR * 0.75);
  return p ? { p, fc: true } : null;
}

function Plot({ f, children, bars }: { f: Frame; children?: React.ReactNode; bars?: boolean }) {
  return (
    <div className={`hc-plot${bars ? ' hc-plot--bars' : ''}`}>
      <span className="hc-future" style={{ left: `${X(f, f.now)}%` }} aria-hidden="true" />
      <span className="hc-now" style={{ left: `${X(f, f.now)}%` }} aria-hidden="true" />
      {children}
      {f.hover != null && <span className="hc-cross" style={{ left: `${X(f, f.hover)}%` }} />}
    </div>
  );
}

function Grid({ f }: { f: Frame }) {
  return (
    <>
      {f.ticks.map((tk) => {
        const gx = X(f, tk) * (W / 100); // griglia sulle stesse ore delle etichette
        return <line key={tk} x1={gx} x2={gx} y1={0} y2={H} className="hc-grid" />;
      })}
    </>
  );
}

function LineChart({ title, series, f, zeroBased, refLine }: { title: string; series: Series[]; f: Frame; zeroBased?: boolean; refLine?: { v: number; label: string } }) {
  const all = series.flatMap((s) => [...s.points, ...s.fc].map((p) => p[1])).concat(refLine ? [refLine.v] : []);
  if (!all.length) return null;
  const { lo, hi, y } = scaleY(all, zeroBased);
  const measured = series.some((s) => s.points.length > 0);
  const reads = series.map((s) => ({ s, r: readOf(s, f, measured) }));
  return (
    <figure className="hc">
      <figcaption className="hc-head">
        <span className="hc-title">{title}</span>
        <span className="hc-read">
          {reads.some(({ r }) => r?.fc) && <span className="hc-fc">previsione</span>}
          {reads.map(({ s, r }) => (
            <span key={s.key} className="hc-val">
              {series.length > 1 && <span className="hc-sw" style={{ background: s.color }} aria-hidden="true" />}
              {series.length > 1 && <span className="hc-lbl">{s.label}</span>}
              <strong>{r ? fmt(r.p[1]) : 'n.d.'}</strong>{r && ` ${s.unit}`}
            </span>
          ))}
        </span>
      </figcaption>
      <Plot f={f}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <Grid f={f} />
          {refLine && <line x1={0} x2={W} y1={y(refLine.v)} y2={y(refLine.v)} className="hc-ref" />}
          {series.map((s) => (
            <g key={s.key} stroke={s.color} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '5 4' : undefined}>
              <path d={path(s.points, f, y)} vectorEffect="non-scaling-stroke" />
              {/* previsione: tratteggio leggero (o più lungo se la serie è già tratteggiata), così si distingue anche fuori dalla banda */}
              <path d={path(s.fc, f, y)} vectorEffect="non-scaling-stroke" className="hc-fcline" strokeDasharray={s.dashed ? '9 4' : '6 3'} />
            </g>
          ))}
        </svg>
        <span className="hc-y hc-y--hi">{fmt(Math.round(hi * 10) / 10)}</span>
        <span className="hc-y hc-y--lo">{fmt(Math.round(lo * 10) / 10)}</span>
        {refLine && (
          <span className="hc-reflbl" style={{ top: `${y(refLine.v)}%` }}>
            {refLine.label}
          </span>
        )}
        {reads.map(({ s, r }) => (r && !(r.fc && Math.abs(r.p[0] - f.now) < 40 * 60_000) ? <span key={s.key} className={`hc-dot${r.fc ? ' is-fc' : ''}`} style={{ left: `${X(f, r.p[0])}%`, top: `${y(r.p[1])}%`, borderColor: s.color }} /> : null))}
      </Plot>
    </figure>
  );
}

function BarChart({ title, unit, past, fc, f, emptyText }: { title: string; unit: string; past: Point[]; fc: Point[]; f: Frame; emptyText: string }) {
  const pb = hourly(past);
  const all = [...pb, ...fc];
  const max = Math.max(...all.map((b) => b[1]), 0.5);
  const t = f.hover;
  const cur = t == null ? null : all.find((b) => t >= b[0] && t < b[0] + HOUR) ?? null;
  const bw = (HOUR / (f.to - f.from)) * 100;
  const pastTot = sum(past);
  const fcTot = sum(fc);
  if (pastTot === 0 && fcTot === 0)
    return (
      <figure className="hc">
        <figcaption className="hc-head">
          <span className="hc-title">{title}</span>
        </figcaption>
        <p className="hc-empty">{emptyText}</p>
      </figure>
    );
  return (
    <figure className="hc">
      <figcaption className="hc-head">
        <span className="hc-title">{title}</span>
        <span className="hc-read">
          {t != null ? (
            <span className="hc-val">
              {t > f.now && <span className="hc-fc">previsione</span>}
              <strong>{cur ? fmt(cur[1]) : t > f.now ? '0' : 'n.d.'}</strong>{(cur || t > f.now) && ` ${unit}`} alle {hhmm(Math.floor(t / HOUR) * HOUR)}
            </span>
          ) : (
            <span className="hc-val">
              {past.length > 0 && (
                <>
                  <strong>{fmt(pastTot)}</strong> {unit} misurati ·{' '}
                </>
              )}
              <strong>{fmt(fcTot)}</strong> {unit} previsti
            </span>
          )}
        </span>
      </figcaption>
      <Plot f={f} bars>
        {all.map(([bt, v]) =>
          v > 0 ? (
            <span
              key={bt}
              className={`hc-bar${bt >= f.now ? ' is-fc' : ''}${cur && cur[0] === bt ? ' is-on' : ''}`}
              style={{ left: `calc(${X(f, bt)}% + 1px)`, width: `calc(${bw}% - 2px)`, height: `${(v / max) * 100}%` }}
            />
          ) : null,
        )}
        <span className="hc-y hc-y--hi">{fmt(Math.round(max * 10) / 10)}</span>
      </Plot>
    </figure>
  );
}

/** Frecce della direzione, una ogni 2 o 3 ore, sopra il grafico del vento (chiare nella parte di previsione). */
function DirRow({ past, fc, f }: { past: Point[]; fc: Point[]; f: Frame }) {
  const every = f.to - f.from > 50 * HOUR ? 3 * HOUR : 2 * HOUR;
  const marks: { t: number; d: number; fc: boolean }[] = [];
  for (let t = Math.ceil(f.from / every) * every; t <= f.to; t += every) {
    const p = t <= f.now ? at(past, t, 45 * 60_000) : at(fc, t, 45 * 60_000);
    if (p) marks.push({ t, d: p[1], fc: t > f.now });
  }
  if (!marks.length) return null;
  return (
    <div className="hc-dirs" aria-hidden="true">
      {marks.map((m) => (
        <span key={m.t} className={m.fc ? 'is-fc' : undefined} style={{ left: `${X(f, m.t)}%` }}>
          <WindArrow deg={m.d} size={14} />
        </span>
      ))}
    </div>
  );
}

interface Props {
  id: string;
  forecast: Forecast | null;
  forecastState: 'loading' | 'ok' | 'error';
  elevation: number;
}

export function HistoryCharts({ id, forecast, forecastState, elevation }: Props) {
  const [h, setH] = useState<History | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [hover, setHover] = useState<number | null>(null);
  const [ahead, setAhead] = useState<24 | 48>(24);
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

  const now = h?.to ?? Date.now();
  const from = now - 24 * HOUR;
  const to = now + ahead * HOUR;

  const ticks = useMemo(() => {
    // etichette ogni 6 ore (ogni 12 se la finestra è di 3 giorni), in ora italiana
    const every = to - from > 50 * HOUR ? 12 : 6;
    const out: number[] = [];
    for (let t = Math.ceil(from / HOUR) * HOUR; t <= to; t += HOUR) {
      const hr = Number(new Date(t).toLocaleString('it-IT', { hour: '2-digit', hour12: false, ...tz }));
      if (hr % every === 0) out.push(t);
    }
    return out;
  }, [from, to]);

  const fc = useMemo(() => {
    const cut = (p: Point[] | undefined) => (p ?? []).filter(([t]) => t >= now - HOUR / 2 && t <= to);
    return {
      temp: cut(forecast?.temp),
      wind: cut(forecast?.windSpeed),
      gust: cut(forecast?.windGust),
      dir: cut(forecast?.windDir),
      precip: cut(forecast?.precip),
      snow: cut(forecast?.snowfall),
      freezing: cut(forecast?.freezing),
    };
  }, [forecast, now, to]);

  const title = (
    <div className="hist-top">
      <h3 className="hist-title">
        Ultime 24 ore e previsioni <span>{hover != null ? `· ${dayHour(hover)}${hover > now ? ' (previsione)' : ''}` : '· tocca e scorri'}</span>
      </h3>
      <div className="hist-ahead" role="radiogroup" aria-label="Ore di previsione">
        {([24, 48] as const).map((n) => (
          <button key={n} role="radio" aria-checked={ahead === n} className={ahead === n ? 'on' : undefined} onClick={() => setAhead(n)}>
            +{n} h
          </button>
        ))}
      </div>
    </div>
  );

  if (state === 'loading')
    return (
      <section className="hist" aria-busy="true">
        {title}
        <div className="hist-skel" />
        <div className="hist-skel" />
      </section>
    );

  const past = h ?? { temp: [], humidity: [], windSpeed: [], windGust: [], windDir: [], rain: [], snow: [] };
  const f: Frame = { from, now, to, hover, ticks };
  const has = (p: Point[]) => p.length >= 2;
  const scrub = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const k = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    setHover(from + k * (to - from));
  };
  const dirNow = (() => {
    const d = hover == null ? (past.windDir.at(-1) ?? fc.dir[0] ?? null) : hover <= now ? at(past.windDir, hover, 45 * 60_000) : at(fc.dir, hover, 45 * 60_000);
    return d ? ` · da ${cardinalWord(d[1])}` : '';
  })();

  return (
    <section className="hist">
      {title}
      {state === 'error' && <p className="hc-note">Storico non disponibile ora: la stazione non ha risposto.</p>}
      {forecastState === 'error' && <p className="hc-note">Previsioni non disponibili ora: riprova tra poco.</p>}
      <div className="hist-charts" ref={box} onPointerDown={scrub} onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons) && scrub(e)} onPointerLeave={() => setHover(null)}>
        {(has(past.temp) || has(fc.temp)) && <LineChart title="Temperatura · °C" series={[{ key: 't', label: 'temperatura', color: INK, points: past.temp, fc: fc.temp, unit: '°C' }]} f={f} />}
        {(has(past.windSpeed) || has(fc.wind)) && (
          <>
            <LineChart
              title={`Vento · km/h${dirNow}`}
              series={[
                { key: 'v', label: 'vento', color: BLUE, points: past.windSpeed, fc: fc.wind, unit: 'km/h' },
                ...(has(past.windGust) || has(fc.gust) ? [{ key: 'g', label: 'raffica', color: RED, points: past.windGust, fc: fc.gust, unit: 'km/h', dashed: true }] : []),
              ]}
              f={f}
              zeroBased
            />
            <DirRow past={past.windDir} fc={fc.dir} f={f} />
          </>
        )}
        <BarChart title="Pioggia · mm all'ora" unit="mm" past={past.rain} fc={fc.precip} f={f} emptyText="Nessuna pioggia misurata né prevista." />
        {has(past.snow) && <LineChart title="Neve al suolo · cm" series={[{ key: 's', label: 'neve', color: BLUE, points: past.snow, fc: [], unit: 'cm' }]} f={f} zeroBased />}
        {sum(fc.snow) > 0 && <BarChart title="Neve fresca prevista · cm all'ora" unit="cm" past={[]} fc={fc.snow} f={f} emptyText="" />}
        {has(fc.freezing) && (
          <LineChart
            title="Zero termico · m"
            series={[{ key: 'z', label: 'zero termico', color: BROWN, points: [], fc: fc.freezing, unit: 'm' }]}
            f={f}
            refLine={{ v: elevation, label: `stazione ${fmt(elevation)} m` }}
          />
        )}
        <div className="hc-axis" aria-hidden="true">
          {ticks.filter((t) => Math.abs(t - now) > 2.5 * HOUR).map((t) => {
            // le etichette troppo vicine ad "adesso" si sovrapporrebbero: la griglia resta, l'etichetta no
            const midnight = hhmm(t) === '00:00';
            return (
              <span key={t} className={midnight ? 'is-day' : undefined} style={{ left: `${X(f, t)}%` }}>
                {midnight ? new Date(t).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', ...tz }) : hhmm(t)}
              </span>
            );
          })}
          <span className="hc-axis-now" style={{ left: `${X(f, now)}%` }}>
            adesso
          </span>
        </div>
      </div>
      {forecast && <p className="hc-src">Previsioni: modello ICON (DWD) via Open-Meteo, aggiornate ogni ora. Le misure sono a sinistra di "adesso".</p>}
    </section>
  );
}
