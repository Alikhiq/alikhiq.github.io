@echo off
rem Renders the two 3D hero shots (Blite fitting mirror, Susu gold wordmark) on this PC's graphics card,
rem at full 1080x1920, every frame at 30 fps, then encodes them and pushes them to the claude/susu-high-end branch.
rem Needs: Blender 4.2 or newer, ffmpeg on PATH, git with access to the repo. Run it from anywhere inside the repo.
setlocal enabledelayedexpansion
cd /d "%~dp0"

set BLENDER=
for /d %%D in ("%ProgramFiles%\Blender Foundation\Blender*") do if exist "%%D\blender.exe" set BLENDER=%%D\blender.exe
if "%BLENDER%"=="" for /f "delims=" %%B in ('where blender 2^>nul') do set BLENDER=%%B
if "%BLENDER%"=="" ( echo Blender not found. Install it from blender.org, then run this again. & pause & exit /b 1 )
echo Using %BLENDER%

set GPU=1
set SAMPLES=128
git checkout claude/susu-high-end && git pull --ff-only

"%BLENDER%" -b -P blender\blite_hero.py -- pc-renders\blite 1 150 100 %SAMPLES% 1 || goto :fail
"%BLENDER%" -b -P blender\susu_lux.py   -- pc-renders\susu  1 150 100 %SAMPLES% 1 || goto :fail

ffmpeg -v error -y -framerate 30 -i pc-renders\blite\%%05d.jpg -c:v libx264 -crf 12 -preset slow -pix_fmt yuv420p pc-renders\blite-hero.mp4 || goto :fail
ffmpeg -v error -y -framerate 30 -i pc-renders\susu\%%05d.jpg  -c:v libx264 -crf 12 -preset slow -pix_fmt yuv420p pc-renders\susu-hero.mp4  || goto :fail

git add -f pc-renders\blite-hero.mp4 pc-renders\susu-hero.mp4
git commit -m "GPU hero renders from the PC (30 fps, %SAMPLES% samples)"
git push origin claude/susu-high-end || goto :fail
echo.
echo Done. Tell Claude "PC renders pushed" and it will finish both videos.
pause
exit /b 0

:fail
echo Something failed above. Copy the last lines to Claude.
pause
exit /b 1
