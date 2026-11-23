// Prüflabor, Tageszeit: morgen
include("labor_morgen.px.js")
include("../../gemeinsam.px.js")
include("../../kegel.px.js")
include("../lampen.px.js")
scene("labor_morgen_licht", { w: W, h: H }, ...RAUM(["wand"]), ...LICHT("morgen"))
