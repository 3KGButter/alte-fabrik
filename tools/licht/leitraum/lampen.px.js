// Leitraum (Hintergrund des Leitstands, Smartboard 1920x1080 = 480x270 Spielpixel). Dieselbe Spielzeit wie bei den Schülern.
// Licht: die beiden Bogenfenster (Himmel), der Schirm der Tafel (grünlicher Schein) und zwei Wandleuchten unter den Fensterbänken,
// die abends und nachts Lichtkegel auf Band und Boden werfen. Rund um die Tafel bleibt es ruhig, damit sie gut lesbar ist.
const LR = {
  morgen: { fenster: ["#ffc8b0", 1.0],  ambient: 0.7,  tafel: 0.5,  leuchte: 0.6,  kegel: 0 },
  tag:    { fenster: ["#e8f2ff", 1.15], ambient: 0.82, tafel: 0.4,  leuchte: 0.4,  kegel: 0 },
  abend:  { fenster: ["#ff9a70", 0.95], ambient: 0.6,  tafel: 0.6,  leuchte: 1.0,  kegel: 0.65 },
  nacht:  { fenster: ["#7f90d8", 0.45], ambient: 0.42, tafel: 0.75, leuchte: 1.3,  kegel: 1.0 },
}
const LEUCHTEN = [[22, 214], [461, 214]]
const LICHT = (zeit) => { const z = LR[zeit]; return [
  layer("licht", (c) => {
    for (const fx of [21, 459]) for (const fy of [70, 130, 190]) c.lamp(fx, fy, { r: 120, color: z.fenster[0], power: z.fenster[1] })   // Bogenfenster links und rechts
    for (const [x, y] of [[240, 120], [60, 120], [420, 120], [240, 215]]) c.lamp(x, y, { r: 150, color: "#8fe0b8", power: z.tafel })      // Schirm der Tafel
    for (const [x, y] of LEUCHTEN) {   // Wandleuchten: kleiner runder Schein, Kegel hinunter auf Band und Boden
      c.lamp(x, y, { r: 26, color: "#ffd890", power: z.leuchte })
      KEGEL(c, x, y + 1, 50, z, "#ffd890", { breite: 6, wachsen: 0.7 })
    }
    c.lamp(13, 216, { r: 18, color: "#9cff7a", power: 0.7 })   // Lampe am Bandantrieb
  }),
  lighting({ cell: 2, smooth: true, ambient: z.ambient, ambientColor: "#a8a0c0" }),
  glow(KEY_AT(...LEUCHTEN), { r: 5, strength: 0.25 + 0.45 * z.leuchte / 1.3 })]
}
