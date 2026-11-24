# Macht aus der Innen-Figur v1 (weißer Helm, Türkis-Hemd) eine Frau: Pferdeschwanz unter dem Helm (Seite/hinten), Haarsträhnen vorn.
import re, base64, io, json, sys
from PIL import Image
SRC = '/home/claude/af/game3/js/figpx.js'
s = open(SRC).read()
A = json.loads(re.search(r'const ANIM = (\{.*?\});', s).group(1))
im = Image.open(io.BytesIO(base64.b64decode(re.search(r'"v1": "([^"]+)"', s).group(1)))).convert('RGBA')
CW = 38; n = im.width // CW
VORN = set(A['front'] + A['fidle'] + A['sit'] + A['wave']); HINTEN = set(A['back'] + A['bidle'] + A['work'] + A['hammer'])
H1, H2, Q = (196, 132, 48, 255), (236, 188, 84, 255), (0, 0, 0, 255)
def helm(p, x0):
    pts = [(x, y) for y in range(0, 24) for x in range(x0, x0 + CW) if p[x, y][3] and min(p[x, y][:3]) > 140 and max(p[x, y][:3]) - min(p[x, y][:3]) < 40]
    return pts
out = im.copy(); p = out.load(); src = im.load()
for i in range(n):
    x0 = i * CW; pts = helm(src, x0)
    if not pts: continue
    xs = [a for a, b in pts]; ys = [b for a, b in pts]; mnx, mxx, by = min(xs), max(xs), max(ys)
    neu = []
    if i in HINTEN:
        cx = (mnx + mxx) // 2
        for j, w in enumerate([3, 3, 3, 2, 2, 1]): neu += [(cx - w // 2 + k, by + 1 + j, H2 if k == 0 and w > 1 else H1) for k in range(w)]
    elif i in VORN:
        for j in range(5):   # Strähnen: direkt neben dem Gesicht (Hautpixel der Zeile), unter der Helmkante herab bis zu den Schultern
            y = by + 1 + j; row = [x for x in range(mnx, mxx + 1) if src[x, y][3] and src[x, y][:3] != (0, 0, 0) and not (min(src[x, y][:3]) > 140)]
            if not row: continue
            l, r = min(row), max(row); c = H2 if j < 2 else H1
            neu += [(l - 1, y, c), (r + 1, y, c)]
    else:   # Seitenansicht, schaut nach rechts: Zopf hinten links
        b0 = mnx + 2
        for j, (dx, w) in enumerate([(0, 3), (-1, 3), (-1, 3), (-1, 2), (-2, 2), (-2, 1)]): neu += [(b0 + dx + k, by + 1 + j, H2 if k == w - 1 and j < 2 else H1) for k in range(w)]
    S = {(x, y) for x, y, c in neu}
    for x, y, c in neu: p[x, y] = c
    for x, y in S:   # schwarzer Rand nur, wo vorher nichts war
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in S and x0 <= q[0] < x0 + CW and 0 <= q[1] < 40 and not src[q][3]: p[q] = Q
# schmalere Statur: unterhalb der Schultern je eine Spalte links und rechts der Mitte herausnehmen (vorn/hinten), seitlich eine in der Mitte
sch = out.copy(); q = sch.load()
for i in range(n):
    x0 = i * CW; pts = helm(src, x0)
    if not pts: continue
    xs = [a for a, b in pts]; ys = [b for a, b in pts]; cx = (min(xs) + max(xs)) // 2; y0 = max(ys) + 6
    seite = i not in VORN and i not in HINTEN
    weg = [cx] if seite else [cx - 4, cx + 4]
    for y in range(y0, 40):
        row = [p[x, y] for x in range(x0, x0 + CW)]
        if seite: keep = [c for k, c in enumerate(row) if x0 + k not in weg]; keep = keep + [(0, 0, 0, 0)]
        else:
            L = [c for k, c in enumerate(row) if x0 + k < cx and x0 + k != weg[0]]; M = [row[cx - x0]]; R = [c for k, c in enumerate(row) if x0 + k > cx and x0 + k != weg[1]]
            keep = [(0, 0, 0, 0)] + L + M + R + [(0, 0, 0, 0)]
        for k in range(CW): q[x0 + k, y] = keep[k]
out = sch
out.save('v1_frau.png')
if '--einbauen' in sys.argv:
    b = io.BytesIO(); out.save(b, 'PNG', optimize=True)
    s = re.sub(r'"v1": "[^"]+"', '"v1": "' + base64.b64encode(b.getvalue()).decode() + '"', s); open(SRC, 'w').write(s); print('eingebaut')
