// Werkshof: Licht draußen. Sonne mit Richtung (morgens von links, mittags von oben, abends von rechts), nachts Mond.
// Ab Abend: Laternen mit Lichtkegeln, erleuchtete Fenster (fenster_<zeit>.px.js), Lampen an den Gebäuden.
// Der Himmel bleibt unbeleuchtet. Lichtliste aus dem Spiel: lichter.px.js
const HOF = {
  //       Sonne/Mond: [x, y, Farbe, Stärke, Reichweite]       Umgebung               Lampen  Fenster Kegel
  morgen: { sonne: [95, 70, "#ffd4b0", 1.15, 700],  ambient: 0.68, amb: "#b8a8c8", lampen: 0.6, fenster: 0.35, kegel: 0 },
  tag:    { sonne: [175, 12, "#fff6e6", 1.2, 900],  ambient: 0.85, amb: "#c8d0e0", lampen: 0,   fenster: 0,    kegel: 0 },
  abend:  { sonne: [430, 95, "#ffa878", 1.15, 650], ambient: 0.66, amb: "#b09ab8", lampen: 1.0, fenster: 0.7,  kegel: 0.65 },
  nacht:  { sonne: [150, 27, "#9fb2ff", 0.55, 600], ambient: 0.34, amb: "#8a96c0", lampen: 1.35, fenster: 1.0, kegel: 1.0 },
}
const LICHT = (zeit) => { const z = HOF[zeit], W8 = "#ffd890"; return [
  layer("licht", (c) => {
    const [sx, sy, sc, sp, sr] = z.sonne; c.lamp(sx, sy, { r: sr, color: sc, power: sp })   // Sonne bzw. Mond
    if (!z.lampen) return
    for (const l of HOF_LICHTER) {
      const cx = Math.round(l.x + l.w / 2), cy = Math.round(l.y + l.h / 2)
      if (l.pool) {   // Laterne: runder Schein am Kopf und Kegel auf das Pflaster
        c.lamp(cx, cy, { r: 14, color: W8, power: 0.9 * z.lampen })
        KEGEL(c, cx, cy + 1, 18, { kegel: z.kegel * 0.7 }, W8, { breite: 4, wachsen: 0.6 })
      } else if (l.fire) c.lamp(cx, cy, { r: 16, color: l.c || W8, power: 0.9 * z.lampen * (l.a === undefined ? 1 : l.a) })   // Lämpchen an Gebäuden, Tor
      else if (z.fenster) c.lamp(cx, cy, { r: 9, color: W8, power: 0.85 * z.fenster })      // Fenster werfen etwas Licht nach draußen
    }
  }),
  lighting({ cell: 2, smooth: true, ambient: z.ambient, ambientColor: z.amb }),
  ...(FENSTER_KEYS ? [glow(FENSTER_KEYS, { r: 4, strength: 0.45 * z.fenster })] : []),
  ...(z.lampen ? [glow(KEY_AT(...HOF_LICHTER.filter(l => l.fire || l.pool).map(l => [l.x, l.y])), { r: 6, strength: 0.4 + 0.35 * z.lampen / 1.35 })] : [])]
}
