#!/usr/bin/env bash
set -e

DESKLET_UUID="bri3fing@ar3ac"
TARGET_DIR="$HOME/.local/share/cinnamon/desklets/$DESKLET_UUID"

echo "==> Uninstalling Bri3fing ($DESKLET_UUID)..."

if [ -L "$TARGET_DIR" ] || [ -d "$TARGET_DIR" ]; then
    rm -rf "$TARGET_DIR"
    echo "  ✓ Removed desklet bundle from $TARGET_DIR"
fi

rm -f "$HOME/.local/share/locale/it/LC_MESSAGES/$DESKLET_UUID.mo"
rm -f "$HOME/.local/share/locale/en/LC_MESSAGES/$DESKLET_UUID.mo"
echo "  ✓ Removed translation catalogs"

echo "==> Uninstallation complete!"
