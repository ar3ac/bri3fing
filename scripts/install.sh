#!/usr/bin/env bash
set -e

DESKLET_UUID="bri3fing@ar3ac"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$HOME/.local/share/cinnamon/desklets/$DESKLET_UUID"

echo "==> Installing Bri3fing ($DESKLET_UUID)..."

# Ensure target directories exist
mkdir -p "$HOME/.local/share/cinnamon/desklets"
mkdir -p "$HOME/.local/share/locale/it/LC_MESSAGES"
mkdir -p "$HOME/.local/share/locale/en/LC_MESSAGES"

# Make helper script executable
chmod +x "$REPO_DIR/desklet/$DESKLET_UUID/eds_helper.py"

# Create symlink
ln -snf "$REPO_DIR/desklet/$DESKLET_UUID" "$TARGET_DIR"
echo "  ✓ Symlinked desklet bundle to $TARGET_DIR"

# Compile localization catalogs
if command -v msgfmt >/dev/null 2>&1; then
    msgfmt "$REPO_DIR/desklet/$DESKLET_UUID/po/it.po" -o "$HOME/.local/share/locale/it/LC_MESSAGES/$DESKLET_UUID.mo"
    msgfmt "$REPO_DIR/desklet/$DESKLET_UUID/po/en.po" -o "$HOME/.local/share/locale/en/LC_MESSAGES/$DESKLET_UUID.mo"
    echo "  ✓ Compiled and installed translation catalogs (en, it)"
else
    echo "  ! Warning: msgfmt not found, skipping translation compilation."
fi

echo "==> Installation complete!"
echo "    Add Bri3fing to your desktop from: System Settings -> Desklets"
