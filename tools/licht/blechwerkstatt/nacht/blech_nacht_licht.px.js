// Blechwerkstatt, Tageszeit: nacht
include("blech_nacht.px.js")
include("../../gemeinsam.px.js")
include("../../kegel.px.js")
include("../lampen.px.js")
scene("blech_nacht_licht", { w: W, h: H }, ...RAUM(["wand"]), ...LICHT("nacht"))
