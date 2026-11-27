"""Automated unit and worldwide timezone tests for eds_helper.py."""

import datetime
import os
import pathlib
import subprocess
import sys
import unittest

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
DESKLET_DIR = REPO_ROOT / "desklet" / "bri3fing@ar3ac"
sys.path.insert(0, str(DESKLET_DIR))

import eds_helper  # noqa: E402
from gi.repository import ICalGLib  # noqa: E402


WORLDWIDE_TIMEZONES = [
    "Pacific/Honolulu",      # UTC-10 (no DST)
    "America/Los_Angeles",   # UTC-8 / -7 (US DST)
    "America/New_York",      # UTC-5 / -4 (US DST)
    "America/St_Johns",      # UTC-3:30 / -2:30 (half-hour + DST)
    "America/Santiago",      # UTC-4 / -3 (Southern Hemisphere midnight DST)
    "UTC",                   # UTC+0
    "Europe/London",         # UTC+0 / +1 (UK BST)
    "Europe/Rome",           # UTC+1 / +2 (EU CET/CEST)
    "Europe/Kyiv",           # UTC+2 / +3 (modern IANA rename)
    "Asia/Kolkata",          # UTC+5:30 (half-hour, no DST)
    "Asia/Kathmandu",        # UTC+5:45 (45-min offset, no DST)
    "Asia/Tokyo",            # UTC+9 (no DST)
    "Australia/Sydney",      # UTC+10 / +11 (Southern Hemisphere DST)
    "Pacific/Chatham",       # UTC+12:45 / +13:45 (45-min + Southern DST)
    "Pacific/Kiritimati",    # UTC+14 (extreme positive offset)
    "EST5EDT",               # Custom POSIX TZ string (non-IANA)
]


class TestValidationHelpers(unittest.TestCase):
    def test_validate_hex_color(self):
        self.assertEqual(eds_helper.validate_hex_color("#fff"), "#fff")
        self.assertEqual(eds_helper.validate_hex_color("#4285F4"), "#4285F4")
        self.assertEqual(eds_helper.validate_hex_color(" #10b98180 "), "#10b98180")
        self.assertEqual(eds_helper.validate_hex_color("#12345"), "#4285F4")
        self.assertEqual(eds_helper.validate_hex_color("#fff; background: red"), "#4285F4")
        self.assertEqual(eds_helper.validate_hex_color("red"), "#4285F4")
        self.assertEqual(eds_helper.validate_hex_color(None), "#4285F4")

    def test_parse_hhmm_valid(self):
        self.assertEqual(eds_helper._parse_hhmm("00:00"), (0, 0))
        self.assertEqual(eds_helper._parse_hhmm("9:05"), (9, 5))
        self.assertEqual(eds_helper._parse_hhmm("23:59"), (23, 59))
        self.assertEqual(eds_helper._parse_hhmm("16"), (16, 0))

    def test_parse_hhmm_invalid(self):
        for bad in ["24:00", "25:99", "12:60", "abc", "12:xx", "12:30:00", "-1:00"]:
            with self.assertRaises(ValueError, msg=f"Should reject {bad!r}"):
                eds_helper._parse_hhmm(bad)

    def test_apply_event_times_rejects_bad_inputs(self):
        comp = ICalGLib.Component.new(ICalGLib.ComponentKind.VEVENT_COMPONENT)
        with self.assertRaises(ValueError):
            eds_helper._apply_event_times_and_dates(comp, date_str="2026-02-31", all_day=True)
        with self.assertRaises(ValueError):
            eds_helper._apply_event_times_and_dates(comp, date_str="not-a-date", all_day=False)
        with self.assertRaises(ValueError):
            eds_helper._apply_event_times_and_dates(comp, date_str="2026-12-04", start_time_str="25:00", end_time_str="26:00")

    def test_apply_event_times_all_day_and_preserve_zone(self):
        comp = ICalGLib.Component.new(ICalGLib.ComponentKind.VEVENT_COMPONENT)
        eds_helper._apply_event_times_and_dates(comp, date_str="2026-12-04", all_day=True)
        self.assertTrue(comp.get_dtstart().is_date())
        self.assertEqual(comp.get_dtstart().as_ical_string(), "20261204")
        self.assertEqual(comp.get_dtend().as_ical_string(), "20261205")

        rome_tz = ICalGLib.Timezone.get_builtin_timezone("Europe/Rome")
        comp2 = ICalGLib.Component.new(ICalGLib.ComponentKind.VEVENT_COMPONENT)
        eds_helper._apply_event_times_and_dates(
            comp2, date_str="2026-12-04", start_time_str="16:00", end_time_str="17:00",
            all_day=False, preserve_zone=rome_tz
        )
        self.assertFalse(comp2.get_dtstart().is_utc())
        self.assertIn("Europe/Rome", comp2.as_ical_string())


class TestWorldwideTimezones(unittest.TestCase):
    def test_global_timezone_matrix(self):
        probe_script = f"""
import sys, datetime, zoneinfo
sys.path.insert(0, {str(DESKLET_DIR)!r})
import eds_helper
from gi.repository import ICalGLib

local_tz = eds_helper.get_local_ical_timezone()

# 1. Round-trip create -> read in winter, summer, and midnight crossover
for d_str, s_str, e_str in [
    ("2026-12-04", "16:00", "17:00"),
    ("2026-07-04", "16:00", "17:30"),
    ("2026-01-15", "00:15", "01:00"),
    ("2026-07-15", "23:30", "00:30"),
]:
    comp = ICalGLib.Component.new(ICalGLib.ComponentKind.VEVENT_COMPONENT)
    eds_helper._apply_event_times_and_dates(comp, d_str, s_str, e_str, all_day=False)
    ts_s = eds_helper.ical_time_to_timestamp(comp.get_dtstart(), local_tz)
    ts_e = eds_helper.ical_time_to_timestamp(comp.get_dtend(), local_tz)
    dt_s = datetime.datetime.fromtimestamp(ts_s)
    dt_e = datetime.datetime.fromtimestamp(ts_e)
    assert dt_s.date().isoformat() == d_str, f"date mismatch: {{dt_s}} vs {{d_str}}"
    assert dt_s.strftime("%H:%M") == s_str, f"start mismatch: {{dt_s}} vs {{s_str}}"
    assert dt_e.strftime("%H:%M") == e_str, f"end mismatch: {{dt_e}} vs {{e_str}}"

# 2. Foreign TZIDs (attached and unattached fallback) compared against zoneinfo
for src_tz_name, ical_dt, y, mo, d, h, mi in [
    ("Europe/Rome",      "20261204T160000", 2026, 12, 4, 16, 0),
    ("Europe/Rome",      "20260704T160000", 2026,  7, 4, 16, 0),
    ("America/New_York", "20261204T100000", 2026, 12, 4, 10, 0),
    ("America/New_York", "20260704T100000", 2026,  7, 4, 10, 0),
    ("Asia/Kolkata",     "20261204T203000", 2026, 12, 4, 20, 30),
    ("Asia/Kathmandu",   "20261204T204500", 2026, 12, 4, 20, 45),
    ("Australia/Sydney", "20261204T180000", 2026, 12, 4, 18, 0),
    ("Australia/Sydney", "20260704T180000", 2026,  7, 4, 18, 0),
    ("Pacific/Chatham",  "20261204T124500", 2026, 12, 4, 12, 45),
]:
    expected_ts = int(datetime.datetime(y, mo, d, h, mi, tzinfo=zoneinfo.ZoneInfo(src_tz_name)).timestamp())
    t = ICalGLib.Time.new_from_string(ical_dt)
    t.set_timezone(ICalGLib.Timezone.get_builtin_timezone(src_tz_name))
    assert eds_helper.ical_time_to_timestamp(t, local_tz) == expected_ts

    t_unattached = ICalGLib.Time.new_from_string(ical_dt)
    assert eds_helper.ical_time_to_timestamp(t_unattached, local_tz, fallback_tzid=src_tz_name) == expected_ts

# 3. Floating times map to exact local wall-clock time
for ical_dt, y, mo, d, h, mi in [
    ("20261204T160000", 2026, 12, 4, 16, 0),
    ("20260704T160000", 2026,  7, 4, 16, 0),
]:
    t_float = ICalGLib.Time.new_from_string(ical_dt)
    dt_f = datetime.datetime.fromtimestamp(eds_helper.ical_time_to_timestamp(t_float, local_tz))
    assert dt_f == datetime.datetime(y, mo, d, h, mi)

# 4. UTC Z timestamp
t_utc = ICalGLib.Time.new_from_string("20261204T150000Z")
expected_utc = int(datetime.datetime(2026, 12, 4, 15, 0, tzinfo=datetime.timezone.utc).timestamp())
assert eds_helper.ical_time_to_timestamp(t_utc, local_tz) == expected_utc

print("OK")
"""
        for tz_name in WORLDWIDE_TIMEZONES:
            with self.subTest(tz=tz_name):
                env = dict(os.environ, TZ=tz_name)
                proc = subprocess.run(
                    [sys.executable, "-c", probe_script],
                    env=env,
                    capture_output=True,
                    text=True,
                )
                self.assertEqual(proc.returncode, 0, f"TZ={tz_name} failed:\n{proc.stderr}")
                self.assertEqual(proc.stdout.strip(), "OK")


if __name__ == "__main__":
    unittest.main()
