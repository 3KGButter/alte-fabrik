// Kraftwerk, Tageszeit: abend
include("kw_abend.px.js")
include("../../gemeinsam.px.js")
include("../../kegel.px.js")
include("zusatz_abend.px.js")
include("../lampen.px.js")
scene("kw_abend_licht", { w: W, h: H }, ...RAUM(["wand"]), BODENSTRAHLER, ...LICHT("abend"))
