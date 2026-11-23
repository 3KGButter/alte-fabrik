// Maschinenhalle, Tageszeit: morgen
include("halle_morgen.px.js")
include("../../gemeinsam.px.js")
include("../../kegel.px.js")
include("../lampen.px.js")
scene("halle_morgen_licht", { w: W, h: H }, ...RAUM(["wand", "hallenwand"]), ...LICHT("morgen"))
