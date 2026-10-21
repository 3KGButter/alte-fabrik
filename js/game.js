// DIE ALTE FABRIK – Spiel (läuft im Browser, z. B. Safari auf dem iPad)
// Karten, Ereignisse, Schalter und Notizen kommen aus dem RPG-Maker-Projekt (assets/data/world.json).
'use strict';
(() => {
  const T = 48;
  const $ = id => document.getElementById(id);
  const L = window.LAYOUT, IC = L.icons;
  const MOCK = !window.API_URL;
  const PARTS = ['blech', 'fraes', 'dreh', 'gewinde', 'baugruppe'];

  const G = {
    world: null, data: null, skew: 0, cred: null, maps: {}, M: null, mapId: 0, imgs: {},
    scale: 1, cam: { x: 0, y: 0 }, follow: true, sw: new Set(), swKey: '',
    player: { x: 0, y: 0, px: 0, py: 0, dir: 2, path: [], walkT: 0, onArrive: null },
    cat: { px: 0, py: 0, dir: 2, trail: [] },
    mode: 'play', placeItem: null, floaters: [], hover: null
  };

  // ---------------- Hilfen ----------------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const short = n => { const i = n.lastIndexOf(' - '); return i > 0 ? n.slice(i + 3) : n; };
  const now = () => Date.now() + G.skew;
  const fmt = n => (Math.round(n * 10) / 10).toLocaleString('de-DE');
  const norm = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  function toast(msg, bad) {
    const t = $('toast'); t.textContent = msg; t.className = bad ? 'bad' : ''; clearTimeout(toast.h);
    toast.h = setTimeout(() => t.className = 'hidden', bad ? 4200 : 3000);
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
      console.error(e);
      toast('Keine Verbindung zum Server. Bitte später erneut versuchen.', true);
      return { ok: false };
    } finally { busy(false); }
  }
  function applyData(d) {
    const before = G.data && JSON.stringify(G.data.areas);
    G.data = d; G.skew = d.now - Date.now();
    if (before && before !== JSON.stringify(d.areas)) toast('🔓 Ein neuer Bereich ist offen! Du hast einen neuen Bauplan.');
    refreshWorld();
    renderHud();
  }

  // ---------------- Spielstand lesen (Logik aus server-logic.js) ----------------
  const R = () => G.data.rules;
  const S = () => G.data.state;
  const ctxLite = () => ({ areas: G.data.areas });
  const areaOpen = a => !!G.data.areas[a];
  const bName = id => R().buildings[id].name;
  const sDef = id => R().stations[id];
  const built = id => !!S().b[id];
  const stOf = id => S().st[id];
  const plans = () => plaene_(S(), ctxLite());
  const areaOf = ms => 'ms' + String(ms).replace(/\D/g, '');
  const areaName = a => (R().areas.find(x => x.id === a) || {}).name || a;
  const msOfArea = a => (R().areas.find(x => x.id === a) || {}).ms || a;
  const unclaimed = () => G.data.quests.filter(q => q.done && !q.claimed);
  const has = (price) => Object.keys(price).every(k => (S().store[k] || 0) >= price[k]);
  const priceTxt = (price) => Object.keys(price).map(k => price[k].toLocaleString('de-DE') + ' ' + IC[k]).join(' + ');
  const machines = () => Object.keys(R().stations).filter(id => sDef(id).out);
  const collectableAll = () => machines().reduce((s, id) => s + (stOf(id) ? kannAbholen_(id, S(), now()) : 0), 0);

  // Welche RPG-Maker-Schalter sind gerade "an"? (Erkennung am Namen)
  function computeSwitches() {
    const on = new Set();
    ['ms2', 'ms3', 'ms4', 'ms5'].forEach(a => { if (areaOpen(a)) on.add(norm(msOfArea(a) + ' offen')); });
    Object.keys(S().b || {}).forEach(id => on.add(norm('Bau ' + R().buildings[id].sw)));
    Object.keys(S().st || {}).forEach(id => {
      const d = sDef(id), ss = stOf(id);
      on.add(norm('Bau ' + d.sw));
      for (let l = 2; l <= ss.lvl; l++) on.add(norm('Bau ' + d.sw + ' ' + l));
      if (d.out && ss.on) { on.add(norm('Läuft ' + d.sw)); on.add(norm('Laeuft ' + d.sw)); }
      if (id === 'notstrom') on.add(norm('Läuft Notstrom'));
    });
    Object.keys(S().owned || {}).forEach(id => { const c = R().catalog[id]; if (c && c.sw) on.add(norm(c.sw)); });
    return on;
  }
  // Ruine zeigen? (Region → Gebäude / Arbeitsbereich / Bereich)
  function isRuin(region) {
    const o = L.regions[region];
    if (!o) return false;
    if (o.b) return !built(o.b);
    if (o.s) return !stOf(o.s);
    if (o.area) return !areaOpen(o.area);
    return false;
  }

  // ---------------- Welt laden ----------------
  function parseTags(note) {
    const tags = {}; const re = /<\s*([A-Za-zÄÖÜäöü]+)\s*(?::\s*([^>]*))?>/g; let m;
    while ((m = re.exec(note || ''))) tags[norm(m[1])] = m[2] === undefined ? true : m[2].trim();
    return tags;
  }
  async function loadWorld() {
    G.world = await (await fetch('assets/data/world.json?v=' + (window.ASSET_V || 1))).json();
    Object.values(G.world.maps).forEach(md => md.events.forEach(e => {
      e.tags = parseTags(e.note);
      if (e.tags.bau) e.bau = L.bau[norm(e.tags.bau).replace(/\s/g, '')] || null;
      if (e.tags.quest) e.quest = String(e.tags.quest).toUpperCase().replace(/\s/g, '');
      e.pages.forEach(p => { p.c1 = p.s1 ? norm(p.s1) : null; p.c2 = p.s2 ? norm(p.s2) : null; });
    }));
    const names = ['!Chest'].concat(L.avatars);
    await Promise.all(names.map(loadChar));
    await Promise.all(Object.entries(L.decoSheets).map(async ([k, n]) => { G.imgs['deco_' + k] = await TM.loadImage('assets/tilesets/' + n + '.png'); }));
  }
  async function loadChar(n) {
    if (!n || G.imgs[n] !== undefined) return;
    G.imgs[n] = null;
    G.imgs[n] = await TM.loadImage('assets/characters/' + encodeURIComponent(n) + '.png');
  }
  async function getMap(id) {
    if (G.maps[id]) return G.maps[id];
    const def = G.world.maps[id]; if (!def) return null;
    const M = await TM.build(def, G.world.tilesets[def.ts], 'assets/');
    M.id = +id; M.events = def.events;
    await Promise.all(def.events.flatMap(e => e.pages.map(p => loadChar(p.img.n))));
    // nur die letzten zwei Karten im Speicher behalten (iPad)
    const keys = Object.keys(G.maps);
    if (keys.length >= 2) keys.filter(k => +k !== G.mapId).forEach(k => delete G.maps[k]);
    G.maps[id] = M;
    return M;
  }

  // Ereignisseiten wie RPG Maker auswählen: die letzte Seite, deren Bedingungen erfüllt sind
  function activePage(e) {
    for (let i = e.pages.length - 1; i >= 0; i--) {
      const p = e.pages[i];
      if (p.x) continue;
      if (p.c1 && !G.sw.has(p.c1)) continue;
      if (p.c2 && !G.sw.has(p.c2)) continue;
      return p;
    }
    return null;
  }
  function refreshWorld() {
    if (!G.M || !G.data) return;
    G.sw = computeSwitches();
    G.M.events.forEach(e => { e.page = activePage(e); e.anim = e.anim || { t: 0, pat: e.page ? e.page.img.p : 1 }; });
    G.M.setRuins((x, y, r) => isRuin(r));
    G.markers = buildMarkers();
  }

  async function enterMap(id, x, y, dir) {
    const M = await getMap(id);
    if (!M) { toast('Dieser Ort wird gerade noch eingerichtet.'); return false; }
    G.M = M; G.mapId = +id;
    const p = G.player;
    p.x = p.px = x; p.y = p.py = y; p.path = []; p.onArrive = null; if (dir) p.dir = dir;
    G.cat.px = x; G.cat.py = y; G.cat.trail = [];
    refreshWorld();
    G.follow = true;
    savePos();
    $('mapName').textContent = M.def.display || M.def.name;
    $('mapName').classList.remove('hidden'); clearTimeout(enterMap.h); enterMap.h = setTimeout(() => $('mapName').classList.add('hidden'), 2200);
    return true;
  }
  function savePos() { if (G.data) store.set('altefabrik_pos_' + G.data.user.tag, JSON.stringify({ m: G.mapId, x: G.player.x, y: G.player.y })); }

  // ---------------- Begehbarkeit (wie RPG Maker) ----------------
  const DIRS = [[0, 1, 2], [-1, 0, 4], [1, 0, 6], [0, -1, 8]]; // dx, dy, RPG-Maker-Richtung
  const rev = d => 10 - d;
  function eventsAt(x, y) { return G.M.events.filter(e => e.x === x && e.y === y); }
  function blockedByObj(x, y) {
    if (eventsAt(x, y).some(e => e.page && e.page.prio === 1 && !e.page.thr)) return true;
    if ((S().placed || []).some(o => o.m === G.mapId && o.x === x && o.y === y)) return true;
    return false;
  }
  function canMove(x, y, d) {
    const [dx, dy] = DIRS.find(a => a[2] === d), nx = x + dx, ny = y + dy, M = G.M;
    if (!M.inside(nx, ny)) return false;
    if (!M.passDir(x, y, d) || !M.passDir(nx, ny, rev(d))) return false;
    const r = L.regions[M.region(nx, ny)];
    if (r && r.blocked) return false;
    return !blockedByObj(nx, ny);
  }
  // Weg zu (tx,ty); wenn dort ein Hindernis ist, bis direkt davor (Blick dorthin)
  function findPath(sx, sy, tx, ty) {
    const W = G.M.W, key = (x, y) => y * W + x;
    const goals = new Map(); // key -> Blickrichtung oder 0
    goals.set(key(tx, ty), 0);
    DIRS.forEach(([dx, dy, d]) => { const x = tx - dx, y = ty - dy; if (G.M.inside(x, y) && !goals.has(key(x, y))) goals.set(key(x, y), d); });
    const open = [[sx, sy]], came = new Map([[key(sx, sy), -1]]);
    let head = 0, hit = null;
    const exact = goals.get(key(tx, ty));
    while (head < open.length) {
      const [x, y] = open[head++];
      if (x === tx && y === ty) { hit = [x, y]; break; }
      for (const [dx, dy, d] of DIRS) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (came.has(k) || !canMove(x, y, d)) continue;
        came.set(k, key(x, y)); open.push([nx, ny]);
      }
    }
    if (!hit) { // Ziel selbst nicht erreichbar: bestes Nachbarfeld
      let best = null;
      goals.forEach((d, k) => { if (d && came.has(k) && (!best || pathLen(came, k, key(sx, sy)) < pathLen(came, best[0], key(sx, sy)))) best = [k, d]; });
      if (!best) return null;
      const path = trace(came, best[0], key(sx, sy), W);
      path.face = best[1];
      return path;
    }
    void exact;
    return trace(came, key(tx, ty), key(sx, sy), W);
  }
  function pathLen(came, k, start) { let n = 0; while (k !== start && n < 9999) { k = came.get(k); n++; } return n; }
  function trace(came, k, start, W) { const path = []; while (k !== start) { path.unshift([k % W, Math.floor(k / W)]); k = came.get(k); } return path; }
  function walkTo(tx, ty, onArrive) {
    const p = G.player;
    const path = findPath(Math.round(p.x), Math.round(p.y), tx, ty);
    if (!path) { toast('Da komme ich nicht hin.'); return false; }
    p.path = path; p.face = path.face || 0; p.onArrive = onArrive || null; G.follow = true;
    if (!path.length) { if (p.face) p.dir = p.face; p.onArrive = null; if (onArrive) onArrive(); }
    return true;
  }

  // ---------------- Questpunkte ----------------
  function buildMarkers() {
    const byKey = {}; G.data.quests.forEach(q => byKey[q.key] = q);
    const cur = G.data.quests.find(q => !q.done && q.hq && areaOpen(areaOf(q.ms))) || G.data.quests.find(q => !q.done && areaOpen(areaOf(q.ms)));
    const list = [];
    G.M.events.forEach(e => { if (e.quest && byKey[e.quest]) list.push({ q: byKey[e.quest], x: e.x, y: e.y, e, current: byKey[e.quest] === cur }); });
    return list;
  }
  function questLocation(q) {
    for (const [id, md] of Object.entries(G.world.maps)) {
      const e = md.events.find(e => e.quest === q.key);
      if (e) return { m: +id, x: e.x, y: e.y, name: md.display || md.name };
    }
    return null;
  }

  // ---------------- Zeichnen ----------------
  const cv = $('world'), ctx = cv.getContext('2d');
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); G.dpr = dpr;
  }
  function clampCam() {
    const vw = innerWidth / G.scale, vh = innerHeight / G.scale, mw = G.M.W * T, mh = G.M.H * T;
    G.cam.x = mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, G.cam.x));
    G.cam.y = mh <= vh ? (mh - vh) / 2 : Math.max(-70 / G.scale, Math.min(mh - vh + 90 / G.scale, G.cam.y));
  }

  function charFrame(name) {
    const img = G.imgs[name]; if (!img) return null;
    const big = name.replace(/^!/, '').startsWith('$');
    const pw = img.width / (big ? 3 : 12), ph = img.height / (big ? 4 : 8);
    return { img, big, pw, ph, obj: name.startsWith('!') || name.startsWith('$!') };
  }
  function drawChar(name, idx, dir, pat, px, py) {
    const f = charFrame(name); if (!f) return;
    const col = (f.big ? 0 : (idx % 4) * 3) + pat, row = (f.big ? 0 : Math.floor(idx / 4) * 4) + (dir / 2 - 1);
    const dx = px * T + T / 2 - f.pw / 2, dy = py * T + T - f.ph - (f.obj ? 0 : 6);
    ctx.drawImage(f.img, col * f.pw, row * f.ph, f.pw, f.ph, Math.round(dx), Math.round(dy), f.pw, f.ph);
  }
  function drawEvent(e) {
    const p = e.page; if (!p) return;
    if (p.img.t > 0) { G.M.drawTileAt(ctx, p.img.t, e.x * T, e.y * T); return; }
    if (!p.img.n) return;
    drawChar(p.img.n, p.img.i, p.img.d, p.step ? e.anim.pat : p.img.p, e.x, e.y);
  }

  function draw(ts) {
    requestAnimationFrame(draw);
    if (!G.M || !G.data) return;
    const dt = Math.min(0.05, (ts - (G.last || ts)) / 1000); G.last = ts;
    update(dt);
    const p = G.player;
    if (G.follow) { G.cam.x = p.px * T + T / 2 - innerWidth / G.scale / 2; G.cam.y = p.py * T + T / 2 - innerHeight / G.scale / 2; }
    clampCam();
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.setTransform(G.dpr * G.scale, 0, 0, G.dpr * G.scale, -G.cam.x * G.dpr * G.scale, -G.cam.y * G.dpr * G.scale);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(G.M.lower, 0, 0);
    if (G.mode === 'place') drawPlaceGrid();
    G.M.events.forEach(e => { if (e.page && e.page.prio === 0) drawEvent(e); });
    drawPathLine();
    const items = [];
    G.M.events.forEach(e => { if (e.page && e.page.prio === 1) items.push({ y: e.y, f: () => drawEvent(e) }); });
    (S().placed || []).forEach(o => { if (o.m === G.mapId) items.push({ y: o.y, f: () => drawDeco(o.t, o.x, o.y) }); });
    G.markers.forEach(m => items.push({ y: m.y - 0.01, f: () => drawMarker(m, ts) }));
    items.push({ y: p.py + 0.02, f: () => drawPlayer() });
    if (S().owned && S().owned.katze) items.push({ y: G.cat.py, f: () => drawCat() });
    items.sort((a, b) => a.y - b.y).forEach(i => i.f());
    ctx.drawImage(G.M.upper, 0, 0);
    G.M.events.forEach(e => { if (e.page && e.page.prio === 2) drawEvent(e); });
    drawSigns(ts);
    if (G.mode === 'place' && G.hover) { ctx.strokeStyle = '#e0a63a'; ctx.lineWidth = 3; ctx.strokeRect(G.hover.x * T + 2, G.hover.y * T + 2, T - 4, T - 4); }
    drawFloaters(dt);
  }

  function update(dt) {
    const p = G.player;
    if (p.path.length) {
      const [nx, ny] = p.path[0];
      const sp = 5 * dt, dx = nx - p.px, dy = ny - p.py, d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 6 : 4) : (dy > 0 ? 2 : 8);
      if (d <= sp) {
        G.cat.trail.push([p.x, p.y]);
        p.px = nx; p.py = ny; p.x = nx; p.y = ny; p.path.shift();
        const door = !p.path.length ? null : null; void door;
        if (!p.path.length) {
          if (p.face) p.dir = p.face;
          savePos();
          if (p.onArrive) { const f = p.onArrive; p.onArrive = null; f(); }
        }
      } else { p.px += dx / d * sp; p.py += dy / d * sp; }
      p.walkT += dt;
    }
    // Katzenroboter folgt mit Abstand
    const c = G.cat;
    if (c.trail.length > 1) c.trail.splice(0, c.trail.length - 1);
    const tgt = c.trail[0] || [p.x, p.y];
    const cdx = tgt[0] - c.px, cdy = tgt[1] - c.py, cd = Math.hypot(cdx, cdy);
    if (cd > 0.02 && Math.hypot(p.px - c.px, p.py - c.py) > 0.9) { const s = Math.min(cd, 5 * dt); c.px += cdx / cd * s; c.py += cdy / cd * s; c.dir = Math.abs(cdx) > Math.abs(cdy) ? (cdx > 0 ? 6 : 4) : (cdy > 0 ? 2 : 8); c.walk = true; } else c.walk = false;
    // Schrittanimation der Ereignisse (wie RPG Maker: Muster 0,1,2,1)
    G.M.events.forEach(e => {
      if (!e.page || !e.page.step) return;
      e.anim.t += dt;
      if (e.anim.t > 0.25) { e.anim.t = 0; e.anim.pat = (e.anim.pat + 1) % 4; }
    });
  }

  function drawPlayer() {
    const p = G.player, n = L.avatars[S().avatar || 0];
    const pat = p.path.length ? [0, 1, 2, 1][Math.floor(p.walkT * 8) % 4] : 1;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(p.px * T + 24, p.py * T + 42, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    drawChar(n, 0, p.dir, pat, p.px, p.py);
  }
  function drawCat() {
    const c = G.cat;
    if (G.imgs.Katzenroboter) return drawChar('Katzenroboter', 0, c.dir, c.walk ? [0, 1, 2, 1][Math.floor(performance.now() / 120) % 4] : 1, c.px, c.py);
    ctx.save(); ctx.font = '28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🐈', c.px * T + 24, c.py * T + 40); ctx.restore();
  }
  function drawDeco(t, x, y) {
    const d = L.deco[t]; if (!d) return;
    const img = G.imgs['deco_' + d.set]; if (!img) return;
    ctx.drawImage(img, d.x * T, d.y * T, d.w * T, d.h * T, x * T, (y - d.h + 1) * T, d.w * T, d.h * T);
  }
  function drawPathLine() {
    ctx.save(); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.setLineDash([2, 10]);
    const byMs = {};
    G.markers.forEach(m => (byMs[m.q.ms] = byMs[m.q.ms] || []).push(m));
    Object.values(byMs).forEach(list => {
      list.sort((a, b) => G.data.quests.indexOf(a.q) - G.data.quests.indexOf(b.q));
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1], b = list[i];
        ctx.strokeStyle = a.q.done && b.q.done ? 'rgba(120,220,130,.8)' : 'rgba(255,255,255,.45)';
        ctx.beginPath(); ctx.moveTo(a.x * T + 24, a.y * T + 24); ctx.lineTo(b.x * T + 24, b.y * T + 24); ctx.stroke();
      }
    });
    ctx.restore();
  }
  function drawMarker(m, ts) {
    const cx = m.x * T + 24, cy = m.y * T + 24, q = m.q;
    if (q.done && !q.claimed) {
      const bob = Math.sin(ts / 250 + m.x) * 3, img = G.imgs['!Chest'];
      ctx.fillStyle = 'rgba(255,215,90,.4)'; ctx.beginPath(); ctx.ellipse(cx, cy + 14, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
      if (img) ctx.drawImage(img, 0, 0, 48, 48, cx - 24, cy - 30 + bob, 48, 48);
      return;
    }
    const r = q.hq ? 13 : 10, locked = !areaOpen(areaOf(q.ms));
    if (m.current) {
      const pr = r + 6 + Math.sin(ts / 220) * 4;
      ctx.strokeStyle = 'rgba(214,70,60,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.lineWidth = 3;
    ctx.fillStyle = q.done ? '#3ea851' : m.current ? '#c53b30' : locked ? 'rgba(90,90,100,.6)' : 'rgba(210,205,200,.6)';
    ctx.strokeStyle = q.done ? '#e9ffe9' : 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (q.done) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx - 1, cy + 5); ctx.lineTo(cx + 7, cy - 5); ctx.stroke(); }
    else if (!q.hq) { ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('+', cx, cy + 4); }
  }
  function pill(x, y, txt, bg, fg, bob, border) {
    ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
    const w = ctx.measureText(txt).width + 22;
    ctx.fillStyle = bg; roundRect(x - w / 2, y - 15 + bob, w, 30, 15); ctx.fill();
    if (border) { ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = fg; ctx.fillText(txt, x, y + 5 + bob);
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // Schilder über Bauplätzen, Türen und Brettern
  function drawSigns(ts) {
    ctx.save();
    G.M.events.forEach(e => {
      const x = e.x * T + 24, y = e.y * T - 30;
      if (e.bau) {
        const st = plotStatus(e.bau); if (!st) return;
        const bob = st.ready ? Math.sin(ts / 300) * 3 : 0;
        pill(x, y, st.txt, st.bg, st.fg, bob, st.border);
      } else if (e.tags.tuer && e.page) {
        const locked = !e.page.xfer;
        ctx.globalAlpha = 0.9; pill(x, y + 6, (locked ? '🔒 ' : '🚪 ') + e.tags.tuer, 'rgba(20,22,28,.78)', locked ? '#d8c8b8' : '#f1ede4', 0); ctx.globalAlpha = 1;
      } else if (e.tags.brett || e.tags.auftraege || e.tags.auftragsbrett) {
        if (!built('pfoertner')) return;
        const n = e.tags.brett ? (G.data.badges || []).filter(b => b.ok).length : (auftraege_(now()).list.length - ((S().orders && S().orders.w === auftraege_(now()).w) ? S().orders.done.length : 0));
        pill(x, y + 6, e.tags.brett ? '🏅 ' + n : '📋 ' + n, 'rgba(20,22,28,.78)', '#f1ede4', 0);
      }
    });
    ctx.restore();
  }
  function plotStatus(o) {
    const gears = S().gears || 0;
    if (o.b) {
      const d = R().buildings[o.b];
      if (built(o.b) || !areaOpen(d.area)) return null;
      const ready = plans() > 0 && gears >= d.gears;
      return { txt: '🔧 ' + d.name, ready, bg: ready ? 'rgba(224,166,58,.95)' : 'rgba(20,22,28,.85)', fg: ready ? '#241806' : '#f1ede4', border: ready ? '#fff3d6' : 'rgba(255,255,255,.35)' };
    }
    const d = sDef(o.s), ss = stOf(o.s);
    if (!built(d.building)) return null;
    if (!ss) { const ready = gears >= d.gears; return { txt: '🔧 ' + d.name, ready, bg: ready ? 'rgba(224,166,58,.95)' : 'rgba(20,22,28,.85)', fg: ready ? '#241806' : '#f1ede4', border: ready ? '#fff3d6' : 'rgba(255,255,255,.35)' }; }
    if (o.s === 'notstrom') return { txt: '⚡ ' + onCount_(S()) + '/' + slots_(S()), bg: 'rgba(20,22,28,.8)', fg: '#ffe08a' };
    if (o.s === 'lager') return { txt: IC.store + ' ' + fmt(storeTotal_(S())) + '/' + fmt(storeCap_(S())), bg: 'rgba(20,22,28,.8)', fg: '#f1ede4' };
    if (!ss.on) return { txt: '⏸ aus', bg: 'rgba(20,22,28,.8)', fg: '#a9a49a' };
    const n = kannAbholen_(o.s, S(), now()), full = puffer_(o.s, ss, now()) >= rate_(o.s, ss) * R().bufferHours - 0.01;
    return { txt: IC[d.out] + ' ' + (n > 0 ? '+' + n : '…'), ready: n > 0, bg: n > 0 ? (full ? 'rgba(214,90,74,.95)' : 'rgba(88,179,104,.95)') : 'rgba(20,22,28,.8)', fg: '#fff' };
  }
  function drawPlaceGrid() {
    const M = G.M, hasDecoRegion = G.M.hasDeco;
    ctx.fillStyle = 'rgba(224,166,58,.18)';
    for (let y = 0; y < M.H; y++) for (let x = 0; x < M.W; x++) if (placeOk(x, y, hasDecoRegion)) ctx.fillRect(x * T + 3, y * T + 3, T - 6, T - 6);
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
    if (!ptrs.has(e.pointerId)) { if (G.mode === 'place' && G.M) { const w = toWorld(e.clientX, e.clientY); G.hover = { x: Math.floor(w.x), y: Math.floor(w.y) }; } return; }
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
    if (!G.data || !G.M) return;
    const w = toWorld(sx, sy), tx = Math.floor(w.x), ty = Math.floor(w.y);
    if (G.mode === 'place') return placeTap(tx, ty);
    // Schild über einem Bauplatz angetippt?
    const sign = G.M.events.find(e => e.bau && plotStatus(e.bau) && Math.abs(w.x - (e.x + .5)) < 1.6 && w.y > e.y - 1.05 && w.y < e.y - 0.3);
    if (sign) return interact(sign);
    const m = G.markers.find(m => Math.hypot(m.x + .5 - w.x, m.y + .5 - w.y) < .7);
    if (m) { walkTo(m.x, m.y); return questPanel(m.q); }
    // Ereignis auf der Kachel (oder große Figur eine Kachel darunter)
    const cand = eventsAt(tx, ty).concat(eventsAt(tx, ty + 1).filter(e => e.page && (e.page.img.n || '').includes('$')));
    const e = cand.find(e => isInteresting(e));
    if (e) return interact(e);
    const deco = (S().placed || []).find(o => o.m === G.mapId && o.x === tx && o.y === ty);
    if (deco) return decoPanel(deco);
    if (!G.M.inside(tx, ty)) return;
    walkTo(tx, ty);
  }
  function isInteresting(e) {
    if (e.bau || e.quest || e.tags.brett || e.tags.auftraege || e.tags.auftragsbrett || e.tags.kosmetik) return true;
    return !!(e.page && (e.page.xfer || e.page.text));
  }
  function interact(e) {
    const p = e.page;
    if (e.bau) { walkTo(e.x, e.y); return e.bau.b ? buildingPanel(e.bau.b) : stationPanel(e.bau.s); }
    if (e.tags.brett) { walkTo(e.x, e.y); return badgePanel(); }
    if (e.tags.auftraege || e.tags.auftragsbrett) { walkTo(e.x, e.y); return ordersPanel(); }
    if (e.tags.kosmetik) { walkTo(e.x, e.y); return catalogPanel(norm(e.tags.kosmetik)); }
    if (p && p.xfer) {
      return walkTo(e.x, e.y, () => {
        const x = p.xfer;
        if (!G.world.maps[x.m]) return toast('Dieser Ort wird gerade noch eingerichtet.');
        enterMap(x.m, x.x, x.y, x.d || G.player.dir);
      });
    }
    if (p && p.text) { walkTo(e.x, e.y, () => toast(p.text)); return; }
    walkTo(e.x, e.y);
  }

  // ---------------- HUD ----------------
  function renderHud() {
    const u = G.data.user, st = S();
    $('whoTag').textContent = u.tag + ((st.stamps || 0) >= R().orders.stampsForTitle ? ' · ' + R().orders.title : '');
    $('whoLevel').textContent = 'Lv ' + (u.level || 0) + (u.stufe ? ' · ' + u.stufe : '');
    let h = `<span class="chip" title="Zahnräder">${IC.gears} ${fmt(st.gears || 0)}</span>`;
    if (plans() > 0) h += `<span class="chip" title="Baupläne">${IC.plans} ${plans()}</span>`;
    if (st.st && st.st.notstrom) h += `<span class="chip" title="Stromanschlüsse">${IC.power} ${onCount_(st)}/${slots_(st) > 50 ? '∞' : slots_(st)}</span>`;
    PARTS.forEach(k => { if ((st.store[k] || 0) > 0) h += `<span class="chip" title="${esc(R().parts[k].name)}">${IC[k]} ${fmt(st.store[k])}</span>`; });
    if (Object.keys(st.st || {}).length) h += `<span class="chip muted" title="Teilelager">${IC.store} ${fmt(storeTotal_(st))}/${fmt(storeCap_(st))}</span>`;
    $('res').innerHTML = h;
    const d = G.data.stand ? new Date(G.data.stand) : null;
    $('stand').textContent = (MOCK ? 'Vorschau-Modus · ' : '') + (d ? 'Quest-Stand: ' + d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '');
    $('dotQuests').classList.toggle('hidden', !unclaimed().length);
    updateDots();
  }
  function updateDots() {
    if (!G.data) return;
    $('dotCollect').classList.toggle('hidden', !(collectableAll() > 0));
    const o = auftraege_(now()), done = S().orders && S().orders.w === o.w ? S().orders.done : [];
    $('dotOrders').classList.toggle('hidden', !o.list.some((x, i) => done.indexOf(i) < 0 && has(x.parts)));
  }
  setInterval(updateDots, 5000);

  // ---------------- Panels ----------------
  function openSheet(html) { $('sheetBody').innerHTML = html; $('sheet').classList.remove('hidden'); $('sheet').scrollTop = 0; }
  function closeSheet() { $('sheet').classList.add('hidden'); }
  $('sheetClose').onclick = closeSheet;
  $('sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
  const on = (sel, fn) => document.querySelectorAll(sel).forEach(el => el.onclick = () => fn(el));
  const req = (ok, txt) => `<div class="req ${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${esc(txt)}</div>`;

  function questPanel(q) {
    const gears = Math.round(q.xp * R().gearsPerXp), a = areaOf(q.ms);
    let body = `<h2>${esc(short(q.n))}</h2>
      <div><span class="tag ${q.hq ? 'hq' : 'nq'}">${q.hq ? 'Hauptquest' : 'Nebenquest'}</span><span class="tag xp">${q.xp} XP</span> <span class="muted small">${esc(q.ms)} · ${esc(areaName(a))}</span></div>
      <p class="muted small">${esc(q.n)}</p>`;
    if (q.done && !q.claimed) body += `<p>Erledigt! Hier wartet eine Kiste auf dich: <b>${gears} ${IC.gears}</b>.</p><div class="actions"><button class="btn primary" id="bClaim">Kiste öffnen</button></div>`;
    else if (q.done) body += `<p>✅ Erledigt und eingesammelt.</p>`;
    else body += `<p>Diese Quest erledigst du in <b>Mebis</b>. Sobald deine Lehrkraft den Fortschritt exportiert hat, steht hier eine Kiste mit <b>${gears} ${IC.gears}</b>.</p>`;
    const loc = questLocation(q);
    if (loc && loc.m !== G.mapId) body += `<p class="muted small">📍 Dieser Questpunkt liegt in: ${esc(loc.name)}</p>`;
    openSheet(body);
    on('#bClaim', async () => {
      const r = await act({ action: 'claim', quest: q.n });
      if (r.ok) { const m = G.markers.find(m => m.q.n === q.n); floater(m ? m.x : G.player.px, m ? m.y : G.player.py, '+' + gears + ' ⚙️'); closeSheet(); }
    });
  }

  function questBook() {
    const byMs = {};
    G.data.quests.forEach(q => (byMs[q.ms] = byMs[q.ms] || []).push(q));
    const open = unclaimed();
    let h = `<h2>Questbuch</h2><p class="muted">${G.data.quests.filter(q => q.done).length} von ${G.data.quests.length} Quests erledigt.</p>`;
    if (open.length) h += `<div class="actions"><button class="btn primary" id="bClaimAll">Alle ${open.length} Kisten öffnen</button></div>`;
    Object.keys(byMs).forEach(ms => {
      const a = areaOf(ms), list = byMs[ms];
      h += `<div class="ms-head"><h3>${esc(ms)} · ${esc(areaName(a))}</h3><span class="lock">${areaOpen(a) ? list.filter(q => q.done).length + '/' + list.length : '🔒 ' + unlockHint(a)}</span></div>`;
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
    on('[data-q]', el => {
      const q = G.data.quests.find(q => q.n === el.dataset.q);
      const m = G.markers.find(m => m.q === q);
      if (m) { closeSheet(); centerOn(m.x, m.y); }
      questPanel(q);
    });
  }
  function unlockHint(a) {
    if (a === 'ms5') return 'öffnet mit der 1. Arbeitsprobe';
    const prev = { ms2: 'MS1', ms3: 'MS2', ms4: 'MS3' }[a];
    const n = G.data.quests.filter(q => q.ms === prev && q.hq && !q.done).length;
    return n ? 'noch ' + n + ' Hauptquest' + (n > 1 ? 's' : '') + ' in ' + prev : 'verschlossen';
  }
  function centerOn(x, y) { G.cam.x = x * T + 24 - innerWidth / G.scale / 2; G.cam.y = y * T + 24 - innerHeight / G.scale / 2; G.follow = false; }

  // Gebäude
  function buildingPanel(id) {
    const d = R().buildings[id], gears = S().gears || 0;
    let h = `<h2>${esc(d.name)}</h2><p class="muted small">${esc(msOfArea(d.area))} · ${esc(areaName(d.area))}${d.optional ? ' · freiwillig' : ''}</p><p>${esc(d.desc || '')}</p>`;
    if (!built(id)) {
      const ok = [areaOpen(d.area), plans() > 0, gears >= d.gears];
      h += `<h3>Reparatur</h3>` + req(ok[0], areaOpen(d.area) ? 'Bereich ist offen' : 'Bereich ' + unlockHint(d.area)) + req(ok[1], '1 Bauplan ' + IC.plans) + req(ok[2], d.gears + ' Zahnräder ' + IC.gears + ' (du hast ' + fmt(gears) + ')');
      h += `<div class="actions"><button class="btn primary" id="bBuild" ${ok.every(Boolean) ? '' : 'disabled'}>Reparieren</button></div>`;
      h += `<p class="muted small">Zahnräder bekommst du aus den Kisten deiner erledigten Quests. Einen Bauplan gibt es, sobald der Bereich offen ist.</p>`;
    } else h += `<p>✅ Repariert.</p>`;
    const sts = Object.keys(R().stations).filter(s => sDef(s).building === id);
    if (sts.length) {
      h += `<h3>Arbeitsbereiche</h3>`;
      sts.forEach(s => { h += stationRow(s); });
    }
    openSheet(h);
    on('#bBuild', async () => { const r = await act({ action: 'build', building: id }); if (r.ok) { floatAt({ b: id }, '✨ ' + d.name); buildingPanel(id); } });
    on('[data-st]', el => stationPanel(el.dataset.st));
  }
  function stationRow(s) {
    const d = sDef(s), ss = stOf(s);
    let sub;
    if (!ss) sub = built(d.building) ? 'Reparatur: ' + d.gears + ' ' + IC.gears : '🔒 erst ' + bName(d.building) + ' reparieren';
    else if (d.out) sub = 'Stufe ' + ss.lvl + ' · ' + fmt(rate_(s, ss)) + ' ' + IC[d.out] + '/h · ' + (ss.on ? '▶ läuft' : '⏸ aus');
    else if (s === 'notstrom') sub = 'Stufe ' + ss.lvl + ' · ' + d.slots[ss.lvl - 1] + ' Anschluss' + (ss.lvl > 1 ? 'e' : '');
    else sub = 'Stufe ' + ss.lvl + ' · ' + fmt(storeCap_(S())) + ' Teile';
    return `<div class="row click" data-st="${s}"><span class="st">${ss ? '✅' : '⬜'}</span><div class="grow"><div class="title">${esc(d.name)}</div><div class="sub">${sub}</div></div></div>`;
  }
  function floatAt(o, txt) {
    const e = G.M.events.find(e => e.bau && ((o.b && e.bau.b === o.b) || (o.s && e.bau.s === o.s)));
    floater(e ? e.x : G.player.px, e ? e.y - 1 : G.player.py, txt);
  }

  // Arbeitsbereich
  function stationPanel(s) {
    const d = sDef(s), ss = stOf(s), gears = S().gears || 0;
    let h = `<h2>${esc(d.name)}</h2><p class="muted small">in: ${esc(bName(d.building))}</p>`;
    if (d.desc) h += `<p>${esc(d.desc)}</p>`;
    if (d.out) h += `<p>Stellt <b>${esc(R().parts[d.out].name)}</b> ${IC[d.out]} her: ${d.rate.map((r, i) => 'Stufe ' + (i + 1) + ': ' + fmt(r) + '/h').join(' · ')}.` +
      (d.uses ? ` Verbraucht je Baugruppe ein Blech-, Fräs-, Dreh- und Gewindeteil.` : '') + `</p>`;
    if (!ss) {
      const ok = [built(d.building), gears >= d.gears];
      h += `<h3>Reparatur</h3>` + req(ok[0], bName(d.building) + ' repariert') + req(ok[1], d.gears + ' Zahnräder ' + IC.gears + ' (du hast ' + fmt(gears) + ')');
      h += `<div class="actions"><button class="btn primary" id="bRepair" ${ok.every(Boolean) ? '' : 'disabled'}>Reparieren</button></div>`;
    } else {
      h += `<p><b>Stufe ${ss.lvl}</b> von 3</p>`;
      if (d.out) {
        const pend = puffer_(s, ss, now()), n = kannAbholen_(s, S(), now()), cap = rate_(s, ss) * R().bufferHours;
        h += `<div class="bar"><div style="width:${Math.min(100, pend / cap * 100)}%"></div></div>
          <p class="small">Ausgabelager: <b>${fmt(Math.floor(pend))}</b> von ${fmt(cap)} (voll nach ${R().bufferHours} Stunden).` +
          (Math.floor(pend) > n ? ` <span class="muted">${s === 'montage' ? 'Es fehlen Teile zum Zusammenbauen.' : 'Das Teilelager ist voll.'}</span>` : '') + `</p>`;
        h += `<p>Strom: ${ss.on ? '▶ <b>läuft</b>' : '⏸ <b>abgeschaltet</b>'} · Anschlüsse belegt: ${onCount_(S())} von ${slots_(S()) > 50 ? 'unbegrenzt (Kraftwerk)' : slots_(S())}</p>`;
        h += `<div class="actions"><button class="btn good" id="bCollect" ${n > 0 ? '' : 'disabled'}>Abholen (${n})</button>
          <button class="btn" id="bPower">${ss.on ? 'Abschalten' : 'Einschalten'}</button>`;
      } else h += `<div class="actions">`;
      if (ss.lvl < 3) {
        const c = d.up[ss.lvl - 1];
        h += `<button class="btn" id="bUp" ${gears >= c ? '' : 'disabled'}>Ausbauen auf Stufe ${ss.lvl + 1} (${c} ${IC.gears})</button>`;
      }
      h += `</div>`;
      if (ss.lvl < 3) h += `<p class="muted small">Stufe ${ss.lvl + 1}: ${upInfo(s, ss.lvl + 1)}</p>`;
    }
    openSheet(h);
    on('#bRepair', async () => { const r = await act({ action: 'repair', station: s }); if (r.ok) { floatAt({ s }, '✨ ' + d.name); stationPanel(s); } });
    on('#bUp', async () => { const r = await act({ action: 'upgrade', station: s }); if (r.ok) stationPanel(s); });
    on('#bPower', async () => { const r = await act({ action: 'power', station: s, on: !stOf(s).on }); if (r.ok || r.state) stationPanel(s); });
    on('#bCollect', async () => { const r = await act({ action: 'collect', station: s }, true); if (r.ok) { gotFloat(r.got, { s }); stationPanel(s); } });
  }
  function upInfo(s, l) {
    const d = sDef(s);
    if (d.out) return fmt(d.rate[l - 1]) + ' ' + IC[d.out] + ' pro Stunde';
    if (s === 'notstrom') return d.slots[l - 1] + ' Maschinen gleichzeitig';
    return R().storeCaps[l].toLocaleString('de-DE') + ' Teile im Lager';
  }
  function gotFloat(got, o) {
    const txt = Object.keys(got || {}).map(k => '+' + got[k] + ' ' + IC[k]).join(' ');
    if (o) floatAt(o, txt); else floater(G.player.px, G.player.py, txt);
  }

  // Fabrik-Übersicht
  function factoryPanel() {
    const st = S();
    let h = `<h2>Meine Fabrik</h2><p class="muted">${IC.gears} ${fmt(st.gears || 0)} Zahnräder · ${IC.plans} ${plans()} ${plans() === 1 ? 'Bauplan' : 'Baupläne'} · ${IC.power} ${onCount_(st)} von ${slots_(st) > 50 ? '∞' : slots_(st)} Anschlüssen belegt</p>`;
    h += `<div class="parts">` + PARTS.map(k => `<span class="chip">${IC[k]} ${fmt(st.store[k] || 0)} <span class="muted small">${esc(R().parts[k].name)}</span></span>`).join('') +
      `<span class="chip">${IC.store} ${fmt(storeTotal_(st))} / ${fmt(storeCap_(st))}</span></div>`;
    R().areas.forEach(a => {
      const ids = Object.keys(R().buildings).filter(b => R().buildings[b].area === a.id);
      ids.forEach(b => {
        const d = R().buildings[b];
        h += `<div class="ms-head"><h3>${esc(d.name)}</h3><span class="lock">${built(b) ? '✅' : areaOpen(a.id) ? '🔧 ' + d.gears + ' ' + IC.gears : '🔒 ' + esc(a.ms)}</span></div>`;
        h += `<div class="row click" data-b="${b}"><span class="st">${built(b) ? '🏭' : '🏚️'}</span><div class="grow"><div class="title">${esc(d.name)}${d.optional ? ' <span class="muted small">(freiwillig)</span>' : ''}</div><div class="sub">${built(b) ? 'repariert' : areaOpen(a.id) ? '1 ' + IC.plans + ' + ' + d.gears + ' ' + IC.gears : unlockHint(a.id)}</div></div></div>`;
        Object.keys(R().stations).filter(s => sDef(s).building === b).forEach(s => {
          const d2 = sDef(s), ss = stOf(s);
          const sw = d2.out && ss ? `<label class="switch" onclick="event.stopPropagation()"><input type="checkbox" data-pw="${s}" ${ss.on ? 'checked' : ''}><span></span></label>` : '';
          h += stationRow(s).replace('</div></div>', '</div></div>' + sw);
        });
      });
    });
    openSheet(h);
    on('[data-b]', el => buildingPanel(el.dataset.b));
    on('[data-st]', el => stationPanel(el.dataset.st));
    document.querySelectorAll('[data-pw]').forEach(el => el.onchange = async () => { await act({ action: 'power', station: el.dataset.pw, on: el.checked }); factoryPanel(); });
  }

  async function collectAll() {
    if (!(collectableAll() > 0)) {
      const full = storeTotal_(S()) >= storeCap_(S()) && machines().some(id => stOf(id) && puffer_(id, stOf(id), now()) >= 1);
      return toast(full ? 'Das Teilelager ist voll. Gib Teile aus oder baue das Teilelager aus.' : 'Gerade ist nichts zum Abholen fertig.');
    }
    const r = await act({ action: 'collect', station: '*' });
    if (r.ok) gotFloat(r.got);
  }

  // Aufträge
  function ordersPanel() {
    const o = auftraege_(now()), done = S().orders && S().orders.w === o.w ? S().orders.done : [];
    const stamps = S().stamps || 0, need = R().orders.stampsForTitle;
    let h = `<h2>Auftragsbrett</h2><p class="muted">Jede Woche drei neue Aufträge, für alle gleich. Jeder erfüllte Auftrag gibt einen Stempel. Ab ${need} Stempeln trägst du den Titel „${esc(R().orders.title)}“.</p>`;
    h += `<div class="stamps">${'●'.repeat(Math.min(stamps, need))}${'○'.repeat(Math.max(0, need - stamps))}</div><p class="small">${stamps} von ${need} Stempeln</p>`;
    if (!built('pfoertner')) h += `<p>🔒 Das Auftragsbrett hängt im Pförtnerhaus. Repariere es zuerst.</p>`;
    o.list.forEach((x, i) => {
      const d = done.indexOf(i) >= 0, ok = has(x.parts);
      h += `<div class="row"><span class="st">${d ? '✅' : '📋'}</span><div class="grow"><div class="title">Auftrag ${esc(x.size)}</div><div class="sub">${priceTxt(x.parts)}</div></div>
        ${d ? '<span class="muted small">erfüllt</span>' : `<button class="btn small ${ok ? 'good' : ''}" data-o="${i}" ${ok && built('pfoertner') ? '' : 'disabled'}>Liefern</button>`}</div>`;
    });
    const nx = new Date((o.w + 1) * 7 * 86400000 - 3 * 86400000);
    h += `<p class="muted small">Neue Aufträge ab ${nx.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'numeric' })}.</p>`;
    openSheet(h);
    on('[data-o]', async el => { const r = await act({ action: 'order', i: +el.dataset.o }); if (r.ok) { floater(G.player.px, G.player.py, '+1 Stempel'); ordersPanel(); } });
  }

  // Katalog
  function catalogPanel(focus) {
    const c = R().catalog, st = S();
    let h = `<h2>Katalog</h2><p class="muted">Bezahlt wird mit Werkstücken aus dem Teilelager. Aufstellen kannst du Gegenstände auf den markierten Deko-Flächen.</p><div class="grid">`;
    Object.keys(c).forEach(id => {
      const d = c[id], open = areaOpen(d.area), owned = d.kind !== 'place' && st.owned && st.owned[id], cnt = (st.items && st.items[id]) || 0;
      const can = open && !owned && has(d.price);
      h += `<div class="tile ${focus === id || norm(d.sw || '') === focus ? 'focus' : ''}"><span class="pic" id="cp_${id}">${L.catalogIcon[id] || ''}</span><b>${esc(d.name)}</b>
        <span class="muted small">${open ? priceTxt(d.price) : '🔒 ab ' + esc(msOfArea(d.area))}</span>
        ${owned ? '<span class="small">✅ gehört dir</span>' : `<button class="btn small ${can ? 'good' : ''}" data-buy="${id}" ${can ? '' : 'disabled'}>Kaufen</button>`}
        ${cnt ? `<button class="btn small primary" data-place="${id}">Aufstellen (${cnt})</button>` : ''}</div>`;
    });
    h += `</div><p class="muted small">${(st.placed || []).length} von ${R().maxPlaced} Plätzen belegt. Tippe einen aufgestellten Gegenstand an, um ihn wegzuräumen.</p>`;
    openSheet(h);
    Object.keys(c).forEach(id => { const el = $('cp_' + id); if (el && L.deco[id]) { el.textContent = ''; el.appendChild(decoCanvas(id)); } });
    on('[data-buy]', async el => { const r = await act({ action: 'buy', item: el.dataset.buy }); if (r.ok) catalogPanel(el.dataset.buy); });
    on('[data-place]', el => startPlace(el.dataset.place));
  }
  function decoCanvas(t) {
    const d = L.deco[t], c = document.createElement('canvas'); c.width = 96; c.height = 96;
    const x = c.getContext('2d'), img = G.imgs['deco_' + d.set]; x.imageSmoothingEnabled = false;
    const s = Math.min(96 / (d.w * T), 96 / (d.h * T), 1);
    if (img) x.drawImage(img, d.x * T, d.y * T, d.w * T, d.h * T, (96 - d.w * T * s) / 2, 96 - d.h * T * s, d.w * T * s, d.h * T * s);
    return c;
  }
  function placeOk(x, y, decoRegion) {
    const M = G.M;
    if (!M.inside(x, y)) return false;
    if (decoRegion) { if (!(L.regions[M.region(x, y)] || {}).deco) return false; }
    else if (!M.passDir(x, y, 2) && !M.passDir(x, y, 8)) return false;
    if (blockedByObj(x, y) || eventsAt(x, y).length) return false;
    if (Math.round(G.player.x) === x && Math.round(G.player.y) === y) return false;
    return true;
  }
  function startPlace(item) {
    G.mode = 'place'; G.placeItem = item; closeSheet();
    G.M.hasDeco = (() => { for (let y = 0; y < G.M.H; y++) for (let x = 0; x < G.M.W; x++) if ((L.regions[G.M.region(x, y)] || {}).deco) return true; return false; })();
    $('decoHint').classList.remove('hidden');
    $('decoHintText').textContent = 'Tippe auf ein markiertes Feld für: ' + R().catalog[item].name;
  }
  function stopPlace() { G.mode = 'play'; G.placeItem = null; G.hover = null; $('decoHint').classList.add('hidden'); }
  $('btnDecoDone').onclick = stopPlace;
  async function placeTap(x, y) {
    G.hover = { x, y };
    if (!placeOk(x, y, G.M.hasDeco)) return toast('Hier ist kein Platz frei.', true);
    const r = await act({ action: 'place', item: G.placeItem, m: G.mapId, x, y });
    if (r.ok && !((S().items || {})[G.placeItem] > 0)) stopPlace();
  }
  function decoPanel(o) {
    const d = R().catalog[o.t];
    openSheet(`<h2>${esc(d ? d.name : o.t)}</h2><p>Willst du das wegräumen? Es kommt zurück in deinen Katalog und du kannst es woanders aufstellen.</p><div class="actions"><button class="btn" id="bUnplace">Wegräumen</button></div>`);
    on('#bUnplace', async () => { const r = await act({ action: 'unplace', m: o.m, x: o.x, y: o.y }); if (r.ok) closeSheet(); });
  }

  // Schwarzes Brett
  function badgePanel() {
    const got = {}; (G.data.badges || []).forEach(b => got[b.id] = b.ok);
    let h = `<h2>Schwarzes Brett</h2><p class="muted">Deine Plaketten. Graue Umrisse zeigen, was du noch verdienen kannst.</p><div class="badges">`;
    R().badges.forEach(b => { h += `<div class="badge-card ${got[b.id] ? b.color : 'locked'}"><span class="medal">${got[b.id] ? '🏅' : '◯'}</span><b>${esc(b.name)}</b><span class="small muted">${badgeHint(b)}</span></div>`; });
    openSheet(h + '</div>');
  }
  function badgeHint(b) {
    if (b.hq) return 'alle Hauptquests ' + b.hq.join(', ');
    if (b.all) return 'alle Quests ' + b.all[0] + '–' + b.all[b.all.length - 1];
    return b.quest.replace(/\\./g, '.').replace(/\\s\*/g, ' ') + ' bestanden';
  }

  // Menü
  function menu() {
    const u = G.data.user;
    let h = `<h2>Menü</h2>
      <div class="row"><div class="grow"><div class="title">${esc(u.tag)}</div><div class="sub">${esc(u.klasse || '')} · ${u.xp} XP · Level ${u.level} · ${S().stamps || 0} Stempel</div></div></div>
      <div class="actions"><button class="btn" id="bBrett">🏅 Schwarzes Brett</button><button class="btn" id="bAvatar">Figur wechseln</button><button class="btn" id="bHome">Zum Eingang</button><button class="btn" id="bRefresh">Neu laden</button></div>`;
    if (MOCK) h += `<h3>Vorschau-Werkzeuge</h3><div class="actions"><button class="btn" id="bSkip">⏩ 12 Stunden vorspulen</button><button class="btn" id="bRich">⚙️ +500 Zahnräder</button><button class="btn" id="bReset">Spielstand zurücksetzen</button></div>`;
    h += `<div class="actions"><button class="btn" id="bLogout">Abmelden</button></div>
      <p class="muted small">Die Alte Fabrik · Fortschritt aus deinem Mebis-Kurs. Die Fabrik zählt nicht für XP oder Noten.</p>`;
    openSheet(h);
    on('#bBrett', badgePanel);
    on('#bAvatar', () => { closeSheet(); avatarPicker(); });
    on('#bHome', () => { closeSheet(); const s = G.world.start; enterMap(s.m, s.x, s.y, 2); });
    on('#bRefresh', async () => { closeSheet(); await act({ action: 'login' }, true); toast('Aktualisiert.'); });
    on('#bSkip', async () => { await act({ action: 'mockSkip' }); closeSheet(); });
    on('#bRich', async () => { await act({ action: 'mockRich' }); closeSheet(); });
    on('#bReset', async () => { await act({ action: 'mockReset' }); closeSheet(); });
    on('#bLogout', () => { store.del('altefabrik_cred'); location.reload(); });
  }

  // Figur wählen
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
  async function startGame() {
    $('hud').classList.remove('hidden');
    if (G.started) return;
    G.started = true;
    G.scale = innerWidth < 700 ? 0.65 : innerWidth < 1100 ? 0.85 : 1;
    let pos = null; try { pos = JSON.parse(store.get('altefabrik_pos_' + G.data.user.tag)); } catch (e) {}
    const s = G.world.start;
    if (!(pos && G.world.maps[pos.m] && await enterMap(pos.m, pos.x, pos.y, 2))) await enterMap(s.m, s.x, s.y, 2);
    if (unclaimed().length) setTimeout(() => toast('🎁 ' + unclaimed().length + ' neue Kiste' + (unclaimed().length > 1 ? 'n' : '') + ' warten auf dich!'), 900);
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
      if (r.state.avatar === undefined) avatarPicker(); else await startGame();
      return true;
    } catch (e) {
      console.error(e);
      $('loginError').textContent = 'Keine Verbindung zum Server.'; return false;
    } finally { $('btnLogin').disabled = false; }
  }

  $('loginForm').addEventListener('submit', e => { e.preventDefault(); doLogin($('inTag').value.trim(), $('inPin').value.trim(), $('inRemember').checked); });
  $('btnQuests').onclick = questBook; $('btnFactory').onclick = factoryPanel; $('btnCollect').onclick = collectAll;
  $('btnOrders').onclick = ordersPanel; $('btnCatalog').onclick = () => G.mode === 'place' ? stopPlace() : catalogPanel(); $('btnMenu').onclick = menu;
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
  window.__T = { canMove, findPath, enterMap, interact, computeSwitches, refreshWorld, tap };
})();
