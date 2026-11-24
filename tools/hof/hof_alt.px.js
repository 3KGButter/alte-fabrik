// Werkshof: kleine Arbeiter und Eule – neu mit pxl. Palette = Spielpalette (gleiche Schlüssel), Varianten über Farbtausch.
pal({ a: '#3e2731', b: '#5c3a2e', c: '#7f5236', d: '#a5703f', e: '#cf9a5c', f: '#ecc58c', g: '#4a4652', h: '#6b6672', i: '#8f8a92', j: '#b5afb0',
  l: '#d8d2cc', x: '#23304f', y: '#355a7a', z: '#4f86a6', A: '#7fb4c8', B: '#c2e2e6', C: '#7a4a1c', D: '#c07a2a', E: '#e8a83a', F: '#f7d86a',
  G: '#fff3c0', H: '#f4ecdc', I: '#d9cbb3', R: '#f0c09a', S: '#c88a6a', T: '#3b3f4a', U: '#2a2440', V: '#ff9a3c', W: '#ffd56a', '~': '#1c1622' })

// Fünf Menschen, die sich unterscheiden: Hautton, Kopfbedeckung (Helm, Mütze, Kappe), Frisur (Zopf, Bart, Schnauzer), Größe, Kleidung
const VS = [
  { h1: 'F', h2: 'E', h3: 'D', hat: 'helm', s1: 'R', s2: 'S', hair: 'b', j1: 'A', j2: 'z', j3: 'y', p1: 'x', p2: 'U', boot: 'a', bib: 1 },                         // gelber Helm, Latzhose
  { h1: 'l', h2: 'j', h3: 'i', hat: 'helm', s1: 'e', s2: 'd', hair: 'E', zopf: 1, j1: 'Q', j2: 'P', j3: 'O', p1: 'g', p2: 'a', boot: 'a', klein: 1 },           // weißer Helm, Zopf, kleiner
  { h1: 'v', h2: 'u', h3: 't', hat: 'muetze', s1: 'R', s2: 'S', hair: 'C', bart: 1, j1: 'j', j2: 'i', j3: 'h', p1: 'x', p2: 'U', boot: 'b' },                  // rote Wollmütze, roter Vollbart
  { h1: 'F', h2: 'E', h3: 'D', hat: 'helm', s1: 'c', s2: 'b', hair: 'a', j1: 'v', j2: 'u', j3: 't', p1: 'h', p2: 'g', boot: 'a', bib: 1 },                     // dunkle Haut, rote Jacke
  { h1: 'z', h2: 'y', h3: 'x', hat: 'kappe', s1: 'e', s2: 'd', hair: 'i', schnauz: 1, j1: 'f', j2: 'e', j3: 'd', p1: 'o', p2: 'n', boot: 'b' } ]               // Schirmkappe, graues Haar, Schnauzer
const V0 = VS[0]
pal({ o: '#467a42', n: '#2f5a3a', t: '#8c3040', u: '#b8474b', v: '#e0705a', O: '#1f5a5a', P: '#2f8a7e', Q: '#5ab8a0', a: '#3e2731' })

function Fig(W, H) {
  const b = Array.from({ length: H }, () => Array(W).fill(null))
  const o = { W, H, b }
  o.set = (x, y, k) => { x = Math.round(x); y = Math.round(y); if (k && x >= 0 && y >= 0 && x < W && y < H) b[y][x] = k }
  o.line = (x0, y0, x1, y1, k) => { const n = Math.max(Math.abs(Math.round(x1) - Math.round(x0)), Math.abs(Math.round(y1) - Math.round(y0)), 1); for (let i = 0; i <= n; i++) o.set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, k) }
  o.out = c => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (b[y][x]) c.px(x, y, b[y][x]) }
  return o
}

// ---------------- Seitenansicht (schaut nach rechts), 9 x 14 wie bisher, Boden y = 13 ----------------
// Schmal wie die alten Figuren: Rumpf 4 px, Kopf 3 px, Beine 1 px; der Umriss kommt im Spiel weich dazu.
function side(c, v, q) {
  const g = Fig(c.w, c.h), B = q.bob || 0, hx = 3.5, hipY = 9 + B
  const leg = (F, k) => { const fx = Math.round(hx + F[0]), fy = 12 - (F[1] || 0), kx = hx + (F[0] + (F[1] ? 1.5 : 0)) * .5, ky = hipY + 1.6 - (F[1] ? .6 : 0)
    g.line(hx, hipY, kx, ky, k); g.line(kx, ky, fx, fy, k); g.set(fx, fy + 1, v.boot); g.set(fx + 1, fy + 1, v.boot) }
  const arm = (A, k) => { const sx = 3.5, sy = 5.5 + B + (v.klein ? .6 : 0), wx = sx + A[0], wy = sy + 3 + (A[1] || 0)
    g.line(sx, sy, sx + A[0] * .4, sy + 1.6, k); g.line(sx + A[0] * .4, sy + 1.6, wx, wy - 1, k); g.set(wx, wy, v.s1) }
  if (!q.carry) arm(q.fa, v.p2)
  leg(q.ff, v.p2)
  for (let y = v.klein ? 6 : 5; y <= 8; y++) for (let x = 2; x <= 5; x++) g.set(x, y + B, y === 8 ? (x === 2 || x === 5 ? v.p2 : v.p1) : x === 2 ? v.j1 : x === 3 ? v.j2 : v.j3)
  if (v.bib) { g.set(4, 6 + B, v.p1); g.set(4, 7 + B, v.p1); g.set(5, 7 + B, v.p1) }
  leg(q.nf, v.p1)
  const hy = B + (v.klein ? 1 : 0)
  const hat = { helm: [[3, 0, 'h1'], [4, 0, 'h1'], [5, 0, 'h2'], [2, 1, 'h2'], [3, 1, 'h1'], [4, 1, 'h1'], [5, 1, 'h1'], [6, 1, 'h2'], [2, 2, 'h2'], [3, 2, 'h2'], [4, 2, 'h2'], [5, 2, 'h2'], [6, 2, 'h2'], [7, 2, 'h3']],
    muetze: [[3, 0, 'h3'], [3, 1, 'h1'], [4, 1, 'h1'], [5, 1, 'h2'], [2, 2, 'h3'], [3, 2, 'h2'], [4, 2, 'h2'], [5, 2, 'h2']],
    kappe: [[3, 1, 'h1'], [4, 1, 'h1'], [5, 1, 'h2'], [2, 2, 'h2'], [3, 2, 'h2'], [4, 2, 'h2'], [5, 2, 'h2'], [6, 2, 'h3'], [7, 2, 'h3']] }[v.hat]
  hat.forEach(([x, y, k]) => g.set(x, y + hy, v[k]))
  for (const [x, y, k] of [[2, 3, v.hair], [3, 3, v.hair], [4, 3, v.s1], [5, 3, v.s1], [3, 4, v.hair], [4, 4, v.s2], [5, 4, v.s1]]) g.set(x, y + hy, k)
  if (v.zopf) { g.set(2, 4 + hy, v.hair); g.set(1, 4 + hy, v.hair); g.set(1, 5 + hy, v.hair) }
  if (v.bart) { g.set(4, 4 + hy, v.hair); g.set(5, 4 + hy, v.hair) }
  if (v.schnauz) g.set(5, 4 + hy, v.hair)
  if (q.carry) { const by = 5 + B; for (let y = by; y <= by + 2; y++) for (let x = 5; x <= 7; x++) g.set(x, y, y === by ? 'e' : x === 7 ? 'c' : 'd'); g.set(6, by + 1, 'C')
    g.line(3.5, 5.5 + B, 5, 6.5 + B, v.j3); g.set(5, 7 + B, v.s1) }
  else arm(q.na, v.j3)
  g.out(c)
}

// Gehen: 8 Bilder. Fuß [vor/zurück, Höhe]; Kontakt bei 0 und 4 (Körper sackt 1 px)
const STEP = [[2, 0], [1, 0], [.3, 0], [-.5, 0], [-1.5, 0], [-1.6, 1], [-.2, 1.6], [1.4, 1]]
const walkQ = (k, carry) => { const n = STEP[k % 8], f = STEP[(k + 4) % 8]
  return { bob: k % 4 === 0 ? 1 : 0, nf: n, ff: f, na: [-n[0] * .6, 0], fa: [-f[0] * .6, 0], carry } }
anim('hof_gehen', { w: 9, h: 14, frames: 8, fps: 10, }, c => side(c, V0, walkQ(c.frame)))
anim('hof_tragen', { w: 9, h: 14, frames: 8, fps: 10, }, c => side(c, V0, walkQ(c.frame, 1)))
anim('hof_stehen', { w: 9, h: 14, frames: 8, fps: 4, }, c => side(c, V0, { bob: 0, nf: [.5, 0], ff: [-.5, 0], na: [.3, 0], fa: [-.3, 0] }))

// ---------------- Vorderansicht / Rückenansicht, 9 x 14 ----------------
function front(c, v, k, back) {
  const g = Fig(c.w, c.h), wk = k < 4, ph = k % 4, B = wk && ph % 2 === 0 ? 1 : 0, L = wk ? [0, 1, 0, 0][ph] : 0, R2 = wk ? [0, 0, 0, 1][ph] : 0
  // Beine 1 px mit Lücke, Stiefel
  for (let y = 9 + B; y <= 11 - L; y++) g.set(3, y, v.p1)
  for (let y = 9 + B; y <= 11 - R2; y++) g.set(5, y, v.p1)
  g.set(3, 12 - L, v.boot); g.set(5, 12 - R2, v.boot)
  // Rumpf 3 px, Arme direkt daneben (zusammen 5 px wie bisher)
  for (let y = v.klein ? 6 : 5; y <= 8; y++) for (let x = 3; x <= 5; x++) g.set(x, y + B, y === 8 ? v.p2 : x === 3 ? v.j1 : v.j2)
  if (v.bib && !back) { g.set(3, 6 + B, v.p1); g.set(5, 6 + B, v.p1); g.set(3, 7 + B, v.p1); g.set(4, 7 + B, v.p1); g.set(5, 7 + B, v.p1) }
  const aL = wk ? [0, -1, 0, 1][ph] : 0
  for (const [x, d] of [[2, aL], [6, -aL]]) { if (!v.klein) g.set(x, 5 + B, v.j3); g.set(x, 6 + B, v.j3); g.set(x, 7 + B + Math.max(0, d), v.j3); g.set(x, 8 + B + d, v.s1) }
  // Kopf je Variante: Helm (Kuppel 3, Schirm 5), Mütze mit Bommel, Kappe mit Schirm vorn
  const hy = B + (v.klein ? 1 : 0), H = k2 => v[k2]
  if (v.hat === 'helm') { g.set(3, hy, H('h1')); g.set(4, hy, H('h1')); g.set(5, hy, H('h2')); for (let x = 2; x <= 6; x++) { g.set(x, 1 + hy, x === 2 || x === 6 ? H('h2') : H('h1')); g.set(x, 2 + hy, x === 2 || x === 6 ? H('h3') : H('h2')) } }
  else if (v.hat === 'muetze') { g.set(4, hy, H('h3')); for (let x = 3; x <= 5; x++) { g.set(x, 1 + hy, x === 5 ? H('h2') : H('h1')); g.set(x, 2 + hy, H('h2')) } g.set(2, 2 + hy, H('h3')); g.set(6, 2 + hy, H('h3')) }
  else { for (let x = 3; x <= 5; x++) g.set(x, 1 + hy, x === 5 ? H('h2') : H('h1')); g.set(2, 2 + hy, H('h2')); g.set(6, 2 + hy, H('h2')); for (let x = 3; x <= 5; x++) g.set(x, 2 + hy, back ? H('h2') : H('h3')) }
  for (let x = 3; x <= 5; x++) { g.set(x, 3 + hy, back ? v.hair : v.s1); g.set(x, 4 + hy, back ? v.s2 : v.s1) }
  if (!back) { const eye = v.s1 === 'c' ? 'U' : 'a'; g.set(3, 3 + hy, eye); g.set(5, 3 + hy, eye); g.set(4, 4 + hy, v.s2)
    if (v.bart) { g.set(3, 4 + hy, v.hair); g.set(4, 4 + hy, v.hair); g.set(5, 4 + hy, v.hair) } if (v.schnauz) g.set(4, 4 + hy, v.hair)
    if (v.zopf) { g.set(2, 3 + hy, v.hair); g.set(6, 3 + hy, v.hair) } }
  else if (v.zopf) { g.set(4, 5 + hy, v.hair); g.set(4, 6 + hy, v.hair) }
  g.out(c)
}
VS.forEach((v, i) => { anim('v' + i + '_gehen', { w: 9, h: 14, frames: 8, fps: 10 }, c => side(c, v, walkQ(c.frame))); anim('v' + i + '_stehen', { w: 9, h: 14, frames: 1, fps: 1 }, c => side(c, v, { bob: 0, nf: [.5, 0], ff: [-.5, 0], na: [.3, 0], fa: [-.3, 0] })); anim('v' + i + '_vorn', { w: 9, h: 14, frames: 4, fps: 6 }, c => front(c, v, c.frame)); anim('v' + i + '_hinten', { w: 9, h: 14, frames: 4, fps: 6 }, c => front(c, v, c.frame, 1)) })
anim('hof_vorn', { w: 9, h: 14, frames: 4, fps: 6 }, c => front(c, V0, c.frame))
anim('hof_hinten', { w: 9, h: 14, frames: 4, fps: 6, }, c => front(c, V0, c.frame, 1))

// ---------------- Eule (Waldkauz), sitzend 7 x 9 ----------------
// blick: -1 links, 0 vorn, 1 rechts, 2 über die Schulter (Hinterkopf); Augen bernstein
function eule(c, q) {
  const g = Fig(c.w, c.h), o = q.blick || 0
  const F = { 0: ['beEbEeb', 'beeDeeb'], '-1': ['bEbEeeb', 'bDeeebb'], 1: ['beeEbEb', 'bbeeeDb'], 2: ['bbcccbb', 'bcccccb'] }[o]
  const rows = ['.b...b.', '.bbbbb.', F[0], F[1], q.puff ? 'bcdcdcbb' : 'bcdcdcb', 'bcdedcb', 'bcdcdcb', '.bcccb.', '..E.E..']
  rows.forEach((r, y) => [...r].forEach((k, x) => { if (k === '.') return; if (k === 'E' && y === 2 && q.blink) k = 'c'; g.set(x, y, k) }))
  if (q.puff) { g.set(0, 4, 'b'); g.set(6, 4, 'b'); g.set(0, 5, 'b'); g.set(6, 5, 'b') }
  g.out(c)
}
const EQ = [{}, {}, { blink: 1 }, {}, { blick: -1 }, { blick: -1 }, {}, { blick: 1 }, { blick: 1 }, { blick: 2 }, { blick: 2 }, { blick: 1 }, {}, { puff: 1 }, { puff: 1 }, {}]
anim('eule_sitzt', { w: 7, h: 9, frames: EQ.length, fps: 3, }, c => eule(c, EQ[c.frame]))

// Fliegen: 17 x 10, von vorn gesehen (wie sie quer über den Hof zieht): Körper mittig, Flügel schlagen auf und ab
const FW = [[-1, -3], [0, -1], [0, 1], [1, 3], [0, 1], [-1, -1]]   // [Ellbogen, Spitze] Höhe je Bild; Gleiten = [0, -1]
function eulenflug(c, k) {
  const g = Fig(c.w, c.h), [e, t] = k === 'gleit' ? [0, -1] : FW[k], cx = 6, cy = 3
  for (const sd of [-1, 1]) { const sx = cx + sd, ex = cx + sd * 3, tx = cx + sd * 5
    g.line(sx, cy, ex, cy + e, 'c'); g.line(sx, cy + 1, ex, cy + 1 + e, 'd'); g.line(ex, cy + e, tx, cy + t, 'c'); g.line(ex, cy + 1 + e, tx - sd, cy + t + 1, 'b')
    g.set(tx, cy + t, 'b'); g.set(tx + sd, cy + t + (t < 0 ? 1 : -1) * 0, 'b'); g.set(ex, cy + e + 2, 'b') }
  for (const [x, y, kk] of [[5, 1, 'b'], [7, 1, 'b'], [5, 2, 'E'], [6, 2, 'b'], [7, 2, 'E'], [5, 3, 'e'], [6, 3, 'D'], [7, 3, 'e'], [5, 4, 'c'], [6, 4, 'd'], [7, 4, 'c'], [6, 5, 'b'], [5, 6, 'E'], [7, 6, 'E']]) g.set(x, y, kk)
  g.out(c)
}
anim('eule_fliegt', { w: 13, h: 8, frames: 6, fps: 10, }, c => eulenflug(c, c.frame))
sprite('eule_gleitet', { w: 13, h: 8, }, c => eulenflug(c, 'gleit'))
