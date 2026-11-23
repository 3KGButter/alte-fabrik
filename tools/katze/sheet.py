import sys
from PIL import Image
names=sys.argv[2:]; sz=sys.argv[1]; Z=6 if sz=='gross' else 8
rows=[]
for n in names:
    im=Image.open(f'out/anims/{n}_{sz}.png').convert('RGBA'); rows.append(im)
W=max(r.width for r in rows); H=sum(r.height+3 for r in rows)
o=Image.new('RGBA',(W,H),(170,175,165,255)); y=0
for r in rows: o.alpha_composite(r,(0,y)); y+=r.height+3
o=o.resize((W*Z,H*Z),Image.NEAREST); o.save(f'/tmp/k_{sz}.png')
