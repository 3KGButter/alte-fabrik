// Blechwerkstatt, Tageszeit: tag
include("blech_tag.px.js")
include("../../gemeinsam.px.js")
include("../../kegel.px.js")
include("../lampen.px.js")
scene("blech_tag_licht", { w: W, h: H }, ...RAUM(["wand"]), ...LICHT("tag"))
