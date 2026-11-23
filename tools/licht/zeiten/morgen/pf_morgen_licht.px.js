// Pförtnerhaus um diese Tageszeit: morgen
include("pf_morgen.px.js")
include("../../kegel.px.js")
include("../../pfoertner/lampen.px.js")
scene("pf_morgen_licht", { w: W, h: H }, ...RAUM(), ...LICHT("morgen"))
