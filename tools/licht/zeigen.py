# Vorher/nachher nebeneinander. Figuren kommen aus dem Spiel (gleicher Augenblick, richtige Reihenfolge vor/hinter Möbeln).
# Im Lichtbild bekommen die Figuren dasselbe Raumlicht (Verhältnis beleuchtet/unbeleuchtet, weichgezeichnet).
import sys, numpy as np; from PIL import Image; from scipy import ndimage
r, lit = sys.argv[1], sys.argv[2]; FLOOR = 136
fig = np.array(Image.open(f'{r}/mit_figuren.png').convert('RGB')).astype(float)
leer = np.array(Image.open(f'{r}/erfasst/11_gesamt.png').convert('RGB')).astype(float)
hell = np.array(Image.open(f'{r}/out/scenes/{lit}.png').convert('RGB')).astype(float)
m = np.any(fig != leer, -1); lab, n = ndimage.label(m, np.ones((3, 3)))
for i, s in enumerate(ndimage.find_objects(lab)):
  if s[0].stop < FLOOR: m[lab == i + 1] = False   # was nicht auf dem Boden steht, ist keine Figur (z. B. Plaketten, die gerade einblenden)
lum = lambda a: a.mean(-1)
k = np.where(lum(leer) > 25, lum(hell) / np.maximum(lum(leer), 1), np.nan)
w = ~np.isnan(k); k0 = np.where(w, k, 0); k = ndimage.gaussian_filter(k0, 4) / np.maximum(ndimage.gaussian_filter(w.astype(float), 4), 1e-6)
a = np.where(m[..., None], fig, leer); b = np.where(m[..., None], np.clip(fig * np.clip(k, 0, 1.3)[..., None], 0, 255), hell)
H, W = leer.shape[:2]; c = np.full((H, W * 2 + 6, 3), 30.); c[:, :W] = a; c[:, W + 6:] = b
Image.fromarray(c.astype(np.uint8)).resize(((W * 2 + 6) * 2, H * 2), Image.NEAREST).save(f'/mnt/user-data/outputs/{r}_vorher_nachher.png')
print('Figurenpixel', int(m.sum()))
