// Pförtnerhaus: Lichtquellen und Tageszeiten. Ambient tagsüber 0.38, nachts etwas weniger, damit die Lampen stärker wirken. Das Dunklerwerden selbst macht das Spiel (Tönung).
// Je Tageszeit ändern sich nur Fenster (Sonne/Mond) und die Stärke der Lampen.
const ZEITEN = {
  morgen: { fenster: ["#ffd8c4", 0.85, 200], lampen: 0.9,  klein: 0.8, schein: 0.45, ambient: 0.38, raum: 0.9,  warm: "#ffe0a8", kegel: 0, strahler: 0.5 },
  tag:    { fenster: ["#f6efe0", 0.95, 220], lampen: 1.0,  klein: 0.8, schein: 0.45, ambient: 0.38, raum: 1.0,  warm: "#ffe0a8", kegel: 0, strahler: 0.1 },
  abend:  { fenster: ["#ffb27a", 0.75, 190], lampen: 1.1,  klein: 0.9, schein: 0.6,  ambient: 0.36, raum: 0.7,  warm: "#ffcc80", kegel: 0.65, rund: 0.2, strahler: 0.6 },
  nacht:  { fenster: ["#9fb2ff", 0.3, 120],  lampen: 1.35, klein: 1.1, schein: 0.85, ambient: 0.31, raum: 0.75, warm: "#ffc070", kegel: 1.0,  rund: 0.45, strahler: 1.0 },
}
const LICHT = (zeit) => { const z = ZEITEN[zeit], WARM = z.warm, SB = STRAHLER[zeit]; return [
  layer("licht", (c) => {   // wenige große, sich überlappende Lichter: gleichmäßiger Raum, kleine Quellen nur als Schein
    c.lamp(64, 57, { r: RUND(240, z), color: WARM, power: z.lampen })                        // Hängelampe Büro
    c.lamp(292, 57, { r: RUND(220, z), color: WARM, power: z.lampen })                       // Hängelampe Aggregatraum
    KEGEL(c, 64, 58, 100, z, WARM, { breite: 12 }); KEGEL(c, 292, 58, 110, z, WARM, { breite: 12 })                   // Lichtkegel nach unten (abends, nachts)
    c.lamp(133, 84, { r: z.fenster[2], color: z.fenster[0], power: z.fenster[1] })  // Fenster: Sonne bzw. Mond
    c.lamp(192, 120, { r: 700, color: "#f3e7d3", power: 0.45 * z.lampen * z.raum })          // Raumlicht: sehr weit, fast flach – füllt die Senken zwischen den Lampen gleichmäßig
    for (const x of [133, 159]) c.lamp(x, 141, { r: 40, color: "#9cc8ff", power: 0.95 * z.klein })   // Bildschirme: bläulicher Schein auf Tisch und Wand
    c.lamp(27, 142, { r: 40, color: "#ffd08a", power: 0.75 * z.klein })             // Stehlampe an der Sitzecke
    for (const x of [198, 259]) c.lamp(x, 150, { r: 22, color: STRAHLER_FARBE, power: 1.1 * SB })   // Lichtschein direkt am Strahlerkopf
    KEGEL(c, 199, 148, 58, z, STRAHLER_FARBE, { dx: 0.45, dy: -1, wachsen: 0.5, staerke: 0.9 * SB })   // Strahler links: Kegel schräg nach oben auf die Ehrentafel – gleich breit, Stärke nach Tageszeit
    KEGEL(c, 258, 148, 58, z, STRAHLER_FARBE, { dx: -0.45, dy: -1, wachsen: 0.5, staerke: 0.9 * SB })  // Strahler rechts
  }),
  lighting({ cell: 2, smooth: true, ambient: z.ambient, ambientColor: "#9aa6c8" }),
  glow(KEY_AT([62, 55], [64, 55], [66, 55], [290, 55], [292, 55]), { r: 7, strength: z.schein, where: [55, 48, 250, 12] }),                 // Glühbirnen der Hängelampen
  glow(KEY_AT([197, 150], [198, 150], [259, 150], [260, 150]), { r: 6, strength: 0.85 * SB, where: [190, 144, 78, 12] }),   // Bodenstrahler: Schein tagsüber kaum, nachts am stärksten
  glow(KEY_AT([126, 139], [152, 139], [152, 141]), { r: 3, strength: 0.5, where: [124, 137, 44, 10] }),        // Schrift auf den Bildschirmen
  glow(KEY_AT([24, 138], [25, 138], [28, 138], [24, 145], [26, 145]), { r: 6, strength: z.schein * 0.7, where: [20, 134, 16, 10] }), // Schirm der Stehlampe
  glow(KEY_OF("#a3fb7b", "#ccde7b"), { r: 4, strength: 0.5, where: [328, 146, 22, 16] })]          // Anzeige und Lämpchen am Aggregat
}
const RAUM = (n) => [EBENE("himmel", { unlit: true }), EBENE("wand", { wall: true }), ...Object.keys(E).filter(k => k !== "himmel" && k !== "wand").map(k => EBENE(k, k === "aggregatraum" ? { wall: true } : {}))]
