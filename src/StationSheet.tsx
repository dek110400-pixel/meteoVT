import { X } from 'lucide-react';
import { StarButton } from './StarButton';
import type { Station, Webcam } from '../server/types';
import { age, cardinal, fmt, isStale, SOURCE_LABEL, when } from './format';
import { WindArrow } from './WindArrow';
import { WebcamImage } from './WebcamImage';

const nd = (v: number | null) => (v == null ? 'nd' : '');

interface Props {
  station: Station;
  /** Webcam più vicina entro 10 km, se esiste. */
  cam: { item: Webcam; km: number } | null;
  version: string;
  onClose: () => void;
  fav: boolean;
  onToggleFav: () => void;
}

export function StationSheet({ station: s, cam, version, onClose, fav, onToggleFav }: Props) {
  const stale = isStale(s);
  return (
    <section className="sheet" aria-label={`Stazione ${s.name}`}>
      {cam && (
        <WebcamImage
          cam={cam.item}
          version={version}
          caption={`webcam a ${cam.km < 1 ? `${Math.round(cam.km * 1000)} m` : `${cam.km.toLocaleString('it-IT', { maximumFractionDigits: 1 })} km`}`}
        />
      )}
      <header className="sheet-head">
        <div>
          <h2>{s.name}</h2>
          <p className="sheet-meta">
            {s.elevation} m · {s.province} · {SOURCE_LABEL[s.source]}
          </p>
        </div>
        <StarButton on={fav} name={s.name} onToggle={onToggleFav} />
        <button className="icon-btn" onClick={onClose} aria-label="Chiudi">
          <X size={22} />
        </button>
      </header>

      <p className={`sheet-time${stale ? ' is-stale' : ''}`}>
        {stale ? 'Dato vecchio · ' : 'Ultimo dato '}
        <strong>{when(s.updatedAt)}</strong>
        {s.updatedAt && <span> ({age(s.updatedAt)})</span>}
      </p>

      <dl className={`readings${stale ? ' is-stale' : ''}`}>
        <div className="r r--wide">
          <dt>Temperatura</dt>
          <dd className={`r-big ${nd(s.temp)}`}>{fmt(s.temp, '°')}</dd>
        </div>
        {/* vento e raffica nella prima riga: per l'uso in montagna e negli sport di vento contano subito dopo la temperatura */}
        <div className="r r--wind">
          <dt>Vento{s.windDir != null && ` da ${cardinal(s.windDir)}`}</dt>
          <dd className={nd(s.windSpeed)}>
            {s.windDir != null && <WindArrow deg={s.windDir} />}
            {fmt(s.windSpeed)}
            {s.windSpeed != null && <small> km/h</small>}
          </dd>
        </div>
        <div className="r">
          <dt>Raffica</dt>
          <dd className={nd(s.windGust)}>
            {fmt(s.windGust)}
            {s.windGust != null && <small> km/h</small>}
          </dd>
        </div>
        <div className="r">
          <dt>Umidità</dt>
          <dd className={nd(s.humidity)}>{fmt(s.humidity, '%')}</dd>
        </div>
        <div className="r">
          <dt>Pioggia 1 h</dt>
          <dd className={nd(s.rain1h)}>{fmt(s.rain1h, ' mm')}</dd>
        </div>
        <div className="r">
          <dt>Pioggia oggi</dt>
          <dd className={nd(s.rain)}>{fmt(s.rain, ' mm')}</dd>
        </div>
        {s.snowDepth != null && (
          <div className="r">
            <dt>Neve al suolo</dt>
            <dd>{fmt(s.snowDepth, ' cm')}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
