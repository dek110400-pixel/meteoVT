import { useEffect, useState } from 'react';
import { ExternalLink, Image as ImageIcon, PlayCircle } from 'lucide-react';
import type { Webcam } from '../server/types';
import { age, isOld, when } from './format';

interface Props {
  cam: Webcam;
  /** Cambia a ogni aggiornamento dati: forza il browser a ricaricare l'immagine. */
  version: string;
  caption?: string;
}

const SOURCE = (c: Webcam) => (c.source === 'windy' ? 'Windy.com' : new URL(c.pageUrl).hostname.replace(/^www\./, ''));

/**
 * Immagine webcam: cliccandola si apre la fonte (Windy chiede il link a windy.com).
 * Per le webcam Windy c'è anche il timelapse delle ultime 24 ore (player di Windy, incorporabile nel piano gratuito).
 */
export function WebcamImage({ cam, version, caption }: Props) {
  const [failed, setFailed] = useState(false);
  const [lapse, setLapse] = useState(false);
  useEffect(() => {
    setFailed(false);
    setLapse(false);
  }, [cam.id, version]);
  const src = cam.source === 'arpav' ? `${cam.imageUrl}&v=${encodeURIComponent(version)}` : cam.imageUrl;
  const old = isOld(cam.updatedAt);

  return (
    <figure className="cam">
      {lapse && cam.timelapseUrl ? (
        <div className="cam-frame">
          <iframe src={cam.timelapseUrl} title={`Timelapse 24 ore della webcam ${cam.name}`} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        </div>
      ) : (
        <a href={cam.pageUrl} target="_blank" rel="noopener noreferrer" className="cam-frame" aria-label={`Apri la webcam ${cam.name} su ${SOURCE(cam)}`}>
          {failed ? (
            <span className="cam-missing">Immagine non disponibile</span>
          ) : (
            <img src={src} alt={`Webcam ${cam.name}`} decoding="async" onError={() => setFailed(true)} />
          )}
        </a>
      )}
      <figcaption className="cam-cap">
        <span className={old ? 'is-stale' : undefined}>
          {caption && <>{caption} · </>}
          {lapse ? (
            'timelapse ultime 24 ore'
          ) : cam.updatedAt ? (
            <>
              foto {when(cam.updatedAt)} ({age(cam.updatedAt)})
            </>
          ) : (
            'ora della foto n.d.'
          )}
        </span>
        <span className="cam-links">
          {cam.timelapseUrl && (
            <button className="cam-lapse" onClick={() => setLapse((l) => !l)} aria-pressed={lapse}>
              {lapse ? <ImageIcon size={16} aria-hidden="true" /> : <PlayCircle size={16} aria-hidden="true" />}
              {lapse ? 'Foto' : 'Timelapse 24 h'}
            </button>
          )}
          <a href={cam.pageUrl} target="_blank" rel="noopener noreferrer">
            {SOURCE(cam)} <ExternalLink size={14} aria-hidden="true" />
          </a>
        </span>
      </figcaption>
    </figure>
  );
}
