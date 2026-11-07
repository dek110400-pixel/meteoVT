# Piano: da questo PC a GitHub, Vercel e iPhone

Tempo totale: circa 20 minuti. Costo: zero (GitHub gratuito, Vercel piano **Hobby** gratuito).
Alla fine avrai un indirizzo tipo `https://meteo-vt.vercel.app` da aprire sull'iPhone come un'app.

Stato di partenza (già fatto): il progetto è in `Documenti\meteo VT`, con Git e un primo commit su `main`.
`.env.local` (la chiave Windy) **non** è nel commit e non finirà mai su GitHub.

---

## Fase 1 — GitHub (5 min)

**1.1 Crea il repository** — su https://github.com/new
- Nome: `meteo-vt` (o quello che vuoi)
- Visibilità: **Private** (consigliato: l'app è solo per te)
- **Non** spuntare README, .gitignore o licenza: il repository deve essere vuoto
- Premi **Create repository** e copia l'indirizzo, es. `https://github.com/TUONOME/meteo-vt.git`

**1.2 Collega e carica** — da un terminale aperto nella cartella `Documenti\meteo VT`
(oppure mandami l'indirizzo e lo faccio io):

```bash
git remote add origin https://github.com/TUONOME/meteo-vt.git
```

```bash
git push -u origin main
```

Al primo push Windows apre una finestra di accesso a GitHub: accedi dal browser e conferma.

**Controllo:** ricarica la pagina del repository su GitHub: devi vedere i file del progetto
(README, `src/`, `api/`…) e **non** devi vedere `.env.local`.

---

## Fase 2 — Vercel (10 min)

**2.1 Account** — su https://vercel.com/signup scegli **Continue with GitHub**, piano **Hobby**.

**2.2 Importa il progetto**
- **Add New… → Project** → nella lista dei repository GitHub scegli `meteo-vt` → **Import**
  (se non compare: **Adjust GitHub App Permissions** e dai accesso a quel repository)
- Framework Preset: **Vite** (lo rileva da solo). Build Command `npm run build`, Output `dist`: lascia così.

**2.3 Chiave Windy** — prima di premere Deploy, apri **Environment Variables**:
- Key: `WINDY_API_KEY`
- Value: la chiave che hai in `.env.local` (aprilo con il Blocco note e copia quello che c'è dopo `=`)
- Ambienti: Production e Preview

**2.4 Deploy** — premi **Deploy** e aspetta 1–2 minuti.
Vercel ti dà l'indirizzo pubblico, es. `https://meteo-vt.vercel.app`.

**2.5 Controlli** (da PC, nel browser):

| Apri | Cosa devi vedere |
|---|---|
| `https://…vercel.app/api/stations` | un JSON con circa 345 stazioni e `"errors":[]` (la prima volta può impiegare ~10 s) |
| `https://…vercel.app/api/webcams` | un JSON con le webcam; se in `errors` c'è `windy`, la chiave manca o è sbagliata → correggila in **Settings → Environment Variables** e poi **Deployments → … → Redeploy** |
| `https://…vercel.app` | la mappa con stazioni, layer e webcam |

---

## Fase 3 — iPhone (2 min)

1. Apri l'indirizzo `https://…vercel.app` in **Safari** (non in un'altra app: solo Safari aggiunge alla Home).
2. Tocca **Condividi** (il quadrato con la freccia in su) → **Aggiungi alla schermata Home** → **Aggiungi**.
3. Avvia l'app dall'icona sulla Home.

Note per l'uso sul telefono:
- **Preferiti e layer** sono salvati in Safari *su quel telefono*: non si sincronizzano con il PC.
- Senza un'icona dedicata, iOS usa un'anteprima della pagina come icona. Se vuoi un'icona vera
  (e l'apertura a schermo intero senza la barra di Safari), è una piccola modifica da fare in seguito:
  icona `apple-touch-icon` + un file manifest.
- Senza segnale la mappa non si aggiorna: i dati arrivano sempre dal server, nulla viene salvato offline.

---

## Dopo il primo deploy

- **Aggiornare l'app:** ogni `git push` su `main` ripubblica da solo in 1–2 minuti.
- **Cambiare la chiave Windy:** Settings → Environment Variables, poi **Redeploy**.
- **Chi può vederla:** chiunque conosca l'indirizzo `…vercel.app`. Non è indicizzata e la chiave Windy resta
  sul server (non è mai nel codice della pagina). Una password sull'intero sito richiede il piano a pagamento
  di Vercel: per uso personale di solito non serve, basta non condividere l'indirizzo.
- **Limiti del piano gratuito:** abbondanti per un uso personale. La cache di 10 minuti fa sì che le fonti
  vengano interrogate al massimo ~6 volte l'ora, anche se apri l'app spesso.

## Se qualcosa va storto

| Problema | Cosa fare |
|---|---|
| `git push` rifiutato: "repository not empty" | il repository su GitHub è stato creato con un README: cancellalo e ricrealo vuoto |
| Vercel: build fallita | apri il log del deploy e mandami le ultime righe |
| `/api/stations` dà errore 500 o va in timeout | Vercel → progetto → **Logs**: mandami il messaggio |
| La mappa si vede ma senza webcam Windy | chiave mancante o errata (punto 2.5) |
| Su iPhone non c'è "Aggiungi alla schermata Home" | stai usando un browser diverso da Safari |
