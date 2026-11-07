import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';

type Item = { id: string; lat: number; lon: number; name: string };

interface Props<T extends Item> {
  items: T[];
  selectedId: string | null;
  /** Deve essere stabile (useCallback/useMemo): quando cambia, i marker vengono ridisegnati. */
  icon: (item: T, selected: boolean) => L.DivIcon;
  clusterClass: string;
  clusterRadius?: number;
  /** Pane Leaflet: le webcam stanno sotto le stazioni. */
  pane?: string;
  clusterSize?: number;
  /** Valore "letterato" accanto al cluster (es. min–max della temperatura), come sulla carta. */
  clusterLabel?: (items: T[]) => string;
  /** Sotto questo zoom il gruppo è nascosto (le webcam servono da vicino). */
  minZoom?: number;
  onSelect: (item: T) => void;
}

/** Un gruppo di marker raggruppati (cluster) per tipo: stazioni e webcam hanno gruppi e stili separati. */
export function MarkerLayer<T extends Item>({
  items,
  selectedId,
  icon,
  clusterClass,
  clusterRadius = 48,
  pane = 'markerPane',
  clusterSize = 40,
  clusterLabel,
  minZoom = 0,
  onSelect,
}: Props<T>) {
  const map = useMap();
  const markers = useRef(new Map<string, { m: L.Marker; item: T }>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const selRef = useRef(selectedId);
  selRef.current = selectedId;

  // Gruppo e marker insieme: con ~1000 punti ricostruire tutto quando cambiano dati o layer costa pochi ms.
  useEffect(() => {
    const itemOf = new WeakMap<L.Marker, T>();
    const g = L.markerClusterGroup({
      iconCreateFunction: (c) => {
        const text = clusterLabel?.(c.getAllChildMarkers().map((m) => itemOf.get(m)!).filter(Boolean)) ?? '';
        const lbl = text ? `<span class="cl-lbl" style="left:${clusterSize + 4}px">${text}</span>` : '';
        return L.divIcon({ className: clusterClass, html: `<span class="cl-n">${c.getChildCount()}</span>${lbl}`, iconSize: [clusterSize, clusterSize] });
      },
      clusterPane: pane,
      showCoverageOnHover: false,
      maxClusterRadius: clusterRadius,
      disableClusteringAtZoom: 11,
      spiderfyOnMaxZoom: true,
    });
    const index = markers.current;
    index.clear();
    g.addLayers(
      items.map((item) => {
        const m = L.marker([item.lat, item.lon], { icon: icon(item, item.id === selRef.current), title: item.name, keyboard: true, pane });
        m.on('click', () => onSelectRef.current(item));
        itemOf.set(m, item);
        index.set(item.id, { m, item });
        return m;
      }),
    );
    const sync = () => (map.getZoom() >= minZoom ? map.addLayer(g) : map.removeLayer(g));
    sync();
    map.on('zoomend', sync);
    // Etichette dei cluster: nascondo quelle che toccano un altro cluster o un'altra etichetta (niente testo sovrapposto).
    const declutter = () =>
      requestAnimationFrame(() => {
        const root = map.getContainer();
        const edge = root.getBoundingClientRect().right; // un'etichetta tagliata dal bordo non si legge: meglio toglierla
        const boxes = [...root.querySelectorAll('.cl .cl-n')].map((e) => e.getBoundingClientRect());
        const kept: DOMRect[] = [];
        root.querySelectorAll<HTMLElement>('.cl-lbl').forEach((el) => {
          el.style.visibility = '';
          const r = el.getBoundingClientRect();
          const hit = (b: DOMRect) => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
          if (boxes.some(hit) || kept.some(hit) || r.right > edge) el.style.visibility = 'hidden';
          else kept.push(r);
        });
      });
    if (clusterLabel) {
      map.on('moveend', declutter);
      g.on('animationend', declutter);
      declutter();
    }
    return () => {
      map.off('zoomend', sync);
      map.off('moveend', declutter);
      map.removeLayer(g);
      index.clear();
    };
  }, [map, items, icon, clusterClass, clusterRadius, pane, clusterSize, clusterLabel, minZoom]);

  // Cambio di selezione: ridisegno solo il marker vecchio e quello nuovo.
  const prevSel = useRef<string | null>(null);
  useEffect(() => {
    for (const id of [prevSel.current, selectedId]) {
      const e = id && markers.current.get(id);
      if (e) e.m.setIcon(icon(e.item, id === selectedId));
    }
    prevSel.current = selectedId;
  }, [selectedId, icon, items]);

  return null;
}
