// Werkshof, Tageszeit: nacht
include("hof_nacht.px.js")
include("../../kegel.px.js")
include("../lichter.px.js")
include("fenster_nacht.px.js")
include("../lampen.px.js")
scene("hof_nacht_licht", { w: W, h: H }, EBENE("himmel", { unlit: true }), ...Object.keys(E).filter(k => k !== "himmel").map(k => EBENE(k)), FENSTER, ...LICHT("nacht"))
