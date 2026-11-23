// Leitraum, Tageszeit: nacht
include("lr_nacht.px.js")
include("../../kegel.px.js")
include("../lampen.px.js")
scene("lr_nacht_licht", { w: W, h: H }, EBENE("himmel", { unlit: true }), EBENE("wand"), EBENE("gesamt"), ...LICHT("nacht"))
