# Vorschau: Nebel im Werkshof (Entwurf). Legt Nebel über das beleuchtete Bild:
# - je weiter hinten (weiter oben im Bild), desto dichter; Himmel fast ganz im Grau
# - um jede Laterne/Lampe ein großer, weicher Lichthof im Nebel, unter Laternen ein heller Lichtkegel
# - Fenster bekommen kleine Lichthöfe
import json, glob, numpy as np
from PIL import Image
from scipy import ndimage
D = '/home/claude/af/tools/licht/werkshof'
L = json.load(open(f'{D}/lichter.json'))
H, W, G, WATER = 200, 384, 116, 164
def nebel(zeit, dichte, farbe, licht):
  img = np.array(Image.open(f'{D}/{zeit}/out/scenes/hof_{zeit}_licht.png').convert('RGB')).astype(float)
  y = np.arange(H)[:, None] * np.ones((1, W))
  f = np.where(y < G - 30, 0.92, np.where(y < WATER, 0.92 - (y - (G - 30)) / (WATER - G + 30) * 0.45, 0.5))   # Tiefe
  rng = np.random.default_rng(3); n = ndimage.gaussian_filter(rng.random((H, W)), (6, 28)); n = (n - n.min()) / (n.max() - n.min())
  f = np.clip(f * dichte * (0.82 + 0.36 * n), 0, 0.97)[..., None]
  fc = np.array(farbe, float)
  glowm = np.zeros((H, W))
  for l in L:
    cx, cy = l['x'] + l['w'] / 2, l['y'] + l['h'] / 2
    if l['pool']: r, s = 34, 0.85
    elif l['fire']: r, s = 12, 0.3 * (l.get('a') or 1)
    else: r, s = 6, 0.035
    d = np.hypot(np.arange(W)[None, :] - cx, (np.arange(H)[:, None] - cy) * 1.15)
    glowm += s * np.exp(-(d / r) ** 2 * 1.6)
    if l['pool']:   # Lichtkegel nach unten im Nebel
      yy = np.arange(H)[:, None] - cy; xx = np.arange(W)[None, :] - cx
      cone = np.where((yy > 0) & (yy < 40), np.exp(-(xx / (3 + yy * 0.55)) ** 2) * (1 - yy / 40), 0)
      glowm += 0.55 * cone
  glowm = np.clip(glowm, 0, 1.0)[..., None] * licht
  warm = np.array([255, 196, 110], float)
  fogc = fc * (1 - np.clip(glowm, 0, 1)) + warm * np.clip(glowm, 0, 1)
  out = img * (1 - f) + fogc * f
  out = out + warm * glowm * 0.1   # Licht streut im Nebel: leichtes Aufhellen
  for l in L:   # Lichtquellen selbst bleiben als heller Punkt sichtbar
    if l['pool'] or l['fire']:
      x, y0 = int(l['x']), int(l['y']); out[max(0, y0 - 1):y0 + l['h'] + 1, max(0, x - 1):x + l['w'] + 1] = np.maximum(out[max(0, y0 - 1):y0 + l['h'] + 1, max(0, x - 1):x + l['w'] + 1], [255, 232, 160])
  return np.clip(out, 0, 255).astype(np.uint8)
bilder = [('Morgen mit Nebel', nebel('morgen', 1.0, (196, 188, 184), 0.9)), ('Abend mit Nebel', nebel('abend', 0.9, (120, 108, 124), 1.0)), ('Nacht mit Nebel', nebel('nacht', 0.85, (52, 56, 78), 1.1))]
from PIL import ImageDraw
out = Image.new('RGB', (W, (H + 14) * len(bilder)), (30, 30, 30)); dr = ImageDraw.Draw(out)
for i, (t, b) in enumerate(bilder): dr.text((4, i * (H + 14) + 2), t, fill=(230, 230, 230)); out.paste(Image.fromarray(b), (0, i * (H + 14) + 14))
out.resize((W * 2, out.height * 2), Image.NEAREST).save('/mnt/user-data/outputs/werkshof_nebel_entwurf.png')
