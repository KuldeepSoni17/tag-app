#!/usr/bin/env bash
# Build Expo web and copy into cooltoolsbykul.com/public/tag-app-play
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"
SITE="$ROOT/../cooltoolsbykul.com/public/tag-app-play"

cd "$MOBILE"
npx expo export --platform web

DIST="$MOBILE/dist"
JS=$(ls "$DIST"/_expo/static/js/web/*.js)

# Subpath hosting: base tag + relative script/assets
perl -pi -e 's|<head>|<head>\n    <base href="/tag-app-play/" />|' "$DIST/index.html"
sed -i '' 's|src="/_expo/|src="./_expo/|g' "$DIST/index.html" 2>/dev/null || sed -i 's|src="/_expo/|src="./_expo/|g' "$DIST/index.html"
sed -i '' 's|href="/favicon|href="./favicon|g' "$DIST/index.html" 2>/dev/null || sed -i 's|href="/favicon|href="./favicon|g' "$DIST/index.html"
sed -i '' 's|"/assets/|"./assets/|g' "$JS" 2>/dev/null || sed -i 's|"/assets/|"./assets/|g' "$JS"

rm -rf "$SITE"
mkdir -p "$SITE"
cp -R "$DIST/"* "$SITE/"
echo "Synced to $SITE"
