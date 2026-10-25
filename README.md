# Bri3fing (`bri3fing@ar3ac`)

A sleek, stealthy desktop agenda widget and event creator for the **Cinnamon Desktop Environment** (Linux Mint), seamlessly synchronized with **Google Calendar** (as well as Nextcloud, Microsoft 365, and generic CalDAV accounts).

---

## Key Features

- **Frictionless OS-Native Authentication:** No Google Cloud Console setup, no client secret JSON files, and no 7-day token expiration hurdles. It taps directly into Linux Mint's native **Online Accounts** (GNOME Online Accounts + Evolution Data Server).
- **Quick Event Creation:** Add upcoming events directly from your desktop in seconds with instant two-way background sync to Google Calendar.
- **Modern Schedule Briefing:** Stay on top of today's and upcoming appointments with clear time ranges, calendar color coding, and visual indicators for active or imminent events.
- **Offline First:** Cached locally by the system's Evolution Data Server database, ensuring your schedule is always visible even without internet connectivity.
- **Stealth & Dark Theme Aesthetic:** Minimalist, transparent dark design matching the Cinnamon desktop aesthetic and customizable via Cinnamon Desklet settings.
- **Internationalization (i18n):** Native multilingual support (English and Italian out of the box).

---

## Prerequisites & Account Setup

To connect your Google Calendar:

1. Open your Cinnamon Application Menu and launch **Online Accounts** (or navigate to *System Settings -> Online Accounts*).
2. Select **Google** and log in with your Google account.
3. Ensure the **Calendar** toggle is turned **ON**.

Once enabled, Bri3fing will automatically discover your calendars and populate your agenda without requiring any API keys.

---

## Installation

The repository is structured with the desklet ready to be linked to your local Cinnamon environment:

```bash
mkdir -p ~/.local/share/cinnamon/desklets
ln -snf /home/ar3ac/projects/bri3fing/desklet/bri3fing@ar3ac ~/.local/share/cinnamon/desklets/bri3fing@ar3ac
```

Then enable the desklet in Cinnamon:
1. Open **System Settings -> Desklets**.
2. Locate **Bri3fing** and click the **+** (Add) button to place it on your desktop.

---

## Project Structure & Development

```text
bri3fing/
├── AGENTS.md                  # AI agent guidelines, design decisions & architecture
├── README.md                  # Public documentation & user guide
├── .gitignore
└── desklet/
    └── bri3fing@ar3ac/        # Cinnamon Desklet bundle
        ├── metadata.json      # Desklet metadata
        ├── desklet.js         # Core GJS desklet implementation
        ├── stylesheet.css     # Desklet styling
        ├── settings-schema.json # Cinnamon settings schema
        ├── po/                # Translation catalogs (en, it)
        └── icon.png           # Desklet icon
```

---

## License & Contributing

Contributions, bug reports, and suggestions are welcome! Feel free to open an issue or submit a pull request.
