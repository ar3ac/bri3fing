"""Static validation tests for Cinnamon desklet metadata, schema, JS, and i18n."""

import json
import os
import pathlib
import re
import shutil
import subprocess
import unittest

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
DESKLET_DIR = REPO_ROOT / "desklet" / "bri3fing@ar3ac"
PO_DIR = DESKLET_DIR / "po"


def _unescape_po(text):
    return text.replace('\\"', '"').replace("\\n", "\n").replace("\\\\", "\\")


def _parse_po(path):
    entries = {}
    cur_id, cur_str, mode = None, None, None

    def flush():
        nonlocal cur_id, cur_str
        if cur_id is not None and cur_id != "":
            entries[cur_id] = cur_str or ""
        cur_id, cur_str = None, None

    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s:
            flush()
            mode = None
            continue
        if s.startswith("#"):
            continue
        if s.startswith("msgid "):
            flush()
            m = re.match(r'msgid\s+"((?:[^"\\]|\\.)*)"$', s)
            cur_id = _unescape_po(m.group(1)) if m else ""
            cur_str = ""
            mode = "id"
        elif s.startswith("msgstr "):
            m = re.match(r'msgstr\s+"((?:[^"\\]|\\.)*)"$', s)
            cur_str = _unescape_po(m.group(1)) if m else ""
            mode = "str"
        elif s.startswith('"') and s.endswith('"'):
            val = _unescape_po(s[1:-1])
            if mode == "id" and cur_id is not None:
                cur_id += val
            elif mode == "str" and cur_str is not None:
                cur_str += val
    flush()
    return entries


class TestDeskletAssets(unittest.TestCase):
    def test_metadata_json(self):
        meta = json.loads((DESKLET_DIR / "metadata.json").read_text(encoding="utf-8"))
        for field in ("uuid", "name", "description", "version", "author"):
            self.assertIn(field, meta)
            self.assertTrue(str(meta[field]).strip())
        self.assertEqual(meta["uuid"], "bri3fing@ar3ac")

    def test_settings_schema_no_orphans(self):
        schema = json.loads((DESKLET_DIR / "settings-schema.json").read_text(encoding="utf-8"))
        layout = schema["layout"]
        referenced_keys = set()
        for section in layout.values():
            if isinstance(section, dict) and section.get("type") == "section":
                referenced_keys.update(section.get("keys", []))

        defined_keys = {k for k in schema.keys() if k != "layout"}
        self.assertEqual(
            defined_keys,
            referenced_keys,
            f"Orphaned or missing keys in settings-schema.json: "
            f"unreferenced={defined_keys - referenced_keys}, missing={referenced_keys - defined_keys}",
        )

    def test_helper_is_executable(self):
        helper_path = DESKLET_DIR / "eds_helper.py"
        self.assertTrue(os.access(helper_path, os.X_OK), "eds_helper.py must be executable (+x)")

    def test_desklet_js_syntax_and_spices_safe_patterns(self):
        js_path = DESKLET_DIR / "desklet.js"
        js_text = js_path.read_text(encoding="utf-8")

        # Forbidden Cinnamon Spices scanner patterns
        forbidden = [
            "Gtk.PolicyType",
            "GLib.file_test",
            "spawnCommandLine",
            "spawn_command_line_async",
            "/.local/share",
        ]
        for pattern in forbidden:
            self.assertNotIn(pattern, js_text, f"Forbidden Spices pattern found in desklet.js: {pattern}")

        if shutil.which("gjs"):
            proc = subprocess.run(
                [
                    "gjs",
                    "-c",
                    f'const f = imports.gi.GLib.file_get_contents({str(js_path)!r})[1]; '
                    'new Function(imports.byteArray.toString(f));',
                ],
                capture_output=True,
                text=True,
            )
            self.assertEqual(proc.returncode, 0, f"GJS syntax check failed:\n{proc.stderr}")

    def test_i18n_complete_and_valid(self):
        js_text = (DESKLET_DIR / "desklet.js").read_text(encoding="utf-8")
        js_keys = {_unescape_po(k) for k in re.findall(r'_\("((?:[^"\\]|\\.)*)"\)', js_text)}

        schema = json.loads((DESKLET_DIR / "settings-schema.json").read_text(encoding="utf-8"))
        schema_keys = set()
        for k, v in schema.items():
            if not isinstance(v, dict):
                continue
            if k == "layout":
                for sv in v.values():
                    if isinstance(sv, dict) and "title" in sv:
                        schema_keys.add(sv["title"])
            else:
                for field in ("description", "tooltip", "units"):
                    if field in v and isinstance(v[field], str) and v[field].strip():
                        schema_keys.add(v[field])

        meta = json.loads((DESKLET_DIR / "metadata.json").read_text(encoding="utf-8"))
        meta_keys = {meta["name"], meta["description"]}
        expected_keys = js_keys | schema_keys | meta_keys

        for fname in ("bri3fing@ar3ac.pot", "en.po", "it.po"):
            po_path = PO_DIR / fname
            entries = _parse_po(po_path)
            missing = sorted(expected_keys - set(entries.keys()))
            self.assertEqual(missing, [], f"Missing strings in {fname}: {missing}")
            if fname != "bri3fing@ar3ac.pot":
                untranslated = sorted([k for k, v in entries.items() if not v])
                self.assertEqual(untranslated, [], f"Untranslated strings in {fname}: {untranslated}")

            if shutil.which("msgfmt"):
                proc = subprocess.run(
                    ["msgfmt", "--check", "-o", os.devnull, str(po_path)],
                    capture_output=True,
                    text=True,
                )
                self.assertEqual(proc.returncode, 0, f"msgfmt --check failed on {fname}:\n{proc.stderr}")


if __name__ == "__main__":
    unittest.main()
