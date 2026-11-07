import { useCallback, useEffect, useMemo, useState } from 'react';
import { AttributionControl, MapContainer, Marker, Pane, TileLayer, useMap, useMapEvent } from 'react-leaflet';
import { ZoomButtons } from './ZoomButtons';
import L from 'leaflet';
import { RefreshCw, Search, Star } from 'lucide-react';
import type { Station } from '../server/types';
import type { StationsPayload } from '../server/stations';
import type { WebcamsPayload } from '../server/webcams';
import type { Place } from '../server/geocode';
import { useFeed } from './api';
import { clock } from './format';
import { nearest } from './geo';
import { clusterLabel, placeIcon, stationIcon, webcamIcon } from './icons';
import { MarkerLayer } from './MarkerLayer';
import { LayerPanel, tempRange, useLayer } from './LayerPanel';
import { SearchBar } from './SearchBar';
import { PlaceCard } from './PlaceCard';
import { isStale } from './format';
import { FavoritesPanel } from './FavoritesPanel';
import { type FavKind, useFavorites } from './favorites';
import { StationSheet } from './StationSheet';
import { WebcamSheet } from './WebcamSheet';

const BOUNDS = L.latLngBounds([44.7, 10.3], [47.2, 13.2]); // Veneto + Trentino con margine
const CAM_RADIUS_KM = 10;

// Attribuzioni richieste dalle licenze (CC-BY-SA mappa, CC BY 4.0 dati, link a Windy), in forma breve per il telefono.
const ATTRIBUTION =
  'Mappa © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)' +
  ' · Dati <a href="https://www.arpa.veneto.it" title="Dati non validati, pubblicati in automatico">ARPAV</a>, <a href="https://www.meteotrentino.it">Meteotrentino</a> (CC BY 4.0)' +
  ' · Webcam <a href="https://www.windy.com/webcams">Windy.com</a> e proprietari indicati';

const SOURCE_NAME: Record<string, string> = { arpav: 'ARPAV', meteotrentino: 'Meteotrentino', windy: 'Windy' };

// fly: arrivo dai preferiti → la mappa vola e avvicina; altrimenti sposta solo quanto basta
type Selection = { kind: FavKind; id: string; fly?: number } | null;
const FLY_ZOOM = 12;

/** Chiude la scheda toccando la mappa e porta il punto scelto nella parte visibile (sopra il pannello su telefono). */
function MapController({ point, fly, onClear }: { point: { lat: number; lon: number } | null; fly?: number; onClear: () => void }) {
  const map = useMap();
  useMapEvent('click', onClear);
  useEffect(() => {
    if (!point) return;
    const reveal = () => {
      const size = map.getSize();
      const phone = size.x < 760;
      const p = map.latLngToContainerPoint([point.lat, point.lon]);
      // area libera: su telefono la parte alta, su desktop a destra del pannello laterale
      const target = phone ? L.point(size.x / 2 + 28, size.y * 0.24) : L.point(460 + (size.x - 460) / 2, size.y / 2);
      const visible = phone ? p.y < size.y * 0.32 && p.y > 80 && p.x > 64 : p.x > 470;
      // panTo verso un centro assoluto (non panBy relativo): rieseguire l'effetto non somma gli spostamenti
      const center = map.latLngToContainerPoint(map.getCenter());
      if (!visible) map.panTo(map.containerPointToLatLng(center.add(p.subtract(target))), { animate: true, duration: 0.25 });
    };
    if (!fly) return reveal();
    map.flyTo([point.lat, point.lon], Math.max(map.getZoom(), FLY_ZOOM), { duration: 0.6 });
    map.once('moveend', reveal);
    return () => {
      map.off('moveend', reveal);
    };
  }, [point, fly, map]);
  return null;
}

export default function App() {
  const st = useFeed<StationsPayload>('/api/stations');
  const wc = useFeed<WebcamsPayload>('/api/webcams');
  const [sel, setSel] = useState<Selection>(null);
  const stations = st.data?.stations ?? [];

  // Solo le webcam "della zona": entro 10 km da una stazione di Veneto o Trentino (Windy restituisce tutto il Trentino-Alto Adige).
  const webcams = useMemo(() => {
    const all = wc.data?.webcams ?? [];
    return stations.length ? all.filter((c) => nearest(c, stations, CAM_RADIUS_KM)) : [];
  }, [wc.data, stations]);

  const [layer, setLayer] = useLayer();
  // Vento e neve mostrano solo le stazioni che misurano quel dato (meno ingombro, frecce leggibili);
  // la temperatura mostra tutte, quelle senza termometro come puntini toccabili.
  // La stazione selezionata resta sempre sulla mappa, anche se non ha il dato del layer.
  const selId = sel?.kind === 'station' ? sel.id : null;
  const shown = useMemo(() => {
    if (layer === 'temp') return stations;
    const has = (s: Station) => (layer === 'snow' ? s.snowDepth : s.windSpeed) != null || s.id === selId;
    return stations.filter(has);
  }, [layer, stations, selId]);
  const withData = useMemo(
    () => stations.filter((s) => (layer === 'temp' ? s.temp : layer === 'wind' ? s.windSpeed : s.snowDepth) != null).length,
    [layer, stations],
  );
  const icon = useCallback((s: Station, selected: boolean) => stationIcon(s, selected, layer), [layer]);
  // Scala temperatura della banda adattata ai valori freschi di oggi
  const range = useMemo(() => tempRange(stations.filter((s) => s.temp != null && !isStale(s)).map((s) => s.temp!)), [stations]);
  const clLabel = useCallback((items: Station[]) => clusterLabel(items, layer), [layer]);

  const station = sel?.kind === 'station' ? (stations.find((s) => s.id === sel.id) ?? null) : null;
  const cam = sel?.kind === 'webcam' ? (webcams.find((c) => c.id === sel.id) ?? null) : null;
  const stationCam = useMemo(() => (station ? nearest(station, webcams, CAM_RADIUS_KM) : null), [station, webcams]);
  const version = wc.data?.generatedAt ?? '';

  const reload = useCallback(() => {
    st.reload();
    wc.reload();
  }, [st.reload, wc.reload]);
  const clear = useCallback(() => setSel(null), []);
  const favs = useFavorites();
  const [favsOpen, setFavsOpen] = useState(false);
  const pickFav = useCallback((kind: FavKind, id: string) => {
    setSel({ kind, id, fly: Date.now() });
    if (window.innerWidth < 760) setFavsOpen(false); // su telefono il pannello coprirebbe la mappa
  }, []);
  // Ricerca: località scelta (segnaposto + riquadro con stazione e webcam più vicine)
  const [searchOpen, setSearchOpen] = useState(false);
  const [place, setPlace] = useState<(Place & { fly: number }) | null>(null);
  const placeNear = useMemo(
    () => (place ? { station: nearest(place, stations, 25), cam: nearest(place, webcams, CAM_RADIUS_KM) } : null),
    [place, stations, webcams],
  );
  const pickPlace = useCallback((p: Place) => {
    setSel(null);
    setPlace({ ...p, fly: Date.now() });
    setSearchOpen(false);
  }, []);
  const pickItem = useCallback((kind: FavKind, id: string) => {
    setPlace(null);
    setSearchOpen(false);
    setSel({ kind, id, fly: Date.now() });
  }, []);
  const clearAll = useCallback(() => {
    setSel(null);
    setPlace(null);
  }, []);
  const point = station ?? cam ?? (sel ? null : place);
  const fly = sel?.fly ?? (sel ? undefined : place?.fly);

  // Avviso discreto: fonte che non risponde, o errore della chiamata al proxy. L'app continua con il resto.
  const notices: string[] = [];
  if (st.error) notices.push(st.data ? `Stazioni: mostro i dati delle ${clock(st.data.generatedAt)}` : 'Stazioni non disponibili');
  if (wc.error && !wc.data) notices.push('Webcam non disponibili');
  for (const e of [...(st.data?.errors ?? []), ...(wc.data?.errors ?? [])]) {
    if (/stazioni senza dati/.test(e.message)) continue;
    notices.push(`${SOURCE_NAME[e.source] ?? e.source}${/webcam/.test(e.message) ? ' (webcam)' : ''} non risponde`);
  }

  return (
    <div className={`app${favsOpen ? ' has-favs' : ''}`}>
      <header className="topbar">
        <h1>
          <span className="t-long">Meteo Veneto · Trentino</span>
          <span className="t-short" aria-hidden="true">Meteo V·T</span>
        </h1>
        <p className="topbar-time" aria-live="polite">
          {st.data ? (
            <>
              <span className="topbar-word">aggiornato </span><strong>{clock(st.data.generatedAt)}</strong>
              <span className="topbar-count">
                {' '}
                · {stations.length} stazioni · {webcams.length} webcam
              </span>
            </>
          ) : (
            'caricamento…'
          )}
        </p>
        <button className={`icon-btn${searchOpen ? ' is-on' : ''}`} onClick={() => setSearchOpen((o) => !o)} aria-expanded={searchOpen} aria-label="Cerca una località">
          <Search size={20} />
        </button>
        <button
          className={`icon-btn favs-btn${favsOpen ? ' is-on' : ''}`}
          onClick={() => setFavsOpen((o) => !o)}
          aria-expanded={favsOpen}
          aria-label={`Preferiti (${favs.list.length})`}
        >
          <Star size={20} fill={favs.list.length ? 'currentColor' : 'none'} />
          {favs.list.length > 0 && <span className="favs-count">{favs.list.length}</span>}
        </button>
        <button className="icon-btn" onClick={reload} disabled={st.loading || wc.loading} aria-label="Aggiorna i dati">
          <RefreshCw size={20} className={st.loading || wc.loading ? 'spin' : undefined} />
        </button>
      </header>
      {searchOpen && <SearchBar stations={stations} webcams={webcams} onPickPlace={pickPlace} onPickItem={pickItem} onClose={() => setSearchOpen(false)} />}
      {notices.length > 0 && (
        <p className="notice" role="status">
          {notices.join(' · ')}
        </p>
      )}

      <MapContainer className="map" center={[45.95, 11.85]} zoom={8} minZoom={7} maxBounds={BOUNDS.pad(0.6)} zoomControl={false} attributionControl={false}>
        <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" subdomains="abc" maxZoom={17} attribution={ATTRIBUTION} />
        <AttributionControl prefix={false} />
        <ZoomButtons />
        <Pane name="cams" style={{ zIndex: 590 }} />
        <MarkerLayer
          items={webcams}
          pane="cams"
          minZoom={9}
          clusterSize={30}
          selectedId={sel?.kind === 'webcam' ? sel.id : null}
          icon={webcamIcon}
          clusterClass="cl cl--cam"
          clusterRadius={90}
          onSelect={(c) => setSel({ kind: 'webcam', id: c.id })}
        />
        <MarkerLayer<Station>
          items={shown}
          selectedId={station?.id ?? null}
          icon={icon}
          clusterClass="cl"
          clusterRadius={layer === 'snow' ? 24 : layer === 'wind' ? 40 : 64}
          clusterLabel={clLabel}
          onSelect={(s) => setSel({ kind: 'station', id: s.id })}
        />
        {place && <Marker position={[place.lat, place.lon]} icon={placeIcon} title={place.name} />}
        <MapController point={point} fly={fly} onClear={clearAll} />
      </MapContainer>

      <LayerPanel layer={layer} onChange={setLayer} count={withData} range={range} />
      {place && !sel && placeNear && (
        <PlaceCard place={place} station={placeNear.station} cam={placeNear.cam} version={version} onPick={pickItem} onClose={() => setPlace(null)} />
      )}

      {station && (
        <StationSheet station={station} cam={stationCam} version={version} onClose={clear} fav={favs.has('station', station.id)} onToggleFav={() => favs.toggle('station', station.id)} />
      )}
      {cam && <WebcamSheet cam={cam} version={version} onClose={clear} fav={favs.has('webcam', cam.id)} onToggleFav={() => favs.toggle('webcam', cam.id)} />}
      {favsOpen && (
        <FavoritesPanel
          favorites={favs.list}
          stations={stations}
          webcams={wc.data?.webcams ?? []}
          version={version}
          onPick={pickFav}
          onToggle={favs.toggle}
          onClose={() => setFavsOpen(false)}
        />
      )}
    </div>
  );
}
