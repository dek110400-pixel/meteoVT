import { X } from 'lucide-react';
import { StarButton } from './StarButton';
import type { Webcam } from '../server/types';
import { WebcamImage } from './WebcamImage';

interface Props {
  cam: Webcam;
  version: string;
  onClose: () => void;
  fav: boolean;
  onToggleFav: () => void;
}

export function WebcamSheet({ cam, version, onClose, fav, onToggleFav }: Props) {
  return (
    <section className="sheet" aria-label={`Webcam ${cam.name}`}>
      <WebcamImage cam={cam} version={version} />
      <header className="sheet-head">
        <div>
          <h2>{cam.name}</h2>
          <p className="sheet-meta">Webcam · quota {cam.elevation == null ? 'n.d.' : `${cam.elevation} m`}</p>
        </div>
        <StarButton on={fav} name={cam.name} onToggle={onToggleFav} />
        <button className="icon-btn" onClick={onClose} aria-label="Chiudi">
          <X size={22} />
        </button>
      </header>
    </section>
  );
}
