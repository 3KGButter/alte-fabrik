// Pförtnerhaus um diese Tageszeit: nacht
include("pf_nacht.px.js")
include("../../kegel.px.js")
include("../../pfoertner/lampen.px.js")
scene("pf_nacht_licht", { w: W, h: H }, ...RAUM(), ...LICHT("nacht"))
