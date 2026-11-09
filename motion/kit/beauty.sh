#!/bin/bash
# Re-time and render the "Beauty" video to a beat grid.
#   ./beauty.sh 120 0.5          # BPM, first-beat offset (s)
#   ./beauty.sh song.mp3         # detect BPM + first beat from the owner's audio file (needs librosa), then render
# Needs `node lib/server.js` running and the logo frames in work/frames/logo (node lib/logoshot.js work/frames/logo 0 16).
set -e
cd "$(dirname "$0")"
if [ -f "$1" ]; then read BPM OFF < <(python3 lib/beats.py "$1"); AUDIO="$1"; else BPM=${1:-120}; OFF=${2:-0.5}; fi
echo "BPM=$BPM offset=$OFF"
echo "window.BEATS = { bpm: $BPM, offset: $OFF };" > work/beauty-beats.js
cat work/beauty-beats.js plans/beauty-body.js > work/beauty-plan.js
read A Z DUR < <(python3 -c "b=60/$BPM;o=$OFF;print(round(o+8*b,4),round(o+44*b,4),round(o+52*b,4))")
rm -rf work/beauty/site work/beauty/comp
node lib/sitecap.js work/beauty-plan.js work/beauty/site --from $A --to $Z
node lib/cap.js beauty.html work/beauty/comp 30 0 $DUR
lib/final.sh work/beauty/comp round-city-beauty
python3 lib/beatnotes.py $BPM $OFF > ../out/round-city-beauty-beats.md
if [ -n "$AUDIO" ]; then
  ffmpeg -v error -y -i ../out/round-city-beauty.mp4 -i "$AUDIO" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart ../out/round-city-beauty-with-audio.mp4
fi
