# Istruzioni e Specifiche di Progetto per Agenti AI (AGENTS.md)

## Obiettivo del Progetto
Sviluppare una desklet nativa per **Cinnamon Desktop** (`calendar@ar3ac`) che consenta di:
1. **Visualizzare l'agenda e i prossimi eventi** sincronizzati con **Google Calendar** (e qualsiasi altro calendario supportato).
2. **Creare nuovi eventi** direttamente dal desktop, sincronizzandoli istantaneamente con Google Calendar.
3. Offrire un'esperienza di installazione e login fluida, moderna e completamente priva di attriti per l'utente finale.

---

## Architettura e Decisioni Tecniche

### 1. Perché GNOME Online Accounts (GOA) ed Evolution Data Server (EDS)?
Durante l'analisi iniziale è stata scartata la vecchia modalità "Google API via script Python autonomo" (come `gcalendar` o OAuth 2.0 loopback personalizzato) per ragioni critiche di usabilità e stabilità:
- **Niente dipendenze esterne o PEP 668:** Su Ubuntu 24.04 / Linux Mint 22, `pip` è bloccato a livello di sistema.
- **Niente scadenze di token a 7 giorni:** Le app Google Cloud in modalità testing revocano i token dopo una settimana; la modalità produzione non verificata mostra avvisi di sicurezza ("App non verificata") ed è limitata a 100 utenti.
- **Nessuna configurazione complessa:** Chiedere all'utente di creare un progetto su Google Cloud Console e scaricare chiavi JSON distrugge l'usabilità.
- **Integrazione nativa Linux Mint:** Linux Mint include già nel sistema `evolution-data-server`, `evolution-calendar-factory` e le librerie GObject Introspection (`gir1.2-ecal-2.0`, `gir1.2-edataserver-1.2`).
- **Autenticazione gestita dal sistema operativo:** L'utente accede da *Impostazioni -> Account Online -> Google*. Il sistema operativo gestisce OAuth2 con certificati ufficiali, rinnovo token e sincronizzazione CalDAV in background.

### 2. Funzionamento di EDS e Comunicazione
- I dati degli eventi sono memorizzati e memorizzati nella cache locale gestita da EDS.
- La desklet può interrogare EDS direttamente da GJS (`imports.gi.ECal` / DBus `org.cinnamon.CalendarServer` / `org.gnome.evolution.dataserver.Calendar8`) oppure tramite un helper Python leggero che usa le librerie di sistema `gi.repository.ECal` / `gi.repository.EDataServer`.
- La creazione di un evento (componente `VEVENT` iCalendar) nel client EDS locale viene sincronizzata automaticamente da EDS con il server di Google Calendar.
- Supporto offline nativo: gli impegni vengono mostrati anche in assenza temporanea di connessione Internet.

---

## Esperienza Utente (UX/UI Desklet)

Seguire la coerenza grafica e stilistica dei progetti precedenti (`tasks-tw@ar3ac` e `book-radar@ar3ac`):
1. **Stato "Non Connesso":**
   - Se nessun account calendario è presente, mostrare una schermata elegante con pulsante `[ Connetti Account ]` che apre con un clic `cinnamon-settings online-accounts` (o `gnome-control-center online-accounts`).
2. **Vista Agenda:**
   - Visualizzazione ordinata degli impegni: Oggi, Domani e Prossimi giorni.
   - Ora inizio / fine, titolo dell'evento, colore del calendario di appartenenza.
   - Evidenziazione visiva degli eventi in corso o imminenti.
3. **Creazione Eventi Rapida:**
   - Pulsante `[+]` nell'intestazione o nella barra inferiore.
   - Form compatto per inserire Titolo, Data (preimpostata su oggi), Ora inizio e Ora fine, e selezione del calendario.
   - Salvataggio immediato in EDS e notifica di avvenuta creazione.
4. **Controlli Desklet:**
   - Pulsante refresh immediato + timer di aggiornamento automatico configurabile.
   - Supporto alle impostazioni Cinnamon (`settings-schema.json`) per opacità, larghezza, scala font e giorni di orizzonte visibile.

---

## Struttura della Repository
```text
calendar-desklet/
├── AGENTS.md                  # Specifiche e contesto di lavoro per l'assistente AI
├── README.md                  # Documentazione per l'utente finale e guida all'uso
├── .gitignore
└── desklet/
    └── calendar@ar3ac/        # Cartella desklet (simlinkata in ~/.local/share/cinnamon/desklets/)
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
