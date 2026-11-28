import subprocess as sp, os
K="/home/user/alikhiq.github.io/motion/kit/snd/"; os.makedirs("final",exist_ok=True)
def run(a): sp.run(["ffmpeg","-v","error","-y",*a],check=True)
def audio(events,D):
    ins=[];fl=[]
    for i,(s,t,v) in enumerate(events):
        ins+=["-i",K+s+".mp3"];ms=int(t*1000);fl.append(f"[{{}}:a]volume={v},adelay={ms}|{ms},apad[a{i}]".replace("{}",str(i)))
    return ins,fl
ENC=["-c:v","libx264","-preset","slow","-crf","17","-pix_fmt","yuv420p","-r","30","-c:a","aac","-b:a","192k","-movflags","+faststart"]
# ---- 4:5 carousel video slides ----
S=[("me","hero","me_hero",""),("me","talk","me_night",""),("ew","hero","ew_hero",""),("ew","social","ew_phone",""),("rc","hero","rc_hero",""),("rc","wanted","rc_aerial",",eq=brightness=-0.20:saturation=1.15")]
for id,sl,clip,fx in S:
    D=5.0
    ev=[("whoosh",0.05,0.7),("impact",0.35,0.8),("shimmer",0.6,0.45),("riser",3.0,0.35)]
    ains,afl=audio(ev,D); n0=2 if sl!="social" else 4
    if sl=="social":
        vin=["-loop","1","-i",f"overlays/{id}_social_base.png","-i",f"clips/{clip}.mp4","-i","overlays/mask_social.png","-loop","1","-i",f"overlays/{id}_social.png"]
        v=(f"[1:v]trim=0:{D},setpts=PTS-STARTPTS,fps=30,scale=-2:1090,crop=690:1090,format=rgba[c];[2:v]format=gray,loop=-1:1[m];[c][m]alphamerge[cm];"
           f"[0:v]trim=0:{D},format=rgba[bg];[bg][cm]overlay=195:130:shortest=1[x];[3:v]trim=0:{D},format=rgba,fade=t=in:st=0.2:d=0.4:alpha=1[o];[x][o]overlay=0:0,format=yuv420p[v]")
    else:
        vin=["-i",f"clips/{clip}.mp4","-loop","1","-i",f"overlays/{id}_{sl}.png"]
        v=(f"[0:v]trim=0:{D},setpts=PTS-STARTPTS,fps=30,scale=1088:1350,crop=1080:1350{fx}[c];[1:v]trim=0:{D},format=rgba,fade=t=in:st=0.3:d=0.5:alpha=1[o];[c][o]overlay=0:0,format=yuv420p[v]")
    afl=[f.replace(f"[{i}:a]",f"[{i+n0}:a]",1) for i,f in enumerate(afl)]
    am="".join(f"[a{i}]" for i in range(len(ev)))+f"amix=inputs={len(ev)}:normalize=0,atrim=0:{D},afade=t=out:st={D-0.5}:d=0.5[a]"
    name={"me":"ali","rc":"roundcity","ew":"everywrap"}[id]
    run([*vin,*ains,"-filter_complex",v+";"+";".join(afl)+";"+am,"-map","[v]","-map","[a]","-t",str(D),*ENC,f"final/{name}-video-{sl}-4x5.mp4"])
    print("slide",name,sl)
# ---- 9:16 trailer reel ----
SEG=[("rc_aerial",0.0,2.4,"title",-0.38),("ew_hero",0.3,3.0,"lt_ew",0),("ew_phone",0.6,2.4,"lt_ew2",0),("rc_aerial",2.4,2.4,"lt_rc",0),
     ("rc_hero",1.5,3.0,"lt_rc2",0),("me_night",0.6,3.0,"lt_me2",0),("me_hero",1.0,4.0,"lt_me",0),("me_hero",3.6,2.8,"end",-0.42)]
parts=[]
for i,(clip,ss,d,card,dark) in enumerate(SEG):
    out=f"final/_seg{i}.mp4"; avail=5.0-ss; pad=max(0,d-avail+0.05)
    fx=(f",eq=brightness={dark}:saturation=0.9" if dark else "")
    f=(f"[0:v]trim={ss}:{min(5.0,ss+d)},setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration={pad:.2f},scale=1080:1341{fx}[c];"
       f"color=c=black:s=1080x1920:d={d}:r=30[bg];[bg][c]overlay=0:290[x];"
       f"[1:v]trim=0:{d},format=rgba,fade=t=in:st=0.15:d=0.35:alpha=1,fade=t=out:st={d-0.35}:d=0.3:alpha=1[o];[x][o]overlay=0:0,format=yuv420p[v]")
    run(["-i",f"clips/{clip}.mp4","-loop","1","-i",f"overlays/{card}.png","-filter_complex",f,"-map","[v]","-t",str(d),"-an","-c:v","libx264","-preset","slow","-crf","17","-pix_fmt","yuv420p","-r","30",out])
    parts.append(out)
open("final/_list.txt","w").write("".join(f"file '{os.path.basename(p)}'\n" for p in parts))
run(["-f","concat","-safe","0","-i","final/_list.txt","-c","copy","final/_reel_v.mp4"])
cuts=[];t=0
for s in SEG: cuts.append(t); t+=s[2]
D=t
ev=[("riser",cuts[1]-1.05,0.6)]+[("impact",c,0.85) for c in cuts[1:]]+[("whoosh",c-0.25,0.5) for c in cuts[1:]]+[("riser",cuts[6]-1.0,0.5),("shimmer",cuts[7]+0.1,0.6),("pop",cuts[7]+0.5,0.5)]
ains,afl=audio(ev,D)
afl=[f.replace(f"[{i}:a]",f"[{i+1}:a]",1) for i,f in enumerate(afl)]
am="".join(f"[a{i}]" for i in range(len(ev)))+f"amix=inputs={len(ev)}:normalize=0,atrim=0:{D},afade=t=out:st={D-0.6}:d=0.6[a]"
run(["-i","final/_reel_v.mp4",*ains,"-filter_complex",";".join(afl)+";"+am,"-map","0:v","-map","[a]","-c:v","copy","-c:a","aac","-b:a","192k","-movflags","+faststart","final/npc-trailer-reel-9x16.mp4"])
for p in parts+["final/_reel_v.mp4","final/_list.txt"]: os.remove(p)
print("reel",D)
