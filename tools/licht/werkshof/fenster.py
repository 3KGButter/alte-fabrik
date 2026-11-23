# Werkshof: beleuchtete Fenster (wie im Spiel: Lichtliste L aus scene.js) als eigene Ebene je Tageszeit, vorgemischt mit dem Bild,
# dazu ihre Spiegelung im Wasser. Schreibt <zeit>/fenster_<zeit>.px.js und lichter.px.js (Lampenliste für das Licht).
import json, glob, numpy as np
from PIL import Image
D = '/home/claude/af/tools/licht/werkshof'
WATER = 164
AN = {'morgen': 0.35, 'tag': 0.0, 'abend': 0.7, 'nacht': 1.0}
L = json.load(open(f'{D}/tag/lampen.json'))
fenster = [l for l in L if not l['fire'] and not l['pool']]
json.dump(L, open(f'{D}/lichter.json', 'w'))
open(f'{D}/lichter.px.js', 'w').write('// Lichtliste des Werkshofs aus dem Spiel (scene.js, Liste L): Fenster, Lampen, Laternen (pool)\nconst HOF_LICHTER = ' + json.dumps(L) + '\n')
hx = lambda c: np.array([int(c[i:i + 2], 16) for i in (1, 3, 5)], float)
WIN = hx('#ffd56a')
for zt, a in AN.items():
  base = np.array(Image.open(glob.glob(f'{D}/{zt}/erfasst/*_gesamt.png')[0]).convert('RGB')).astype(float)
  out = base.copy(); m = np.zeros(base.shape[:2], bool)
  if a > 0:
    for l in fenster:
      for y in range(l['y'], l['y'] + l['h']):
        for x in range(l['x'], l['x'] + l['w']):
          if 0 <= x < 384 and 0 <= y < WATER: out[y, x] = base[y, x] * (1 - a) + WIN * a; m[y, x] = True
          ry = 2 * WATER - 1 - y   # Spiegelung wie water() in art.js
          if WATER <= ry < 200 and 0 <= x < 384: aa = a * 0.75 * 0.62 * (0.75 if ry - WATER > 28 else 1); out[ry, x] = base[ry, x] * (1 - aa) + WIN * aa; m[ry, x] = True
  cols, keys = {}, []
  def key(c):
    h = '#%02x%02x%02x' % tuple(int(round(v)) for v in c)
    if h not in cols: cols[h] = chr(0x30A1 + len(cols))
    return cols[h]
  ys, xs = np.nonzero(m)
  if len(ys):
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    rows = [''.join(key(out[y, x]) if m[y, x] else '.' for x in range(x0, x1 + 1)) for y in range(y0, y1 + 1)]
    win_keys = ''.join(sorted({key(out[l['y'], l['x']]) for l in fenster}))
    grid = f'grid({x0}, {y0}, `\n' + '\n'.join(rows) + '`)'
  else:
    win_keys, grid = '', ''
  pal = 'pal({' + ', '.join(f'"{k}": "{h}"' for h, k in cols.items()) + '})\n' if cols else ''
  open(f'{D}/{zt}/fenster_{zt}.px.js', 'w').write(f'// Werkshof {zt}: erleuchtete Fenster (Stärke {a}) und ihre Spiegelung im Wasser – vorgemischt\n{pal}const FENSTER = layer("fenster_licht"{", " + grid if grid else ""})\nconst FENSTER_KEYS = "{win_keys}"\n')
  print(zt, 'Fensterpunkte', int(m.sum()))
