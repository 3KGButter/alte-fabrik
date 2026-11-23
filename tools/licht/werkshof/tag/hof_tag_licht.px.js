// Werkshof, Tageszeit: tag
include("hof_tag.px.js")
include("../../kegel.px.js")
include("../lichter.px.js")
include("fenster_tag.px.js")
include("../lampen.px.js")
scene("hof_tag_licht", { w: W, h: H }, EBENE("himmel", { unlit: true }), ...Object.keys(E).filter(k => k !== "himmel").map(k => EBENE(k)), FENSTER, ...LICHT("tag"))
