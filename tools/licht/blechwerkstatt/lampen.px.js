// Blechwerkstatt: Lichtquellen. Tageszeiten aus gemeinsam.px.js
const LICHT = (zeit) => { const z = ZEITEN[zeit]; return [
  layer("licht", (c) => {
    c.lamp(192, 140, { r: 700, color: "#f3e7d3", power: 0.55 * z.lampen * z.raum })   // Raumlicht: sehr weit, fast flach – keine dunklen Senken
    for (const x of [73, 149, 225, 301]) c.lamp(x, 59, { r: RUND(200, z), color: z.warm, power: z.lampen })   // Wandlampen zwischen den Fenstern
    for (const x of [35, 111, 187, 264, 339]) c.lamp(x, 70, { r: 240, color: z.fenster[0], power: z.fenster[1] * 1.1 })   // fünf Bogenfenster: Sonne bzw. Mond
    for (const x of [73, 149, 225, 301]) KEGEL(c, x, 60, 75, z, z.warm)   // Lichtkegel an der Wand hinunter (abends, nachts)
  }),
  BELEUCHTUNG(z),
  glow(KEY_AT([70, 57], [73, 57], [146, 57], [149, 57], [222, 57], [298, 57]), { r: 7, strength: z.schein, where: [60, 52, 250, 10] }),        // Glühbirnen der Wandlampen
  glow(KEY_AT([142, 145], [143, 144]), { r: 3, strength: 0.4, where: [138, 140, 12, 12] })]             // Kontrolllampe an der Presse
}
