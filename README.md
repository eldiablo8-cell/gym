# 🏋️ ZAMPA'S GYM

App per tracciare gli allenamenti di pesistica, pensata per un tablet in orizzontale appeso in palestra (e utilizzabile anche da smartphone in verticale).

## Cosa fa

- Nome atleta e data dell'allenamento
- Gruppi muscolari con esercizi, serie, ripetizioni, kg bilanciere e kg manubri
- Viste **Giorno**, **Settimana** e **Mese** (volume totale e gruppi più allenati)
- Elenco esercizi con tendina di richiamo (si riempie anche da solo quando scrivi un esercizio nuovo)
- Record personali (🏆 PR), grafici di progressione, timer di recupero e scheda settimanale per atleta
- Funziona offline, si installa come una vera app
- Sincronizzazione dei dati tra tablet e telefono (pulsante ☁ in alto)
- Backup e ripristino dei dati con il pulsante 💾

## File del progetto

| File | A cosa serve |
|---|---|
| `index.html` | L'app vera e propria |
| `manifest.json` | Nome, colori e icone per l'installazione |
| `cloud.js` | Sincronizzazione online con Firebase (accesso + database) |
| `sw.js` | Permette di usarla offline |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` | Icone dell'app |

## Pubblicare su GitHub Pages

1. Crea un repository su GitHub (es. `zampas-gym`).
2. Carica **tutti** i file della cartella nella radice del repository (Add file → Upload files).
3. Vai in **Settings → Pages**, scegli *Deploy from a branch*, branch `main`, cartella `/ (root)`, poi Save.
4. Dopo circa un minuto l'app è online su `https://TUO-UTENTE.github.io/zampas-gym/`.

L'indirizzo deve essere `https://`: GitHub Pages lo è già, ed è necessario per l'installazione.

## Installare l'app

- **Android / Chrome (tablet e telefono):** apri il link, poi menu ⋮ → *Installa app* (oppure tocca il pulsante ⬇ Installa che compare in alto).
- **iPad / iPhone (Safari):** apri il link, tocca *Condividi* → *Aggiungi a schermata Home*.
- **PC (Chrome / Edge):** icona di installazione nella barra dell'indirizzo.

Sul tablet della palestra, dopo l'installazione, apri l'app dalla schermata Home: si avvia a schermo intero, senza la barra del browser.

## Aggiornare l'app

Sostituisci i file nel repository con quelli nuovi. L'app prende gli aggiornamenti da sola quando il tablet è online (alla riapertura, eventualmente dopo averla chiusa e riaperta due volte).

## Sincronizzazione online (Firebase)

L'app usa il progetto Firebase `zampa-s-gym`. Ogni dispositivo accede con lo stesso account (email e password creati in *Authentication → Users*) e vede gli stessi dati.

Impostazioni necessarie nella console Firebase:

1. **Authentication → Sign-in method:** abilitare *Email/Password* e creare l'utente in *Users → Add user*.
2. **Firestore Database:** creato in modalità produzione.
3. **Firestore → Rules:** incollare queste regole e premere *Publish*:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Come funziona:

- Il pulsante ☁ in alto mostra lo stato: `☁ Accedi` (non connesso), `☁ …` (salvataggio), `☁ ✓` (sincronizzato), `☁ offline`, `☁ !` (errore, passa sopra o tocca per i dettagli).
- Senza internet l'app funziona lo stesso e i dati si sincronizzano appena torna la connessione.
- Al primo accesso i dati già presenti sul dispositivo vengono caricati online. Se lo stesso giorno esiste già online, vale la versione online.
- Se due dispositivi modificano lo stesso giorno insieme, vince l'ultima modifica.
- Se vedi l'errore `unauthorized-domain`, aggiungi `TUO-UTENTE.github.io` in *Authentication → Settings → Authorized domains*.

## I dati

I dati sono salvati anche nella memoria del dispositivo (localStorage). Fai ogni tanto un backup con 💾: cancellare i dati di navigazione del browser o disinstallare l'app cancella la copia locale (quella online resta).
