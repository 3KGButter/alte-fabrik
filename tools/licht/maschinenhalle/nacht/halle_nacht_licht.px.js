// Maschinenhalle, Tageszeit: nacht
include("halle_nacht.px.js")
include("../../gemeinsam.px.js")
include("../../kegel.px.js")
include("../lampen.px.js")
scene("halle_nacht_licht", { w: W, h: H }, ...RAUM(["wand", "hallenwand"]), ...LICHT("nacht"))
