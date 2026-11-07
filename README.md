# Meteo Veneto · Trentino

Mappa interattiva (uso personale) con tutte le stazioni meteo ufficiali di **ARPAV** (Veneto) e
**Meteotrentino** (Trentino) e le webcam pubbliche della zona (**Windy** + elenco **ARPAV**).
Stile "carta escursionistica", pensata per lo smartphone all'aperto.

- ~345 stazioni con temperatura, umidità, vento (velocità, raffica, direzione), pioggia, neve al suolo
- ~700 webcam; nella scheda di ogni stazione la webcam più vicina entro 10 km
- Layer **Temperatura / Vento / Neve** con legenda; il layer scelto resta dopo un refresh
- **Preferiti** (stellina) salvati nel browser, con pannello laterale e dati live
- Dati più vecchi di 1 ora in grigio; un dato mancante è "n.d.", mai stimato
- Aggiornamento ogni 10 minuti + pulsante ↻

Le fonti, i campi e le licenze sono documentati in [DATA_SOURCES.md](DATA_SOURCES.md).

---

## Avvio in locale

Serve **Node.js 20 o più recente** (https://nodejs.org).

```bash
npm install
```

Chiave Windy (facoltativa, gratuita: https://api.windy.com/keys): copia `.env.example` in `.env.local`
e incolla la chiave dopo `WINDY_API_KEY=`.

```bash
npm run dev
```

Apri http://localhost:5173. Il comando avvia sia la mappa sia le funzioni `/api` (non serve `vercel dev`).
Il primo caricamento delle webcam richiede ~10 s: il server controlla quali webcam ARPAV rispondono.

### Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | sviluppo con ricarica automatica |
| `npm run build` | controllo dei tipi + build di produzione in `dist/` |
| `npm run test:sources` | chiama ARPAV e Meteotrentino e stampa 5 stazioni per fonte |
| `npm run test:webcams` | chiama Windy e l'elenco ARPAV e stampa 5 webcam per fonte |
| `npm run test:scales` | controlla scale colore, frecce del vento e cerchi della neve |

---

## Deploy su Vercel

Il progetto è già pronto: Vercel riconosce Vite per la parte statica e trasforma ogni file in `api/`
in una Serverless Function (`vercel.json` alza la durata massima a 60 s).

### Opzione A — dal sito (con GitHub)

1. Carica la cartella su un repository GitHub (anche privato). `.env.local` **non** viene caricato: è in `.gitignore`.
2. Su https://vercel.com → **Add New… → Project** → importa il repository.
   Framework: **Vite** (rilevato da solo). Build command `npm run build`, output `dist`: lascia i valori proposti.
3. Prima di premere **Deploy**, apri **Environment Variables** e aggiungi
   `WINDY_API_KEY` = la tua chiave (ambienti Production e Preview).
4. **Deploy**. A ogni `git push` Vercel ripubblica da solo.

### Opzione B — dal terminale

```bash
npx vercel login
```

```bash
npx vercel
```

Rispondi alle domande (va bene tutto di default), poi aggiungi la chiave e pubblica in produzione:

```bash
npx vercel env add WINDY_API_KEY production
```

```bash
npx vercel --prod
```

> Se cambi la chiave su Vercel devi rifare il deploy (**Deployments → … → Redeploy**): le variabili
> vengono lette solo al momento della build/avvio.

### Verifica dopo il deploy

- `https://<tuo-progetto>.vercel.app/api/stations` → JSON con ~345 stazioni ed `errors: []`
- `https://<tuo-progetto>.vercel.app/api/webcams` → JSON con le webcam (se `errors` contiene `windy`, la chiave manca o è errata)

---

## Come è fatto

```
api/                  Vercel Functions (proxy verso le fonti)
  stations.ts         GET /api/stations   – stazioni ARPAV + Meteotrentino, cache 10 min
  webcams.ts          GET /api/webcams    – webcam Windy + ARPAV, cache 10 min
  webcam-image.ts     GET /api/webcam-image?id=N – proxy immagini ARPAV (solo id dell'elenco)
server/               normalizzazione dei dati nel modello unico (Station, Webcam)
src/                  frontend React + Leaflet
scripts/              test delle fonti e delle scale
DATA_SOURCES.md       verifica delle fonti (Fase 0)
PRODUCT.md, DESIGN.md contesto di prodotto e sistema visivo
```

- **Cache:** in memoria sul server (10 min) + cache CDN di Vercel (`s-maxage`). Il pulsante ↻ rispetta la
  cache: entro 10 minuti restituisce gli stessi dati (le fonti si aggiornano ogni 15–30 min).
- **Fonte che non risponde:** l'app continua con le altre e mostra un avviso discreto in basso.
- **Dati in ritardo:** ARPAV pubblica con 15–75 minuti di ritardo, quindi le sue stazioni diventano grigie
  per un tratto di ogni ora. La soglia è `STALE_MS` in `src/format.ts`.

## Attribuzioni e licenze

Visibili sulla mappa in basso a destra.

- Dati meteo **ARPAV** – Servizio Centro Meteorologico di Teolo, CC BY 4.0 (dati non validati, pubblicati in automatico)
- Dati meteo **Meteotrentino** – Provincia Autonoma di Trento, CC BY 4.0
- Webcam **Windy.com** (piano gratuito: ogni immagine rimanda a windy.com) e webcam di terzi raccolte da ARPAV:
  le immagini restano dei rispettivi proprietari. Il progetto è **per uso personale**: prima di renderlo pubblico
  andrebbe chiesto il permesso ai proprietari delle webcam ARPAV.
- Mappa © OpenStreetMap contributors, SRTM, stile © OpenTopoMap (CC-BY-SA)
