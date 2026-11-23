// Prüflabor, Tageszeit: tag
include("labor_tag.px.js")
include("../../gemeinsam.px.js")
include("../../kegel.px.js")
include("../lampen.px.js")
scene("labor_tag_licht", { w: W, h: H }, ...RAUM(["wand"]), ...LICHT("tag"))
