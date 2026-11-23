// Kraftwerk, Tageszeit: tag
include("kw_tag.px.js")
include("../../gemeinsam.px.js")
include("../../kegel.px.js")
include("zusatz_tag.px.js")
include("../lampen.px.js")
scene("kw_tag_licht", { w: W, h: H }, ...RAUM(["wand"]), BODENSTRAHLER, ...LICHT("tag"))
