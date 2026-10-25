# Istruzioni e Specifiche di Progetto per Agenti AI (AGENTS.md)

## Obiettivo del Progetto
Sviluppare **`Bri3fing`** (`bri3fing@ar3ac`), una desklet nativa per **Cinnamon Desktop** che consente di:
1. **Visualizzare il briefing della giornata e dei prossimi impegni** sincronizzati con **Google Calendar** (e qualsiasi altro calendario supportato da Linux Mint).
2. **Creare nuovi eventi** rapidamente direttamente dal desktop, sincronizzandoli istantaneamente con Google Calendar.
3. Offrire un'esperienza di installazione e login fluida, elegante e completamente priva di attriti per l'utente finale.

---

## Architettura e Decisioni Tecniche

### 1. Perché GNOME Online Accounts (GOA) ed Evolution Data Server (EDS)?
Durante l'analisi preliminare è stata scartata l'integrazione Google API "fai-da-te" (tipo `gcalendar` o OAuth 2.0 loopback via script) per motivi critici:
- **Nessuna dipendenza Python esterna o blocco PEP 668:** Su Ubuntu 24.04 / Mint 22 `pip` è bloccato e richiederebbe la gestione complessa di un `.venv` locale.
- **Niente token che scadono a 7 giorni:** I progetti Google Cloud in test mode revocano i token ogni settimana; le app non verificate mostrano schermate d'avviso rosse e hanno quote limitate a 100 utenti.
- **Nessuna configurazione su Google Cloud Console richiesta all'utente.**
- **Integrazione nativa Linux Mint:** Linux Mint include già nel sistema `evolution-data-server`, `evolution-calendar-factory` e le librerie GObject Introspection (`gir1.2-ecal-2.0`, `gir1.2-edataserver-1.2`).
- **Autenticazione gestita dal sistema operativo:** L'utente accede da *Impostazioni -> Account Online -> Google*. Il sistema operativo gestisce OAuth2 con certificati ufficiali, rinnovo token e sincronizzazione CalDAV in background.

### 2. Funzionamento di EDS e Comunicazione
- I calendari e gli eventi sono memorizzati nella cache locale gestita da EDS (`/usr/libexec/evolution-calendar-factory`).
- La desklet può interrogare EDS direttamente da GJS (`imports.gi.ECal` / DBus `org.cinnamon.CalendarServer` o `org.gnome.evolution.dataserver.Calendar8`) o tramite un micro-script Python leggero che usa le librerie di sistema `gi.repository.ECal` / `gi.repository.EDataServer`.
- La creazione di un evento (componente `VEVENT` iCalendar) nel client EDS locale viene sincronizzata automaticamente da EDS con il server di Google Calendar.
- Supporto offline nativo: gli impegni vengono mostrati anche in assenza temporanea di connessione Internet.

---

## Esperienza Utente (UX/UI Desklet)

Seguire la coerenza grafica e stilistica dei progetti precedenti (`tasks-tw@ar3ac` e `book-radar@ar3ac`):
1. **Stato "Non Connesso":**
   - Se nessun account calendario è presente, mostrare una schermata elegante con pulsante `[ Connetti Account ]` che apre con un clic `cinnamon-settings online-accounts` (o `gnome-control-center online-accounts`).
2. **Vista Agenda (Briefing):**
   - Visualizzazione ordinata degli impegni: Oggi, Domani e Prossimi giorni.
   - Ora inizio / fine, titolo dell'evento, colore del calendario di appartenenza.
   - Evidenziazione visiva per l'evento in corso o imminente.
3. **Creazione Eventi Rapida:**
   - Pulsante `[+]` nell'intestazione o nella barra inferiore.
   - Form compatto per inserire Titolo, Data (default oggi), Ora inizio e Ora fine, e selezione del calendario.
   - Salvataggio immediato in EDS e notifica/aggiornamento al volo.
4. **Controlli Desklet:**
   - Pulsante refresh manuale + timer di auto-refresh configurabile.
   - Supporto alle impostazioni Cinnamon (`settings-schema.json`) per opacità, larghezza, dimensione font e intervallo di refresh.

---

## Struttura della Repository
```text
bri3fing/
├── AGENTS.md                  # Specifiche e contesto di lavoro per l'assistente AI
├── README.md                  # Documentazione per l'utente finale e guida all'uso
├── .gitignore
└── desklet/
    └── bri3fing@ar3ac/        # Cartella desklet (simlinkata in ~/.local/share/cinnamon/desklets/)
        ├── metadata.json      # Metadati desklet Cinnamon
        ├── desklet.js         # Codice principale GJS della desklet
        ├── stylesheet.css     # Stile CSS personalizzato
        ├── settings-schema.json # Schema delle impostazioni Cinnamon
        └── icon.png           # Icona desklet
```

---

## Regole di Sviluppo (Post-Modifica)
1. **Aggiornamento Documentazione (.md):** Mantenere aggiornato il `README.md` per ogni nuova feature o modifica strutturale.
2. **Git Commit & Push:** Al termine del lavoro e dopo aver testato/validato, eseguire un commit con messaggio descrittivo ed effettuare il `git push origin main`.
