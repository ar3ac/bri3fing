#!/usr/bin/env bash
set -e

DESKLET_UUID="bri3fing@ar3ac"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$REPO_DIR/dist"

echo "==> Packaging Bri3fing ($DESKLET_UUID)..."

mkdir -p "$DIST_DIR"
ARCHIVE_PATH="$DIST_DIR/$DESKLET_UUID.zip"

rm -f "$ARCHIVE_PATH"

cd "$REPO_DIR/desklet"
zip -r "$ARCHIVE_PATH" "$DESKLET_UUID" -x "*.pyc" "*/__pycache__/*" "*~" "*.swp"

echo "  ✓ Created release bundle: $ARCHIVE_PATH"
echo "==> Package ready for GitHub Releases or Cinnamon Spices!"
