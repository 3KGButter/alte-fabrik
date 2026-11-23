// Leitraum, Tageszeit: morgen
include("lr_morgen.px.js")
include("../../kegel.px.js")
include("../lampen.px.js")
scene("lr_morgen_licht", { w: W, h: H }, EBENE("himmel", { unlit: true }), EBENE("wand"), EBENE("gesamt"), ...LICHT("morgen"))
