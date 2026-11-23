// prüft den Spiel-Nachbau gegen die pxl-Ausgabe (Pixel für Pixel)
const fs = require('fs'), src = fs.readFileSync(process.argv[2], 'utf8')
const a = src.indexOf('/* KATZE-KERN'), b = src.indexOf('/* /KATZE-KERN */')
const katzeAnims = eval(src.slice(a, b) + ';katzeAnims')
const { PNG } = (() => { try { return require('pngjs') } catch { return {} } })()
const PAL = { g: '#4a4652', h: '#6b6672', i: '#8f8a92', j: '#b5afb0', l: '#d8d2cc', P: '#2f8a7e', Q: '#5ab8a0', x: '#23304f', z: '#4f86a6', A: '#7fb4c8', B: '#c2e2e6', H: '#f4ecdc', u: '#b8474b', v: '#e0705a', w: '#f2a77a', E: '#e8a83a' }
const out = {}
for (const [sz, S] of [['gross', 1], ['klein', .6]]) { const A = katzeAnims(S); for (const n in A) out[n + '_' + sz] = A[n].f.map(f => f.rows.map(r => [...r].map(c => c === '.' ? '' : PAL[c]).join(',')).join('\n')) }
fs.writeFileSync('/tmp/kern.json', JSON.stringify(out))
