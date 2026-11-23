# Prüft: pxl-Bild (ohne Licht) == Spielbild
import sys, numpy as np; from PIL import Image
r = sys.argv[1]
a = np.array(Image.open(f'{r}/out/scenes/{r}.png').convert('RGBA')).astype(int); b = np.array(Image.open(f'{r}/erfasst/11_gesamt.png').convert('RGBA')).astype(int)
print(r, a.shape[1], 'x', a.shape[0], '| abweichende Pixel:', int(np.any(a != b, -1).sum()), '| durchsichtig im Spielbild:', int((b[..., 3] < 255).sum()))
