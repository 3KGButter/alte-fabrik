// Katzenroboter (Seitenansicht, schaut nach rechts) – Posen als Skelett-Parameter, gezeichnet in einen
// Schlüsselpuffer und mit g umrandet. Zwei Größen: gross (S=1, Innenräume) und klein (S=.6, Werkshof).
pal({ g: '#4a4652', h: '#6b6672', i: '#8f8a92', j: '#b5afb0', l: '#d8d2cc', P: '#2f8a7e', Q: '#5ab8a0', x: '#23304f',
  z: '#4f86a6', A: '#7fb4c8', B: '#c2e2e6', H: '#f4ecdc', F: '#6b6672', I: '#8f8a92', u: '#b8474b', v: '#e0705a', w: '#f2a77a', D: '#c07a2a', E: '#e8a83a' })

const L = (a, b, t) => a + (b - a) * t
const LP = (a, b, t) => [L(a[0], b[0], t), L(a[1], b[1], t)]
const ease = t => t * t * (3 - 2 * t)
// Pose mischen: Zahlen, Punkte und Listen von Punkten
function mix(a, b, t) { const o = {}
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const x = a[k] === undefined ? b[k] : a[k], y = b[k] === undefined ? x : b[k]
    if (typeof x === 'number') o[k] = L(x, y, t)
    else if (Array.isArray(x) && Array.isArray(y) && typeof x[0] === 'number') o[k] = LP(x, y, t)
    else if (!Array.isArray(x) || !Array.isArray(y)) o[k] = t < .5 ? x : y
    else if (Array.isArray(x)) o[k] = x.map((p, i) => p && y[i] ? LP(p, y[i], t) : (t < .5 ? p : y[i]))
    else o[k] = t < .5 ? x : y }
  return o }

// ---------- Grundposen (Einheiten der großen Katze: Boden y=18, Breite 29) ----------
const STAND = { hip: [8, 9], chest: [17, 9], rh: 2.9, rc: 3, haunch: 0, hx: 9, hy: 12,
  head: [22.5, 5], neck: [19, 7.5], tilt: 0, eye: 'auf', ears: 0,
  tail: [[6, 8.5], [2, 7], [2.5, 1.5]],
  // Beine: [Wurzel relativ zu Hüfte/Brust, Pfote absolut, Gelenkrichtung]
  nhF: [8.5, 18], fhF: [7, 18], nfF: [17.5, 18], ffF: [16, 18], stripe: 1 }
const SIT = { ...STAND, hip: [9, 13.5], chest: [14.5, 8], rh: 3.6, rc: 3, haunch: 4, hx: 9, hy: 14.5,
  head: [17, 4], neck: [15.5, 6], tail: [[6, 16.5], [9, 19.5], [14, 17]],
  nhF: [12, 18], fhF: [10.5, 18], nfF: [15.5, 18], ffF: [14, 18], stripe: 0 }
const LIE = { ...SIT, hip: [9, 14.5], chest: [17, 14], rh: 3.4, rc: 3.1, haunch: 3.5, hx: 9, hy: 15,
  head: [21.5, 11.5], neck: [19.5, 13], tail: [[5.5, 15.5], [6, 19.5], [13, 18]],
  nhF: [12, 18], fhF: [11, 18], nfF: [22, 18], ffF: [20.5, 18], stripe: 1 }
const CURL = { ...LIE, hip: [11, 14], chest: [15, 14.8], rh: 4.2, rc: 3.4, haunch: 4.6, hx: 11, hy: 13.6,
  head: [18.6, 15.2], neck: [17, 15], tilt: .6, eye: 'zu', ears: 1, tail: [[7, 17.4], [13, 20.6], [21.6, 17.6]], tailFront: 1,
  nhF: null, fhF: null, nfF: null, ffF: null, stripe: 1 }
const STRETCH = { ...STAND, hip: [8, 8], chest: [16, 12.5], rh: 2.9, rc: 2.6, head: [21.5, 11], neck: [18.5, 12], tilt: 0,
  eye: 'zu', tail: [[6, 7.5], [2, 3], [5, 0.5]], nhF: [8, 18], fhF: [6.5, 18], nfF: [23.5, 18], ffF: [22, 18] }
const REAR = { ...SIT, hip: [9.5, 13.5], chest: [12.5, 6.5], rh: 3.4, rc: 2.8, haunch: 3.6, head: [15, 2.5], neck: [13.5, 4.5],
  tail: [[6.5, 16], [2, 17.5], [1, 13]], nhF: [11.5, 18], fhF: [10, 18], nfF: [16, 2], ffF: [17, 4], paws: 1 }

// ---------- Zeichnen ----------
function drawCat(c, S, p, extra) {
  const W = c.w, H = c.h, gy = H - 1, oy = gy - 18 * S
  const buf = Array.from({ length: H }, () => Array(W).fill(null))
  const X = v => v * S, Y = v => v * S + oy
  const set = (x, y, k) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) buf[y][x] = k }
  const disc = (cx, cy, r, k) => { for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++)
    if ((x + .5 - cx - .5) ** 2 + (y - cy) ** 2 <= r * r + .2) set(x, y, k) }
  const seg = (a, b, r0, r1, k) => { const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2))
    for (let i = 0; i <= n; i++) { const t = i / n; if (r0 < .7) set(L(a[0], b[0], t), L(a[1], b[1], t), k); else disc(L(a[0], b[0], t), L(a[1], b[1], t), L(r0, r1, t), k) } }
  const P2 = q => [X(q[0]), Y(q[1])]
  const big = S > .8, lw = big ? .75 : .3
  // Bein mit Gelenk: Hinterbein knickt nach hinten (Sprunggelenk), Vorderbein leicht nach hinten (Ellenbogen)
  const leg = (root, foot, back, k, direkt) => { if (!foot) return
    if (k === 'i') { const snap = buf.map(r => r.slice()); leg(root, foot, back, 'L', direkt)
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (buf[y][x] === 'L') { buf[y][x] = 'i'
        const lx = x - 1; if (lx >= 0 && snap[y][lx] && buf[y][lx] !== 'L' && snap[y][lx] !== 'g') buf[y][lx] = 'h' }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (buf[y][x] === 'i' && (y === 0 || !buf[y - 1][x])) buf[y][x] = 'j'
      return }
    if (direkt) { const a = P2(root), f = P2(foot); seg(a, f, lw, lw * .8, k); set(f[0], f[1], 'l'); if (big) set(f[0], f[1] + 1, 'l'); return }
    const a = P2(root), f = P2(foot), dx = f[0] - a[0], dy = f[1] - a[1], d = Math.hypot(dx, dy), len = 8.2 * S
    const h = d < len ? Math.sqrt((len / 2) ** 2 - (d / 2) ** 2) : 0, s = back ? 1 : -.35
    const m = [(a[0] + f[0]) / 2 - dy / d * h * s * (dx >= 0 ? 1 : 1), (a[1] + f[1]) / 2 + dx / d * h * s]
    // Gelenk zeigt bei aufrechtem Bein nach hinten (links)
    const j = [m[0] - Math.abs(m[0] - (a[0] + f[0]) / 2) * (back ? 1 : .35) * 0 , m[1]]
    const jj = back ? [Math.min(m[0], (a[0] + f[0]) / 2 - h * .9), m[1]] : [(a[0] + f[0]) / 2 - h * .35, m[1]]
    seg(a, jj, lw, lw, k); seg(jj, f, lw, lw * .8, k)
    set(f[0], f[1], 'g'); if (big) set(f[0] + 1, f[1], 'g') }
  const hipR = P2(p.hip), chR = P2(p.chest)
  // Wurzeln der Beine
  const rootH = [p.hip[0] + .5, p.hip[1] + p.rh * .55], rootF = [p.chest[0] + .3, p.chest[1] + p.rc * .55]
  // 1) ferne Beine
  leg([rootH[0] - 1.2, rootH[1] - .3], p.fhF, true, 'F')
  leg(p.paws ? [p.chest[0], p.chest[1]] : [rootF[0] - 1.2, rootF[1] - .3], p.ffF, false, 'F', p.paws)
  // 2) Schwanz (quadratische Bezierkurve, Gliederfarben, Leuchtspitze)
  const drawTail = () => { const [t0, t1, t2] = p.tail, tp = []
  for (let i = 0; i <= 26; i++) { const t = i / 26, a = LP(t0, t1, t), b = LP(t1, t2, t); tp.push(LP(a, b, t)) }
  tp.forEach((q, i) => { const t = i / 26, k = t > .9 ? 'Q' : (Math.floor(t * 7) % 2 ? 'h' : 'i')
    const pp = P2(q); if (big && t < .75) disc(pp[0], pp[1], .6, k); else set(pp[0], pp[1], k) }) }
  if (!p.tailFront) drawTail()
  // 3) Körper (Hüfte -> Brust) und Keule
  const body = new Set()
  const mark = () => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (buf[y][x] === 'i' && !body.has(y * W + x)) body.add(y * W + x) }
  if (p.haunch > .3) disc(X(p.hx), Y(p.hy), p.haunch * S, 'i')
  seg(hipR, chR, p.rh * S, p.rc * S, 'i')
  // Schattierung oben hell, unten dunkel (Licht von oben)
  const before = buf.map(r => r.slice())
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (buf[y][x] === 'i' && before[y][x] === 'i') {
    const up = y > 0 ? before[y - 1][x] : null, up2 = y > 1 ? before[y - 2][x] : null, dn = y < H - 1 ? before[y + 1][x] : null
    if (up !== 'i') buf[y][x] = 'l'; else if (big && up2 !== 'i') buf[y][x] = 'j'; else if (dn !== 'i' && dn !== 'h') buf[y][x] = 'h' }
  // Petrol-Streifen am Rücken
  if (p.stripe) { const n = 16; for (let i = 2; i < n - 1; i++) { const q = LP(p.hip, p.chest, i / n), r = L(p.rh, p.rc, i / n)
    set(X(q[0]), Y(q[1] - r * .35), 'P') } }
  // 4) nahe Beine
  leg(rootH, p.nhF, true, 'i')
  if (!p.paws) leg(rootF, p.nfF, false, 'i')
  // 5) Hals und Kopf
  const hd = P2(p.head), nk = P2(p.neck)
  seg(nk, [L(nk[0], hd[0], .5), L(nk[1], hd[1], .5)], 2 * S, 2.2 * S, 'i')
  const hr = 3.2 * S
  disc(hd[0], hd[1], hr, 'i')
  for (let y = Math.floor(hd[1] - hr - 1); y <= hd[1] + hr + 1; y++) for (let x = Math.floor(hd[0] - hr - 1); x <= hd[0] + hr + 1; x++) {
    const yy = Math.round(y), xx = Math.round(x); if (yy < 0 || yy >= H || xx < 0 || xx >= W || buf[yy][xx] !== 'i') continue
    const dy = y - hd[1], dx = x - hd[0]; if (dx * dx + dy * dy > hr * hr + .2) continue
    if (dy < -hr * .55) buf[yy][xx] = 'l'; else if (big && dy < -hr * .2 && dx < 0) buf[yy][xx] = 'j'; else if (dy > hr * .6) buf[yy][xx] = 'h' }
  // Ohren (ears=1: angelegt)
  const ear = (ex, far) => { const flat = p.ears; for (let j = 0; j < (big ? 3 : 2); j++) for (let i = 0; i <= j * .7; i++) {
    const x = hd[0] + ex * S + i - j * (.35 + flat * .6), y = hd[1] - hr - (big ? 2.4 : 1.4) + j + flat * (big ? 1.5 : 1)
    set(x, y, (big && i > 0 && j > 1 && !far) ? 'Q' : far ? 'h' : 'i') } }
  ear(-2.2, true); ear(.6, false)
  // Visier und Auge
  const vy = hd[1] + p.tilt * S * .8
  for (let y = vy - (big ? 1 : .5); y <= vy + (big ? 1 : .5); y++) for (let x = hd[0] + .3 * S; x <= hd[0] + 3.4 * S; x++) set(x, y, 'x')
  const ex = hd[0] + 2.2 * S, ey = vy - (big ? .3 : 0)
  if (p.eye === 'auf') { set(ex, ey, 'B'); if (big) set(ex + 1, ey, 'A') }
  else if (p.eye === 'blinz') { set(ex, ey, 'z') }
  else if (p.eye === 'froh') { if (big) { set(ex - .5, ey, 'A'); set(ex + .5, ey - 1, 'B'); set(ex + 1.5, ey, 'A') } else set(ex, ey - .5, 'A') }
  else { set(ex, ey + (big ? .7 : .4), 'z'); if (big) set(ex + 1, ey + .7, 'z') }
  set(hd[0] + 3.7 * S, hd[1] + 1.6 * S + p.tilt * S * .5, 'h')   // Schnauze
  if (extra) extra(set, X, Y, big)
  if (p.paws) leg([p.chest[0] + 1, p.chest[1] + .5], p.nfF, false, 'i', 1)
  if (p.tailFront) drawTail()
  // hellere Stahlschale wie bisher im Spiel: eine Stufe heller, ferne Beine bleiben dunkel
  const UP = { i: 'j', j: 'l', l: 'H', h: 'I', F: 'h' }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (buf[y][x]) c.px(x, y, UP[buf[y][x]] || buf[y][x])
}

// ---------- Animationen ----------
const SIZES = { gross: { S: 1, w: 29, h: 19 }, klein: { S: .6, w: 17, h: 12 } }
function mk(name, frames, fps, poseOf, opts = {}) {
  for (const [sz, d] of Object.entries(SIZES)) {
    const h = Math.ceil(d.h + (opts.hoch || 0) * d.S)
    anim(name + '_' + sz, { w: d.w, h, frames, fps, outline: 'g', loop: opts.loop !== false }, c => {
      const r = poseOf(c.frame, c.phase); drawCat(c, d.S, r.p || r, r.extra) })
  }
}

// Laufen: Kreuzgang LH, LV, RH, RV; Standphase 60 %, Schwungphase mit gehobener Pfote
mk('laufen', 8, 10, (k, ph) => {
  const foot = (x0, phase) => { const q = ((k / 8 + phase) % 1 + 1) % 1, A = 2.4
    if (q < .6) return [x0 + A - 2 * A * q / .6, 18]
    const t = (q - .6) / .4, e = ease(t); return [x0 - A + 2 * A * e, 18 - Math.sin(t * Math.PI) * 1.6] }
  const bob = Math.round(Math.max(0, Math.cos(ph * Math.PI * 4)) * .9) * .7, sway = Math.sin(ph * Math.PI * 2)
  return { ...STAND, hip: [8, 9 + bob * .6], chest: [17, 9 + bob], head: [22.5, 5 + bob * .6], neck: [19, 7.5 + bob],
    tail: [[6, 8.5 + bob * .5], [2 + sway * .4, 7], [2.5 + sway * 1.2, 1.5]],
    nhF: foot(8.5, 0), nfF: foot(17.5, .25), fhF: foot(7, .5), ffF: foot(16, .75) } })

// Stehen und Sitzen (Schwanz pendelt)
mk('stehen', 4, 3, k => { const s = [-1, -.35, .35, 1][k]; return { ...STAND, tail: [[6, 8.5], [2 + s * .5, 7], [2.5 + s * 1.5, 1.5]] } })
mk('sitzen', 4, 3, k => { const s = [-1, -.35, .35, 1][k]; return { ...SIT, tail: [[6, 16.5], [9, 19.5], [14 + s * .6, 17 - Math.abs(s) * .6]] } })
mk('blinzeln', 4, 3, k => { const s = [-1, -.35, .35, 1][k]; return { ...SIT, eye: 'blinz', tail: [[6, 16.5], [9, 19.5], [14 + s * .6, 17 - Math.abs(s) * .6]] } })

// Zusammenrollen: Sitzen -> Hinlegen -> Einrollen (einmal), dann Schlafen (Atmen)
const KR = [[SIT, 0], [LIE, .45], [CURL, 1]]
const along = t => { for (let i = 0; i < KR.length - 1; i++) { const [a, ta] = KR[i], [b, tb] = KR[i + 1]
  if (t <= tb) return mix(a, b, ease((t - ta) / (tb - ta))) } return CURL }
mk('einrollen', 7, 7, k => along(k / 6), { loop: false })
mk('schlafen', 8, 4, (k, ph) => { const b = (1 - Math.cos(ph * Math.PI * 2)) / 2
  return { ...CURL, rh: 4.2 + b * .45, rc: 3.4 + b * .35, haunch: 4.6 + b * .45, tail: [[7, 17.4], [13, 20.6], [21.6, 17.6 - (k === 5 ? .6 : 0)]] } })
mk('aufstehen', 7, 7, k => along(1 - k / 6), { loop: false })

// Schnurren: sitzt, Augen froh zu, Körper vibriert, kleine Schallwellen am Hals
mk('schnurren', 8, 10, (k, ph) => { const v = k % 2 ? .35 : 0
  return { p: { ...SIT, eye: 'froh', ears: .3,
    tail: [[6, 16.5], [9, 19.5], [14 + Math.sin(ph * 6.28) * .6, 17]] },
    extra: (set, X, Y, big) => { const w = Math.floor(k / 2) % 4; if (w === 3) return   // Schallbögen wandern von der Brust nach außen
      const x0 = 19 + w * 1.6, c = w === 2 ? 'P' : 'Q'
      set(X(x0), Y(10.2), c); set(X(x0 + .9), Y(11.4), c); set(X(x0), Y(12.6), c) } } })

// Strecken: vorne runter, Hinterteil hoch, halten, wieder hoch
const SK = [0, .15, .35, .55, .75, .9, 1, 1, 1, 1, 1, 1, 1, 1, .9, .75, .55, .35, .15, 0]
mk('strecken', SK.length, 7, k => mix(STAND, STRETCH, ease(SK[k])), { loop: false })

// Ball fangen: Ball kommt im Bogen von rechts oben, Katze stellt sich auf, fängt ihn mit den Pfoten,
// hält ihn kurz und lässt ihn nach vorne wegrollen
const BALL = [[31, -5], [28, -4], [25, -1.5], [22, 2.5], null, null, null, null, [20, 15], [24, 17], [28, 17]]
const RK = [0, .3, .65, .95, 1, 1, .9, .55, .2, 0, 0]
mk('ball', RK.length, 9, k => { const t = ease(RK[k]), p = mix(SIT, REAR, t)
  if (t > .4) { const dn = k >= 4 && k <= 7 ? (k - 4) * 1.2 : k > 7 ? 4 : 0
    p.nfF = [p.head[0] + 4.2, p.head[1] + 4.6 + dn]; p.ffF = [p.head[0] + 5.2, p.head[1] + 3.4 + dn]; p.paws = 1 } else p.paws = 0
  return { p, extra: (set, X, Y, big) => {
    let b = BALL[k]; if (!b) b = [p.head[0] + 5.8, p.head[1] + 2.4 + (k - 4) * 1.2]
    const r = big ? 1.6 : .9, cx = X(b[0]), cy = Y(b[1])
    if (!big) { set(cx, cy, 'w'); set(cx + 1, cy, 'v'); set(cx, cy + 1, 'v'); set(cx + 1, cy + 1, 'u'); return }
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) { const d = x * x + y * y; if (d <= r * r + .3) set(cx + x, cy + y, (x < 0 && y < 0) ? 'w' : y > 0 ? 'u' : 'v') }
    if (big) set(cx, cy, 'E') } } }, { hoch: 8, loop: false })
