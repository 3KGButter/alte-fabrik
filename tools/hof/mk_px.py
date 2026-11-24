# baut hof.px.js aus kern.js (derselbe Code wie in workers.js) – Vorschau mit pxl
import re
k=open('kern.js').read()
eule="""
anim('eule_sitzt', { w: 7, h: 9, frames: 16, fps: 3 }, c => zeig(HOFFIG.EULE_Q.map(HOFFIG.eule))(c))
anim('eule_fliegt', { w: 13, h: 8, frames: 6, fps: 10 }, c => zeig([0, 1, 2, 3, 4, 5].map(HOFFIG.flug))(c))
anim('eule_gleitet', { w: 13, h: 8, frames: 1, fps: 1 }, c => zeig([HOFFIG.flug('gleit')])(c))
"""
pal="""pal({ a: '#3e2731', b: '#5c3a2e', c: '#7f5236', d: '#a5703f', e: '#cf9a5c', f: '#ecc58c', g: '#4a4652', h: '#6b6672', i: '#8f8a92', j: '#b5afb0',
  l: '#d8d2cc', m: '#1f3a2f', n: '#2f5a3a', o: '#467a42', p: '#6a9e4c', t: '#8c3040', u: '#b8474b', v: '#e0705a', x: '#23304f', y: '#355a7a', z: '#4f86a6',
  A: '#7fb4c8', C: '#7a4a1c', D: '#c07a2a', E: '#e8a83a', F: '#f7d86a', J: '#fffaf0', O: '#1f5a5a', P: '#2f8a7e', Q: '#5ab8a0', R: '#f0c09a', S: '#c88a6a', T: '#3b3f4a', U: '#2a2440' })
"""
anims="""
const zeig = rows => c => rows[c.frame].forEach((r, y) => [...r].forEach((kk, x) => { if (kk !== '.') c.px(x, y, kk) }))
for (let vi = 0; vi < 8; vi++) { const B = HOFFIG.bilder(vi)
  for (const n of ['walk', 'carry', 'idle', 'work', 'hammer', 'sit', 'phone', 'coffee', 'stretch', 'wave', 'vorn', 'hinten', 'sitzvorn', 'ruderer'])
    anim('v' + vi + '_' + n, { w: 9, h: 16, frames: B[n].length, fps: 8 }, c => zeig(B[n])(c)) }
"""
open('hof.px.js','w').write(pal+k+anims+eule)
