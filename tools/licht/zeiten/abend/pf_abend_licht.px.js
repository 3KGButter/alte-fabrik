// Pförtnerhaus um diese Tageszeit: abend
include("pf_abend.px.js")
include("../../kegel.px.js")
include("../../pfoertner/lampen.px.js")
scene("pf_abend_licht", { w: W, h: H }, ...RAUM(), ...LICHT("abend"))
