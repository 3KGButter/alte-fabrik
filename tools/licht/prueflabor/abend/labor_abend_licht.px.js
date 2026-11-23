// Prüflabor, Tageszeit: abend
include("labor_abend.px.js")
include("../../gemeinsam.px.js")
include("../../kegel.px.js")
include("../lampen.px.js")
scene("labor_abend_licht", { w: W, h: H }, ...RAUM(["wand"]), ...LICHT("abend"))
