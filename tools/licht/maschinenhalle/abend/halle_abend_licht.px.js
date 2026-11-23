// Maschinenhalle, Tageszeit: abend
include("halle_abend.px.js")
include("../../gemeinsam.px.js")
include("../../kegel.px.js")
include("../lampen.px.js")
scene("halle_abend_licht", { w: W, h: H }, ...RAUM(["wand", "hallenwand"]), ...LICHT("abend"))
