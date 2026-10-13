// DIE ALTE FABRIK – Spiel (läuft im Browser, z. B. Safari auf dem iPad)
'use strict';
(() => {
  const T = 48;
  const $ = id => document.getElementById(id);
  const L = window.LAYOUT;
  const MOCK = !window.API_URL;
  const ICON = { gears: '⚙️', plans: '📜', power: '⚡', sheet: '🔲', kant: '📐', dreh: '🔩', machine: '🏭' };

  const G = {
    data: null, skew: 0, cred: null, map: null, imgs: {},
    scale: 1, cam: { x: 0, y: 0 }, follow: true,
    player: { x: L.start.x, y: L.start.y, px: L.start.x, py: L.start.y, dir: 0, path: [], walkT: 0, onArrive: null },
    markers: [], mode: 'play', decoItem: null, floaters: [], t0: performance.now()
  };

  // ---------------- Hilfen ----------------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const short = n => { const i = n.lastIndexOf(' - '); return i > 0 ? n.slice(i + 3) : n; };
  const now = () => Date.now() + G.skew;
  const fmt = n => (Math.round(n * 10) / 10).toLocaleString('de-DE');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  function toast(msg, bad) {
    const t = $('toast'); t.textContent = msg; t.className = bad ? 'bad' : ''; clearTimeout(toast.h);
    toast.h = setTimeout(() => t.className = 'hidden', bad ? 4200 : 2800);
  }
  function busy(on) { $('busy').classList.toggle('hidden', !on); }

  // ---------------- Server ----------------
  async function api(body) {
    const req = Object.assign({}, G.cred, body);
    if (MOCK) return MockServer.call(req);
    const r = await fetch(window.API_URL, { method: 'POST', body: JSON.stringify(req) });
    return r.json();
  }
  async function act(body, quiet) {
    busy(true);
    try {
      const res = await api(body);
      if (res.state) applyData(res);
      if (!res.ok) toast(res.error || 'Das hat nicht geklappt.', true);
      else if (res.msg && !quiet) toast(res.msg);
      return res;
    } catch (e) {
      toast('Keine Verbindung zum Server. Bitte später erneut versuchen.', true);
      return { ok: false };
    } finally { busy(false); }
  }
  function applyData(d) {
    const before = G.data && G.data.state.inv;
    G.data = d; G.skew = d.now - Date.now();
    buildMarkers();
    renderHud(before);
  }

  // ---------------- Spiellogik (Anzeige; geprüft wird auf dem Server) ----------------
  const R = () => G.data.rules;
  const S = () => G.data.state;
  const inv = k => S().inv[k] || 0;
  function goodsCap() { const l = S().b.lager ? S().b.lager.lvl : 0; return R().goodsBaseCap + R().goodsCapPerLagerLevel * l; }
  function pending(id) {
    const def = R().buildings[id], bs = S().b[id];
    if (!def || !bs || !def.produces) return 0;
    const rate = def.produces.perHour * bs.lvl;
    return Math.min(rate * Math.max(0, (now() - bs.last) / 3600000), rate * R().bufferHours);
  }
  function collectable(id) {
    const p = R().buildings[id].produces;
    let u = Math.floor(pending(id));
    Object.keys(p.uses || {}).forEach(k => { u = Math.min(u, Math.floor(inv(k) / p.uses[k])); });
    return Math.max(0, Math.min(u, goodsCap() - inv(p.out)));
  }
  function areaOpen(a) { return !!G.data.areas[a]; }
  function buildCheck(id) {
    const def = R().buildings[id], st = S(), out = [];
    out.push({ ok: areaOpen(def.area), txt: 'Bereich ' + areaName(def.area) + ' ist offen' });
    if (def.boss) out.push({ ok: G.data.bossDefeated, txt: 'Kraft-Golem besiegt (1. Arbeitsprobe)' });
    if (def.req) out.push({ ok: !!st.b[def.req], txt: R().buildings[def.req].name + ' gebaut' });
    if (def.minLevel) out.push({ ok: G.data.user.level >= def.minLevel, txt: 'Level ' + def.minLevel + ' erreicht' });
    Object.keys(def.cost).forEach(k => out.push({ ok: inv(k) >= def.cost[k], txt: def.cost[k] + ' ' + ICON[k] + ' ' + R().goods[k].name }));
    return out;
  }
  const areaName = a => (R().areas.find(x => x.id === a) || {}).name || a;
  const msArea = ms => 'ms' + ms.replace(/\D/g, '');
  const unclaimed = () => G.data.quests.filter(q => q.done && !q.claimed);

  // ---------------- Questmarker auf der Karte ----------------
  function along(pts, t) {
    if (pts.length === 1) return { x: pts[0][0], y: pts[0][1] };
    const seg = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
    let d = t * total;
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i] || i === seg.length - 1) { const f = seg[i] ? Math.min(1, d / seg[i]) : 0; return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f }; }
      d -= seg[i];
    }
  }
  function buildMarkers() {
    const byMs = {};
    G.data.quests.forEach(q => (byMs[q.ms] = byMs[q.ms] || []).push(q));
    G.markers = [];
    let current = G.data.quests.find(q => !q.done && q.hq && areaOpen(msArea(q.ms))) || G.data.quests.find(q => !q.done && areaOpen(msArea(q.ms)));
    Object.keys(byMs).forEach(ms => {
      const pts = L.paths[ms]; if (!pts) return;
      const list = byMs[ms];
      list.forEach((q, i) => {
        const p = along(pts, list.length === 1 ? 0 : i / (list.length - 1));
        G.markers.push({ q, x: p.x, y: p.y, area: msArea(ms), current: q === current });
      });
    });
  }

  // ---------------- Karte laden ----------------
  async function loadWorld() {
    const map = await (await fetch('assets/data/fabrik.json')).json();
    G.map = await TM.render(map, 'assets/', 1);
    const lo = G.map.frames[0].lower, up = G.map.frames[0].upper;
    // Graue Ruinen-Version (für noch nicht reparierte Gebäude)
    const g = document.createElement('canvas'); g.width = lo.width; g.height = lo.height;
    const gc = g.getContext('2d'); gc.drawImage(lo, 0, 0); gc.drawImage(up, 0, 0);
    const id = gc.getImageData(0, 0, g.width, g.height), px = id.data;
    for (let i = 0; i < px.length; i += 4) {
      const v = (px[i] * .3 + px[i + 1] * .59 + px[i + 2] * .11) * .55;
      px[i] = v * 1.05; px[i + 1] = v; px[i + 2] = v * .92;
    }
    gc.putImageData(id, 0, 0);
    G.gray = g;
    const names = ['!Chest'].concat(L.avatars);
    await Promise.all(names.map(async n => { G.imgs[n] = await TM.loadImage('assets/characters/' + n + '.png'); }));
    G.imgs.tilesB = await TM.loadImage('assets/tilesets/SF_Outside_B_MS.png');
  }

  // ---------------- Wegfindung ----------------
  function walkable(x, y) {
    if (x < 0 || y < 0 || x >= G.map.W || y >= G.map.H) return false;
    if (!G.map.pass[y * G.map.W + x]) return false;
    if (!areaOpen(L.zoneOf(x, y))) return false;
    if (S().deco.some(d => d.x === x && d.y === y)) return false;
    return true;
  }
  function findPath(sx, sy, tx, ty) {
    if (!walkable(tx, ty)) {
      // nächstgelegene begehbare Kachel suchen
      let best = null, bd = 1e9;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const x = tx + dx, y = ty + dy; if (!walkable(x, y)) continue;
        const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [x, y]; }
      }
      if (!best) return null; tx = best[0]; ty = best[1];
    }
    const W = G.map.W, key = (x, y) => y * W + x;
    const open = [[sx, sy]], came = new Map([[key(sx, sy), -1]]);
    let head = 0;
    while (head < open.length) {
      const [x, y] = open[head++];
      if (x === tx && y === ty) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (came.has(k) || !walkable(nx, ny)) continue;
        came.set(k, key(x, y)); open.push([nx, ny]);
      }
    }
    if (!came.has(key(tx, ty))) return null;
    const path = []; let k = key(tx, ty);
    while (k !== key(sx, sy)) { path.unshift([k % W, Math.floor(k / W)]); k = came.get(k); }
    return path;
  }
  function walkTo(tx, ty, onArrive) {
    const p = G.player;
    const path = findPath(Math.round(p.x), Math.round(p.y), Math.round(tx), Math.round(ty));
    if (!path) { if (onArrive) onArrive(); return; }
    p.path = path; p.onArrive = onArrive || null; G.follow = true;
    if (!path.length && onArrive) { p.onArrive = null; onArrive(); }
  }

  // ---------------- Zeichnen ----------------
  const cv = $('world'), ctx = cv.getContext('2d');
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); G.dpr = dpr;
  }
  function clampCam() {
    const vw = innerWidth / G.scale, vh = innerHeight / G.scale, mw = G.map.W * T, mh = G.map.H * T;
    G.cam.x = mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, G.cam.x));
    G.cam.y = mh <= vh ? (mh - vh) / 2 : Math.max(-60 / G.scale, Math.min(mh - vh + 90 / G.scale, G.cam.y));
  }
  function plotRects(filter) {
    return Object.keys(L.plots).filter(filter).map(id => L.plots[id]);
  }

  function draw(ts) {
    requestAnimationFrame(draw);
    if (!G.map || !G.data) return;
    const dt = Math.min(0.05, (ts - (G.last || ts)) / 1000); G.last = ts;
    update(dt);
    const p = G.player;
    if (G.follow) { G.cam.x = p.px * T + T / 2 - innerWidth / G.scale / 2; G.cam.y = p.py * T + T / 2 - innerHeight / G.scale / 2; }
    clampCam();
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.setTransform(G.dpr * G.scale, 0, 0, G.dpr * G.scale, -G.cam.x * G.dpr * G.scale, -G.cam.y * G.dpr * G.scale);
    ctx.imageSmoothingEnabled = false;
    const fr = G.map.frames[0];
    ctx.drawImage(fr.lower, 0, 0);
    // Ruinen grau
    const st = S();
    const unbuilt = plotRects(id => !st.b[id]);
    unbuilt.forEach(r => ctx.drawImage(G.gray, r.x * T, r.y * T, r.w * T, r.h * T, r.x * T, r.y * T, r.w * T, r.h * T));
    drawPathLine();
    // Sortiert nach y: Deko, Marker, Spieler
    const items = [];
    st.deco.forEach(d => items.push({ y: d.y, f: () => drawDeco(d.t, d.x, d.y) }));
    G.markers.forEach(m => items.push({ y: m.y, f: () => drawMarker(m, ts) }));
    items.push({ y: p.py + 0.01, f: () => drawPlayer(ts) });
    items.sort((a, b) => a.y - b.y).forEach(i => i.f());
    // obere Ebene (ohne Ruinenflächen)
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, G.map.W * T, G.map.H * T);
    unbuilt.forEach(r => ctx.rect(r.x * T, r.y * T, r.w * T, r.h * T));
    ctx.clip('evenodd');
    ctx.drawImage(fr.upper, 0, 0);
    ctx.restore();
    drawFog();
    drawPlots(ts);
    if (G.mode === 'deco' && G.hover) { ctx.strokeStyle = '#e0a63a'; ctx.lineWidth = 3; ctx.strokeRect(G.hover.x * T + 2, G.hover.y * T + 2, T - 4, T - 4); }
    drawFloaters(dt);
  }

  function update(dt) {
    const p = G.player;
    if (p.path.length) {
      const [nx, ny] = p.path[0];
      const sp = 5.5 * dt, dx = nx - p.px, dy = ny - p.py, d = Math.hypot(dx, dy);
      p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : (dy > 0 ? 0 : 3);
      if (d <= sp) { p.px = nx; p.py = ny; p.x = nx; p.y = ny; p.path.shift(); if (!p.path.length && p.onArrive) { const f = p.onArrive; p.onArrive = null; f(); } }
      else { p.px += dx / d * sp; p.py += dy / d * sp; }
      p.walkT += dt;
    }
  }

  function drawPathLine() {
    ctx.save(); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.setLineDash([2, 10]);
    const ms = {};
    G.markers.forEach(m => (ms[m.q.ms] = ms[m.q.ms] || []).push(m));
    Object.values(ms).forEach(list => {
      if (!areaOpen(list[0].area)) return;
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1], b = list[i];
        ctx.strokeStyle = a.q.done && b.q.done ? 'rgba(120,220,130,.9)' : 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.moveTo(a.x * T + 24, a.y * T + 24); ctx.lineTo(b.x * T + 24, b.y * T + 24); ctx.stroke();
      }
    });
    ctx.restore();
  }

  function drawMarker(m, ts) {
    if (!areaOpen(m.area)) return;
    const cx = m.x * T + 24, cy = m.y * T + 24, q = m.q;
    if (q.done && !q.claimed) { // Kiste
      const bob = Math.sin(ts / 250 + m.x) * 3;
      const img = G.imgs['!Chest'];
      if (img) ctx.drawImage(img, 0, 0, 48, 48, cx - 24, cy - 34 + bob, 48, 48);
      ctx.fillStyle = 'rgba(255,215,90,.35)'; ctx.beginPath(); ctx.ellipse(cx, cy + 10, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const r = q.hq ? 13 : 10;
    if (m.current) {
      const pr = r + 6 + Math.sin(ts / 220) * 4;
      ctx.strokeStyle = 'rgba(214,70,60,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.lineWidth = 3;
    ctx.fillStyle = q.done ? '#3ea851' : m.current ? '#c53b30' : 'rgba(210,205,200,.55)';
    ctx.strokeStyle = q.done ? '#e9ffe9' : 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (q.done) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx - 1, cy + 5); ctx.lineTo(cx + 7, cy - 5); ctx.stroke(); }
    else if (!q.hq) { ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('+', cx, cy + 4); }
  }

  function drawPlayer(ts) {
    const p = G.player, img = G.imgs[L.avatars[S().avatar || 0]];
    if (!img) return;
    const pat = p.path.length ? [0, 1, 2, 1][Math.floor(p.walkT * 8) % 4] : 1;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(p.px * T + 24, p.py * T + 42, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(img, pat * 48, p.dir * 48, 48, 48, p.px * T, p.py * T - 6, 48, 48);
  }

  function drawDeco(t, x, y) {
    const tiles = L.deco[t]; if (!tiles || !G.imgs.tilesB) return;
    tiles.forEach((c, i) => {
      const dy = (y - (tiles.length - 1 - i)) * T;
      ctx.drawImage(G.imgs.tilesB, c[0] * T, c[1] * T, T, T, x * T, dy, T, T);
    });
  }

  function drawFog() {
    const turm = !!S().b.turm;
    ['ms2', 'ms3', 'ms4', 'ms5'].forEach(a => {
      if (areaOpen(a)) return;
      if (!G.fog) G.fog = {};
      if (!G.fog[a]) {
        const path = new Path2D();
        for (let y = 0; y < G.map.H; y++) for (let x = 0; x < G.map.W; x++) if (L.zoneOf(x, y) === a) path.rect(x * T, y * T, T, T);
        G.fog[a] = path;
      }
      ctx.fillStyle = turm ? 'rgba(8,10,18,.5)' : 'rgba(8,10,18,.82)';
      ctx.fill(G.fog[a]);
      const lab = L.zoneLabel[a];
      if (lab) label(lab.x * T, lab.y * T, '🔒 ' + areaName(a), unlockHint(a));
    });
  }
  function unlockHint(a) {
    const prev = { ms2: 'MS1', ms3: 'MS2', ms4: 'MS3', ms5: 'MS3' }[a];
    const open = G.data.quests.filter(q => q.ms === prev && q.hq && !q.done).length;
    return open ? 'Noch ' + open + ' Hauptquest' + (open > 1 ? 's' : '') + ' in ' + prev : '';
  }
  function label(x, y, t1, t2) {
    ctx.save(); ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    const w = Math.max(ctx.measureText(t1).width, t2 ? ctx.measureText(t2).width * .75 : 0) + 28;
    ctx.fillStyle = 'rgba(20,22,28,.9)'; ctx.strokeStyle = 'rgba(224,166,58,.8)'; ctx.lineWidth = 2;
    roundRect(x - w / 2, y - 26, w, t2 ? 60 : 40, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f1ede4'; ctx.fillText(t1, x, y + 2);
    if (t2) { ctx.font = '16px sans-serif'; ctx.fillStyle = '#a9a49a'; ctx.fillText(t2, x, y + 24); }
    ctx.restore();
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function drawPlots(ts) {
    const st = S();
    Object.keys(L.plots).forEach(id => {
      const def = R().buildings[id]; if (!def || !areaOpen(def.area)) return;
      const pl = L.plots[id], x = pl.icon.x * T + 24, y = pl.icon.y * T + 16;
      ctx.save(); ctx.textAlign = 'center';
      if (!st.b[id]) {
        const ready = buildCheck(id).every(c => c.ok);
        const bob = ready ? Math.sin(ts / 300) * 3 : 0;
        ctx.font = 'bold 15px sans-serif';
        const w = ctx.measureText(def.name).width + 44;
        ctx.fillStyle = ready ? 'rgba(224,166,58,.95)' : 'rgba(20,22,28,.85)'; ctx.strokeStyle = ready ? '#fff3d6' : 'rgba(255,255,255,.4)'; ctx.lineWidth = 2;
        roundRect(x - w / 2, y - 16 + bob, w, 32, 16); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ready ? '#241806' : '#f1ede4';
        ctx.fillText('🔧 ' + def.name, x, y + 5 + bob);
      } else if (def.produces) {
        const n = collectable(id), pend = pending(id);
        if (pend >= 1) {
          const full = pend >= def.produces.perHour * st.b[id].lvl * R().bufferHours - 0.01;
          ctx.font = 'bold 16px sans-serif';
          const txt = ICON[def.produces.out] + ' ' + (n > 0 ? '+' + n : '0');
          const w = ctx.measureText(txt).width + 24, bob = Math.sin(ts / 280) * 3;
          ctx.fillStyle = n > 0 ? (full ? 'rgba(214,90,74,.95)' : 'rgba(88,179,104,.95)') : 'rgba(20,22,28,.85)';
          roundRect(x - w / 2, y - 16 + bob, w, 30, 15); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.fillText(txt, x, y + 4 + bob);
        }
        if (st.b[id].lvl > 1) { ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#e0a63a'; ctx.fillText('★'.repeat(st.b[id].lvl - 1), x, y + 30); }
      }
      ctx.restore();
    });
  }

  function floater(x, y, text) { G.floaters.push({ x, y, text, t: 0 }); }
  function drawFloaters(dt) {
    G.floaters = G.floaters.filter(f => (f.t += dt) < 1.8);
    G.floaters.forEach(f => {
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - f.t / 1.8); ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.fillStyle = '#ffd25a';
      ctx.strokeText(f.text, f.x * T + 24, f.y * T - f.t * 40); ctx.fillText(f.text, f.x * T + 24, f.y * T - f.t * 40); ctx.restore();
    });
  }

  // ---------------- Eingabe (Touch, Maus) ----------------
  const ptrs = new Map(); let drag = null, pinch = null;
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, cx: G.cam.x, cy: G.cam.y, moved: false };
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: G.scale }; drag = null; }
  });
  cv.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) { if (G.mode === 'deco' && G.map) { const w = toWorld(e.clientX, e.clientY); G.hover = { x: Math.floor(w.x), y: Math.floor(w.y) }; } return; }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; setScale(pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d); return; }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 8) drag.moved = true;
      if (drag.moved) { G.follow = false; G.cam.x = drag.cx - dx / G.scale; G.cam.y = drag.cy - dy / G.scale; }
    }
  });
  const up = e => {
    ptrs.delete(e.pointerId);
    if (drag && !drag.moved && e.type === 'pointerup') tap(e.clientX, e.clientY);
    if (ptrs.size < 2) pinch = null;
    drag = null;
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); setScale(G.scale * (e.deltaY < 0 ? 1.1 : 0.9)); }, { passive: false });
  function setScale(s) {
    const cx = G.cam.x + innerWidth / G.scale / 2, cy = G.cam.y + innerHeight / G.scale / 2;
    G.scale = Math.max(0.35, Math.min(2, s));
    G.cam.x = cx - innerWidth / G.scale / 2; G.cam.y = cy - innerHeight / G.scale / 2;
  }
  function toWorld(sx, sy) { return { x: (G.cam.x + sx / G.scale) / T, y: (G.cam.y + sy / G.scale) / T }; }

  function tap(sx, sy) {
    if (!G.data) return;
    const w = toWorld(sx, sy), tx = Math.floor(w.x), ty = Math.floor(w.y);
    if (G.mode === 'deco') return decoTap(tx, ty);
    // Marker?
    const m = G.markers.filter(m => areaOpen(m.area)).find(m => Math.hypot(m.x + .5 - w.x, m.y + .5 - w.y) < .7);
    if (m) { walkTo(m.x, m.y + 1); return questPanel(m); }
    // Gebäude-Schild oder Fläche?
    const id = Object.keys(L.plots).find(id => { const p = L.plots[id]; return w.x >= p.x && w.x < p.x + p.w && w.y >= p.y && w.y < p.y + p.h; });
    if (id && areaOpen(R().buildings[id].area)) { const p = L.plots[id]; walkTo(p.x + Math.floor(p.w / 2), p.y + p.h); return buildingPanel(id); }
    if (!areaOpen(L.zoneOf(tx, ty))) { toast('Dieser Bereich ist noch verschlossen. ' + unlockHint(L.zoneOf(tx, ty))); return; }
    walkTo(tx, ty);
  }

  // ---------------- HUD ----------------
  function renderHud(before) {
    const u = G.data.user, st = S();
    $('whoTag').textContent = u.tag;
    $('whoLevel').textContent = 'Lv ' + (u.level || 0) + (u.stufe ? ' · ' + u.stufe : '');
    const keys = ['gears', 'plans'].concat(['power', 'sheet', 'kant', 'dreh', 'machine'].filter(k => inv(k) > 0 || Object.keys(st.b).some(b => (R().buildings[b].produces || {}).out === k)));
    $('res').innerHTML = keys.map(k => `<span class="chip" id="chip_${k}" title="${esc(R().goods[k].name)}">${ICON[k]} ${fmt(inv(k))}${R().goods[k].capped ? '<span class="muted">/' + goodsCap() + '</span>' : ''}</span>`).join('');
    if (before) keys.forEach(k => { if ((before[k] || 0) !== inv(k)) { const c = $('chip_' + k); if (c) { c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); } } });
    const d = G.data.stand ? new Date(G.data.stand) : null;
    $('stand').textContent = (MOCK ? 'Vorschau-Modus · ' : '') + (d ? 'Quest-Stand: ' + d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '');
    $('dotQuests').classList.toggle('hidden', !unclaimed().length);
    updateCollectDot();
  }
  function updateCollectDot() { if (G.data) $('dotCollect').classList.toggle('hidden', !Object.keys(S().b).some(id => R().buildings[id].produces && collectable(id) > 0)); }
  setInterval(updateCollectDot, 5000);

  // ---------------- Panels ----------------
  function openSheet(html) { $('sheetBody').innerHTML = html; $('sheet').classList.remove('hidden'); }
  function closeSheet() { $('sheet').classList.add('hidden'); }
  $('sheetClose').onclick = closeSheet;
  $('sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
  const on = (sel, fn) => document.querySelectorAll(sel).forEach(el => el.onclick = fn);

  function questPanel(m) {
    const q = m.q, gears = Math.round(q.xp * R().gearsPerXp);
    let body = `<h2>${esc(short(q.n))}</h2>
      <div><span class="tag ${q.hq ? 'hq' : 'nq'}">${q.hq ? 'Hauptquest' : 'Nebenquest'}</span><span class="tag xp">${q.xp} XP</span> <span class="muted small">${esc(q.ms)} · ${esc(areaName(m.area))}</span></div>
      <p class="muted small">${esc(q.n)}</p>`;
    if (q.done && !q.claimed) body += `<p>Erledigt! Hier wartet eine Kiste auf dich: <b>${gears} ${ICON.gears}</b>${q.hq ? ' und <b>1 ' + ICON.plans + ' Bauplan</b>' : ''}.</p>
      <div class="actions"><button class="btn primary" id="bClaim">Kiste öffnen</button></div>`;
    else if (q.done) body += `<p>✅ Erledigt und eingesammelt.</p>`;
    else body += `<p>Diese Quest erledigst du in <b>Mebis</b>. Sobald deine Lehrkraft den Fortschritt exportiert hat, steht hier eine Kiste mit <b>${gears} ${ICON.gears}</b>${q.hq ? ' und 1 ' + ICON.plans : ''}.</p>`;
    openSheet(body);
    on('#bClaim', async () => {
      const r = await act({ action: 'claim', quest: q.n });
      if (r.ok) { floater(m.x, m.y, '+' + gears + ' ⚙️' + (q.hq ? ' +1 📜' : '')); closeSheet(); }
    });
  }

  function questBook() {
    const byMs = {};
    G.data.quests.forEach(q => (byMs[q.ms] = byMs[q.ms] || []).push(q));
    const open = unclaimed();
    let h = `<h2>Questbuch</h2><p class="muted">${G.data.quests.filter(q => q.done).length} von ${G.data.quests.length} Quests erledigt.</p>`;
    if (open.length) h += `<div class="actions"><button class="btn primary" id="bClaimAll">Alle ${open.length} Kisten öffnen</button></div>`;
    Object.keys(byMs).forEach(ms => {
      const a = msArea(ms), list = byMs[ms];
      h += `<div class="ms-head"><h3>${esc(ms)} · ${esc(areaName(a))}</h3><span class="lock">${areaOpen(a) ? list.filter(q => q.done).length + '/' + list.length : '🔒 verschlossen'}</span></div>`;
      list.forEach(q => {
        const icon = q.done ? (q.claimed ? '✅' : '🎁') : '⬜';
        h += `<div class="row click" data-q="${esc(q.n)}"><span class="st">${icon}</span><div class="grow"><div class="title">${esc(short(q.n))}</div>
          <div class="sub"><span class="tag ${q.hq ? 'hq' : 'nq'}">${q.hq ? 'HQ' : 'NQ'}</span>${q.xp} XP</div></div></div>`;
      });
    });
    openSheet(h);
    on('#bClaimAll', async () => {
      const g = open.reduce((s, q) => s + Math.round(q.xp * R().gearsPerXp), 0);
      const r = await act({ action: 'claim', quests: open.map(q => q.n) });
      if (r.ok) { floater(G.player.px, G.player.py, '+' + g + ' ⚙️'); questBook(); }
    });
    document.querySelectorAll('[data-q]').forEach(el => el.onclick = () => {
      const m = G.markers.find(m => m.q.n === el.dataset.q); if (!m) return;
      if (!areaOpen(m.area)) return toast('Dieser Bereich ist noch verschlossen. ' + unlockHint(m.area));
      closeSheet(); G.follow = false; centerOn(m.x, m.y); questPanel(m);
    });
  }

  function centerOn(x, y) { G.cam.x = x * T + 24 - innerWidth / G.scale / 2; G.cam.y = y * T + 24 - innerHeight / G.scale / 2; G.follow = false; }

  function costChips(cost) { return '<div class="costs">' + Object.keys(cost).map(k => `<span class="chip">${ICON[k]} ${cost[k]} ${esc(R().goods[k].name)}</span>`).join('') + '</div>'; }

  function buildingPanel(id) {
    const def = R().buildings[id], bs = S().b[id];
    let h = `<h2>${esc(def.name)}</h2><p class="muted small">${esc(areaName(def.area))}</p><p>${esc(def.desc || '')}</p>`;
    if (!bs) {
      const checks = buildCheck(id), ok = checks.every(c => c.ok);
      h += `<h3>Reparatur</h3>` + checks.map(c => `<div class="req ${c.ok ? 'ok' : 'no'}">${c.ok ? '✓' : '✗'} ${esc(c.txt)}</div>`).join('');
      if (def.produces) h += prodInfo(def, 1);
      h += `<div class="actions"><button class="btn primary" id="bBuild" ${ok ? '' : 'disabled'}>Reparieren</button></div>`;
      if (!ok && checks.some(c => !c.ok && /⚙️|📜/.test(c.txt))) h += `<p class="muted small">Zahnräder und Baupläne bekommst du aus den Kisten deiner erledigten Quests.</p>`;
    } else {
      const maxL = def.maxLevel || 1;
      h += `<p><b>Stufe ${bs.lvl}</b>${maxL > 1 ? ' von ' + maxL : ''}</p>`;
      if (def.produces) {
        const n = collectable(id), pend = pending(id);
        h += prodInfo(def, bs.lvl);
        h += `<p>Fertig zum Abholen: <b>${n} ${ICON[def.produces.out]}</b>${pend >= 1 && n < Math.floor(pend) ? ' <span class="muted small">(es fehlen Rohstoffe oder Lagerplatz)</span>' : ''}</p>`;
        h += `<div class="actions"><button class="btn good" id="bCollect" ${n > 0 ? '' : 'disabled'}>Abholen</button>`;
      } else h += `<div class="actions">`;
      if (bs.lvl < maxL) {
        const cost = { gears: (def.cost.gears || 0) * Math.pow(2, bs.lvl) };
        const can = !!S().b[R().upgradeNeeds] && inv('gears') >= cost.gears;
        h += `<button class="btn" id="bUpgrade" ${can ? '' : 'disabled'}>Ausbauen auf Stufe ${bs.lvl + 1} (${cost.gears} ⚙️)</button>`;
      }
      h += `</div>`;
      if (bs.lvl < maxL && !S().b[R().upgradeNeeds]) h += `<p class="muted small">Ausbauen kannst du erst mit dem Zeichensaal.</p>`;
    }
    openSheet(h);
    on('#bBuild', async () => { const r = await act({ action: 'build', building: id }); if (r.ok) { const p = L.plots[id]; floater(p.icon.x, p.icon.y, '✨ ' + def.name); closeSheet(); } });
    on('#bCollect', async () => { const n = collectable(id); const r = await act({ action: 'collect', building: id }); if (r.ok) { const p = L.plots[id]; floater(p.icon.x, p.icon.y, '+' + n + ' ' + ICON[def.produces.out]); buildingPanel(id); } });
    on('#bUpgrade', async () => { const r = await act({ action: 'upgrade', building: id }); if (r.ok) buildingPanel(id); });
  }
  function prodInfo(def, lvl) {
    const p = def.produces, uses = Object.keys(p.uses || {});
    return `<h3>Produktion</h3><p>${fmt(p.perHour * lvl)} ${ICON[p.out]} ${esc(R().goods[p.out].name)} pro Stunde` +
      (uses.length ? ', verbraucht je Stück ' + uses.map(k => p.uses[k] + ' ' + ICON[k]).join(' + ') : '') +
      `.<br><span class="muted small">Das Ausgabelager ist nach ${R().bufferHours} Stunden voll. Lagerplatz für Güter: ${goodsCap()}.</span></p>`;
  }

  function buildList() {
    let h = `<h2>Bauen und Reparieren</h2><p class="muted">Tippe ein Gebäude an, um auf der Karte hinzugehen.</p>`;
    R().areas.forEach(a => {
      const ids = Object.keys(R().buildings).filter(id => R().buildings[id].area === a.id);
      h += `<div class="ms-head"><h3>${esc(a.ms)} · ${esc(a.name)}</h3><span class="lock">${areaOpen(a.id) ? '' : '🔒 verschlossen'}</span></div>`;
      ids.forEach(id => {
        const def = R().buildings[id], bs = S().b[id];
        const ready = !bs && buildCheck(id).every(c => c.ok);
        const st = bs ? '✅' : ready ? '🔧' : '⬜';
        const sub = bs ? 'Stufe ' + bs.lvl + (def.produces ? ' · ' + fmt(def.produces.perHour * bs.lvl) + ' ' + ICON[def.produces.out] + '/h' : '') : Object.keys(def.cost).map(k => def.cost[k] + ' ' + ICON[k]).join('  ');
        h += `<div class="row click" data-b="${id}"><span class="st">${st}</span><div class="grow"><div class="title">${esc(def.name)}</div><div class="sub">${sub}${ready ? ' · <b style="color:#e0a63a">bereit!</b>' : ''}</div></div></div>`;
      });
    });
    openSheet(h);
    document.querySelectorAll('[data-b]').forEach(el => el.onclick = () => {
      const id = el.dataset.b, p = L.plots[id];
      if (!areaOpen(R().buildings[id].area)) return toast('Dieser Bereich ist noch verschlossen.');
      closeSheet(); centerOn(p.x + p.w / 2, p.y + p.h / 2); walkTo(p.x + Math.floor(p.w / 2), p.y + p.h); buildingPanel(id);
    });
  }

  async function collectAll() {
    const ids = Object.keys(S().b).filter(id => R().buildings[id].produces && collectable(id) > 0);
    if (!ids.length) return toast('Gerade ist nichts zum Abholen fertig.');
    const r = await act({ action: 'collect', building: '*' });
    if (r.ok) floater(G.player.px, G.player.py, '📦 ' + r.msg.split(' ')[0]);
  }

  // ---------------- Deko ----------------
  function decoCanvas(t) {
    const tiles = L.deco[t], c = document.createElement('canvas'); c.width = 48; c.height = 96;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    tiles.forEach((tt, i) => x.drawImage(G.imgs.tilesB, tt[0] * T, tt[1] * T, T, T, 0, 96 - (tiles.length - i) * 48, 48, 48));
    return c;
  }
  function decoPanel() {
    let h = `<h2>Deko</h2><p class="muted">Wähle ein Objekt und tippe dann auf einen freien Platz. Tippe ein aufgestelltes Objekt an, um es wieder abzubauen.</p><div class="grid">`;
    Object.keys(R().deco).forEach(k => { const d = R().deco[k]; h += `<button class="tile" data-d="${k}" ${inv('gears') >= d.gears ? '' : 'disabled'}><span id="dc_${k}"></span><b>${esc(d.name)}</b><span class="muted small">${d.gears} ⚙️</span></button>`; });
    h += `</div><p class="muted small">${S().deco.length} von ${R().maxDeco} Plätzen belegt.</p>`;
    openSheet(h);
    Object.keys(R().deco).forEach(k => { const s = $('dc_' + k); if (s && L.deco[k]) s.appendChild(decoCanvas(k)); });
    document.querySelectorAll('[data-d]').forEach(el => el.onclick = () => startDeco(el.dataset.d));
  }
  function startDeco(item) {
    G.mode = 'deco'; G.decoItem = item; closeSheet();
    $('decoHint').classList.remove('hidden');
    $('decoHintText').textContent = item ? 'Tippe auf einen freien Platz für: ' + R().deco[item].name : 'Tippe ein Objekt zum Abbauen an';
  }
  function stopDeco() { G.mode = 'play'; G.decoItem = null; G.hover = null; $('decoHint').classList.add('hidden'); }
  $('btnDecoDone').onclick = stopDeco;
  async function decoTap(x, y) {
    G.hover = { x, y };
    const existing = S().deco.find(d => d.x === x && d.y === y);
    if (existing) { if (confirmBox('Abbauen? Du bekommst die Hälfte der Zahnräder zurück.')) await act({ action: 'decoRemove', x, y }); return; }
    if (!G.decoItem) return;
    const bad = !G.map.pass[y * G.map.W + x] || !areaOpen(L.zoneOf(x, y)) || G.markers.some(m => Math.round(m.x) === x && Math.round(m.y) === y) ||
      Object.values(L.plots).some(p => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) || (Math.round(G.player.x) === x && Math.round(G.player.y) === y);
    if (bad) return toast('Hier ist kein Platz frei.', true);
    const r = await act({ action: 'deco', item: G.decoItem, x, y });
    if (r.ok && inv('gears') < R().deco[G.decoItem].gears) stopDeco();
  }
  function confirmBox(msg) { return window.confirm(msg); }

  // ---------------- Menü ----------------
  function menu() {
    let h = `<h2>Menü</h2>
      <div class="row"><div class="grow"><div class="title">${esc(G.data.user.tag)}</div><div class="sub">${esc(G.data.user.klasse || '')} · ${G.data.user.xp} XP · Level ${G.data.user.level}</div></div></div>
      <div class="actions"><button class="btn" id="bAvatar">Figur wechseln</button><button class="btn" id="bRefresh">Neu laden</button></div>`;
    if (MOCK) h += `<h3>Vorschau-Werkzeuge</h3><div class="actions"><button class="btn" id="bSkip">⏩ 4 Stunden vorspulen</button><button class="btn" id="bReset">Spielstand zurücksetzen</button></div>`;
    h += `<div class="actions"><button class="btn" id="bLogout">Abmelden</button></div>
      <p class="muted small">Die Alte Fabrik · Fortschritt aus deinem Mebis-Kurs. Gebäude zählen nicht für XP oder Noten.</p>`;
    openSheet(h);
    on('#bAvatar', () => { closeSheet(); avatarPicker(); });
    on('#bRefresh', async () => { closeSheet(); await act({ action: 'login' }, true); toast('Aktualisiert.'); });
    on('#bSkip', async () => { await act({ action: 'mockSkip' }); closeSheet(); });
    on('#bReset', async () => { await act({ action: 'mockReset' }); closeSheet(); });
    on('#bLogout', () => { store.del('altefabrik_cred'); location.reload(); });
  }

  // ---------------- Figur wählen ----------------
  function avatarPicker() {
    const box = $('avatarList'); box.innerHTML = '';
    L.avatars.forEach((n, i) => {
      const b = document.createElement('button'), c = document.createElement('canvas'); c.width = 48; c.height = 48;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false; if (G.imgs[n]) x.drawImage(G.imgs[n], 48, 0, 48, 48, 0, 0, 48, 48);
      b.appendChild(c); b.onclick = async () => { $('avatarPick').classList.add('hidden'); await act({ action: 'avatar', avatar: i }, true); startGame(); };
      box.appendChild(b);
    });
    $('avatarPick').classList.remove('hidden');
  }

  // ---------------- Start ----------------
  function startGame() {
    $('hud').classList.remove('hidden');
    if (!G.started) {
      G.started = true;
      G.scale = innerWidth < 700 ? 0.6 : innerWidth < 1100 ? 0.8 : 1;
      if (unclaimed().length) setTimeout(() => toast('🎁 ' + unclaimed().length + ' neue Kiste' + (unclaimed().length > 1 ? 'n' : '') + ' warten auf dich!'), 600);
    }
  }
  async function doLogin(tag, pin, remember) {
    G.cred = { tag, pin };
    $('loginError').textContent = ''; $('btnLogin').disabled = true;
    try {
      const r = await api({ action: 'login' });
      if (!r.ok) { $('loginError').textContent = r.error || 'Anmeldung fehlgeschlagen.'; return false; }
      if (remember) store.set('altefabrik_cred', JSON.stringify({ tag, pin }));
      applyData(r);
      $('login').classList.add('hidden');
      if (r.state.avatar === undefined) avatarPicker(); else startGame();
      return true;
    } catch (e) {
      $('loginError').textContent = 'Keine Verbindung zum Server.'; return false;
    } finally { $('btnLogin').disabled = false; }
  }

  $('loginForm').addEventListener('submit', e => { e.preventDefault(); doLogin($('inTag').value.trim(), $('inPin').value.trim(), $('inRemember').checked); });
  $('btnQuests').onclick = questBook; $('btnBuild').onclick = buildList; $('btnCollect').onclick = collectAll;
  $('btnDeco').onclick = () => G.mode === 'deco' ? stopDeco() : decoPanel(); $('btnMenu').onclick = menu;
  $('btnZoomIn').onclick = () => setScale(G.scale * 1.25); $('btnZoomOut').onclick = () => setScale(G.scale / 1.25);
  $('btnCenter').onclick = () => { G.follow = true; };
  window.addEventListener('resize', resize);
  // Daten regelmäßig aktualisieren (neue Kisten nach Export), alle 5 Minuten
  setInterval(() => { if (G.data && !document.hidden && !MOCK) api({ action: 'login' }).then(r => { if (r.ok) applyData(r); }).catch(() => {}); }, 5 * 60000);

  (async function init() {
    resize();
    try { await loadWorld(); } catch (e) { $('loadingText').textContent = 'Die Karte konnte nicht geladen werden.'; console.error(e); return; }
    $('loading').classList.add('hidden');
    requestAnimationFrame(draw);
    if (MOCK) $('mockHint').textContent = 'Vorschau-Modus: Es ist noch kein Server eingetragen. Melde dich mit beliebigem Namen und PIN an.';
    let saved = null; try { saved = JSON.parse(store.get('altefabrik_cred')); } catch (e) {}
    if (saved && saved.tag && saved.pin && await doLogin(saved.tag, saved.pin, true)) return;
    $('login').classList.remove('hidden');
  })();

  window.__G = G; // für Tests
})();
