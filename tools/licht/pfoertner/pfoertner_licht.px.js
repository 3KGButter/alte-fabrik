// Pförtnerhaus mit Licht, Tageszeit Tag (freigegeben). Lampen und Zeiten: lampen.px.js
include("pfoertner.px.js")
include("../kegel.px.js")
include("lampen.px.js")
scene("pfoertner_licht", { w: W, h: H }, ...RAUM(), ...LICHT("tag"))
