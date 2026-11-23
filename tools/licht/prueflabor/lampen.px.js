// Prüflabor: Lichtquellen. Tageszeiten aus gemeinsam.px.js. Labor: kühles, helles Deckenlicht.
const LICHT = (zeit) => { const z = ZEITEN[zeit]; return [
  layer("licht", (c) => {
    c.lamp(192, 165, { r: 700, color: "#e4e9f2", power: 0.6 * z.lampen * z.raum })   // Raumlicht: sehr weit, fast flach – keine dunklen Senken
    for (const x of [60, 156, 252, 348]) c.lamp(x, 21, { r: RUND(320, z), color: "#cfe0ff", power: z.lampen })   // Deckenleuchten (Lichtbänder): kaltweißes Licht
    for (const x of [39, 115, 191, 267, 343]) c.lamp(x, 64, { r: 320, color: z.fenster[0], power: z.fenster[1] * 0.85 })   // fünf Fenster: Sonne bzw. Mond
    for (const x of [60, 156, 252, 348]) KEGEL(c, x, 22, 140, z, "#cfe0ff", { breite: 30 })   // breite kalte Lichtbahnen unter den Lichtleisten bis auf den Boden (abends, nachts)
  }),
  BELEUCHTUNG(z),
  glow(KEY_AT([60, 17], [60, 18]), { r: 4, strength: z.schein * 0.7, where: [30, 16, 340, 4] }),                  // Lichtbänder an der Decke
  glow(KEY_AT([221, 58]), { r: 3, strength: 0.5, where: [216, 54, 26, 20] }),                               // Klimaanzeige
  glow(KEY_AT([218, 140], [217, 139]), { r: 3, strength: 0.45, where: [213, 135, 22, 10] })]                // Messkurve auf dem Monitor
}
