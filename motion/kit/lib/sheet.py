import sys,glob
from PIL import Image
d,out=sys.argv[1],sys.argv[2]; cols=int(sys.argv[3]) if len(sys.argv)>3 else 6
fs=sorted(glob.glob(d+'/*.jpg'));w=270;h=480
s=Image.new('RGB',(cols*w,((len(fs)+cols-1)//cols)*h))
for i,f in enumerate(fs):
  im=Image.open(f).resize((w,h));s.paste(im,((i%cols)*w,(i//cols)*h))
s.save(out,quality=88)
