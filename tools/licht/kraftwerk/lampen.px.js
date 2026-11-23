// Kraftwerk: Lichtquellen. Tageszeiten aus gemeinsam.px.js
const LICHT = (zeit) => { const z = ZEITEN[zeit], SB = STRAHLER[zeit]; return [
  layer("licht", (c) => {
    c.lamp(192, 150, { r: 700, color: "#f3e7d3", power: 0.55 * z.lampen * z.raum })   // Raumlicht: sehr weit, fast flach – keine dunklen Senken
    for (const x of [48, 144, 240]) c.lamp(x, 51, { r: RUND(210, z), color: z.warm, power: z.lampen })   // drei Hängelampen mit Glockenschirm
    for (const x of [48, 144, 240]) KEGEL(c, x, 52, 120, z, z.warm, { breite: 8 })                        // Lichtkegel bis auf den Boden (abends leicht, nachts deutlich)
    for (const x of [25, 71, 121, 167, 217]) c.lamp(x, 62, { r: 220, color: z.fenster[0], power: z.fenster[1] })   // fünf hohe Fenster: Sonne bzw. Mond
    c.lamp(206, 152, { r: 40, color: "#ffb860", power: 1.15 * z.klein })   // Energiekapseln: orange,
    c.lamp(224, 152, { r: 40, color: "#a8f080", power: 1.15 * z.klein })   // grün,
    c.lamp(242, 152, { r: 40, color: "#a8d8ff", power: 1.15 * z.klein })   // blau – färben Boden und Wand um sich herum
    for (const [x, d] of [[274, 1], [373, -1]]) {   // zwei starke Bodenstrahler vor der Mecha-Bucht (Zusatz), leuchten schräg hinauf auf den Bauplatz
      c.lamp(x, 177, { r: 24, color: STRAHLER_FARBE, power: 1.2 * SB })
      KEGEL(c, x, 175, 130, z, STRAHLER_FARBE, { dx: 0.42 * d, dy: -1, breite: 10, wachsen: 0.85, staerke: 1.05 * SB })   // breit und weich
    }
    c.lamp(86, 139, { r: 24, color: "#ffb060", power: 0.8 * z.klein })     // Schaugläser an der Turbine
  }),
  BELEUCHTUNG(z),
  glow(KEY_AT([46, 49], [48, 49]), { r: 7, strength: z.schein, where: [40, 46, 210, 6] }),                                   // Glühbirnen der Hängelampen
  glow(KEY_AT([200, 144], [201, 144], [202, 144], [206, 145], [207, 145], [208, 145]), { r: 5, strength: 0.4 + 0.3 * z.klein, where: [198, 138, 52, 32] }),   // Leuchten in den Kapseln
  glow(KEY_AT([219, 150], [222, 150], [223, 151], [238, 150], [241, 150]), { r: 5, strength: 0.4 + 0.3 * z.klein, where: [198, 138, 52, 32] }),
  glow(STRAHLER_KEYS, { r: 6, strength: 0.85 * SB, where: [266, 173, 116, 12] }),                                        // Schein am Kopf der Bodenstrahler
  glow(KEY_AT([80, 138], [83, 138]), { r: 4, strength: 0.45, where: [74, 134, 26, 8] }),                                       // Schaugläser der Turbine
  glow(KEY_AT([140, 155], [145, 156], [151, 155]), { r: 3, strength: 0.5, where: [136, 152, 18, 8] })]                          // Kontrolllampen
}
