
function Fig(W, H) { const b = Array.from({ length: H }, () => Array(W).fill(null)), o = { W, H, b }; o.set = (x, y, k) => { x = Math.round(x); y = Math.round(y); if (k && x >= 0 && y >= 0 && x < W && y < H) b[y][x] = k }; o.line = (x0, y0, x1, y1, k) => { const n = Math.max(Math.abs(Math.round(x1) - Math.round(x0)), Math.abs(Math.round(y1) - Math.round(y0)), 1); for (let i = 0; i <= n; i++) o.set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, k) }; o.out = c => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (b[y][x]) c.px(x, y, b[y][x]) }; return o }
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
