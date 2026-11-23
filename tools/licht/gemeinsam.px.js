// Gemeinsam für alle Räume: Tageszeiten (wie im freigegebenen Pförtnerhaus) und Ebenen-Helfer.
// Ambient tagsüber 0.38, nachts etwas weniger, damit die Lampen stärker wirken. Das Dunklerwerden selbst macht das Spiel (Tönung).
const ZEITEN = {
  morgen: { fenster: ["#ffd8c4", 0.85], lampen: 0.9,  klein: 0.8, schein: 0.45, ambient: 0.38, raum: 0.9,  warm: "#ffe0a8", kegel: 0 },
  tag:    { fenster: ["#f6efe0", 0.95], lampen: 1.0,  klein: 0.8, schein: 0.45, ambient: 0.38, raum: 1.0,  warm: "#ffe0a8", kegel: 0 },
  abend:  { fenster: ["#ffb27a", 0.75], lampen: 1.1,  klein: 0.9, schein: 0.6,  ambient: 0.36, raum: 0.7,  warm: "#ffcc80", kegel: 0.65, rund: 0.2 },
  nacht:  { fenster: ["#9fb2ff", 0.3],  lampen: 1.35, klein: 1.1, schein: 0.85, ambient: 0.28, raum: 0.3,  warm: "#ffc070", kegel: 1.0,  rund: 0.45 },
  // raum: Stärke des weiten Raumlichts. Abends und nachts weniger, damit die Lichtkegel der Lampen deutlich hervortreten.
  // kegel: Lichtkegel nach unten (kegel.px.js), nur abends und nachts.
  // warm: Farbe der warmen Lampen. Abends und nachts satter, damit sie sich gegen die blaue Tönung behaupten.
}
const WARM = "#ffe0a8"
// Raum aus den übernommenen Ebenen: Himmel unbeleuchtet, Wände (Licht geht durch, kein Himmelslicht)
const RAUM = (waende = ["wand"]) => [EBENE("himmel", { unlit: true }), ...Object.keys(E).filter(k => k !== "himmel").map(k => EBENE(k, waende.includes(k) ? { wall: true } : {}))]
const BELEUCHTUNG = (z) => lighting({ cell: 2, smooth: true, ambient: z.ambient, ambientColor: "#9aa6c8" })
