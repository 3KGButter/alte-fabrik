// Lichtkegel: pxl-Lampen strahlen rund. Für einen Kegel reihen wir in Strahlrichtung dicht weitere Lichtpunkte auf,
// die zum Ende hin breiter und etwas schwächer werden und zu einem Kegel verschmelzen.
// Stärke über 1: nachts muss der Kegel heller sein als der vom Spiel abgedunkelte Raum. Stärke je Tageszeit über z.kegel.
// o.breite: Breite der Leuchte (Lichtleisten) – die Reihen liegen dann nur 3 px auseinander, damit keine Streifen entstehen.
// o.dx, o.dy: Strahlrichtung (Standard: senkrecht nach unten). o.wachsen: wie stark der Kegel nach unten breiter wird.
// o.staerke: eigener Faktor (Standard z.kegel).
const KEGEL = (c, x, y, lang, z, farbe, o = {}) => {
  const k = o.staerke !== undefined ? o.staerke : z.kegel
  if (!k) return
  const b = o.breite || 0, dl = Math.hypot(o.dx || 0, o.dy === undefined ? 1 : o.dy), dx = (o.dx || 0) / dl, dy = (o.dy === undefined ? 1 : o.dy) / dl
  const n = Math.max(8, Math.round(lang / 5)), spalten = b ? Math.round(b / 3) + 1 : 1, w = o.wachsen === undefined ? 0.45 : o.wachsen
  for (let s = 0; s < spalten; s++) {
    const off = spalten === 1 ? 0 : -b / 2 + b * s / (spalten - 1)
    for (let i = 1; i <= n; i++) { const f = i / n
      c.lamp(Math.round(x + off + dx * lang * f), Math.round(y + dy * lang * f), { r: Math.round(14 + lang * w * f), color: farbe, power: k * (1.55 - 0.45 * f) }) }
  }
}
// Runde Lampenreichweite nachts verkleinern: die Lampe leuchtet dann vor allem nach unten (z.rund, nur nachts)
const RUND = (r, z) => Math.round(r * (1 - (z.rund || 0)))
// Bodenstrahler: gemeinsame Stärke je Tageszeit (Tag kaum sichtbar, Morgen/Abend schwach, Nacht am deutlichsten) und warmweißes Licht
const STRAHLER = { morgen: 0.5, tag: 0.28, abend: 0.55, nacht: 1.0 }, STRAHLER_FARBE = "#ffdcaa"
