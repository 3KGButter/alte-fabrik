import json,glob
from PIL import Image, ImageDraw
Z=5; BG=(150,152,140,255)
def strip(n,sz):
    im=Image.open(f'out/anims/{n}_{sz}.png').convert('RGBA'); j=json.load(open(f'out/anims/{n}_{sz}.json'))
    fr=j['frames']; fr=fr if isinstance(fr,list) else list(fr.values())
    out=[]
    for f in fr:
        r=f['frame']; out.append((im.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h'])),f['duration']))
    return out
def seq(parts):  # Liste (name, wiederholungen) -> Bilder mit Dauer
    o=[]
    for n,rep,sz in parts:
        s=strip(n,sz); o+= s*rep
    return o
alt=[(Image.open(f'alt/gross_walk_{k}.png').convert('RGBA'),100) for k in range(8)]
cells=[('vorher: Laufen',alt*6),('neu: Laufen',seq([('laufen',6,'gross')])),
 ('Einrollen + Schlafen',seq([('sitzen',2,'gross'),('einrollen',1,'gross'),('schlafen',3,'gross'),('aufstehen',1,'gross')])),
 ('Antippen: Schnurren',seq([('sitzen',1,'gross'),('schnurren',4,'gross'),('blinzeln',1,'gross')])),
 ('Antippen: Strecken',seq([('stehen',2,'gross'),('strecken',1,'gross'),('stehen',3,'gross')])),
 ('Antippen: Ball',seq([('sitzen',2,'gross'),('ball',1,'gross'),('sitzen',3,'gross')]))]
CW,CH=40,36; cols=3; rows=2
T=max(sum(d for _,d in c[1]) for c in cells); step=50
frames=[]
for t in range(0,T,step):
    can=Image.new('RGBA',(CW*cols*Z,(CH*rows)*Z+rows*14),BG); d=ImageDraw.Draw(can)
    for i,(lab,s) in enumerate(cells):
        tot=sum(x for _,x in s); tt=t%tot; acc=0
        for im,du in s:
            if acc+du>tt: break
            acc+=du
        cx=(i%cols)*CW*Z; cy=(i//cols)*(CH*Z+14)
        d.text((cx+6,cy+2),lab,fill=(30,30,40,255))
        big=im.resize((im.width*Z,im.height*Z),Image.NEAREST)
        can.alpha_composite(big,(cx+(CW*Z-big.width)//2, cy+14+CH*Z-big.height-8))
    frames.append(can.convert('RGB'))
frames[0].save('/mnt/user-data/outputs/katze_neu.gif',save_all=True,append_images=frames[1:],duration=step,loop=0)
print(len(frames))
