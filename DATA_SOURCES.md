# DATA_SOURCES.md — Fase 0: verifica delle fonti

Verifica eseguita il **2026-11-06 ~10:40 (ora italiana)** con chiamate reali (curl/python).
Tutto ciò che è scritto qui è stato osservato nelle risposte; dove un dato non è verificato è segnato **[da verificare]**.

---

## 1. ARPAV — Veneto ✅ funziona

### 1a. Anagrafica stazioni
- **URL:** `https://meteo.arpa.veneto.it/meteo/dati_meteo/xml/stazioni.xml`
- **Formato:** XML, encoding **ISO-8859-1**, radice `<METEOGRAMMI>`
- **Contenuto osservato:** 192 `<STAZIONE>` (107 METEO, 83 AGRO, 1 DOLINE, 1 mobile).
  Province: BL 60, VI 35, TV 23, VR 22, PD 21, VE 17, RO 14.
- **Campi per stazione:** `IDSTAZ`, `NOME` (CDATA), `X` (=lon), `Y` (=lat), `QUOTA` (m), `TIPOSTAZ`,
  `PROVINCIA` (sigla), `COMUNE`, `LINKSTAZ` (es. `0009.xml`)
- **Proiezione:** `<PROJECTION>EPSG:4258</PROJECTION>` (ETRS89, in pratica = WGS84 per Leaflet)
- **Header HTTP:** `Cache-Control: max-age=300`, `Last-Modified` aggiornato (09:26 UTC del giorno del test)
- **CORS:** nessun header `Access-Control-Allow-Origin` → serve il proxy.

### 1b. Dati della singola stazione (ultimi ~3 giorni)
- **URL:** `https://meteo.arpa.veneto.it/meteo/dati_meteo/xml/{LINKSTAZ}` (es. `.../xml/0009.xml`)
- **Formato:** XML ISO-8859-1, radice `<CONTENITORE>` → `<STAZIONE>` → N × `<SENSORE>`
- **Struttura sensore:** `ID`, `PARAMNM`, `TYPE`, `UNITNM`, `FREQ` (minuti), poi
  `<DATI ISTANTE="YYYYMMDDHHMM"><VM>valore</VM></DATI>` ripetuto.
- **Frequenza:** `FREQ` = 30 min; file rigenerati circa ogni 30 min (`ISTANTERUN`).
- **⚠ Fuso orario:** i timestamp sono in **orario solare fisso (UTC+1)** tutto l'anno — lo dichiara
  il campo `<PERIODO>`. Da convertire esplicitamente (in estate NON è l'ora legale).
- **Sensori (`TYPE`) trovati su tutte le 192 stazioni** (survey completo, 0 errori, 0 stazioni ferme da >2h):

  | TYPE | PARAMNM | unità | n. stazioni | → campo modello |
  |---|---|---|---|---|
  | `PREC` | Precipitazione | mm (cumulata nei 30') | 187 | `rain` |
  | `TEMP` | Temperatura aria a 2m | °C | 172 | `temp` |
  | `UMID` | Umidità relativa a 2m | % | 137 | `humidity` |
  | `VVENTO` | Velocità vento a 10m / 5m / 2m | m/s | 39 / 64 / 16 | `windSpeed` (preferire 10m > 5m > 2m) |
  | `DVENTO` | Direzione vento a 10m / 5m / 2m | gradi | 39 / 64 / 16 | `windDir` |
  | `LIVNEVE` | Altezza neve | [unità da verificare in Fase 1] | solo stazioni nivo | `snowDepth` |
  | `RADSOL`, `VISIB`, `PRESS` | — | — | — | non usati |

- **❌ Raffica (`windGust`): NON esiste** in nessuna stazione ARPAV di questo feed → resterà `null` ("n.d.").
- **Quante chiamate:** 1 file per stazione → **~192 richieste** per un refresh completo (~35 KB ciascuna, ~6–7 MB totali).

### 1c. Stazioni con neve
- **URL:** `https://meteo.arpa.veneto.it/meteo/dati_meteo/xml/stazioni_neve.xml`
- Stesso formato di `stazioni.xml` + campo `ZONA`. **41 stazioni**; i dati stanno nello stesso
  `{LINKSTAZ}` (es. Arabba `0003.xml` contiene il sensore `LIVNEVE` "Altezza neve", unità **cm**).
- ⚠ (scoperto in Fase 1) i due elenchi sono **disgiunti** (0 stazioni in comune): il proxy li unisce →
  **ARPAV = 233 stazioni** in totale.

### Licenza e attribuzione
- Dichiarata dentro ogni XML: **"Dati rilasciati con licenza CC BY 4.0"**.
- Attribuzione da mostrare: *"Dati meteo: ARPAV – Servizio Centro Meteorologico di Teolo (CC BY 4.0)"*.
- Nota d'uso ARPAV: dati **non validati**, pubblicati in automatico → la mostriamo nel tooltip dell'attribuzione.
- **Limiti di chiamate:** non documentati. Mitigazione: cache server 10 min + concorrenza limitata (4–6 richieste in parallelo).

---

## 2. Meteotrentino — Trentino ✅ funziona

Base: `https://dati.meteotrentino.it/service.asmx/` (servizio ASP.NET, risposte XML;
**CORS aperto** `Access-Control-Allow-Origin: *`, ma passiamo comunque dal proxy per normalizzare e cachare).
La WSDL (`service.asmx?WSDL`) elenca ~80 operazioni; quelle utili:

### 2a. Anagrafica stazioni
- **URL JSON:** `https://dati.meteotrentino.it/service.asmx/listaStazioniJson`
  (esiste anche XML: `.../listaStazioni`)
- **Campi:** `codice` (es. `T0147`), `nome`, `nomebreve`, `quota`, `latitudine`, `longitudine`,
  `est`, `north` (UTM), `inizio`, `fine`
- **207 stazioni, di cui 112 attive** nella versione JSON (`fine` vuoto; la versione XML ne riportava 208/113). Le dismesse vanno scartate.
  Al test di Fase 1, 4 stazioni attive avevano tutte le liste vuote → restano sulla mappa con dati `null`.
- **Nessun campo provincia** → la impostiamo a `"TN"` (tutte le stazioni della rete sono in Provincia di Trento).

### 2b. Dotazione sensori
- **URL:** `https://dati.meteotrentino.it/service.asmx/sensoriStazioniGeoJson`
- JSON `{"dotazioneSensori":[{"staz","temperatura","precipitazione","vento","umidita","pressione","radiazione","neve"}]}` (valori stringa `"true"/"false"`)
- Osservato: **49 stazioni con vento, 34 con neve al suolo.**

### 2c. Ultimi dati di una stazione ← **da usare**
- **URL:** `https://dati.meteotrentino.it/service.asmx/getLastDataOfMeteoStation?codice={codice}`
- **Formato:** XML radice `<lastData>`, finestra da ieri 00:00 a ora, passo **15 min**.
- **Timestamp con offset esplicito**, es. `2026-11-05T00:15:00+01` ✅
- **Struttura e mappatura:**

  | elemento | campi | unità | → campo modello |
  |---|---|---|---|
  | `temperature_list/air_temperature` | `date`, `value` | °C | `temp` |
  | `relative_humidity_list/relative_humidity` | `date`, `value` | % | `humidity` |
  | `wind_list/wind10m` | `date`, `speed_value`, `windgust`, `direction_value` | m/s, m/s, gradi N | `windSpeed`, `windGust`, `windDir` |
  | `precipitation_list/precipitation` | `date`, `value` | mm (nei 15') | `rain` |
  | `snow_depth_list/snow_depth` | `date`, `value` | **cm** | `snowDepth` |
  | `global_radiation_list` | — | W/mq | non usato |

  Liste vuote (`<wind_list />`) = sensore assente → `null`.
- **Freschezza:** la maggior parte aggiornata al quarto d'ora; ma es. `T0027` aveva l'ultimo dato
  ieri 19:30 → è proprio il caso "dato > 1 ora → grigio".
- **Quante chiamate:** 1 per stazione → **~113 richieste** per refresh.

> Alternativa scartata: `ultimiDatiStazione?codice=` funziona ma **non contiene la neve** e i timestamp
> sono **senza fuso**. `datiRealtime` (tutte le stazioni in una chiamata) **richiede un parametro `key`**
> non pubblico → risponde 500 "Missing parameter: key".

### 2d. Rilievi neve manuali (campi neve) — opzionale
- `listaCampiNeveJson` (55 campi neve con lat/lon) + `tuttiUltimiRilieviNeve` (XML, campo `hs` = altezza neve).
- Oggi (inizio stagione) contiene solo 8 rilievi di 1 campo (`21MB`). Sono rilievi **giornalieri manuali**:
  propongo di **non usarli** (i sensori automatici del 2c bastano).

### Licenza e attribuzione
- dati.trentino.it (CKAN, dataset `anagrafica-stazioni-meteo-stazioni-automatiche`):
  **`cc-by` — Creative Commons Attribution 4.0, Provincia Autonoma di Trento**.
- Attribuzione: *"Dati meteo: Meteotrentino – Provincia Autonoma di Trento (CC BY 4.0)"*.
- **Limiti di chiamate:** non documentati → stessa cache 10 min + concorrenza limitata.

---

## 3. Webcam

### 3a. Windy Webcams API v3 — ✅ VERIFICATA con chiave (2026-11-06)
- Chiamata reale: `GET /webcams/api/v3/webcams?regions=IT.20,IT.17&limit=50&offset=N&include=location,images,urls,player`
  con header `x-windy-api-key` → **200, `total` 954** (Veneto 259 + Trentino-Alto Adige 695, che include anche l'Alto Adige).
  Sotto il limite di offset 1000 del piano free → ~20 pagine da 50.
- **Campi reali:** `webcamId`, `title`, `status` (`active`), `lastUpdatedOn` (ISO), `location.{latitude,longitude,city,region}`,
  `images.current.{icon,thumbnail,preview}` (preview 400×224), `images.daylight.*`, `urls.detail` (windy.com/webcams/ID),
  `urls.provider`, `player.{day,month,year,lifetime}`. **Nessuna quota** → `elevation: null`.
- `location.region` non è sempre presente quando si filtra per `regions`. Le immagini `imgproxy.windy.com` rispondono `200 image/jpeg` in https.
- Pricing ufficiale (api.windy.com/webcams/pricing): free = immagini piccole, URL validi **15 min**, offset max 1000, link obbligatorio a windy.com.

> Le righe sotto sono la nota originale di Fase 0, prima della chiave.

### 3a (Fase 0). Windy — note precedenti
- **URL:** `https://api.windy.com/webcams/api/v3/webcams`
- Chiamata senza chiave → `403 {"message":"Missing Header 'x-windy-api-key' with API key"}`
  (conferma endpoint e nome dell'header). Autenticazione: header **`x-windy-api-key`**.
- **Non ho potuto verificare campi e risposta reale senza chiave.** Dalla documentazione pubblica
  (non ancora verificata con una chiamata) [da verificare]:
  - filtro per area (bbox o nearby), `include=location,images,urls`
  - piano gratuito: **solo immagini a bassa risoluzione**, URL immagine con **token che scade** (10–15 min secondo fonti diverse) →
    la cache server non deve superare ~10 min per le immagini;
  - **offset di paginazione limitato** sul free tier;
  - **attribuzione obbligatoria** a Windy con link a windy.com.
- Licenza: termini Windy (non open data). Attribuzione: *"Webcam: Windy.com"* + link.

### 3b. ARPAV — elenco webcam ✅ FONTE SCELTA (progetto ad uso personale, nessuna API key)
> Decisione dell'utente (2026-11-06): niente chiave Windy; l'app è solo per uso personale, non pubblica.
> Usiamo quindi le webcam pubbliche già raccolte da ARPAV.

- **URL:** `https://meteo.arpa.veneto.it/?page=webcam` (HTML). Dentro la pagina c'è un elenco JavaScript:
  ```js
  names[1]='Porta Vescovo';
  imageUrl[1]='https://portavescovo.panomax.com/';
  points[1]=[46.473104,11.867960];   // [lat, lon]
  icons[1]=greenIcon;
  ```
- **Contenuto verificato** (ogni URL provato con una GET, certificati TLS verificati):
  - **375 webcam**, lat 44.93–46.93, lon 10.60–13.08
  - **227 sono immagini dirette** (`Content-Type: image/*`) → anteprima nel popup
    - 215 hanno l'header `Last-Modified` → diventa `updatedAt`; **194 aggiornate nelle ultime 3 ore**
    - 74 sono solo **http** → vanno servite tramite il nostro proxy, sennò il browser le blocca su https
  - 100 sono **pagine/player** (skylinewebcams 42, webcamtour 16, autostrade, panomax, feratel…) → marker con solo il link "apri webcam", senza anteprima
  - 14 video mp4, 1 stream MJPEG → trattati come link
  - 33 non rispondono (HTTP error / timeout) → scartati a runtime
  - `icons` (green/blue/red) non corrisponde in modo affidabile al tipo → ignorato
- **Copertura:** ottima in Veneto (~210 immagini dirette), **scarsa in Trentino (~17)**.
- **Niente quota** → `elevation: null`.
- **Licenza:** non è open data; le immagini sono dei rispettivi proprietari. Per uso personale: mostriamo sempre il link
  alla fonte originale, cache di 5 min sulle immagini (non le martelliamo), elenco ARPAV letto al massimo 1 volta l'ora.
- **Proxy immagini:** `/api/webcam-image?id=N` accetta **solo id presenti nell'elenco** (non è un proxy aperto
  verso URL arbitrari).

### 3b-bis. trentino.com — solo link, nessuna immagine diretta
- `https://www.trentino.com/it/webcam/` elenca ~28 webcam trentine (Canazei, Campiglio, Passo Manghen…), ma ogni pagina
  incorpora un **player panomax**, non un JPG. Eventualmente utilizzabili solo come link → **non incluse per ora**.

### Per migliorare il Trentino (opzionale)
- La chiave Windy (§3a) è **gratuita** (solo registrazione su api.windy.com, nessun pagamento): se un giorno la crei,
  il proxy la aggiunge come seconda fonte senza cambiare il frontend.

### 3c. Meteotrentino — ❌ nessun servizio webcam trovato
- Nessuna operazione webcam nella WSDL; nessun endpoint pubblico individuato.

### 3d. Comprensori sciistici — ❌ nessuna API aperta trovata
- Le webcam dei comprensori (Dolomiti Superski, trentino.com, feratel, panomax) sono pagine/player
  proprietari senza API pubblica né licenza di riuso. Molte di queste sono già **indicizzate da Windy**.

---

## 4. Riepilogo e conseguenze sul modello dati

| Campo | ARPAV | Meteotrentino |
|---|---|---|
| temp, humidity, rain, windSpeed, windDir | ✅ | ✅ |
| **windGust** | ❌ sempre `null` | ✅ |
| snowDepth | ✅ 41 stazioni (cm) | ✅ 32–34 stazioni (cm) |
| province | sigla (BL, VI…) | sempre `TN` (implicito) |
| timestamp | UTC+1 fisso, da convertire | ISO con offset |
| passo | 30 min | 15 min |
| richieste per refresh | ~235 | ~113 |

**`rain`:** entrambe le fonti danno la pioggia per intervallo (30' / 15'). Propongo di mostrare
**"pioggia ultima ora" e "pioggia da mezzanotte"** come somma dei valori misurati (somma, non stima).

**Rischio tecnico:** ~300 richieste upstream per refresh. Su Vercel (piano Hobby) la function ha un limite di durata;
le chiamate vanno parallelizzate con limite di concorrenza e la cache CDN (`s-maxage=600, stale-while-revalidate`)
evita di rifarle a ogni utente.

---

## 5. Ricerca località — Nominatim (OpenStreetMap) ✅ verificata 2026-11-07
- **URL:** `https://nominatim.openstreetmap.org/search?q=…&format=jsonv2&countrycodes=it&viewbox=10.3,47.2,13.2,44.7&bounded=1&limit=6&accept-language=it`
- **Formato:** JSON, campi usati: `name`, `display_name`, `lat`, `lon`, `type`. Nessun header CORS → passa dal proxy `/api/geocode`.
- **Policy d'uso:** max 1 richiesta/s, User-Agent identificativo, **vietata la ricerca a ogni tasto** → il client cerca solo all'invio;
  il proxy mette in coda le richieste (≥1,1 s) e tiene in cache ogni testo per 1 giorno.
- **Licenza:** dati © OpenStreetMap contributors, ODbL (attribuzione già presente sulla mappa).
- Risultati con lo stesso nome entro ~300 m (es. frazione + fermata bus) vengono uniti.

## 6. Storico 24 ore
Nessuna fonte nuova: gli stessi file per stazione già usati per i dati live contengono la serie
(ARPAV ~3 giorni ogni 30', Meteotrentino da ieri 00:00 ogni 15'). Il file ARPAV si ricava dall'id:
`IDSTAZ` a 4 cifre + `.xml` (verificato su 233/233 stazioni).

## 7. Previsioni — Open-Meteo ✅ verificata 2026-11-07
- **URL:** `https://api.open-meteo.com/v1/forecast?latitude=…&longitude=…&elevation=<quota stazione>&hourly=temperature_2m,precipitation,snowfall,wind_speed_10m,wind_gusts_10m,wind_direction_10m,freezing_level_height&models=icon_seamless&forecast_days=3&timezone=GMT&wind_speed_unit=kmh&timeformat=unixtime`
- **Modello:** `icon_seamless` (DWD): ICON-D2 ~2 km per le prime ~48 h, poi ICON-EU. `elevation` corregge la temperatura alla quota della stazione.
- **Formato:** JSON, `hourly.time` (secondi Unix UTC) + un array per variabile; unità °C, mm, cm, km/h, gradi, m. Chiamata di prova: 72 ore, nessun valore nullo.
- **Termini:** uso **non commerciale** gratuito, < 10.000 chiamate/giorno, 5.000/ora, 600/minuto. Attribuzione "Previsioni Open-Meteo.com" (CC BY 4.0) mostrata sulla mappa.
- **Cache:** 1 ora per coordinate arrotondate (~100 m): poche decine di chiamate al giorno.
- Sono **previsioni di modello**: nell'app sono sempre tratteggiate ed etichettate "previsione", mai mescolate con i dati misurati.
- **Zero termico** = `freezing_level_height` del modello (m s.l.m.).

## 8. Timelapse webcam — Windy player ✅ verificato 2026-11-07
- Con `include=player` l'API restituisce `player.day` (es. `https://webcams.windy.com/webcams/public/embed/player/<id>/day`).
- La pagina del player risponde 200 senza `X-Frame-Options` né CSP `frame-ancestors` → incorporabile in un `<iframe>`.
- Il piano gratuito permette esplicitamente di incorporare il timelapse. Solo per le webcam Windy (le ARPAV non hanno timelapse).
