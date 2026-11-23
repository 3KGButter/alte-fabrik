# baut mecha_seite.px.js aus seite.js (dieselbe Funktion wie in interior.js) – Vorschau und GIF mit pxl
import re
fn=open('seite.js').read()
pal="""pal({ b: '#5c3a2e', c: '#7f5236', e: '#cf9a5c', g: '#4a4652', h: '#6b6672', i: '#8f8a92', j: '#b5afb0', l: '#d8d2cc', H: '#f4ecdc', J: '#fffaf0',
  u: '#b8474b', v: '#e0705a', x: '#23304f', y: '#355a7a', C: '#7a4a1c', D: '#c07a2a', E: '#e8a83a', G: '#fff3c0', P: '#2f8a7e',
  T: '#3b3f4a', X: '#565b66', Y: '#7c818a', Z: '#a6abb1', U: '#2a2440', V: '#ff9a3c', W: '#ffd56a', '~': '#24182a' })
function Grid(w, h) { const a = [...Array(h)].map(() => Array(w).fill('.'))
  const g = { w, h, a, set(x, y, c) { if (x >= 0 && y >= 0 && x < w && y < h && c) a[y][x] = c }, get(x, y) { return x >= 0 && y >= 0 && x < w && y < h ? a[y][x] : '.' },
    rect(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) g.set(x + i, y + j, c) }, rows() { return a.map(r => r.join('')) } }; return g }
"""
body=pal+fn+"""
anim('seite_gehen', { w: 86, h: 100, frames: 8, fps: 7, outline: '~' }, c => { const r = mechaSideBig({ step: c.frame }); r.forEach((row, y) => [...row].forEach((k, x) => { if (k !== '.') c.px(x, y, k) })) })
"""
open('mecha_seite.px.js','w').write(body)
