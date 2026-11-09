#!/bin/bash
# encode.sh <framedir> <name>
set -e
A=${WORK:-$(cd "$(dirname "$0")/.." && pwd)/work}; O=$A/out; mkdir -p $O
ffmpeg -v error -y -framerate 30 -i $1/%05d.jpg -c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow -movflags +faststart $O/$2.mp4
ffmpeg -v error -y -i $O/$2.mp4 -filter_complex "[0:v]split[a][b];[a]crop=1080:1080:0:420,gblur=sigma=40,eq=brightness=-0.06:saturation=0.9[bg];[b]scale=608:1080[fg];[bg][fg]overlay=236:0,format=yuv420p" -c:v libx264 -crf 18 -preset slow -movflags +faststart $O/$2-square.mp4
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $O/$2.mp4)
mkdir -p $A/look/sheet_$2; rm -f $A/look/sheet_$2/*
for i in 0 1 2 3 4 5; do t=$(python3 -c "print(round($D*($i+0.5)/6,2))"); ffmpeg -v error -y -ss $t -i $O/$2.mp4 -frames:v 1 -vf scale=360:640 $A/look/sheet_$2/$i.png; done
ffmpeg -v error -y -i $A/look/sheet_$2/%d.png -vf tile=6x1:padding=8:color=0x19121b -frames:v 1 -q:v 3 $O/$2-sheet.jpg 2>/dev/null || ffmpeg -v error -y -start_number 0 -i $A/look/sheet_$2/%d.png -vf tile=6x1:padding=8:color=0x19121b -frames:v 1 -q:v 3 $O/$2-sheet.jpg
ffprobe -v error -select_streams v -show_entries stream=width,height,r_frame_rate,nb_frames,pix_fmt:format=duration,size -of compact $O/$2.mp4; ffprobe -v error -select_streams v -show_entries stream=width,height:format=duration,size -of compact $O/$2-square.mp4
