# Bri3fing (`bri3fing@ar3ac`)

A sleek, native desktop agenda widget and event creator for the **Cinnamon Desktop Environment** (Linux Mint), seamlessly synchronized with **Google Calendar** (as well as Nextcloud, Microsoft 365, and generic CalDAV accounts).

Designed with a stealth, minimalist dark glass aesthetic that matches [`tasks-tw`](https://github.com/ar3ac/tasks-tw) and [`book-radar`](https://github.com/ar3ac/book-radar).

---

## Key Highlights

- **Zero-Friction OS-Native Integration:** No Google Cloud Console setup, no client secret JSON files, and no 7-day token expiration hurdles. Bri3fing taps directly into Linux Mint's native **Online Accounts** (GNOME Online Accounts + Evolution Data Server).
- **Chronus-Style Day-by-Day Agenda:** Continuous timeline organized day-by-day (e.g. *Today*, *Tomorrow*, *Tuesday, Oct 27*, *Monday, Nov 2*), skipping empty days for maximum clarity across a 2-week (or custom) horizon.
- **Visual Status Badges:** Calendar color indicator strips, start/end time ranges, location tags, and real-time badges for active (**NOW**) or imminent (**SOON**) events.
- **Quick Event Creation (`[+]`):** Add upcoming appointments directly from your desktop in seconds with automatic two-way background sync to Google Calendar.
- **Interactive Event Inspection:** Click any event on the widget to view its full details (exact time, location, notes, calendar source) or delete it directly from your schedule.
- **Offline First:** Cached locally in the system's Evolution Data Server database, ensuring your schedule is always visible even without internet connectivity.
- **Native Internationalization (i18n):** Multilingual support out of the box with English (`en`) and Italian (`it`) translations.
- **Fully Customizable:** Flexible Cinnamon settings for desklet width, background opacity, font scaling, briefing range, and refresh intervals.

---

## Prerequisites & Account Setup

To connect your Google Calendar:

1. Open your Cinnamon Application Menu and launch **Online Accounts** (or navigate to *System Settings -> Online Accounts*).
2. Select **Google** and log in with your account credentials.
3. Ensure the **Calendar** toggle is turned **ON**.

Once enabled, Bri3fing automatically discovers your calendars and populates your agenda without requiring manual API credentials or local tokens.

---

## Installation

### Automated Setup

Run the installation script to symlink the desklet bundle and compile translations:

```bash
git clone https://github.com/ar3ac/bri3fing.git ~/projects/bri3fing
cd ~/projects/bri3fing
./scripts/install.sh
```

### Manual Setup

Alternatively, create the symlink and compile translations manually:

```bash
mkdir -p ~/.local/share/cinnamon/desklets
ln -snf ~/projects/bri3fing/desklet/bri3fing@ar3ac ~/.local/share/cinnamon/desklets/bri3fing@ar3ac
```

Compile and install translation catalogs:

```bash
mkdir -p ~/.local/share/locale/it/LC_MESSAGES ~/.local/share/locale/en/LC_MESSAGES
msgfmt ~/projects/bri3fing/desklet/bri3fing@ar3ac/po/it.po -o ~/.local/share/locale/it/LC_MESSAGES/bri3fing@ar3ac.mo
msgfmt ~/projects/bri3fing/desklet/bri3fing@ar3ac/po/en.po -o ~/.local/share/locale/en/LC_MESSAGES/bri3fing@ar3ac.mo
```

Then enable the desklet in Cinnamon:
1. Open **System Settings -> Desklets**.
2. Locate **Bri3fing** and click the **+** (Add) button to place it on your desktop.

---

## CLI Backend Helper (`eds_helper.py`)

Bri3fing includes a standalone backend helper interfacing directly with `Evolution Data Server` via Python GObject introspection (`gir1.2-ecal-2.0` and `gir1.2-edataserver-1.2`):

```bash
# List all configured calendar sources
./desklet/bri3fing@ar3ac/eds_helper.py calendars

# Retrieve briefing events for the next 7 days
./desklet/bri3fing@ar3ac/eds_helper.py events --days 7

# Include past events from earlier today
./desklet/bri3fing@ar3ac/eds_helper.py events --days 7 --include-past

# Quickly add a new event
./desklet/bri3fing@ar3ac/eds_helper.py add \
    --summary "Sprint Retrospective" \
    --date 2026-10-25 \
    --start 15:00 \
    --end 16:00 \
    --location "Google Meet"

# Add an all-day event
./desklet/bri3fing@ar3ac/eds_helper.py add \
    --summary "Public Holiday" \
    --date 2026-10-26 \
    --all-day

# Delete an event
./desklet/bri3fing@ar3ac/eds_helper.py delete --calendar system-calendar --uid <event-uid>
```

---

## Configuration Settings

Configure Bri3fing directly through Cinnamon Desklet Settings (*Right-click widget -> Configure...*):

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **Days ahead** | Spinbutton | `14` | Number of days ahead to include in briefing (1–60) |
| **Show past events** | Switch | `false` | Display today's events that have already ended |
| **Show event location** | Switch | `true` | Display event location when available |
| **24-hour time format** | Switch | `true` | Use 24-hour format (`14:30`) vs 12-hour AM/PM |
| **Refresh interval** | Spinbutton | `10` | Automatic refresh frequency in minutes |
| **Transparent background**| Switch | `false` | Enable completely transparent desklet canvas |
| **Desklet opacity** | Spinbutton | `30%` | Card background opacity when transparency is off |
| **Desklet width** | Spinbutton | `340px` | Total widget width in pixels |
| **Max height** | Spinbutton | `520px` | Maximum height before scrolling for 2+ week agendas |
| **Font size** | Spinbutton | `9pt` | Text size for event titles (7–18pt) |
| **Header font size** | Spinbutton | `11pt` | Text size for header date (8–20pt) |
| **Compact mode** | Switch | `true` | Reduced padding and spacing for sleek Chronus density |
| **Custom colors** | Switch | `false` | Enable custom color pickers for all schedule fields |
| **Section color** | Colorchooser | `rgb(96,165,250)` | Section & day header accent color |
| **Title color** | Colorchooser | `rgb(243,244,246)` | Event title text color |
| **Time color** | Colorchooser | `rgb(209,213,219)` | Time & duration label color |
| **Calendar tag color** | Colorchooser | `rgb(147,197,253)` | Calendar account tag color |

---

## Repository Structure

```text
bri3fing/
├── AGENTS.md                  # AI agent guidelines, design decisions & architecture
├── README.md                  # Public documentation & user guide
├── .gitignore                 # Git ignore rules
├── scripts/
│   └── install.sh             # Automated installer & translation compiler
└── desklet/
    └── bri3fing@ar3ac/        # Cinnamon Desklet bundle
        ├── metadata.json      # Desklet metadata & versioning
        ├── desklet.js         # Core GJS desklet implementation
        ├── stylesheet.css     # Desklet styling (stealth dark theme)
        ├── settings-schema.json # Cinnamon settings schema
        ├── eds_helper.py      # Standalone EDS backend helper
        ├── icon.png           # Desklet icon
        └── po/                # Localization catalogs
            ├── bri3fing.pot   # Translation template
            ├── en.po          # English base translation
            └── it.po          # Italian translation
```

---

## License

MIT License. Designed and maintained for Linux Mint & Cinnamon desktop enthusiasts.
