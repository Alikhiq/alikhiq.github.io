#!/bin/bash
# final.sh <framedir> <name> [w] [h]  -> motion/out/<name>.mp4 (H.264, yuv420p, faststart, 30 fps) + <name>-sheet.jpg (6 frames)
set -e
D=$(cd "$(dirname "$0")/../.." && pwd)/out; mkdir -p "$D"
W=${3:-1080}; H=${4:-1920}
ffmpeg -v error -y -framerate 30 -i "$1/%05d.jpg" -vf "scale=${W}:${H}:flags=lanczos,format=yuv420p" -c:v libx264 -profile:v high -crf 17 -preset slow -r 30 -movflags +faststart "$D/$2.mp4"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$D/$2.mp4")
T=$(mktemp -d); SW=$(( W > H ? 480 : 270 )); SH=$(( W > H ? 270 : 480 ))
for i in 0 1 2 3 4 5; do t=$(python3 -c "print(round($DUR*($i+0.5)/6,2))"); ffmpeg -v error -y -ss $t -i "$D/$2.mp4" -frames:v 1 -vf "scale=$SW:$SH" "$T/$i.png"; done
ffmpeg -v error -y -start_number 0 -i "$T/%d.png" -vf "tile=6x1:padding=8:color=0x19121b" -frames:v 1 -q:v 3 "$D/$2-sheet.jpg"; rm -rf "$T"
ffprobe -v error -select_streams v -show_entries stream=codec_name,profile,width,height,r_frame_rate,nb_frames,pix_fmt:format=duration,size -of compact "$D/$2.mp4"
