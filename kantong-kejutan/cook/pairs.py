import sys
from PIL import Image
r=sys.argv[1]; H=620
def pair(s):
    a=Image.open(f'cook/refs/{s}.png').convert('RGB'); b=Image.open(f'cook/stills/{r}/{s}.png').convert('RGB')
    a=a.resize((int(a.width*H/a.height),H)); b=b.resize((int(b.width*H/b.height),H))
    im=Image.new('RGB',(a.width+b.width+10,H),(139,137,52)); im.paste(a,(0,0)); im.paste(b,(a.width+10,0)); return im
def sheet(names,out):
    ps=[pair(n) for n in names]; W=sum(p.width for p in ps)+20*(len(ps)-1)
    im=Image.new('RGB',(W,H),(60,60,30)); x=0
    for p in ps: im.paste(p,(x,0)); x+=p.width+20
    im.save(out,quality=88)
sheet(['S01','S02','S03'],f'cook/compare/{r}/A.jpg'); sheet(['S04','S05'],f'cook/compare/{r}/B.jpg')
