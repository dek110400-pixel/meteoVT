import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, MapPin, Search, X } from 'lucide-react';
import type { Station, Webcam } from '../server/types';
import type { Place } from '../server/geocode';
import type { FavKind } from './favorites';

interface Props {
  stations: Station[];
  webcams: Webcam[];
  onPickPlace: (p: Place) => void;
  onPickItem: (kind: FavKind, id: string) => void;
  onClose: () => void;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Ricerca: stazioni e webcam si filtrano mentre scrivi (nessuna rete);
 * le località si cercano su OpenStreetMap solo all'invio (la policy di Nominatim vieta la ricerca a ogni tasto).
 */
export function SearchBar({ stations, webcams, onPickPlace, onPickItem, onClose }: Props) {
  const [q, setQ] = useState('');
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  const local = useMemo(() => {
    const n = norm(q.trim());
    if (n.length < 2) return [];
    const st = stations.filter((s) => norm(s.name).includes(n)).slice(0, 4).map((s) => ({ kind: 'station' as const, id: s.id, name: s.name, meta: `stazione · ${s.elevation} m · ${s.province}` }));
    const wc = webcams.filter((c) => norm(c.name).includes(n)).slice(0, 3).map((c) => ({ kind: 'webcam' as const, id: c.id, name: c.name, meta: 'webcam' }));
    return [...st, ...wc];
  }, [q, stations, webcams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setState('loading');
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q.trim())}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setPlaces(j.places);
      setState('idle');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="search" role="search">
      <form className="search-form" onSubmit={submit}>
        <Search size={20} aria-hidden="true" className="search-ico" />
        <input
          ref={input}
          type="search"
          enterKeyHint="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPlaces(null);
            setState('idle');
          }}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
          placeholder="Località, rifugio, passo, stazione…"
          aria-label="Cerca una località"
        />
        <button type="submit" className="search-go" disabled={q.trim().length < 2 || state === 'loading'}>
          Cerca
        </button>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Chiudi la ricerca">
          <X size={22} />
        </button>
      </form>

      {(local.length > 0 || places || state !== 'idle') && (
        <div className="search-results">
          {local.length > 0 && (
            <ul aria-label="Stazioni e webcam">
              {local.map((r) => (
                <li key={`${r.kind}|${r.id}`}>
                  <button onClick={() => onPickItem(r.kind, r.id)}>
                    {r.kind === 'station' ? <span className="key-dia" aria-hidden="true" /> : <Camera size={16} aria-hidden="true" />}
                    <span className="sr-name">{r.name}</span>
                    <span className="sr-meta">{r.meta}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {state === 'loading' && <p className="search-msg">Cerco su OpenStreetMap…</p>}
          {state === 'error' && <p className="search-msg">Ricerca non disponibile ora. Riprova tra poco.</p>}
          {places && places.length === 0 && <p className="search-msg">Nessuna località trovata in Veneto o Trentino.</p>}
          {places && places.length > 0 && (
            <ul aria-label="Località">
              {places.map((p) => (
                <li key={`${p.lat},${p.lon}`}>
                  <button onClick={() => onPickPlace(p)}>
                    <MapPin size={16} aria-hidden="true" />
                    <span className="sr-name">{p.name}</span>
                    <span className="sr-meta">{p.label.split(', ').slice(1).join(', ')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!places && state === 'idle' && q.trim().length >= 2 && <p className="search-hint">Premi Cerca per le località (paesi, rifugi, cime, passi).</p>}
        </div>
      )}
    </div>
  );
}
