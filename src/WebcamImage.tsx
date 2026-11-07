import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { Webcam } from '../server/types';
import { age, isOld, when } from './format';

interface Props {
  cam: Webcam;
  /** Cambia a ogni aggiornamento dati: forza il browser a ricaricare l'immagine. */
  version: string;
  caption?: string;
}

const SOURCE = (c: Webcam) => (c.source === 'windy' ? 'Windy.com' : new URL(c.pageUrl).hostname.replace(/^www\./, ''));

/** Immagine webcam: cliccandola si apre la fonte (Windy chiede il link a windy.com). */
export function WebcamImage({ cam, version, caption }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [cam.id, version]);
  const src = cam.source === 'arpav' ? `${cam.imageUrl}&v=${encodeURIComponent(version)}` : cam.imageUrl;
  const old = isOld(cam.updatedAt);

  return (
    <figure className="cam">
      <a href={cam.pageUrl} target="_blank" rel="noopener noreferrer" className="cam-frame" aria-label={`Apri la webcam ${cam.name} su ${SOURCE(cam)}`}>
        {failed ? (
          <span className="cam-missing">Immagine non disponibile</span>
        ) : (
          <img src={src} alt={`Webcam ${cam.name}`} decoding="async" onError={() => setFailed(true)} />
        )}
      </a>
      <figcaption className="cam-cap">
        <span className={old ? 'is-stale' : undefined}>
          {caption && <>{caption} · </>}
          {cam.updatedAt ? (
            <>
              foto {when(cam.updatedAt)} ({age(cam.updatedAt)})
            </>
          ) : (
            'ora della foto n.d.'
          )}
        </span>
        <a href={cam.pageUrl} target="_blank" rel="noopener noreferrer">
          {SOURCE(cam)} <ExternalLink size={14} aria-hidden="true" />
        </a>
      </figcaption>
    </figure>
  );
}
