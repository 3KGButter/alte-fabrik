// Maschinenhalle: Lichtquellen. Tageszeiten aus gemeinsam.px.js
const LICHT = (zeit) => { const z = ZEITEN[zeit]; return [
  layer("licht", (c) => {
    c.lamp(192, 165, { r: 700, color: "#f3e7d3", power: 0.6 * z.lampen * z.raum })   // Raumlicht: sehr weit, fast flach – keine dunklen Senken
    for (const x of [54, 150, 246, 342]) c.lamp(x, 27, { r: RUND(230, z), color: z.warm, power: z.lampen })   // vier Hallenleuchten unter dem Dach
    for (const x of [30, 78, 126, 174, 222, 270, 318, 366]) c.lamp(x, 46, { r: 200, color: z.fenster[0], power: z.fenster[1] })   // Fensterband: Sonne bzw. Mond
    c.lamp(190, 104, { r: 40, color: "#ffc070", power: 0.55 * z.klein })   // Stückzahl-Tafel leuchtet auf die Wand
    for (const x of [54, 150, 246, 342]) KEGEL(c, x, 28, 140, z, z.warm)   // Lichtkegel bis auf den Boden (abends, nachts)
  }),
  BELEUCHTUNG(z),
  glow(KEY_AT([50, 25], [54, 25], [146, 25], [242, 25], [338, 25]), { r: 7, strength: z.schein, where: [40, 20, 320, 10] }),   // Leuchtstäbe der Hallenleuchten
  glow(KEY_AT([172, 94], [171, 95]), { r: 4, strength: 0.45 + 0.2 * z.klein, where: [158, 88, 66, 34] }),                   // Schrift und Zahlen der Stückzahl-Tafel
  glow(KEY_AT([164, 104], [164, 105]), { r: 3, strength: 0.5, where: [160, 100, 8, 20] }),                                  // grüne Lämpchen an der Tafel
  glow(KEY_AT([8, 97]), { r: 3, strength: 0.5, where: [4, 94, 6, 6] })]                                                    // Lämpchen am Schaltschrank
}
