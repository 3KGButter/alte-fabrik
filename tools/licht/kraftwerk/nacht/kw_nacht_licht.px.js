// Kraftwerk, Tageszeit: nacht
include("kw_nacht.px.js")
include("../../gemeinsam.px.js")
include("../../kegel.px.js")
include("zusatz_nacht.px.js")
include("../lampen.px.js")
scene("kw_nacht_licht", { w: W, h: H }, ...RAUM(["wand"]), BODENSTRAHLER, ...LICHT("nacht"))
