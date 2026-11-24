import json,base64,io
from PIL import Image, ImageDraw
d=json.load(open('/tmp/hof_ist.json'))
L=lambda s: Image.open(io.BytesIO(base64.b64decode(s.split(',')[1]))).convert('RGBA')
OUTC=(36,24,42)
def soft(im):   # Umriss wie im Spiel (buildSprite): Nachbarfarben gemittelt, 65 % Richtung Pflaumenton
    W,H=im.width+2,im.height+2; o=Image.new('RGBA',(W,H),(0,0,0,0)); o.paste(im,(1,1)); p=o.load(); out=o.copy(); q=out.load()
    for y in range(H):
        for x in range(W):
            if p[x,y][3]: continue
            ns=[p[x+dx,y+dy] for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)) if 0<=x+dx<W and 0<=y+dy<H and p[x+dx,y+dy][3]]
            if ns: a=[sum(n[i] for n in ns)/len(ns) for i in range(3)]; q[x,y]=tuple(int(a[i]+(OUTC[i]-a[i])*.65) for i in range(3))+(255,)
    return out
def strip(n, sprite=False):
    if sprite: return [Image.open(f'out/sprites/{n}.png').convert('RGBA')]
    im=Image.open(f'out/anims/{n}.png').convert('RGBA'); j=json.load(open(f'out/anims/{n}.json')); fr=j['frames']; fr=fr if isinstance(fr,list) else list(fr.values())
    return [soft(im.crop((f['frame']['x'],f['frame']['y'],f['frame']['x']+f['frame']['w'],f['frame']['y']+f['frame']['h']))) for f in fr]
def oldowl(fly, ph=0, blink=False):
    im=Image.new('RGBA',(17,12),(0,0,0,0)); dr=ImageDraw.Draw(im); ox,oy=8,3
    R=lambda x,y,w,h,c: dr.rectangle([x,y,x+w-1,y+h-1],fill=c)
    R(ox-2,oy,5,6,'#5c3a2e'); R(ox-1,oy+3,3,3,'#a5703f'); R(ox,oy+2,1,1,'#e8a83a')
    if fly:
        dy=[-2,0,2,0][ph]
        for sd in (-1,1):
            for i in range(5):
                wx=ox-3-i if sd<0 else ox+3+i; wy=oy+2+round(dy*(i+1)/5); R(wx,wy,1,2 if i<3 else 1,'#5c3a2e' if i==4 else '#7f5236')
    else:
        R(ox-2,oy-1,1,1,'#5c3a2e'); R(ox+2,oy-1,1,1,'#5c3a2e'); R(ox-1,oy+6,1,1,'#e8a83a'); R(ox+1,oy+6,1,1,'#e8a83a')
    if not blink: R(ox-1,oy+1,1,1,'#c8902e'); R(ox+1,oy+1,1,1,'#c8902e')
    return soft(im.crop(im.getbbox()))
v0=d['v0']
cells=[('alt: Gehen',[L(x) for x in v0['walk']],100),('neu: Gehen',strip('hof_gehen'),100),
 ('alt: Tragen',[L(x) for x in v0['carry']],100),('neu: Tragen',strip('hof_tragen'),100),
 ('alt: Stehen',[L(x) for x in v0['idle']],400),('neu: Stehen',strip('hof_stehen'),250),
 ('alt: vorn/hinten',[L(x) for x in v0['vorn'][:4]+v0['hinten'][:4]],170),('neu: vorn/hinten',strip('hof_vorn')+strip('hof_hinten'),170),
 ('alt: Eule',[oldowl(False)]*10+[oldowl(False,blink=True)],330),('neu: Eule',strip('eule_sitzt'),330),
 ('alt: Eule fliegt',[oldowl(True,p) for p in range(4)],140),('neu: Eule fliegt',strip('eule_fliegt'),100)]
Z=6; CW,CH=19*Z,18*Z; cols=4; rows=3; BG=(118,140,96,255)
frames=[]
for t in range(0,4000,50):
    can=Image.new('RGBA',(cols*CW*2,rows*(CH+16)),BG); dr=ImageDraw.Draw(can)
    for i,(lab,ims,du) in enumerate(cells):
        cx=(i%(cols*2))*CW; cy=(i//(cols*2))*(CH+16); im=ims[(t//du)%len(ims)]
        dr.text((cx+4,cy+2),lab,fill=(15,20,10,255)); big=im.resize((im.width*Z,im.height*Z),Image.NEAREST); can.alpha_composite(big,(cx+(CW-big.width)//2,cy+16+CH-big.height-4))
    frames.append(can.convert('RGB'))
frames[0].save('/mnt/user-data/outputs/hof_figuren_probe.gif',save_all=True,append_images=frames[1:],duration=50,loop=0)
frames[13].save('/tmp/hg.png')
