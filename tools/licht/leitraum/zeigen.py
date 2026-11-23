# Leitraum: je Tageszeit Spiel (links) und pxl-Licht (rechts), jeweils mit der Tafel davor
from PIL import Image, ImageDraw
D = '/home/claude/af/tools/licht/leitraum'; Z = ['morgen', 'tag', 'abend', 'nacht']; S = 480 * 2, 270 * 2
out = Image.new('RGB', (S[0] * 2 + 8, (S[1] + 16) * 4), (30, 30, 30)); dr = ImageDraw.Draw(out)
for i, n in enumerate(Z):
  t = Image.open(f'{D}/{n}/tafel.png').convert('RGBA').resize(S)
  for j, f in enumerate([f'{D}/{n}/out/scenes/lr_{n}.png', f'{D}/{n}/out/scenes/lr_{n}_licht.png']):
    a = Image.open(f).convert('RGBA').resize(S, Image.NEAREST); a.alpha_composite(t); y = i * (S[1] + 16)
    out.paste(a.convert('RGB'), (j * (S[0] + 8), y + 16)); dr.text((j * (S[0] + 8) + 4, y + 3), f'{n.capitalize()}: ' + ('Spiel heute' if j == 0 else 'mit pxl-Licht'), fill=(230, 230, 230))
out.save('/mnt/user-data/outputs/leitraum_tageszeiten.png')
