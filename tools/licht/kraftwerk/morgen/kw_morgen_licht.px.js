// Kraftwerk, Tageszeit: morgen
include("kw_morgen.px.js")
include("../../gemeinsam.px.js")
include("../../kegel.px.js")
include("zusatz_morgen.px.js")
include("../lampen.px.js")
scene("kw_morgen_licht", { w: W, h: H }, ...RAUM(["wand"]), BODENSTRAHLER, ...LICHT("morgen"))
