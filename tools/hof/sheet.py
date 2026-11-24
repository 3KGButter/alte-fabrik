import json,sys
from PIL import Image, ImageDraw
names=sys.argv[1:]; Z=8; rows=[]
for n in names:
    im=Image.open(f'out/anims/{n}.png').convert('RGBA'); j=json.load(open(f'out/anims/{n}.json')); fr=j['frames']; fr=fr if isinstance(fr,list) else list(fr.values())
    rows.append((n,[im.crop((f['frame']['x'],f['frame']['y'],f['frame']['x']+f['frame']['w'],f['frame']['y']+f['frame']['h'])) for f in fr]))
W=max(sum(i.width*Z+6 for i in ims)+100 for _,ims in rows); H=sum(max(i.height for i in ims)*Z+8 for _,ims in rows)
can=Image.new('RGBA',(W,H),(150,160,140,255)); d=ImageDraw.Draw(can); y=0
for n,ims in rows:
    d.text((2,y+2),n,fill=(0,0,0,255)); x=100
    for im in ims: can.alpha_composite(im.resize((im.width*Z,im.height*Z),Image.NEAREST),(x,y)); x+=im.width*Z+6
    y+=max(i.height for i in ims)*Z+8
can.save('/tmp/hof_neu.png'); print(can.size)
