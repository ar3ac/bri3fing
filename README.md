# calendar-desklet (`calendar@ar3ac`)

Desklet nativa per l'ambiente desktop **Cinnamon** (Linux Mint) per visualizzare la propria agenda e **creare nuovi eventi** sincronizzati con **Google Calendar** (o altri account CalDAV/Nextcloud/Microsoft).

---

## Caratteristiche Principali

- **Login Facile e Senza Frustrazioni:** Nessuna API key da creare su Google Cloud Console, nessun file JSON di credenziali e nessun token che scade ogni 7 giorni. Sfrutta l'integrazione nativa del sistema operativo tramite **Account Online** (GNOME Online Accounts ed Evolution Data Server).
- **Creazione Eventi Rapida:** Aggiungi impegni direttamente dal desktop con un clic, con sincronizzazione istantanea sul tuo Google Calendar.
- **Vista Agenda Moderna:** Visualizza gli eventi di oggi, domani e dei prossimi giorni con orari chiari, indicatori cromatici dei calendari e badge per gli eventi in corso.
- **Funziona anche Offline:** Memorizzazione nella cache locale del sistema operativo; gli eventi sono sempre visibili anche se momentaneamente disconnessi.
- **Stile Coerente con Cinnamon:** Interfaccia scura, elegante e personalizzabile (larghezza, trasparenza, font), allineata allo stile di `tasks-tw` e `book-radar`.

---

## Prerequisiti e Configurazione Account

Per connettere il tuo Google Calendar:
1. Apri il menu delle applicazioni di Linux Mint / Cinnamon e cerca **Account Online** (o apri *Impostazioni di Sistema -> Account Online*).
2. Clicca su **Google** ed esegui il normale accesso con la tua email e password.
3. Assicurati che l'opzione **Calendario** sia attiva.

La desklet rileverà automaticamente i tuoi calendari e mostrerà subito gli impegni.

---

## Installazione Desklet

Il repository è strutturato con la cartella desklet pronta per essere collegata all'ambiente Cinnamon:

```bash
mkdir -p ~/.local/share/cinnamon/desklets
ln -snf /home/ar3ac/projects/calendar-desklet/desklet/calendar@ar3ac ~/.local/share/cinnamon/desklets/calendar@ar3ac
```

Abilita la desklet da *Impostazioni di Sistema -> Desklet* selezionando **Calendar & Agenda**.

---

## Sviluppo e Struttura

- `desklet/calendar@ar3ac/`: contiene il codice GJS, i fogli di stile e la configurazione della desklet Cinnamon.
- `AGENTS.md`: note architetturali, decisioni di design e linee guida per gli sviluppatori / agenti AI.
