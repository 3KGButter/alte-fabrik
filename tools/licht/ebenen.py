# Aus den erfassten Zwischenständen Ebenen machen und eine pxl-Datei schreiben (pixelgleich zum Spiel ohne Licht)
import sys, os, glob, numpy as np
from PIL import Image
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), sys.argv[1]); ROOM = sys.argv[2] if len(sys.argv) > 2 else os.path.basename(sys.argv[1])
F = sorted(glob.glob(os.path.join(D, 'erfasst', '*.png')))
names = [os.path.basename(f)[3:-4] for f in F]
A = [np.array(Image.open(f).convert('RGBA')).astype(np.float64) for f in F]
sky = A[0]; ges = A[-1].astype(np.uint8)
def over(top, bot):   # top über bot (source-over)
  a = top[..., 3:4] / 255.0; b = bot[..., 3:4] / 255.0; o = a + b * (1 - a)
  c = np.where(o > 0, (top[..., :3] * a + bot[..., :3] * b * (1 - a)) / np.maximum(o, 1e-9), 0)
  return np.concatenate([np.round(c), np.round(o * 255)], -1)
if all(n[:2] in ('S_', 'L_', 'C_') for n in names):   # Werkshof: S = ganze Szene, L = Ebene über der letzten Szene, C = fertiges Bild
  comps, base = [], None
  for n, x in zip(names, A):
    if n[0] == 'L': comps.append(over(x, base))
    else: comps.append(x); base = x if n[0] == 'S' else base
  names = [n[2:] for n in names]
else:
  comps = [sky] + [over(x, sky) for x in A[1:-1]]
comps[-1] = ges.astype(np.float64)   # letzter Stand = tatsächliches Spielbild
H, W = ges.shape[:2]
layers = [('himmel', comps[0][..., 3] > 0, comps[0])]
for i in range(1, len(comps)):
  m = np.any(comps[i] != comps[i - 1], -1); layers.append((names[i], m, comps[i]))
# Palette: häufigste Farben bekommen lesbare Zeichen, der Rest Unicode
from collections import Counter
cnt = Counter()
for n, m, c in layers:
  for v in map(tuple, c[m][:, :4].astype(int)): cnt[v] += 1
ASCII = [ch for ch in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789']
UNI = [chr(c) for c in list(range(0xC0, 0x24F)) + list(range(0x391, 0x3FF)) + list(range(0x410, 0x4FF)) + list(range(0x4E00, 0x9FFF)) if chr(c) not in '×÷']
keys = ASCII + UNI; KEY = {}
for i, (col, _) in enumerate(cnt.most_common()): KEY[col] = keys[i]
out = [f'// {ROOM}: aus dem Spiel übernommen (tools/licht/erfassen.js + ebenen.py), ohne Licht pixelgleich zum Spielbild.',
       f'// {len(KEY)} Farben. Ebenen in Zeichenreihenfolge. Figuren, Katze und das alte Lampenlicht sind nicht enthalten.',
       'const PALETTE = {' + ', '.join(f'"{k}": "#{c[0]:02x}{c[1]:02x}{c[2]:02x}' + (f'{c[3]:02x}' if c[3] < 255 else '') + '"' for c, k in KEY.items()) + '}',
       'pal(PALETTE)', 'const KEY_OF = (...hex) => hex.map(h => Object.keys(PALETTE).find(k => PALETTE[k] === h) || "").join("")   // Zeichen zu Farben', '']
out.append(f'const E = {{}}   // Ebene -> [x, y, Raster]')
for n, m, c in layers:
  ys, xs = np.nonzero(m)
  if not len(ys): continue
  y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
  rows = []
  for y in range(y0, y1 + 1):
    rows.append(''.join(KEY[tuple(c[y, x, :4].astype(int))] if m[y, x] else '.' for x in range(x0, x1 + 1)))
  out.append(f'E.{n} = [{x0}, {y0}, `\n' + '\n'.join(rows) + '`]')
  print(n, int(m.sum()), 'Pixel')
out.append('const EBENE = (n, o = {}) => layer(n, o, grid(...E[n]))')
out.append('// Zeichen an Bildpunkten (oberste Ebene gewinnt) – für glow, unabhängig von der Tageszeit-Tönung')
out.append('const KEY_AT = (...pts) => [...new Set(pts.map(([x, y]) => { for (const n of Object.keys(E).reverse()) { const [x0, y0, g] = E[n], r = g.split("\\n")[1 + y - y0]; const ch = r && [...r][x - x0]; if (ch && ch !== ".") return ch } return "" }))].join("")')
out.append(f'const W = {W}, H = {H}')
out.append(f'scene("{ROOM}", {{ w: W, h: H }}, ...Object.keys(E).map(n => EBENE(n)))')
open(os.path.join(D, ROOM + '.px.js'), 'w').write('\n'.join(out) + '\n')
print(len(KEY), 'Farben', W, H)
