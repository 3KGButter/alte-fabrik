// Werkshof, Tageszeit: abend
include("hof_abend.px.js")
include("../../kegel.px.js")
include("../lichter.px.js")
include("fenster_abend.px.js")
include("../lampen.px.js")
scene("hof_abend_licht", { w: W, h: H }, EBENE("himmel", { unlit: true }), ...Object.keys(E).filter(k => k !== "himmel").map(k => EBENE(k)), FENSTER, ...LICHT("abend"))
