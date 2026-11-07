import { X } from 'lucide-react';
import type { Station, Webcam } from '../server/types';
import type { Place } from '../server/geocode';
import type { FavKind } from './favorites';
import { cardinal, fmt, isStale, round0, when } from './format';
import { WindArrow } from './WindArrow';
import { useForecast } from './useForecast';

const dist = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString('it-IT', { maximumFractionDigits: 1 })} km`);

interface Props {
  place: Place;
  station: { item: Station; km: number } | null;
  cam: { item: Webcam; km: number } | null;
  version: string;
  onPick: (kind: FavKind, id: string) => void;
  onClose: () => void;
}

/** Riquadro della località cercata: stazione e webcam più vicine, toccabili. */
export function PlaceCard({ place, station, cam, version, onPick, onClose }: Props) {
  const s = station?.item;
  const { forecast, state } = useForecast(place.lat, place.lon, null);
  const next = (p: [number, number][] | undefined) => (p ?? []).slice(0, 12); // prossime 12 ore
  const vals = (p: [number, number][] | undefined) => next(p).map((x) => x[1]);
  const t = vals(forecast?.temp);
  const g = vals(forecast?.windGust);
  const rain = Math.round(vals(forecast?.precip).reduce((a, b) => a + b, 0) * 10) / 10;
  const zero = forecast?.freezing[0]?.[1];
  const camSrc = cam && (cam.item.source === 'arpav' ? `${cam.item.imageUrl}&v=${encodeURIComponent(version)}` : cam.item.imageUrl);
  return (
    <section className="sheet place" aria-label={`Località ${place.name}`}>
      <header className="sheet-head">
        <div>
          <h2>{place.name}</h2>
          <p className="sheet-meta">{place.label.split(', ').slice(1).join(', ') || 'Località'}</p>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Chiudi">
          <X size={22} />
        </button>
      </header>

      <div className="place-fc">
        <span className="near-k">Prossime 12 ore · previsione</span>
        {state === 'loading' && <span className="place-fc-row">…</span>}
        {state === 'error' && <span className="place-fc-row nd">Previsioni non disponibili ora.</span>}
        {forecast && t.length > 0 && (
          <span className="place-fc-row">
            <span>
              <strong>
                {fmt(round0(Math.min(...t)))}…{fmt(round0(Math.max(...t)), '°')}
              </strong>
            </span>
            <span>
              raffiche fino a <strong>{fmt(Math.round(Math.max(...g)))}</strong> km/h
            </span>
            <span>
              pioggia <strong>{fmt(rain)}</strong> mm
            </span>
            {zero != null && (
              <span>
                zero termico <strong>{fmt(Math.round(zero / 10) * 10)}</strong> m
              </span>
            )}
          </span>
        )}
      </div>

      <div className="place-near">
        {s ? (
          <button className={`near${isStale(s) ? ' is-stale' : ''}`} onClick={() => onPick('station', s.id)}>
            <span className="near-k">Stazione più vicina · {dist(station!.km)}</span>
            <span className="near-name">{s.name}</span>
            <span className="near-vals">
              <strong>{fmt(s.temp, '°')}</strong>
              {s.windSpeed != null && (
                <span>
                  {s.windDir != null && <WindArrow deg={s.windDir} size={16} />} {fmt(s.windSpeed)} km/h {cardinal(s.windDir)}
                </span>
              )}
              <span className="near-time">{when(s.updatedAt)}</span>
            </span>
          </button>
        ) : (
          <p className="near-none">Nessuna stazione entro 25 km.</p>
        )}
        {cam ? (
          <button className="near near--cam" onClick={() => onPick('webcam', cam.item.id)}>
            <img src={camSrc!} alt="" />
            <span>
              <span className="near-k">Webcam più vicina · {dist(cam.km)}</span>
              <span className="near-name">{cam.item.name}</span>
            </span>
          </button>
        ) : (
          <p className="near-none">Nessuna webcam entro 10 km.</p>
        )}
      </div>
    </section>
  );
}
