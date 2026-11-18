import subprocess as sp, os
K="/home/user/alikhiq.github.io/motion/kit/snd/"
def mix(events, D, out):
    ins=[];fl=[]
    for i,(snd,t,vol) in enumerate(events):
        ins+=["-i",K+snd+".mp3"]; ms=int(t*1000)
        fl.append(f"[{i}:a]volume={vol},adelay={ms}|{ms},apad[a{i}]")
    fl.append("".join(f"[a{i}]" for i in range(len(events)))+f"amix=inputs={len(events)}:normalize=0,atrim=0:{D},afade=t=out:st={D-0.4}:d=0.4[out]")
    sp.run(["ffmpeg","-v","error","-y",*ins,"-filter_complex",";".join(fl),"-map","[out]","-ac","2","-ar","48000",out],check=True)
os.makedirs("out/clips",exist_ok=True)
for id in ["me","rc","ew"]:
    D=6.5
    ev=[("whoosh",0.2,0.8),("glitch",0.35,0.5)]+[("pop",1.6+i*0.28+0.08,0.7) for i in range(5)]+[("riser",D-2.35,0.7),("impact",D-1.22,1.0),("shimmer",D-1.1,0.6)]
    mix(ev,D,f"frames/{id}_hero.wav")
    D2=2.6
    mix([("shimmer",0.0,0.5)]+[("pop",0.45+i*0.3,0.7) for i in range(5)],D2,f"frames/{id}_wanted.wav")
    for s,dur in [("hero",6.5),("wanted",2.6)]:
        out=f"out/clips/{id}-{s}-4x5.mp4"
        sp.run(["ffmpeg","-v","error","-y","-framerate","30","-i",f"frames/{id}_{s}/%04d.jpg","-i",f"frames/{id}_{s}.wav",
          "-c:v","libx264","-preset","slow","-crf","17","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-shortest","-movflags","+faststart",out],check=True)
    # GIF: wanted stars loop
    sp.run(["ffmpeg","-v","error","-y","-framerate","30","-i",f"frames/{id}_wanted/%04d.jpg","-vf",
      "fps=15,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192[p];[b][p]paletteuse=dither=sierra2_4a","-loop","0",f"out/clips/{id}-wanted.gif"],check=True)
    print(id,"done")
# 9:16 reel: ew, rc, me
parts=[f"out/clips/{i}-hero-4x5.mp4" for i in ["ew","rc","me"]]
ins=sum([["-i",p] for p in parts],[])
fc="".join(f"[{i}:v]split[v{i}a][v{i}b];[v{i}a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:2,eq=brightness=-0.15[bg{i}];[bg{i}][v{i}b]overlay=0:285[o{i}];" for i in range(3))
fc+="".join(f"[o{i}][{i}:a]" for i in range(3))+"concat=n=3:v=1:a=1[v][a]"
sp.run(["ffmpeg","-v","error","-y",*ins,"-filter_complex",fc,"-map","[v]","-map","[a]","-c:v","libx264","-preset","slow","-crf","18","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-movflags","+faststart","out/clips/npc-reel-9x16.mp4"],check=True)
print("reel done")
