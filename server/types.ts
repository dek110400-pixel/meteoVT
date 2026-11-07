// Modello dati unico, condiviso da tutte le fonti. Un dato mancante è null, mai stimato.
export type Source = 'arpav' | 'meteotrentino';

export interface Station {
  id: string;            // "<source>:<codice originale>"
  source: Source;
  name: string;
  lat: number;
  lon: number;
  elevation: number;     // m s.l.m.
  province: string;      // sigla (BL, VI, TN…)
  updatedAt: string | null; // ISO UTC dell'ultima misura ricevuta
  temp: number | null;      // °C
  humidity: number | null;  // %
  windSpeed: number | null; // km/h
  windGust: number | null;  // km/h (ARPAV non la fornisce: sempre null)
  windDir: number | null;   // gradi da cui proviene il vento (0 = N)
  rain: number | null;      // mm da mezzanotte (ora italiana)
  rain1h: number | null;    // mm nell'ultima ora
  snowDepth: number | null; // cm
}

export interface Webcam {
  id: string;
  source: string;
  name: string;
  lat: number;
  lon: number;
  elevation: number | null;
  imageUrl: string;
  pageUrl: string;
  updatedAt: string | null;
}

export interface SourceError {
  source: Source | 'windy';
  message: string;
}
