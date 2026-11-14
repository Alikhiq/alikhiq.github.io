#!/bin/sh
# Compile the blob rasteriser used by fit.py / export.py.
cd "$(dirname "$0")" && g++ -O3 -march=native -ffast-math -fopenmp -shared -fPIC splat.cpp -o libsplat.so && echo "built tools/libsplat.so"
