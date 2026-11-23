// Leitraum, Tageszeit: abend
include("lr_abend.px.js")
include("../../kegel.px.js")
include("../lampen.px.js")
scene("lr_abend_licht", { w: W, h: H }, EBENE("himmel", { unlit: true }), EBENE("wand"), EBENE("gesamt"), ...LICHT("abend"))
