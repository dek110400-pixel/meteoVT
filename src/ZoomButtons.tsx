import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Minus, Plus } from 'lucide-react';

/** Zoom con le icone dell'app (il controllo di Leaflet usa i caratteri "+" e "−"). */
export function ZoomButtons() {
  const map = useMap();
  const ref = useRef<HTMLDivElement>(null);
  // i clic sui pulsanti non devono arrivare alla mappa (chiuderebbero la scheda)
  useEffect(() => {
    if (ref.current) L.DomEvent.disableClickPropagation(ref.current);
  }, []);
  return (
    <div className="zoom" ref={ref}>
      <button className="icon-btn" onClick={() => map.zoomIn()} aria-label="Avvicina">
        <Plus size={22} />
      </button>
      <button className="icon-btn" onClick={() => map.zoomOut()} aria-label="Allontana">
        <Minus size={22} />
      </button>
    </div>
  );
}
