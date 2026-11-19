#!/usr/bin/env bash
# Extracts the background thumbnails for the browser panel from public/media (needs ffmpeg).
# Usage: bash scripts/make-posters.sh
set -euo pipefail
cd "$(dirname "$0")/../public"
mkdir -p thumbs
# video id : timestamp of a representative frame
for item in v28687:3 v4231:3 v4109:3 v35644:1.5 v35327:3 v1968:8 v18142:3 v47558:0.6; do
  id=${item%%:*}; t=${item##*:}
  ffmpeg -loglevel error -y -ss "$t" -i "media/$id.mp4" -frames:v 1 \
    -vf "scale=480:270:force_original_aspect_ratio=increase,crop=480:270" -c:v libwebp -q:v 72 "thumbs/env-$id.webp"
done
# 360° image : id (a window cut from the middle of the panorama)
for item in shanghai_bund:h_shanghai rooftop_night:h_rooftop neuer_zollhof:h_zollhof metro_noord:h_metro moonless_golf:h_stars; do
  f=${item%%:*}; id=${item##*:}
  ffmpeg -loglevel error -y -i "media/$f.jpg" -frames:v 1 -vf "crop=1100:619:986:420,scale=480:270" -c:v libwebp -q:v 74 "thumbs/env-$id.webp"
done
