# Tageszeiten-Übersicht: je Zeile Spiel (links) und pxl-Licht (rechts), Figuren aus dem Spiel, beschriftet
import glob, numpy as np; from PIL import Image, ImageDraw; from scipy import ndimage
FLOOR = 136
import sys as _s
if len(_s.argv) > 1 and _s.argv[1] == 'werkshof': FLOOR = 0   # draußen: alles Bewegte zählt als Figur
def paar(d, base, lit):
  fig = np.array(Image.open(f'{d}/mit_figuren.png').convert('RGB')).astype(float)
  leer = np.array(Image.open(glob.glob(f'{d}/erfasst/*_gesamt.png')[0]).convert('RGB')).astype(float)
  pxl0 = np.array(Image.open(f'{d}/out/scenes/{base}.png').convert('RGB')).astype(float)
  hell = np.array(Image.open(f'{d}/out/scenes/{lit}.png').convert('RGB')).astype(float)
  diff = int(np.any(pxl0 != leer, -1).sum())
  m = np.any(fig != leer, -1); lab, n = ndimage.label(m, np.ones((3, 3)))
  for i, s in enumerate(ndimage.find_objects(lab)):
    if s[0].stop < FLOOR: m[lab == i + 1] = False
  lum = lambda a: a.mean(-1); k = np.where(lum(leer) > 25, lum(hell) / np.maximum(lum(leer), 1), np.nan)
  w = ~np.isnan(k); k = ndimage.gaussian_filter(np.where(w, k, 0), 4) / np.maximum(ndimage.gaussian_filter(w.astype(float), 4), 1e-6)
  a = np.where(m[..., None], fig, leer); b = np.where(m[..., None], np.clip(fig * np.clip(k, 0, 1.3)[..., None], 0, 255), hell)
  return a.astype(np.uint8), b.astype(np.uint8), diff
import sys
RAUM = sys.argv[1] if len(sys.argv) > 1 else 'pfoertner'
if RAUM == 'pfoertner':
  Z = [('Morgen', 'zeiten/morgen', 'pf_morgen', 'pf_morgen_licht'), ('Tag', 'pfoertner', 'pfoertner', 'pfoertner_licht'),
       ('Abend', 'zeiten/abend', 'pf_abend', 'pf_abend_licht'), ('Nacht', 'zeiten/nacht', 'pf_nacht', 'pf_nacht_licht')]
else:
  K = sys.argv[2]; Z = [(n.capitalize(), f'{RAUM}/{n}', f'{K}_{n}', f'{K}_{n}_licht') for n in ['morgen', 'tag', 'abend', 'nacht']]
W, H, T = 384, 200, 14; out = Image.new('RGB', (W * 2 + 6, (H + T) * len(Z)), (30, 30, 30)); dr = ImageDraw.Draw(out)
for i, (nm, d, b0, l) in enumerate(Z):
  a, b, diff = paar(d, b0, l); y = i * (H + T)
  dr.text((4, y + 2), f'{nm}: Spiel heute', fill=(230, 230, 230)); dr.text((W + 10, y + 2), f'{nm}: mit pxl-Licht', fill=(230, 230, 230))
  out.paste(Image.fromarray(a), (0, y + T)); out.paste(Image.fromarray(b), (W + 6, y + T)); print(nm, 'abweichende Pixel ohne Licht:', diff)
out.resize((out.width * 2, out.height * 2), Image.NEAREST).save(f'/mnt/user-data/outputs/{RAUM}_tageszeiten.png')
