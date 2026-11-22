#!/usr/bin/env bash
# Empaqueta la skill de Claude Desktop en design-system/claude-desktop/rogue-roadmap-design.zip
set -euo pipefail
here="$(cd "$(dirname "$0")/../claude-desktop" && pwd)"
rm -f "$here/rogue-roadmap-design.zip"
(cd "$here" && zip -qr rogue-roadmap-design.zip rogue-roadmap-design)
echo "wrote ${here#"$(cd "$here/../.." && pwd)"/}/rogue-roadmap-design.zip"
