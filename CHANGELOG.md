# Changelog

All notable changes to **Bri3fing** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-11-27

### Added
- **Live 60-second In-Memory Briefing Ticker:** Automatically updates `NOW` / `SOON` badges, fires imminent event notifications on the exact minute, removes finished events when *Show past events* is off, and handles midnight date rollover without spawning Python/EDS.
- **Smart Next-Up Header Countdown:** Displays live next-event countdowns in the header subtitle (e.g. `In 25 min: Team Sync`, `Now: Standup`).
- **Quick Date & Duration Presets + Inline Validation:** Added one-click `Today`, `Tomorrow`, `+1 week`, `30m`, `1h`, and `2h` pills plus inline date/time validation inside the Create/Edit Event modal dialog.
- **Safe Recurring Event Controls (`↻`):** Displays recurring indicators, lets users choose between **This Occurrence** and **Entire Series** when editing or deleting recurring events, and writes explicit `TZID` parameters on recurring series to preserve local wall-clock times across DST changes.
- **Open in Maps Action:** Event details dialog now includes an `Open in Maps` (OpenStreetMap) quick action for physical locations.
- **Automated Test Suite & CI:** Added `tests/test_eds_helper.py` (16-timezone global DST matrix + validation tests), `tests/test_desklet_assets.py` (metadata, schema, GJS, Cinnamon Spices safety patterns, and 100% i18n coverage checks), GitHub Actions CI workflow, and a GitHub bug report template.

### Fixed
- **Accurate Error Handling on Create / Edit / Delete:** `eds_helper.py` now exits with status `1` on errors and `desklet.js` parses JSON responses so failed operations show the real error instead of a false success message.
- **Real Read-Only Calendar Detection:** Uses `ECal.Client.is_readonly()` so read-only calendars (e.g. Holidays, Birthdays) are excluded from Create/Edit dropdowns, auto-selection, and Edit/Delete actions.
- **Right-Click Context Menu on Event Rows:** Left-click opens event details while right-click now bubbles cleanly to Cinnamon's desklet context menu.
- **Active Multi-Day Event Grouping:** Multi-day events that started on an earlier day are grouped under today's section without producing duplicate `TODAY` headers, while preserving original start/end dates in details and edit dialogs.
- **CLI & Argument Safety:** Uses `--flag=value` arguments so titles/notes starting with `-` never confuse `argparse`, and preserves omitted fields (`--date`, `--location`, `--description`) when editing via CLI.
- **Lifecycle & Memory Cleanup:** Properly removes all timers, closes open modal dialogs, finalizes `DeskletSettings` in `on_desklet_removed()`, prunes expired notification IDs, and queues overlapping `refresh()` calls.
- **Complete Localization:** Added all missing UI, `settings-schema.json`, and `metadata.json` strings to `bri3fing@ar3ac.pot`, `en.po`, and `it.po`.
- **Minor Polish:** Stripped trailing sentence punctuation from extracted video meeting URLs, validated remote calendar hex colors, and removed the orphaned `max-height` schema key.

## [1.0.1] - 2026-11-27

### Fixed
- **Worldwide Timezone & DST Accuracy:** Preserves per-event `TZID` / `VTIMEZONE`, UTC (`Z`), and RFC 5545 floating times instead of forcing UTC conversion in `eds_helper.py`, honoring POSIX `TZ` overrides and setting the local default timezone on EDS clients.
- **Day & Midnight Boundaries:** Excluded events finished prior to `00:00` local time when `--include-past` is enabled, avoided tagging `00:00`-ending evening events as multi-day, and used local noon when computing weekday header names in `desklet.js`.

## [1.0.0] - 2026-10-25

### Added
- Initial public release of **Bri3fing (`bri3fing@ar3ac`)** for the Cinnamon Desktop Environment.
- Native GNOME Online Accounts + Evolution Data Server integration for Google Calendar, Nextcloud, Microsoft 365, and CalDAV.
- Chronus-style day-by-day agenda, inline search, video meeting quick-join, calendar visibility toggles, desktop notifications, in-place event creation/editing/deletion, stealth customizable dark glass UI, and English/Italian localization.
