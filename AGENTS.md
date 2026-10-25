# AI Agent Instructions & Project Specifications (AGENTS.md)

## Project Overview
Develop **`Bri3fing`** (`bri3fing@ar3ac`), a native desklet for the **Cinnamon Desktop Environment** that allows users to:
1. **View their daily briefing and upcoming schedule** synchronized with **Google Calendar** (and any other account supported by Linux Mint's Online Accounts).
2. **Quickly create new events** directly from the desktop, syncing instantly with Google Calendar.
3. Provide a seamless, zero-friction setup and login experience for the end user.

---

## Architecture & Technical Decisions

### 1. Why GNOME Online Accounts (GOA) & Evolution Data Server (EDS)?
Custom Google API solutions (such as the legacy `gcalendar` CLI or custom desktop OAuth loopbacks) were explicitly rejected due to significant real-world pitfalls:
- **No external Python dependency hell or PEP 668 restrictions:** Ubuntu 24.04 / Linux Mint 22 blocks global `pip` installs; avoiding an internal `.venv` saves complexity and ~60MB of disk space.
- **No 7-day token expiration:** Unverified/Testing Google Cloud OAuth apps invalidate tokens every week. Production unverified apps display scary red security warnings and cap access at 100 users.
- **No Google Cloud Console setup required from users:** Tapping into system credentials eliminates manual API key and JSON file management.
- **Native Linux Mint Stack:** Mint already ships with `evolution-data-server`, `evolution-calendar-factory` running in the background, and GObject Introspection packages (`gir1.2-ecal-2.0`, `gir1.2-edataserver-1.2`).
- **OS-Managed Authentication:** User authenticates via *System Settings -> Online Accounts -> Google*. The operating system handles OAuth2 tokens, refresh cycles, and CalDAV synchronization transparently.

### 2. EDS Data Flow
- Calendars and events are cached locally by EDS (`/usr/libexec/evolution-calendar-factory`).
- The desklet queries EDS via GJS (`imports.gi.ECal` / DBus `org.cinnamon.CalendarServer` or `org.gnome.evolution.dataserver.Calendar8`) or via a lightweight system-Python helper using `gi.repository.ECal` / `gi.repository.EDataServer`.
- Creating a `VEVENT` component in the local EDS client triggers background synchronization to Google Calendar.
- Offline support is inherent: cached events remain visible without network access.

---

## Internationalization (i18n) & Coding Standards

In accordance with global repository rules:
1. **Code & Comments:** All source code, variables, functions, and internal comments MUST be written in **English**.
2. **Cinnamon Gettext Standard:**
   - Wrap all user-facing UI strings with `_("String in English")`.
   - Setup gettext domain binding for `bri3fing@ar3ac`:
     ```javascript
     const Gettext = imports.gettext;
     const GLib = imports.gi.GLib;
     const UUID = "bri3fing@ar3ac";
     Gettext.bindtextdomain(UUID, GLib.get_home_dir() + "/.local/share/locale");
     function _(str) {
         let customTranslation = Gettext.dgettext(UUID, str);
         if (customTranslation !== str) return customTranslation;
         return Gettext.gettext(str);
     }
     ```
   - Provide translation catalogs in `desklet/bri3fing@ar3ac/po/`:
     - `bri3fing.pot` (template)
     - `it.po` (Italian translation)
     - `en.po` (English base)

---

## User Experience (UX/UI Requirements)

Follow the aesthetic consistency of `tasks-tw@ar3ac` and `book-radar@ar3ac`:
1. **"Not Connected" State:**
   - If no calendar account is configured in EDS, display a clean card:  
     `"No calendars connected"` with a button `[ Connect Account ]` that triggers `cinnamon-settings online-accounts`.
2. **Briefing View (Agenda):**
   - Clean schedule grouped by day: Today, Tomorrow, and Upcoming days.
   - Start / end times, event titles, calendar color indicators.
   - Visual emphasis for active (happening now) or imminent events.
3. **Quick Event Creation:**
   - A `[+]` button in the header or footer.
   - Minimal input fields: Title, Date (default today), Start Time, End Time, and Calendar selector.
   - Immediate EDS insertion and UI refresh.
4. **Desklet Controls:**
   - Manual refresh icon + configurable auto-refresh interval.
   - Cinnamon settings schema (`settings-schema.json`) for opacity, panel width, font scaling, and refresh timer.

---

## Repository Structure
```text
bri3fing/
├── AGENTS.md                  # AI agent guidelines, design decisions & architecture
├── README.md                  # Public documentation & user guide (in English)
├── .gitignore
└── desklet/
    └── bri3fing@ar3ac/        # Cinnamon Desklet bundle
        ├── metadata.json      # Desklet metadata
        ├── desklet.js         # Core GJS desklet implementation
        ├── stylesheet.css     # Desklet styling
        ├── settings-schema.json # Cinnamon settings schema
        ├── po/                # Translation files (bri3fing.pot, it.po, en.po)
        └── icon.png           # Desklet icon
```

---

## Post-Edit Workflow Rules
1. **Maintain Documentation:** Keep `README.md` updated as features evolve.
2. **Git Commit & Push:** Follow Conventional Commits in English (e.g., `feat: ...`, `fix: ...`) and always push to `origin main`.
