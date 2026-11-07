import { Star, X } from 'lucide-react';
import type { Station, Webcam } from '../server/types';
import { type FavKind, parseFavKey } from './favorites';
import { age, cardinal, fmt, isOld, isStale, when } from './format';
import { StarButton } from './StarButton';
import { WindArrow } from './WindArrow';

interface Props {
  favorites: string[];
  stations: Station[];
  webcams: Webcam[];
  version: string;
  onPick: (kind: FavKind, id: string) => void;
  onToggle: (kind: FavKind, id: string) => void;
  onClose: () => void;
}

/** Pannello laterale con i preferiti e i loro dati live; un tocco porta il punto sulla mappa. */
export function FavoritesPanel({ favorites, stations, webcams, version, onPick, onToggle, onClose }: Props) {
  return (
    <aside className="favs" aria-label="Preferiti">
      <header className="favs-head">
        <h2>Preferiti</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Chiudi i preferiti">
          <X size={22} />
        </button>
      </header>

      {favorites.length === 0 ? (
        <p className="favs-empty">
          Apri una stazione o una webcam e tocca la stella <Star size={16} aria-label="stella" className="inline-icon" /> per
          ritrovarla qui con i dati aggiornati.
        </p>
      ) : (
        <ul className="favs-list">
          {favorites.map((k) => {
            const { kind, id } = parseFavKey(k);
            const item = kind === 'station' ? stations.find((s) => s.id === id) : webcams.find((c) => c.id === id);
            if (!item) {
              return (
                <li key={k} className="fav fav--missing">
                  <div className="fav-main">
                    <span className="fav-text">
                      <span className="fav-name">{kind === 'station' ? 'Stazione' : 'Webcam'} {id}</span>
                      <span className="fav-meta">Non presente negli ultimi dati</span>
                    </span>
                  </div>
                  <StarButton on name={id} onToggle={() => onToggle(kind, id)} />
                </li>
              );
            }
            return (
              <li key={k} className="fav">
                <button className="fav-main" onClick={() => onPick(kind, id)}>
                  {kind === 'station' ? <StationRow s={item as Station} /> : <WebcamRow c={item as Webcam} version={version} />}
                </button>
                <StarButton on name={item.name} onToggle={() => onToggle(kind, id)} />
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

function StationRow({ s }: { s: Station }) {
  const stale = isStale(s);
  return (
    <>
      <span className="fav-text">
        <span className="fav-name">{s.name}</span>
        <span className={`fav-meta${stale ? ' is-stale' : ''}`}>
          {s.elevation} m · {s.province} · {when(s.updatedAt)}
        </span>
      </span>
      <span className={`fav-vals${stale ? ' is-stale' : ''}`}>
        <span className={`fav-temp${s.temp == null ? ' nd' : ''}`}>{fmt(s.temp, '°')}</span>
        <span className="fav-wind">
          {s.windSpeed == null ? (
            <span className="nd">vento n.d.</span>
          ) : (
            <>
              {s.windDir != null && <WindArrow deg={s.windDir} size={18} />}
              {fmt(s.windSpeed)}
              {s.windGust != null && <small> ({fmt(s.windGust)})</small>} <small>km/h {cardinal(s.windDir)}</small>
            </>
          )}
        </span>
        {s.snowDepth != null && <span className="fav-snow">neve {fmt(s.snowDepth, ' cm')}</span>}
      </span>
    </>
  );
}

function WebcamRow({ c, version }: { c: Webcam; version: string }) {
  const src = c.source === 'arpav' ? `${c.imageUrl}&v=${encodeURIComponent(version)}` : c.imageUrl;
  return (
    <>
      <img className="fav-thumb" src={src} alt="" loading="lazy" />
      <span className="fav-text">
        <span className="fav-name">{c.name}</span>
        <span className={`fav-meta${isOld(c.updatedAt) ? ' is-stale' : ''}`}>
          Webcam · foto {c.updatedAt ? `${when(c.updatedAt)} (${age(c.updatedAt)})` : 'n.d.'}
        </span>
      </span>
    </>
  );
}
