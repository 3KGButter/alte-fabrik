// Ehrenhalle (Ehrentafel im Pförtnerhaus, 192x246): zwei Bodenstrahler leuchten schräg nach oben auf die Steintafel –
// wie die Strahler im Pförtnerhaus. Immer wie nachts (Wunsch): dunkler Raum, die Strahler tragen das Licht – unabhängig von der Spielzeit.
include("eh.px.js")
include("../kegel.px.js")
const EH = {
  morgen: { ambient: 0.6,  raum: 0.75, strahler: 0.5 },
  tag:    { ambient: 0.72, raum: 1.0,  strahler: 0.1 },
  abend:  { ambient: 0.52, raum: 0.6,  strahler: 0.6 },
  nacht:  { ambient: 0.38, raum: 0.3,  strahler: 1.0 },
}
const SPOTS = [[30, 1], [162, -1]], FL = 232
const LICHT = (zeit) => { const z = EH[zeit], SB = STRAHLER[zeit]; return [
  layer("licht", (c) => {
    c.lamp(96, 150, { r: 500, color: "#eeeef4", power: 0.35 + 0.55 * z.raum })   // Raumlicht aus dem Pförtnerhaus (neutral, damit der Stein grau bleibt)
    for (const [x, d] of SPOTS) {
      c.lamp(x, FL - 7, { r: 22, color: STRAHLER_FARBE, power: 1.1 * SB })                                          // Lichthof am Strahlerkopf
      KEGEL(c, x, FL - 8, 200, z, STRAHLER_FARBE, { dx: 0.3 * d, dy: -1, breite: 6, wachsen: 0.5, staerke: 0.95 * SB })               // Kegel schräg hinauf auf die Tafel
    }
  }),
  lighting({ cell: 2, smooth: true, ambient: z.ambient, ambientColor: "#9aa6c8" }),
  glow(KEY_AT([30, 225], [162, 225]), { r: 6, strength: 0.85 * SB })]
}
scene("eh_licht", { w: W, h: H }, EBENE("wand"), EBENE("plaketten"), EBENE("gesamt"), ...LICHT("nacht"))
