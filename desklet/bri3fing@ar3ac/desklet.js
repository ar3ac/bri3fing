const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Mainloop = imports.mainloop;
const Settings = imports.ui.settings;
const PopupMenu = imports.ui.popupMenu;
const Clutter = imports.gi.Clutter;
const ModalDialog = imports.ui.modalDialog;
const Dialog = imports.ui.dialog;
const Tooltips = imports.ui.tooltips;
const Pango = imports.gi.Pango;
const Gettext = imports.gettext;

const UUID = "bri3fing@ar3ac";

// Setup gettext domain binding
Gettext.bindtextdomain(UUID, GLib.get_home_dir() + "/.local/share/locale");
function _(str) {
    let customTranslation = Gettext.dgettext(UUID, str);
    if (customTranslation !== str) return customTranslation;
    return Gettext.gettext(str);
}

function Bri3fingDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

Bri3fingDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function(metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);
        this.metadata = metadata;
        this.desklet_id = desklet_id;
        this._timeoutId = null;
        this._isLoading = false;
        this._calendars = [];
        this._events = [];

        // Force disable Cinnamon's default opaque decorations
        this.metadata["prevent-decorations"] = true;
        this._updateDecoration();

        // Desklet settings binding
        this.settings = new Settings.DeskletSettings(this, this.metadata["uuid"], desklet_id);
        this.settings.bindProperty(Settings.BindingDirection.IN, "days-ahead", "daysAhead", this._onConfigChanged.bind(this));
        this.settings.bindProperty(Settings.BindingDirection.IN, "refresh-interval", "refreshInterval", this._onIntervalChanged.bind(this));
        this.settings.bindProperty(Settings.BindingDirection.IN, "show-past-events", "showPastEvents", this._onConfigChanged.bind(this));
        this.settings.bindProperty(Settings.BindingDirection.IN, "show-event-location", "showEventLocation", this._onConfigChanged.bind(this));
        this.settings.bindProperty(Settings.BindingDirection.IN, "time-format-24h", "timeFormat24h", this._onConfigChanged.bind(this));
        this.settings.bindProperty(Settings.BindingDirection.IN, "default-calendar-uid", "defaultCalendarUid", () => {});
        this.settings.bindProperty(Settings.BindingDirection.IN, "transparent-background", "transparentBackground", this._onStyleChanged.bind(this));
        this.settings.bindProperty(Settings.BindingDirection.IN, "desklet-opacity", "deskletOpacity", this._onStyleChanged.bind(this));
        this.settings.bindProperty(Settings.BindingDirection.IN, "desklet-width", "deskletWidth", this._onStyleChanged.bind(this));
        this.settings.bindProperty(Settings.BindingDirection.IN, "font-size", "fontSize", this._onStyleChanged.bind(this));
        this.settings.bindProperty(Settings.BindingDirection.IN, "compact-mode", "compactMode", this._onStyleChanged.bind(this));

        this._buildUI();
        this._applyCustomStyle();

        // Context menu items
        let newEventItem = new PopupMenu.PopupMenuItem(_("New Event…"));
        newEventItem.connect("activate", () => this._showAddEventDialog());
        this._menu.addMenuItem(newEventItem);

        let refreshMenuItem = new PopupMenu.PopupMenuItem(_("Refresh Briefing"));
        refreshMenuItem.connect("activate", () => this.refresh());
        this._menu.addMenuItem(refreshMenuItem);

        let onlineAccountsItem = new PopupMenu.PopupMenuItem(_("Online Accounts…"));
        onlineAccountsItem.connect("activate", () => this._openOnlineAccounts());
        this._menu.addMenuItem(onlineAccountsItem);

        // Initial fetch & start timer
        this.refresh();
        this._startTimer();
    },

    _updateDecoration: function() {
        try {
            if (this._header) this._header.hide();
            if (this.content) {
                this.content.style_class = "";
                this.content.set_style("background-color: transparent; border: none; padding: 0; box-shadow: none;");
            }
        } catch (e) {}
    },

    _buildUI: function() {
        this._updateDecoration();

        this.window = new St.BoxLayout({
            vertical: true,
            style_class: "bri3fing-container"
        });
        this.setContent(this.window);

        // Header container
        this.header = new St.BoxLayout({
            vertical: false,
            style_class: "bri3fing-header"
        });
        this.window.add_actor(this.header);

        // Title & date box
        let titleBox = new St.BoxLayout({
            vertical: true,
            x_expand: true
        });
        this.header.add_actor(titleBox);

        this.dateLabel = new St.Label({
            text: this._getFormattedCurrentDate(),
            style_class: "bri3fing-date-title"
        });
        titleBox.add_actor(this.dateLabel);

        this.subtitleLabel = new St.Label({
            text: _("Checking schedule…"),
            style_class: "bri3fing-subtitle"
        });
        titleBox.add_actor(this.subtitleLabel);

        // Action buttons (Add Event + Refresh)
        let actionsBox = new St.BoxLayout({
            vertical: false,
            y_align: Clutter.ActorAlign.CENTER,
            style: "spacing: 4px;"
        });
        this.header.add_actor(actionsBox);

        // Quick add button
        this.addBtn = new St.Button({
            style_class: "bri3fing-action-button",
            reactive: true,
            can_focus: true
        });
        new Tooltips.Tooltip(this.addBtn, _("Add New Event"));
        this.addIcon = new St.Icon({
            icon_name: "list-add-symbolic",
            icon_size: 15
        });
        this.addBtn.set_child(this.addIcon);
        this.addBtn.connect("clicked", () => this._showAddEventDialog());
        actionsBox.add_actor(this.addBtn);

        // Refresh button
        this.refreshBtn = new St.Button({
            style_class: "bri3fing-action-button",
            reactive: true,
            can_focus: true
        });
        new Tooltips.Tooltip(this.refreshBtn, _("Refresh Schedule"));
        this.refreshIcon = new St.Icon({
            icon_name: "view-refresh-symbolic",
            icon_size: 15
        });
        this.refreshBtn.set_child(this.refreshIcon);
        this.refreshBtn.connect("clicked", () => this.refresh());
        actionsBox.add_actor(this.refreshBtn);

        // Scroll view for events
        this.scrollView = new St.ScrollView({
            style_class: "bri3fing-scroll-view",
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC
        });
        this.scrollView.set_mouse_scrolling(true);
        this.window.add_actor(this.scrollView);

        // Schedule content box
        this.scheduleBox = new St.BoxLayout({
            vertical: true,
            style_class: "bri3fing-schedule-box",
            x_expand: true
        });
        this.scrollView.add_actor(this.scheduleBox);

        // Message / zero state box
        this.messageBox = new St.BoxLayout({
            vertical: true,
            style_class: "bri3fing-message-box",
            x_expand: true
        });
        this.window.add_actor(this.messageBox);
    },

    _getFormattedCurrentDate: function() {
        let now = new Date();
        let days = [_("Sunday"), _("Monday"), _("Tuesday"), _("Wednesday"), _("Thursday"), _("Friday"), _("Saturday")];
        let months = [
            _("January"), _("February"), _("March"), _("April"), _("May"), _("June"),
            _("July"), _("August"), _("September"), _("October"), _("November"), _("December")
        ];
        return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
    },

    _applyCustomStyle: function() {
        this._updateDecoration();
        if (!this.window) return;

        try {
            let width = this.deskletWidth || 340;
            this.window.set_width(width);

            let isTransparent = this.transparentBackground === true;
            let opacityPct = (this.deskletOpacity !== undefined && this.deskletOpacity !== null) ? this.deskletOpacity : 30;
            let padding = this.compactMode ? "8px 10px" : "12px 14px";

            if (isTransparent || opacityPct === 0) {
                this.window.set_style(`background-color: transparent; border: none; box-shadow: none; padding: ${padding};`);
            } else {
                let alpha = (opacityPct / 100).toFixed(2);
                this.window.set_style(`background-color: rgba(18, 18, 20, ${alpha}); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.40); padding: ${padding};`);
            }

            this._reapplyFontStyles();
            this._updateDynamicHeight();
        } catch (e) {}
    },

    _updateDynamicHeight: function() {
        if (!this.window) return;
        try {
            let width = this.deskletWidth || 340;
            this.window.set_width(width);

            if (this.scrollView && this.scheduleBox) {
                let [, schedH] = this.scheduleBox.get_preferred_height(width);
                let maxH = 460;
                let targetScrollH = Math.min(schedH, maxH);
                if (schedH > 0) {
                    this.scrollView.show();
                    this.scrollView.set_height(targetScrollH);
                } else {
                    this.scrollView.hide();
                    this.scrollView.set_height(0);
                }
            }

            this.window.set_height(-1);
            if (this.content) this.content.set_height(-1);
            if (this.actor) this.actor.set_height(-1);

            let [, natH] = this.window.get_preferred_height(width);
            let minH = 75;
            let targetH = Math.max(natH, minH);

            this.window.set_height(targetH);
            if (this.content) this.content.set_height(targetH);
            if (this.actor) this.actor.set_height(targetH);
        } catch (e) {}
    },

    _reapplyFontStyles: function() {
        if (!this.scheduleBox) return;
        let fontSize = this.fontSize || 11;
        try {
            let children = this.scheduleBox.get_children();
            for (let i = 0; i < children.length; i++) {
                let child = children[i];
                if (child && child._titleLabel) {
                    child._titleLabel.set_style(`font-size: ${fontSize}pt;`);
                }
            }
        } catch (e) {}
    },

    _onConfigChanged: function() {
        this.refresh();
    },

    _onIntervalChanged: function() {
        this._startTimer();
    },

    _onStyleChanged: function() {
        this._applyCustomStyle();
    },

    _startTimer: function() {
        if (this._timeoutId) {
            Mainloop.source_remove(this._timeoutId);
            this._timeoutId = null;
        }

        let minutes = this.refreshInterval || 10;
        if (minutes < 1) minutes = 1;
        let intervalMs = minutes * 60 * 1000;

        this._timeoutId = Mainloop.timeout_add(intervalMs, () => {
            this.refresh();
            return true;
        });
    },

    _findHelperPath: function() {
        let candidates = [
            (this.metadata["path"] ? this.metadata["path"] + "/eds_helper.py" : null),
            GLib.get_home_dir() + "/.local/share/cinnamon/desklets/" + this.metadata["uuid"] + "/eds_helper.py",
            "/home/ar3ac/projects/bri3fing/desklet/bri3fing@ar3ac/eds_helper.py"
        ];

        for (let candidate of candidates) {
            if (candidate && GLib.file_test(candidate, GLib.FileTest.IS_EXECUTABLE)) {
                return candidate;
            }
        }

        return GLib.get_home_dir() + "/.local/share/cinnamon/desklets/" + this.metadata["uuid"] + "/eds_helper.py";
    },

    _executeHelper: function(args, callback) {
        let helper = this._findHelperPath();
        let argv = ["/usr/bin/python3", helper].concat(args);

        try {
            let proc = new Gio.Subprocess({
                argv: argv,
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            });
            proc.init(null);
            proc.communicate_utf8_async(null, null, (p, res) => {
                try {
                    let [ok, stdout, stderr] = p.communicate_utf8_finish(res);
                    if (p.get_successful()) {
                        callback(true, stdout, stderr);
                    } else {
                        callback(false, stdout, stderr || `Exit status: ${p.get_exit_status()}`);
                    }
                } catch (e) {
                    callback(false, null, e.message);
                }
            });
        } catch (e) {
            callback(false, null, e.message);
        }
    },

    refresh: function() {
        if (this._isLoading) return;
        this._isLoading = true;

        if (this.dateLabel) {
            this.dateLabel.set_text(this._getFormattedCurrentDate());
        }
        if (this.subtitleLabel) {
            this.subtitleLabel.set_text(_("Updating schedule…"));
        }

        let days = this.daysAhead || 7;
        let args = ["events", "--days", String(days)];
        if (this.showPastEvents) {
            args.push("--include-past");
        }

        this._executeHelper(args, (success, stdout, stderr) => {
            this._isLoading = false;
            if (success) {
                try {
                    let data = JSON.parse(stdout);
                    if (data.status === "success") {
                        this._calendars = data.calendars || [];
                        this._events = data.events || [];
                        this._renderSchedule(data);

                        let now = new Date();
                        let hours = String(now.getHours()).padStart(2, "0");
                        let mins = String(now.getMinutes()).padStart(2, "0");
                        let updatedText = _("Updated at %s").replace("%s", `${hours}:${mins}`);

                        let todayCount = this._events.filter(e => e.day_category === "today").length;
                        if (todayCount === 1) {
                            this.subtitleLabel.set_text(`1 ${_("event today")} • ${updatedText}`);
                        } else if (todayCount > 1) {
                            this.subtitleLabel.set_text(`${todayCount} ${_("events today")} • ${updatedText}`);
                        } else {
                            this.subtitleLabel.set_text(`${_("No events today")} • ${updatedText}`);
                        }
                    } else {
                        this._renderError(data.message || _("Failed to retrieve events"));
                    }
                } catch (e) {
                    this._renderError(_("Failed to parse calendar data: ") + e.message);
                }
            } else {
                this._renderError(stderr || _("Error querying calendar service"));
            }
            this._updateDynamicHeight();
        });
    },

    _renderSchedule: function(data) {
        this.scheduleBox.destroy_all_children();
        this.messageBox.destroy_all_children();

        let events = data.events || [];
        let calendars = data.calendars || [];

        if (calendars.length === 0) {
            this.scrollView.hide();
            this.messageBox.show();
            this._renderNoCalendarsCard();
            this._updateDynamicHeight();
            return;
        }

        if (events.length === 0) {
            this.scrollView.hide();
            this.messageBox.show();
            this._renderEmptySchedule();
            this._updateDynamicHeight();
            return;
        }

        this.messageBox.hide();
        this.scrollView.show();

        // Group events: Today, Tomorrow, Upcoming
        let todayEvents = [];
        let tomorrowEvents = [];
        let upcomingEvents = [];

        events.forEach(ev => {
            if (ev.day_category === "today") {
                todayEvents.push(ev);
            } else if (ev.day_category === "tomorrow") {
                tomorrowEvents.push(ev);
            } else {
                upcomingEvents.push(ev);
            }
        });

        if (todayEvents.length > 0) {
            this._addSection(_("Today"), todayEvents);
        }
        if (tomorrowEvents.length > 0) {
            this._addSection(_("Tomorrow"), tomorrowEvents);
        }
        if (upcomingEvents.length > 0) {
            this._addSection(_("Upcoming"), upcomingEvents, true);
        }

        this._reapplyFontStyles();
        this._updateDynamicHeight();
    },

    _addSection: function(title, eventsList, showDateBadge) {
        let headerBox = new St.BoxLayout({
            vertical: false,
            style_class: "bri3fing-section-header"
        });

        let titleLabel = new St.Label({
            text: title.toUpperCase(),
            style_class: "bri3fing-section-title"
        });
        titleLabel.clutter_text.set_ellipsize(Pango.EllipsizeMode.NONE);
        headerBox.add_actor(titleLabel);

        let countLabel = new St.Label({
            text: ` (${eventsList.length})`,
            style_class: "bri3fing-section-count"
        });
        countLabel.clutter_text.set_ellipsize(Pango.EllipsizeMode.NONE);
        headerBox.add_actor(countLabel);

        this.scheduleBox.add_actor(headerBox);

        eventsList.forEach(ev => {
            let row = this._createEventRow(ev, showDateBadge);
            this.scheduleBox.add_actor(row);
        });
    },

    _createEventRow: function(ev, showDateBadge) {
        let row = new St.BoxLayout({
            vertical: false,
            style_class: "bri3fing-event-row",
            reactive: true,
            can_focus: true
        });

        if (ev.is_ongoing) {
            row.add_style_class_name("bri3fing-event-row-active");
        } else if (ev.is_imminent) {
            row.add_style_class_name("bri3fing-event-row-imminent");
        }

        // Calendar color pill
        let colorPill = new St.BoxLayout({
            style_class: "bri3fing-color-pill",
            style: `background-color: ${ev.calendar_color || "#4285F4"};`
        });
        row.add_actor(colorPill);

        // Middle details box
        let detailsBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: "bri3fing-event-details"
        });
        row.add_actor(detailsBox);

        // Summary Label
        let summaryLabel = new St.Label({
            text: ev.summary || _("(Untitled event)"),
            style_class: "bri3fing-event-summary"
        });
        summaryLabel.clutter_text.set_line_wrap(true);
        summaryLabel.clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD);
        row._titleLabel = summaryLabel;
        detailsBox.add_actor(summaryLabel);

        // Meta Box (Time • Location • Calendar)
        let metaBox = new St.BoxLayout({
            vertical: false,
            style_class: "bri3fing-event-meta"
        });
        detailsBox.add_actor(metaBox);

        // Format time string
        let timeStr = "";
        if (ev.all_day) {
            timeStr = _("All Day");
        } else if (ev.start_time_str) {
            let sTime = this._formatTime(ev.start_time_str);
            let eTime = ev.end_time_str ? this._formatTime(ev.end_time_str) : "";
            timeStr = eTime ? `${sTime} – ${eTime}` : sTime;
        }

        if (showDateBadge && ev.date_str) {
            let dParts = ev.date_str.split("-");
            if (dParts.length === 3) {
                let d = new Date(parseInt(dParts[0]), parseInt(dParts[1]) - 1, parseInt(dParts[2]));
                let dayName = [_("Sun"), _("Mon"), _("Tue"), _("Wed"), _("Thu"), _("Fri"), _("Sat")][d.getDay()];
                timeStr = `${dayName} ${dParts[2]} • ${timeStr}`;
            }
        }

        let timeLabel = new St.Label({
            text: timeStr,
            style_class: "bri3fing-time-label"
        });
        metaBox.add_actor(timeLabel);

        // Location
        if (this.showEventLocation !== false && ev.location && ev.location.trim().length > 0) {
            let locLabel = new St.Label({
                text: ` • 📍 ${ev.location.trim()}`,
                style_class: "bri3fing-meta-subtext"
            });
            metaBox.add_actor(locLabel);
        }

        // Calendar source tag
        if (ev.calendar_name) {
            let calTag = new St.Label({
                text: ` • ${ev.calendar_name}`,
                style_class: "bri3fing-meta-calendar"
            });
            metaBox.add_actor(calTag);
        }

        // Status badge (NOW / SOON)
        if (ev.is_ongoing) {
            let nowBadge = new St.Label({
                text: _("NOW"),
                style_class: "bri3fing-badge-now"
            });
            row.add_actor(nowBadge);
        } else if (ev.is_imminent) {
            let soonBadge = new St.Label({
                text: _("SOON"),
                style_class: "bri3fing-badge-soon"
            });
            row.add_actor(soonBadge);
        }

        // Click row to view details / delete dialog
        row.connect("button-press-event", () => {
            this._showEventDetailsDialog(ev);
            return Clutter.EVENT_STOP;
        });

        return row;
    },

    _formatTime: function(hhmm) {
        if (!hhmm) return "";
        let use24h = this.timeFormat24h !== false;
        if (use24h) return hhmm;

        let parts = hhmm.split(":");
        let h = parseInt(parts[0], 10);
        let m = parts[1] || "00";
        let ampm = h >= 12 ? "PM" : "AM";
        let h12 = h % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    },

    _showEventDetailsDialog: function(ev) {
        let dlg = new ModalDialog.ModalDialog();

        let headerMeta = [];
        if (ev.calendar_name) headerMeta.push(ev.calendar_name);
        if (ev.date_str) headerMeta.push(ev.date_str);

        let content = new Dialog.MessageDialogContent({
            title: ev.summary || _("(Untitled event)"),
            description: headerMeta.join(" • ")
        });
        dlg.contentLayout.add_child(content);

        let detailsBox = new St.BoxLayout({
            vertical: true,
            style: "spacing: 8px; padding: 6px 0; min-width: 360px;"
        });
        content.add_child(detailsBox);

        // Time
        let timeStr = ev.all_day ? _("All Day") : `${this._formatTime(ev.start_time_str)} – ${this._formatTime(ev.end_time_str)}`;
        let timeLbl = new St.Label({
            text: `🕒 ${timeStr}`,
            style: "color: #93c5fd; font-size: 10pt; font-weight: 600;"
        });
        detailsBox.add_actor(timeLbl);

        // Location
        if (ev.location && ev.location.trim().length > 0) {
            let locLbl = new St.Label({
                text: `📍 ${ev.location.trim()}`,
                style: "color: #cbd5e1; font-size: 9.5pt;"
            });
            locLbl.clutter_text.set_line_wrap(true);
            detailsBox.add_actor(locLbl);
        }

        // Description
        if (ev.description && ev.description.trim().length > 0) {
            let descLbl = new St.Label({
                text: ev.description.trim(),
                style: "color: #94a3b8; font-size: 9pt; padding-top: 4px;"
            });
            descLbl.clutter_text.set_line_wrap(true);
            descLbl.clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD);
            detailsBox.add_actor(descLbl);
        }

        dlg.setButtons([
            {
                label: _("Delete Event"),
                action: () => {
                    dlg.close();
                    this._deleteEvent(ev);
                }
            },
            {
                label: _("Close"),
                action: () => dlg.close(),
                default: true,
                key: Clutter.KEY_Escape
            }
        ]);

        dlg.open();
    },

    _deleteEvent: function(ev) {
        if (!ev.calendar_uid || !ev.uid) return;

        if (this.subtitleLabel) {
            this.subtitleLabel.set_text(_("Deleting event…"));
        }

        this._executeHelper(["delete", "--calendar", ev.calendar_uid, "--uid", ev.uid], (success, stdout, stderr) => {
            if (success) {
                if (this.subtitleLabel) {
                    this.subtitleLabel.set_text(_("Event deleted"));
                }
                Mainloop.timeout_add(300, () => {
                    this.refresh();
                    return false;
                });
            } else {
                let errMsg = stderr || _("Failed to delete event");
                try {
                    let parsed = JSON.parse(stderr);
                    if (parsed && parsed.message) errMsg = parsed.message;
                } catch (e) {}
                this._renderError(errMsg);
            }
        });
    },

    _renderNoCalendarsCard: function() {
        let card = new St.BoxLayout({
            vertical: true,
            style_class: "bri3fing-card-empty"
        });

        let icon = new St.Icon({
            icon_name: "x-office-calendar-symbolic",
            icon_size: 32,
            style_class: "bri3fing-card-icon"
        });
        card.add_actor(icon);

        let title = new St.Label({
            text: _("No calendars connected"),
            style_class: "bri3fing-card-title"
        });
        card.add_actor(title);

        let desc = new St.Label({
            text: _("Connect your Google Calendar or CalDAV account in Cinnamon Online Accounts to view and manage your schedule."),
            style_class: "bri3fing-card-desc"
        });
        desc.clutter_text.set_line_wrap(true);
        desc.clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD);
        card.add_actor(desc);

        let btn = new St.Button({
            label: _("Connect Account"),
            style_class: "bri3fing-primary-button"
        });
        btn.connect("clicked", () => this._openOnlineAccounts());
        card.add_actor(btn);

        this.messageBox.add_actor(card);
    },

    _renderEmptySchedule: function() {
        let card = new St.BoxLayout({
            vertical: true,
            style_class: "bri3fing-card-empty"
        });

        let icon = new St.Icon({
            icon_name: "object-select-symbolic",
            icon_size: 28,
            style_class: "bri3fing-card-icon"
        });
        card.add_actor(icon);

        let title = new St.Label({
            text: _("No upcoming events"),
            style_class: "bri3fing-card-title"
        });
        card.add_actor(title);

        let days = this.daysAhead || 7;
        let desc = new St.Label({
            text: _("Your schedule is clear for the next %d days.").replace("%d", String(days)),
            style_class: "bri3fing-card-desc"
        });
        card.add_actor(desc);

        let addBtn = new St.Button({
            label: _("+ Create New Event"),
            style_class: "bri3fing-secondary-button"
        });
        addBtn.connect("clicked", () => this._showAddEventDialog());
        card.add_actor(addBtn);

        this.messageBox.add_actor(card);
    },

    _renderError: function(message) {
        this.scheduleBox.destroy_all_children();
        this.messageBox.destroy_all_children();
        this.scrollView.hide();
        this.messageBox.show();

        let errorBox = new St.BoxLayout({
            vertical: true,
            style_class: "bri3fing-error-box"
        });

        let errTitle = new St.Label({
            text: _("Calendar Service Error"),
            style_class: "bri3fing-error-title"
        });
        errorBox.add_actor(errTitle);

        let errDesc = new St.Label({
            text: message,
            style_class: "bri3fing-error-desc"
        });
        errDesc.clutter_text.set_line_wrap(true);
        errDesc.clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD);
        errorBox.add_actor(errDesc);

        let retryBtn = new St.Button({
            label: _("Retry"),
            style_class: "bri3fing-secondary-button"
        });
        retryBtn.connect("clicked", () => this.refresh());
        errorBox.add_actor(retryBtn);

        this.messageBox.add_actor(errorBox);
        this._updateDynamicHeight();
    },

    _showAddEventDialog: function() {
        let dlg = new ModalDialog.ModalDialog();

        let content = new Dialog.MessageDialogContent({
            title: _("New Calendar Event"),
            description: _("Create an event synced automatically with your calendar account.")
        });
        dlg.contentLayout.add_child(content);

        let formBox = new St.BoxLayout({
            vertical: true,
            style_class: "bri3fing-dialog-form",
            style: "spacing: 10px; padding: 4px 0;"
        });
        content.add_child(formBox);

        // 1. Title Input
        let titleLabel = new St.Label({ text: _("Event Title:"), style_class: "bri3fing-dialog-label" });
        formBox.add_actor(titleLabel);

        let titleEntry = new St.Entry({
            hint_text: _("e.g., Team Sync, Doctor Appointment"),
            style_class: "run-dialog-entry",
            can_focus: true
        });
        titleEntry.set_width(400);
        formBox.add_actor(titleEntry);

        // 2. Calendar Selector (if multiple available)
        let selectedCalendarUid = "";
        let writableCalendars = this._calendars.filter(c => c.writable !== false);

        if (writableCalendars.length > 0) {
            let defCal = writableCalendars.find(c => c.uid === this.defaultCalendarUid) ||
                         writableCalendars.find(c => c.is_online) ||
                         writableCalendars[0];
            selectedCalendarUid = defCal ? defCal.uid : writableCalendars[0].uid;

            let calHeaderBox = new St.BoxLayout({ vertical: false, style: "spacing: 8px;" });
            let calLabel = new St.Label({ text: _("Calendar:"), style_class: "bri3fing-dialog-label" });
            calHeaderBox.add_actor(calLabel);

            let calButtonsBox = new St.BoxLayout({ vertical: false, style: "spacing: 6px;" });
            writableCalendars.forEach(c => {
                let calBtn = new St.Button({
                    label: c.name,
                    style_class: (c.uid === selectedCalendarUid) ? "bri3fing-pill-btn-active" : "bri3fing-pill-btn"
                });
                calBtn.connect("clicked", () => {
                    selectedCalendarUid = c.uid;
                    calButtonsBox.get_children().forEach(btn => {
                        btn.style_class = "bri3fing-pill-btn";
                    });
                    calBtn.style_class = "bri3fing-pill-btn-active";
                });
                calButtonsBox.add_actor(calBtn);
            });
            formBox.add_actor(calHeaderBox);
            formBox.add_actor(calButtonsBox);
        }

        // 3. Date & Time Box
        let now = new Date();
        let todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

        let nextHour = (now.getHours() + 1) % 24;
        let defaultStart = `${String(nextHour).padStart(2, "0")}:00`;
        let defaultEnd = `${String((nextHour + 1) % 24).padStart(2, "0")}:00`;

        let dateTimeRow = new St.BoxLayout({ vertical: false, style: "spacing: 12px;" });
        formBox.add_actor(dateTimeRow);

        // Date Entry
        let dateBox = new St.BoxLayout({ vertical: true, style: "spacing: 4px;" });
        let dateLabel = new St.Label({ text: _("Date (YYYY-MM-DD):"), style_class: "bri3fing-dialog-label" });
        let dateEntry = new St.Entry({
            text: todayIso,
            style_class: "run-dialog-entry",
            can_focus: true
        });
        dateEntry.set_width(140);
        dateBox.add_actor(dateLabel);
        dateBox.add_actor(dateEntry);
        dateTimeRow.add_actor(dateBox);

        // Time Start Entry
        let startBox = new St.BoxLayout({ vertical: true, style: "spacing: 4px;" });
        let startLabel = new St.Label({ text: _("Start Time:"), style_class: "bri3fing-dialog-label" });
        let startEntry = new St.Entry({
            text: defaultStart,
            style_class: "run-dialog-entry",
            can_focus: true
        });
        startEntry.set_width(110);
        startBox.add_actor(startLabel);
        startBox.add_actor(startEntry);
        dateTimeRow.add_actor(startBox);

        // Time End Entry
        let endBox = new St.BoxLayout({ vertical: true, style: "spacing: 4px;" });
        let endLabel = new St.Label({ text: _("End Time:"), style_class: "bri3fing-dialog-label" });
        let endEntry = new St.Entry({
            text: defaultEnd,
            style_class: "run-dialog-entry",
            can_focus: true
        });
        endEntry.set_width(110);
        endBox.add_actor(endLabel);
        endBox.add_actor(endEntry);
        dateTimeRow.add_actor(endBox);

        // All Day Toggle
        let isAllDay = false;
        let allDayBtn = new St.Button({
            label: `☐ ${_("All Day Event")}`,
            style_class: "bri3fing-pill-btn",
            style: "margin-top: 2px;"
        });
        allDayBtn.connect("clicked", () => {
            isAllDay = !isAllDay;
            if (isAllDay) {
                allDayBtn.set_label(`☑ ${_("All Day Event")}`);
                allDayBtn.style_class = "bri3fing-pill-btn-active";
                startEntry.set_reactive(false);
                endEntry.set_reactive(false);
            } else {
                allDayBtn.set_label(`☐ ${_("All Day Event")}`);
                allDayBtn.style_class = "bri3fing-pill-btn";
                startEntry.set_reactive(true);
                endEntry.set_reactive(true);
            }
        });
        formBox.add_actor(allDayBtn);

        // 4. Location Input
        let locLabel = new St.Label({ text: _("Location (optional):"), style_class: "bri3fing-dialog-label" });
        formBox.add_actor(locLabel);

        let locEntry = new St.Entry({
            hint_text: _("e.g., Office, Google Meet, Coffee Shop"),
            style_class: "run-dialog-entry",
            can_focus: true
        });
        locEntry.set_width(400);
        formBox.add_actor(locEntry);

        dlg.setInitialKeyFocus(titleEntry.clutter_text);

        let submit = () => {
            let summary = titleEntry.get_text().trim();
            if (!summary) return;

            let dateVal = dateEntry.get_text().trim() || todayIso;
            let startVal = startEntry.get_text().trim() || defaultStart;
            let endVal = endEntry.get_text().trim() || defaultEnd;
            let locVal = locEntry.get_text().trim();

            dlg.close();

            if (this.subtitleLabel) {
                this.subtitleLabel.set_text(_("Creating event…"));
            }

            let args = ["add", "--summary", summary, "--date", dateVal];
            if (selectedCalendarUid) {
                args.push("--calendar", selectedCalendarUid);
            }
            if (isAllDay) {
                args.push("--all-day");
            } else {
                args.push("--start", startVal, "--end", endVal);
            }
            if (locVal) {
                args.push("--location", locVal);
            }

            this._executeHelper(args, (success, stdout, stderr) => {
                if (success) {
                    if (this.subtitleLabel) {
                        this.subtitleLabel.set_text(_("Event created!"));
                    }
                    Mainloop.timeout_add(400, () => {
                        this.refresh();
                        return false;
                    });
                } else {
                    let errMsg = stderr || _("Failed to create event");
                    try {
                        let parsed = JSON.parse(stderr);
                        if (parsed && parsed.message) errMsg = parsed.message;
                    } catch (e) {}
                    this._renderError(errMsg);
                }
            });
        };

        titleEntry.clutter_text.connect("activate", submit);

        dlg.setButtons([
            {
                label: _("Cancel"),
                action: () => dlg.close(),
                key: Clutter.KEY_Escape
            },
            {
                label: _("Create Event"),
                action: submit,
                default: true,
                key: Clutter.KEY_Return
            }
        ]);

        dlg.open();
    },

    _openOnlineAccounts: function() {
        try {
            GLib.spawn_command_line_async("cinnamon-settings online-accounts");
        } catch (e) {}
    },

    on_desklet_removed: function() {
        if (this._timeoutId) {
            Mainloop.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
    }
};

function main(metadata, desklet_id) {
    return new Bri3fingDesklet(metadata, desklet_id);
}
