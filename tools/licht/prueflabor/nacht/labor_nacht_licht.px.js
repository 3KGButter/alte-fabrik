// Prüflabor, Tageszeit: nacht
include("labor_nacht.px.js")
include("../../gemeinsam.px.js")
include("../../kegel.px.js")
include("../lampen.px.js")
scene("labor_nacht_licht", { w: W, h: H }, ...RAUM(["wand"]), ...LICHT("nacht"))
