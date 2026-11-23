// Werkshof, Tageszeit: morgen
include("hof_morgen.px.js")
include("../../kegel.px.js")
include("../lichter.px.js")
include("fenster_morgen.px.js")
include("../lampen.px.js")
scene("hof_morgen_licht", { w: W, h: H }, EBENE("himmel", { unlit: true }), ...Object.keys(E).filter(k => k !== "himmel").map(k => EBENE(k)), FENSTER, ...LICHT("morgen"))
