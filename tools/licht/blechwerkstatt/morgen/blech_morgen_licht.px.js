// Blechwerkstatt, Tageszeit: morgen
include("blech_morgen.px.js")
include("../../gemeinsam.px.js")
include("../../kegel.px.js")
include("../lampen.px.js")
scene("blech_morgen_licht", { w: W, h: H }, ...RAUM(["wand"]), ...LICHT("morgen"))
