import { X } from 'lucide-react';
import type { Station, Webcam } from '../server/types';
import type { Place } from '../server/geocode';
import type { FavKind } from './favorites';
import { cardinal, fmt, isStale, when } from './format';
import { WindArrow } from './WindArrow';

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
