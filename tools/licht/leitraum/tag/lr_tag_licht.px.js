// Leitraum, Tageszeit: tag
include("lr_tag.px.js")
include("../../kegel.px.js")
include("../lampen.px.js")
scene("lr_tag_licht", { w: W, h: H }, EBENE("himmel", { unlit: true }), EBENE("wand"), EBENE("gesamt"), ...LICHT("tag"))
