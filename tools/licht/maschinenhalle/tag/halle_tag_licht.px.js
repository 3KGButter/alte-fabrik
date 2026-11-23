// Maschinenhalle, Tageszeit: tag
include("halle_tag.px.js")
include("../../gemeinsam.px.js")
include("../../kegel.px.js")
include("../lampen.px.js")
scene("halle_tag_licht", { w: W, h: H }, ...RAUM(["wand", "hallenwand"]), ...LICHT("tag"))
