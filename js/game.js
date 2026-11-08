// DIE ALTE FABRIK – Spiel (Version 3: Pixel-Aufbauspiel)
// Szenen: Werkshof + fünf Innenansichten. Spielregeln: server-logic.js (= Kopie von Code.gs). Daten: Google Apps Script.
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const W = ART.W, H = ART.H;
  const MOCK = !window.API_URL;
  const IC = ICONS, ICV = ICONS.canvas;
  const PARTS = ['blech', 'fraes', 'dreh', 'gewinde', 'baugruppe'];
  const BUILDINGS = ['pfoertner', 'blechwerkstatt', 'maschinenhalle', 'prueflabor', 'kraftwerk'];
  const VIEWS = [{ id: 'hof', name: 'Werkshof', m: 1 }].concat(BUILDINGS.map((b, i) => ({ id: b, b, m: i + 2 })));
  const BADGE_COL = { bronze: '#c07a2a', silber: '#d8d2cc', gold: '#ffd56a' };

  const cvs = $('game'), ctx = cvs.getContext('2d'); ctx.setTransform(cvs.width / W, 0, 0, cvs.height / H, 0, 0); ctx.imageSmoothingEnabled = false;   // Spielwelt in 384×200, gezeichnet in doppelter Auflösung
  // Mecha nach dem Bau: Aktion nach Antippen, einmalige Szenen (Inbetriebnahme mit Feuerwerk, Katapult-Kampf)
  let mechaAct = null, cut = null, pendBadge = null, katWait = 0; const MACTS = ['faust', 'winken', 'abheben', 'licht', 'dampf', 'klinge'];
  const tagKey = k => 'altefabrik_' + k + '_' + ((D && D.user && D.user.tag) || '');
  const mechaDone = () => D && mechaStage() >= 6;
  const katOk = () => mechaDone() && (D.badges || []).some(b => b.id === 'b7' && b.ok);   /* Katapult-Kampf nach der 2. Arbeitsprobe */
  function mechaTap() { let k; do k = MACTS[Math.floor(Math.random() * MACTS.length)]; while (mechaAct && k === mechaAct.k && MACTS.length > 1); mechaAct = { k, t0: time, id: Math.floor(time * 1000) }; }
  const actState = () => mechaAct && time - mechaAct.t0 < 3.4 ? { k: mechaAct.k, t: time - mechaAct.t0, id: mechaAct.id } : null;
  function startCut(k) { cut = { k, t0: time + (k === 'kat' ? 0 : 1) }; sel = null; mode = null; if (k === 'mecha') setView('kraftwerk'); else if (view !== 'hof') setView('hof'); renderPanel(true); $('stage').classList.add('cutscene'); }
  function endCut() {
    const k = cut && cut.k; cut = null; $('stage').classList.remove('cutscene');
    if (k === 'mecha' || k === 'fw') { store.set(tagKey('mintro'), '1'); if (pendBadge) { const pb = pendBadge; pendBadge = null; newBadge = { ids: pb.ids, t0: time + 1 }; showBadges(); SFX.play('badge', { delay: 1 }); toast(pb.text); } }
    if (k === 'kat') { store.set(tagKey('kat'), '1'); toast('Dein Mecha hat das Katapult besiegt! Die Trümmer liegen jetzt als Trophäe am Kraftwerk.'); }
  }
  function cutStep() {   /* im Bild-Takt: Szenen weiterschalten */
    if (!cut) { if (D && view === 'hof' && katOk() && store.get(tagKey('mintro')) === '1' && store.get(tagKey('kat')) !== '1' && fade === 0) { katWait += .016; if (katWait > 3) { katWait = 0; toast('Achtung! Ein Katapult rollt auf die Fabrik zu!'); startCut('kat'); } } return; }
    const u = time - cut.t0;
    if (cut.k === 'mecha' && u > 14) { cut = { k: 'fw', t0: time + 1 }; setView('hof'); toast('Der Riesen-Mecha ist erwacht!'); }
    else if (cut.k === 'fw' && u > 17.5) endCut();
    else if (cut.k === 'kat' && u > 15) endCut();
  }
  let newBadge = null;   /* { ids, t0 }: diese Badges blendet gerade ein */
  const badgeFade = id => newBadge && newBadge.ids.includes(id) ? Math.max(0, Math.min(1, (time - newBadge.t0) / 2.5)) : 1;
  const keysOpen = () => R().areas.filter(a => areaOpen(a.id)).length, keysKey = () => 'altefabrik_keys_' + ((D && D.user && D.user.tag) || '');
  const keysNew = () => { const v = store.get(keysKey()); if (v == null) { store.set(keysKey(), String(keysOpen())); return false; } return keysOpen() > +v; };   /* Ausrufezeichen am Schlüsselbrett, bis es angeklickt wird */
  let D = null, cred = null, skew = 0, view = 'hof', sel = null, mode = null, placeItem = null;
  let time = 0, last = 0, truckT = 0, lastUnclaimed = 0, lastSig = '', fade = 0;
  const XSHOT = document.createElement('canvas'); XSHOT.width = 384; XSHOT.height = 200;   // Standbild für die Überblendung beim Ortswechsel
  const pops = [];

  // ---------- Hilfen ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.floor(n).toLocaleString('de-DE');
  const fmt1 = n => (Math.round(n * 10) / 10).toLocaleString('de-DE');
  const short = n => { const i = n.lastIndexOf(' - '); return i > 0 ? n.slice(i + 3) : n; };
  const now = () => Date.now() + skew;
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
  const img = k => `<img src="${IC[k]}" alt="">`;
  const R = () => D.rules, S = () => D.state;
  const built = id => !!S().b[id], bauEnde = id => (S().bau || {})[id] || 0, BAU_MS = 20 * 60000;   /* Bauzeit: S().bau[id] = Fertigstellung */
  const stOf = id => S().st[id];
  const sDef = id => R().stations[id];
  const bDef = id => R().buildings[id];
  const areaOpen = a => !!D.areas[a];
  const plans = () => plaene_(S(), { areas: D.areas });
  const gears = () => S().gears || 0;
  const unclaimed = () => D.quests.filter(q => q.done && !q.claimed);
  const stationsOf = b => Object.keys(R().stations).filter(s => sDef(s).building === b);
  const canAfford = p => Object.keys(p).every(k => (S().store[k] || 0) >= p[k]);
  const costHTML = (o, gearsOnly) => `<span class="cost">${Object.keys(o).map(k => `<span class="${(k === 'gears' ? gears() : k === 'plans' ? plans() : (S().store[k] || 0)) < o[k] ? 'miss' : ''}">${fmt(o[k])}${img(k)}</span>`).join('')}</span>`;
  const msOf = a => (R().areas.find(x => x.id === a) || {}).ms || a;
  const areaOfMs = ms => 'ms' + String(ms).replace(/\D/g, '');
  const maxMachines = () => Object.keys(R().stations).filter(s => sDef(s).out).length;
  const slotTxt = st => slots_(st) > 50 ? maxMachines() : slots_(st);
  const collectable = id => stOf(id) ? kannAbholen_(id, S(), now()) : 0;

  // Geräusche zu Aktionen (neue Aktionen hier eintragen)
  const ACT_SND = { buy: 'coin', sell: 'coin', build: 'build', repair: 'build', upgrade: 'build', mecha: 'build', place: 'place', unplace: 'unplace', zeigen: 'place', claim: 'reward', collect: 'crate', order: 'stamp', deliver: 'stamp', power: 'lamp', mechaPaint: 'hiss', mechaName: 'ding', spind: 'reward', discard: 'unplace', avatar: 'click' };
  const sndIcon = () => { const b = $('sndBtn'); if (!b) return; b.innerHTML = '<svg viewBox="0 0 16 16" width="18" height="18" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true"><rect x="1" y="6" width="3" height="4"/><rect x="4" y="5" width="2" height="6"/><rect x="6" y="3" width="2" height="10"/>' + (SFX.on ? '<rect x="10" y="6" width="1" height="4"/><rect x="12" y="4" width="1" height="8"/><rect x="11" y="5" width="1" height="1"/><rect x="11" y="10" width="1" height="1"/>' : '<rect x="10" y="5" width="1" height="1"/><rect x="11" y="6" width="1" height="1"/><rect x="12" y="7" width="1" height="2"/><rect x="13" y="6" width="1" height="1"/><rect x="14" y="5" width="1" height="1"/><rect x="11" y="9" width="1" height="1"/><rect x="13" y="9" width="1" height="1"/><rect x="10" y="10" width="1" height="1"/><rect x="14" y="10" width="1" height="1"/>') + '</svg>'; b.classList.toggle('off', !SFX.on); b.setAttribute('aria-pressed', SFX.on ? 'true' : 'false'); };
  $('sndBtn').addEventListener('click', () => { SFX.setOn(!SFX.on); sndIcon(); if (SFX.on) SFX.play('click'); toast(SFX.on ? 'Geräusche an' : 'Geräusche aus'); });
  sndIcon();
  ['visibilitychange', 'pageshow', 'focus'].forEach(e => addEventListener(e, () => { if (!document.hidden && ART.canvasLost()) ART.restoreAll(); }));
  document.addEventListener('click', e => { if (e.target.closest('.btn, .abtn, .vbtn, .row.click, [data-view]')) SFX.play('click'); }, true);   /* leises Klicken bei Knöpfen */
  // Toasts
  const tq = []; let tBusy = false, tTimer = null;
  function toast(m, bad, now) { if (now) { tq.length = 0; clearTimeout(tTimer); tBusy = false; } tq.push([m, bad]); if (!tBusy) nextToast(); }
  function nextToast() { const m = tq.shift(); if (!m) { tBusy = false; return; } tBusy = true; const el = $('toast'); el.textContent = m[0]; el.className = 'toast show' + (m[1] ? ' bad' : ''); tTimer = setTimeout(() => { el.className = 'toast'; tTimer = setTimeout(nextToast, 350); }, Math.max(m[1] ? 3800 : 2600, String(m[0]).length * 55)); }
  function busy(on) { const b = $('busy'), host = $('app').classList.contains('hidden') ? document.body : $('stage'); if (b.parentNode !== host) host.appendChild(b); b.classList.toggle('hidden', !on); }   /* Ladesymbol mitten über dem Spielfeld, nicht mitten im Fenster */

  // ---------- Server ----------
  async function api(body) {
    const req = Object.assign({}, cred, body);
    if (MOCK) return MockServer.call(req);
    const r = await fetch(window.API_URL, { method: 'POST', body: JSON.stringify(req) });
    return r.json();
  }
  async function act(body, quiet) {
    busy(true);
    try {
      const res = await api(body);
      if (res.state) apply(res);
      if (!res.ok) { toast(res.error || 'Das hat nicht geklappt.', true); SFX.play('error'); }
      else if (!quiet) SFX.play(ACT_SND[body.action] || '', { vol: .9 });   /* jede Aktion klingt passend */
      else if (res.msg && !quiet) toast(res.msg);
      return res;
    } catch (e) { console.error(e); toast('Keine Verbindung zum Server. Bitte später erneut versuchen.', true); return { ok: false }; }
    finally { busy(false); }
  }
  function apply(d) {
    const before = D && JSON.stringify(D.areas), mBefore = D ? mechaStage() : null;
    D = d; skew = d.now - Date.now();
    if (before && before !== JSON.stringify(d.areas)) { toast('Ein neuer Bereich ist offen! Du hast einen neuen Bauplan.'); SFX.play('unlock', { delay: .3 }); }
    const bKey = 'altefabrik_badges_' + ((d.user && d.user.tag) || ''), okNow = (d.badges || []).filter(b => b.ok).map(b => b.id), seen = store.get(bKey);   /* auch Badges, die seit dem letzten Besuch in Mebis verdient wurden */
    const fresh = seen == null ? [] : okNow.filter(id => !seen.split(',').includes(id)); store.set(bKey, okNow.join(','));   /* neu verdientes Badge: Meldung, Sprung zur Ehrentafel, langsam einblenden */
    if (mechaStage() >= 6 && (store.get(tagKey('mintro')) !== '1' || (mBefore !== null && mBefore < 6)) && !cut && tutSeen()) {   /* gerade fertig gebaut: Inbetriebnahme immer zeigen */   /* Mecha frisch fertig: erst die Inbetriebnahme zeigen, dann die Badges */
      if (fresh.length) { const names = fresh.map(id => (R().badges.find(x => x.id === id) || {}).name).filter(Boolean); pendBadge = { ids: fresh, text: names.length > 1 ? names.length + ' neue Badges verdient! Schau auf die Ehrentafel.' : 'Neues Badge verdient: „' + names[0] + '“' }; }
      renderChrome(); startCut('mecha'); const u = unclaimed().length; if (u && !lastUnclaimed) truckT = time; lastUnclaimed = u; return; }
    if (fresh.length) { const names = fresh.map(id => (R().badges.find(x => x.id === id) || {}).name).filter(Boolean); newBadge = { ids: fresh, t0: time + 1 }; renderChrome(); showBadges(); SFX.play('badge', { delay: 1 }); toast(names.length > 1 ? names.length + ' neue Badges verdient! Schau auf die Ehrentafel.' : 'Neues Badge verdient: „' + names[0] + '“'); const u = unclaimed().length; if (u && !lastUnclaimed) truckT = time; lastUnclaimed = u; return; }
    const u = unclaimed().length; if (u && !lastUnclaimed) truckT = time; lastUnclaimed = u;
    renderChrome(); renderPanel(true);
  }

  // ---------- Zustand für die Szenen ----------
  // Hinweise im Bild: Kiste = etwas abholen; Ausrufezeichen nur, solange ein Gebäude noch nicht repariert ist
  function marksFor(b) {
    const d = bDef(b);
    if (!built(b)) return areaOpen(d.area) ? 'repair' : null;
    if (stationsOf(b).some(s => collectable(s) > 0)) return 'crate';
    return null;
  }
  const shownOwned = () => { const o = S().owned || {}, h = S().hidden || {}, r = {}; Object.keys(o).forEach(k => { if (o[k] && !h[k]) r[k] = true; }); return r; };   // weggeräumte Einmal-Gegenstände nicht zeichnen
  const badgeList = () => R().badges.map(b => ({ id: b.id, name: b.name, ok: (D.badges || []).some(x => x.id === b.id && x.ok), hint: badgeHint(b), a: badgeFade(b.id) }));
  const tutSeen = () => store.get('altefabrik_tut') === '1';
  const badgeCols = () => R().badges.map(b => { const x = (D.badges || []).find(y => y.id === b.id); return x && x.ok ? b.color : null; });
  function placedIn(m) { const o = {}; (S().placed || []).forEach(p => { if (p.m === m) o[m === 1 ? p.x : (p.y || 0) + ':' + p.x] = p.t; }); return o; }
  const whereOf = t => (R().catalog[t] || {}).where;
  const ICO_BUY = '<svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true" shape-rendering="crispEdges" fill="currentColor"><rect x="0" y="2" width="3" height="2"/><rect x="3" y="2" width="2" height="8"/><rect x="5" y="4" width="10" height="2"/><rect x="5" y="6" width="9" height="2"/><rect x="5" y="8" width="8" height="2"/><rect x="4" y="10" width="10" height="2"/><rect x="5" y="13" width="3" height="3"/><rect x="11" y="13" width="3" height="3"/></svg>';
  const ICO_PLACE = '<svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true" shape-rendering="crispEdges" fill="currentColor"><rect x="7" y="0" width="2" height="6"/><rect x="4" y="6" width="8" height="2"/><rect x="5" y="8" width="6" height="1"/><rect x="6" y="9" width="4" height="1"/><rect x="7" y="10" width="2" height="1"/><rect x="1" y="13" width="14" height="2"/><rect x="1" y="11" width="2" height="2"/><rect x="13" y="11" width="2" height="2"/></svg>';
  const ICO_BRUSH = '<svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true" shape-rendering="crispEdges" fill="currentColor"><rect x="10" y="1" width="3" height="2"/><rect x="9" y="3" width="3" height="2"/><rect x="8" y="5" width="3" height="2"/><rect x="5" y="7" width="5" height="2"/><rect x="3" y="9" width="5" height="3"/><rect x="2" y="12" width="4" height="2"/><rect x="1" y="14" width="2" height="1"/></svg>';   /* Pinsel: Farbe auftragen */
  const ICO_TAKE = ICO_PLACE.replace('fill="currentColor">', 'fill="currentColor"><g transform="rotate(180 8 8)">').replace('</svg>', '</g></svg>');   /* Wegräumen: Aufstellen-Symbol umgedreht */
  const ICO_SELL = '<svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true" shape-rendering="crispEdges"><g fill="#7a4a1c"><rect x="5" y="0" width="6" height="1"/><rect x="3" y="1" width="10" height="1"/><rect x="2" y="2" width="12" height="12"/><rect x="1" y="3" width="14" height="10"/><rect x="3" y="14" width="10" height="1"/><rect x="5" y="15" width="6" height="1"/></g><g fill="#e8a83a"><rect x="5" y="1" width="6" height="1"/><rect x="3" y="2" width="10" height="12"/><rect x="2" y="3" width="12" height="10"/><rect x="5" y="14" width="6" height="1"/></g><g fill="#f7d86a"><rect x="4" y="3" width="3" height="1"/><rect x="3" y="4" width="1" height="3"/></g><g fill="#a5641f"><rect x="7" y="4" width="2" height="8"/><rect x="5" y="5" width="6" height="2"/><rect x="5" y="9" width="6" height="2"/></g></svg>';   // goldene Münze
  let sellOpen = null;
  const WHERE_TXT = { aussen: 'draußen', wand: 'an die Wand', boden: 'auf den Boden' };
  function yardState() {
    const b = {}, running = {}, marks = {};
    const bauP = {}; BUILDINGS.forEach(id => { b[id] = built(id) ? 'ok' : bauEnde(id) ? 'bau' : areaOpen(bDef(id).area) ? 'ruin' : 'locked'; if (b[id] === 'bau') bauP[id] = Math.max(0, Math.min(1, 1 - (bauEnde(id) - now()) / BAU_MS)); running[id] = stationsOf(id).filter(s => stOf(s) && (stOf(s).on || (s === 'notstrom' && !built('kraftwerk')) || s === 'lager')).length; marks[id] = b[id] === 'bau' ? null : marksFor(id); });   /* Baustellen ohne Hinweis */
    b.tor = 'ok'; marks.tor = tutSeen() ? null : 'help';
    if (built('kraftwerk')) running.kraftwerk = 2;
    const cu = cut ? time - cut.t0 : 0;
    return { mecha: mechaDone() ? { paint: S().mechaPaint || 'stahl', act: actState() } : null, fw: cut && cut.k === 'fw' ? cu : undefined, kat: cut && cut.k === 'kat' ? cu : undefined, trophy: katOk() && !(cut && cut.k === 'kat'), b, bauP, running, marks, golem: !areaOpen('ms5'), truck: unclaimed().length, truckT, owned: shownOwned(), placed: placedIn(1), meister: (S().stamps || 0) >= R().orders.stampsForTitle, badges: badgeCols(), showSlots: !!placeItem && whereOf(placeItem) === 'aussen', sel: (sel && sel.hit && sel.kind !== 'placed' && sel.kind !== 'fixed' ? sel.hit : null) || modeHit() };   /* Katalog-Gegenstände ohne Auswahlrahmen (Immersion) */
  }
  // Riesen-Golem im Kraftwerk: jede Maschinen-Verbesserung (Stufe 2 und 3) bringt den Bau weiter, 6 Abschnitte
  const modeHit = () => ({ badges: 'brett', orders: 'auftraege', quests: 'questbuch', rank: 'rang', keys: 'schluessel' })[mode] || null;   // offene Tafel/Buch im Raum umrahmen
  function mechaStage() { return Math.min(6, S().mecha || 0); }   // Bauabschnitte werden mit Werkstücken gebaut (Aktion 'mecha')
  function roomState(bid) {
    const s = {}, marks = {};
    stationsOf(bid).forEach(id => {
      const ss = stOf(id);
      s[id] = { state: !ss ? 'broken' : (sDef(id).out ? (ss.on ? 'running' : 'idle') : id === 'notstrom' && built('kraftwerk') ? 'idle' : 'running'),   /* Kraftwerk liefert Strom: Notstrom aus */ level: ss ? ss.lvl : 0, crate: collectable(id) > 0, pend: ss && sDef(id).out ? Math.floor(puffer_(id, ss, now())) : 0 };
      if (!ss && built(bid)) marks[id] = 'repair';
    });
    const o = auftraege_(now()), done = S().orders && S().orders.w === o.w ? S().orders.done.length : 0;
    return { intro: cut && cut.k === 'mecha' && bid === 'kraftwerk' ? Math.max(0, time - cut.t0) : undefined, mechaAct: actState(), mechaPaint: S().mechaPaint || 'stahl', mechaName: S().mechaName || '', keys: R().areas.map(a => areaOpen(a.id)), keysNew: keysNew(), mecha: mechaStage(), built: built(bid), s, marks, placed: placedIn(VIEWS.find(v => v.id === bid).m), badges: badgeList(), orders: o.list.length - done, ordersDone: done, orderNotes: o.list.map((it, i) => ({ s: it.size, d: !!(S().orders && S().orders.w === o.w && S().orders.done.includes(i)) })), owned: shownOwned(), showSlots: placeItem && whereOf(placeItem) !== 'aussen' ? whereOf(placeItem) : null, only: placeItem && R().catalog[placeItem].only ? VIEWS.find(v => v.m === R().catalog[placeItem].only).id : null, sel: (sel && sel.hit && sel.kind !== 'placed' && sel.kind !== 'fixed' ? sel.hit : null) || modeHit() };   /* Katalog-Gegenstände ohne Auswahlrahmen (Immersion) */
  }

  // ---------- Hauptschleife ----------
  /* Tageszeit 0..1 (Feuerwerk und alles andere laufen zur echten Tageszeit) */
  function dayT() { if (window.FORCE_T !== undefined) return window.FORCE_T; const p = (window.DAY_MINUTES || 10) * 60000; return ((now() % p) / p + .35) % 1; }
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (ts - (last || ts)) / 1000); last = ts; time += dt; if (window.FORCE_TIME !== undefined) time = window.FORCE_TIME;
    if (!D) return;
    const t = dayT();
    if (view === 'hof') SCENE.yard(ctx, yardState(), t, time, dt);
    else INNER.draw(ctx, view, roomState(view), t, time, dt);
    // aufsteigende Icons
    for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.age += dt; if (p.age > 1.6) { pops.splice(i, 1); continue; } ctx.globalAlpha = Math.max(0, Math.min(1, (1 - p.age / 1.6) * 1.6)); ctx.drawImage(ICV[p.k], Math.round(p.x - 7), Math.round(p.y - p.age * 14)); }
    ctx.globalAlpha = 1;
    if (mode === 'badges') drawBadgeRoom();
    cutStep(); SFX.frame(dt);
    if (Math.floor(time / 2) !== Math.floor((time - dt) / 2) && ART.canvasLost()) ART.restoreAll();   /* Grafik verloren (z. B. nach App-Wechsel am iPad)? neu zeichnen */
    if (fade > 0) {   // Ortswechsel: alter Ort blendet ins Dunkle aus (0,45 s), dann blendet der neue Ort ein (0,45 s)
      fade = Math.max(0, fade - dt / .9); const q = 1 - fade, sm = v => v * v * (3 - 2 * v);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (q < .5) { ctx.drawImage(XSHOT, 0, 0); ctx.globalAlpha = sm(q / .5); } else ctx.globalAlpha = 1 - sm((q - .5) / .5);
      ctx.fillStyle = '#0b1030'; ctx.fillRect(0, 0, cvs.width, cvs.height); ctx.restore(); }
    if (Math.floor(time * 2) !== Math.floor((time - dt) * 2)) { $('clock').textContent = clockText(t); renderPanel(); renderBadges(); }
  }
  function clockText(t) { const h = t * 24, hh = Math.floor(h), mm = Math.floor((h - hh) * 6) * 10; const ph = t < .17 || t >= .84 ? 'Nacht' : t < .3 ? 'Morgen' : t < .7 ? 'Tag' : 'Abend'; return `${ph}, ${hh}:${String(mm).padStart(2, '0')} Uhr · ${D.user.tag}`; }

  // ---------- Kopfzeile, Reiter, Ziel ----------
  function renderChrome() {
    $('app').classList.toggle('needtut', !tutSeen());
    const st = S();
    const chip = (key, inner) => `<button class="chip" data-info="${key}" aria-label="${esc(INFO_NAME[key] || R().parts[key].name)}">${inner}</button>`;
    let h = '';
    if (gears() > 0) h += chip('gears', `${img('gears')}${fmt(gears())}`);   /* wie bei den Teilen: bei 0 ausgeblendet */
    if (!BUILDINGS.every(built)) h += chip('plans', `${img('plans')}${Math.max(0, plans())}`);   /* alle Gebäude repariert: keine Baupläne mehr nötig */
    if (stOf('notstrom') || built('kraftwerk')) h += chip('power', `${img('power')}${onCount_(st)}<span class="of">/${slotTxt(st)}</span>`);
    // Teilelager als eine Gruppe: einzelne Teile nebeneinander, darunter der Füllstand des Lagers
    const shown = PARTS.filter(k => (st.store[k] || 0) > 0);
    if (shown.length || Object.keys(st.st || {}).length) {
      const cap = storeCap_(st), isFull = k => (st.store[k] || 0) >= cap, anyFull = shown.some(isFull), pc = k => Math.min(100, Math.round((st.store[k] || 0) / cap * 100));
      // Lager: vorn das Lagersymbol mit dem Platz je Sorte, abgetrennt; jedes Teil hat darunter einen feinen Füllstandsbalken
      h += `<div class="stgroup ${anyFull ? 'full' : ''}" role="group" aria-label="Teilelager, je Sorte bis ${fmt(cap)}"><button class="chip lg" data-info="store" aria-label="Teilelager, je Sorte bis ${fmt(cap)}">${img('store')}<span class="capn">${fmt(cap)}</span></button><span class="sdiv" aria-hidden="true"></span>${shown.map(k => `<button class="chip pt ${isFull(k) ? 'voll' : ''}" data-info="${k}" aria-label="${esc(R().parts[k].name)} ${fmt(st.store[k])} von ${fmt(cap)}${isFull(k) ? ', Regal voll' : ''}">${img(k)}${fmt(st.store[k])}<i class="track"><i style="width:${pc(k)}%"></i></i></button>`).join('')}</div>`;
    }
    $('res').innerHTML = h;
    { const mt = $('mtitle'), ok = (S().stamps || 0) >= R().orders.stampsForTitle; if (mt) { mt.hidden = !ok; mt.textContent = '★ ' + R().orders.title; } }
    // Reiter
    $('views').innerHTML = VIEWS.map(v => {
      const locked = v.b && !built(v.b), cnt = v.b ? (marksFor(v.b) ? 1 : 0) : 0;
      return `<button class="vbtn ${locked ? 'locked' : ''}" role="tab" data-view="${v.id}" aria-selected="${view === v.id}">${locked ? '🔒 ' : ''}${esc(v.b ? bDef(v.b).name : v.name)}<span class="badge" ${cnt && !locked ? '' : 'hidden'}>!</span></button>`;
    }).join('');
    renderBadges();
  }
  function renderBadges() {
    if (!D) return;
    const u = unclaimed().length; $('b_quests').hidden = !u; $('b_quests').textContent = u;
    const o = auftraege_(now()), done = S().orders && S().orders.w === o.w ? S().orders.done : [];
    const can = built('pfoertner') && (S().stamps || 0) < R().orders.stampsForTitle ? o.list.filter((x, i) => done.indexOf(i) < 0 && canAfford(x.parts)).length : 0;
    $('b_orders').hidden = !can; $('b_orders').textContent = can;
  }
  function goalText() {
    const u = unclaimed().length;
    if (!tutSeen()) return `Neu hier? <strong>Tippe auf das Eingangstor</strong> (links): dort erfährst du, wie die Fabrik funktioniert.`;
    if (u) return `Ziel: <strong>Öffne die ${u} Kiste${u > 1 ? 'n' : ''} am Lieferwagen</strong>`;
    for (const b of BUILDINGS) { const d = bDef(b); if (!built(b) && areaOpen(d.area) && !d.optional) return gears() >= d.gears ? `Ziel: <strong>Repariere ${d.name}</strong> (1 Bauplan + ${d.gears} Zahnräder)` : `Ziel: <strong>${d.name} reparieren</strong>: dir fehlen noch ${d.gears - gears()} Zahnräder. Erledige Quests in Mebis!`; }
    for (const b of BUILDINGS) if (built(b)) for (const s of stationsOf(b)) if (!stOf(s)) return `Ziel: <strong>Repariere ${sDef(s).name}</strong> in ${bDef(b).name} (${sDef(s).gears} Zahnräder)`;
    const next = ['ms2', 'ms3', 'ms4'].find(a => !areaOpen(a));
    if (next) { const prev = 'MS' + (+next.slice(2) - 1), n = D.quests.filter(q => q.ms === prev && q.hq && !q.done).length; return `Ziel: <strong>Noch ${n} Hauptquest${n === 1 ? '' : 's'} in ${prev}</strong>, dann öffnet ${R().areas.find(a => a.id === next).name}.`; }
    if (!areaOpen('ms5')) return 'Ziel: <strong>Besiege den Kraft-Golem</strong> mit der 1. Arbeitsprobe.';
    return 'Ziel: <strong>Baue deine Maschinen aus</strong> und erfülle Aufträge.';
  }

  // Erklärungen zu den Symbolen in der Kopfzeile
  const INFO_NAME = { gears: 'Zahnräder', plans: 'Baupläne', power: 'Strom', store: 'Teilelager' };
  const MAKER = { blech: 'die Abkantbank', fraes: 'die Fräsmaschine', dreh: 'die Drehmaschine', gewinde: 'der Gewindeschneidplatz', baugruppe: 'der Montageplatz' };
  function infoText(k) {
    if (k === 'gears') return allesAusgebaut_(S()) ? 'Zahnräder: Deine Fabrik ist komplett ausgebaut, Zahnräder brauchst du nicht mehr.' : 'Zahnräder: Du bekommst sie aus den Kisten für erledigte Quests (10 XP = 1 Zahnrad). Damit reparierst du und baust aus.';
    if (k === 'plans') return 'Baupläne: einer für jeden offenen Bereich. Mit Bauplan und Zahnrädern reparierst du ein Gebäude.';
    if (k === 'power') return `Strom: ${onCount_(S())} von ${slotTxt(S())} Maschinen können gerade laufen. Mehr Anschlüsse gibt es durch den Ausbau des Notstromaggregats oder das Kraftwerk.`;
    if (k === 'store') return `Teilelager: Jede Werkstück-Sorte hat ihr eigenes Regal mit Platz für ${fmt(storeCap_(S()))} Stück. Baue das Teilelager in der Blechwerkstatt aus, dann passt mehr hinein.`;
    if (R().parts[k]) return `${R().parts[k].name}: ${MAKER[k]} stellt sie her. Damit erfüllst du Aufträge und kaufst im Katalog ein.`;
    return '';
  }
  // kurzes Namensschild direkt unter dem Symbol, verblasst nach etwa 2 Sekunden
  $('res').addEventListener('click', e => {
    const b = e.target.closest('[data-info]'); if (!b) return;
    if (mode !== 'factory') { mode = 'factory'; sel = null; renderPanel(true); }   /* springt zu „Meine Fabrik“ */
    document.querySelectorAll('.chiptip').forEach(x => x.remove());
    const k = b.dataset.info, tip = document.createElement('span');
    tip.className = 'chiptip'; tip.textContent = k === 'store' ? `Lager: je Sorte bis ${fmt(storeCap_(S()))}` : INFO_NAME[k] || (R().parts[k] && R().parts[k].name) || '';
    const r = b.getBoundingClientRect(); tip.style.left = (r.left + r.width / 2 + scrollX) + 'px'; tip.style.top = (r.bottom + 4 + scrollY) + 'px';
    document.body.appendChild(tip); setTimeout(() => tip.remove(), 2600);
  });

  // ---------- Panel ----------
  // Inhalt tauschen ohne Sprung: wird der Inhalt kürzer, gleitet die Ansicht in 0,5 s nach oben statt zu springen
  let panelAnim = 0;
  function swapPanel(html) {
    const P = $('panel'), doc = document.scrollingElement || document.documentElement;
    const oP = P.scrollTop, oD = doc.scrollTop, hP = P.scrollHeight, hD = doc.scrollHeight;
    P.innerHTML = html;
    const maxP = P.scrollHeight - P.clientHeight, maxD = doc.scrollHeight - window.innerHeight;
    if (oP <= maxP + 1 && oD <= maxD + 1) return;
    const sp = document.createElement('div'); sp.style.height = Math.max(0, hP - P.scrollHeight, hD - doc.scrollHeight) + 'px'; sp.setAttribute('aria-hidden', 'true'); P.appendChild(sp);
    P.scrollTop = oP; doc.scrollTop = oD;
    const t0 = performance.now(), id = ++panelAnim, tP = Math.max(0, Math.min(oP, maxP)), tD = Math.max(0, Math.min(oD, maxD));
    const step = t => { if (id !== panelAnim) return; const q = Math.min(1, (t - t0) / 500), e = q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
      P.scrollTop = oP + (tP - oP) * e; doc.scrollTop = oD + (tD - oD) * e; if (q < 1) requestAnimationFrame(step); else sp.remove(); };
    requestAnimationFrame(step);
  }
  function renderPanel(force) {
    if (!D) return;
    const html = panelHTML();
    if (!force && html === lastSig) return;
    lastSig = html; swapPanel(html);
    document.querySelectorAll('.abtn').forEach(b => b.classList.toggle('on', b.dataset.p === mode));
    // Katalog-Vorschaubilder
    document.querySelectorAll('[data-prev]').forEach(el => { const s = SCENE.DS[el.dataset.prev] || INNER.DSI[el.dataset.prev]; if (s) { el.width = s.c.width; el.height = s.c.height; el.getContext('2d').drawImage(s.c, 0, 0); if (el.parentNode.classList.contains('catimg')) { const k = Math.max(1, Math.min(3, Math.floor(104 / s.c.height)));   /* Maßstab nur nach der Höhe (unabhängig vom Layout); ist die Karte schmal, wird ein breites Bild (Kran) per CSS eingepasst */   /* möglichst gleicher Maßstab (3), nur sehr große Dinge kleiner: Größen passen zueinander */ el.style.width = s.c.width * k + 'px'; el.style.height = s.c.height * k + 'px'; } } /* ganzzahlig skaliert: gleich große Pixel */ });
  }
  function panelHTML() {
    if (mode === 'quests') return questsHTML();
    if (mode === 'keys') return keysHTML();
    if (mode === 'factory') return factoryHTML();
    if (mode === 'orders') return ordersHTML();
    if (mode === 'rank') return rankHTML();
    if (mode === 'catalog') return catalogHTML();
    if (mode === 'badges') return badgesHTML();
    if (mode === 'menu') return menuHTML();
    if (sel) {
      if (sel.kind === 'building') return buildingHTML(sel.id);
      if (sel.kind === 'station') return stationHTML(sel.id);
      if (sel.kind === 'truck') return questsHTML();
      if (sel.kind === 'golem') return `<h2>Der Kraft-Golem</h2><p>Er bewacht die Treppe zum Kraftwerk. Besiegt ist er, sobald deine <b>1. Arbeitsprobe</b> im Questbuch als bestanden steht.</p>`;
      if (sel.kind === 'mecha') { const m2 = mechaStage(), M = R().mecha || [], nx = M[m2];
        let h = `<h2>Riesen-Mecha${m2 >= 6 && S().mechaName ? ' „' + esc(S().mechaName) + '“' : ''}</h2><p>${m2 >= 6 ? 'Der Riesen-Mecha steht startklar im Hangar. Energiekern und Augen leuchten, die Versorgungsleitungen sind angeschlossen.' : 'Im Hangar des Kraftwerks wird ein riesiger Mecha gebaut. Jeder Bauabschnitt kostet Werkstücke aus deinem Teilelager.'}</p><div class="bar"><div style="width:${m2 / 6 * 100}%"></div></div><p class="small">Bauabschnitt ${m2} von 6</p>`;
        h += `<ol class="msteps">${M.map((st2, i) => `<li class="${i < m2 ? 'done' : i === m2 ? 'next' : ''}">${i < m2 ? '✓ ' : ''}${esc(st2.name)}</li>`).join('')}</ol>`;
        if (nx) { const ok = built('kraftwerk') && canAfford(nx.cost); h += `<p><b>Nächster Abschnitt:</b> ${esc(nx.name)}</p><p>${costHTML(nx.cost)}</p><div class="btns"><button class="btn main" data-act="mecha" ${ok ? '' : 'disabled'}>Bauen</button></div>${ok ? '' : '<p class="small hint">Sammle die fehlenden Werkstücke in Blechwerkstatt und Maschinenhalle.</p>'}`; }
        else { const P = R().mechaPaints || [], own = S().paints || ['stahl'], cur = S().mechaPaint || 'stahl', nm = S().mechaName || '';
          h += `<p class="small">Badge „Mecha-Ingenieur“ verdient. Tippe den Mecha an, dann zeigt er dir, was er kann.</p>`;
          h += `<h3>Lackierung</h3><p class="small">Eine gekaufte Farbe bleibt deine. Du kannst jederzeit zwischen deinen Farben wechseln.</p><div class="grid2 paints">${P.map(pt => { const has = own.includes(pt.id), sw = (ART.PAINT[pt.id] || { i: '#8f8a92', l: '#d8d2cc', g: '#4a4652' }), can = canAfford(pt.price);
            return `<div class="cat"><span class="sw" style="background:linear-gradient(135deg, ${sw.l} 0 35%, ${sw.i} 35% 70%, ${sw.g} 70%)"></span><b>${esc(pt.name)}</b>${has ? '' : costHTML(pt.price)}<div class="catbtns">${pt.id === cur ? '<span class="box done">✓ Gewählt</span>' : has ? `<span class="box done">✓ Gekauft</span><button class="btn x icon place" data-act="mpaint" data-id="${pt.id}" aria-label="${esc(pt.name)} auftragen" title="Auftragen">${ICO_BRUSH}</button>` : `<button class="btn x icon ${can ? 'good' : ''}" data-act="mpaint" data-id="${pt.id}" ${can ? '' : 'disabled'} aria-label="${esc(pt.name)} kaufen" title="Kaufen">${ICO_BUY}</button>`}</div></div>`; }).join('')}</div>`;
          h += `<h3>Name</h3><p class="small">${nm ? 'Dein Mecha heißt <b>' + esc(nm) + '</b>. Du kannst ihn jederzeit umbenennen.' : 'Gib deinem Mecha einen Namen. Er steht dann auf dem Schild über dem Hangar.'}</p><div class="names">${[''].concat(R().mechaNames || []).map(x => `<button class="btn x chipn${x === nm ? ' on' : ''}" data-act="mname" data-id="${esc(x)}">${x ? esc(x) : 'Ohne Namen'}</button>`).join('')}</div>`; }
        return h; }
      if (sel.kind === 'turbine') return `<h2>Turbine</h2><p>${built('kraftwerk') ? 'Die Turbine läuft: alle Maschinen haben Strom.' : 'Die Turbine steht still. Repariere das Kraftwerk.'}</p>`;
      if (sel.kind === 'placed') return placedHTML(sel);
      if (sel.kind === 'fixed') { const d = R().catalog[sel.id], id = sel.id;   /* gleiche Karte wie im Katalog */
        return `<h2>${esc(d.name)}</h2><p>Willst du das wegräumen? Es bleibt deins. Im Katalog kannst du es jederzeit wieder aufstellen.</p><div class="cat one"><div class="catimg"><canvas data-prev="${id}" width="1" height="1"></canvas></div><b>${esc(d.name)}</b>
          <div class="catbtns"><button class="btn x icon place" data-act="zeigen" data-id="${id}" data-on="0" aria-label="${esc(d.name)} wegräumen" title="Wegräumen">${ICO_TAKE}</button><button class="btn x icon" data-act="sell" data-id="${id}" aria-label="${esc(d.name)} verkaufen" title="Verkaufen">${ICO_SELL}</button></div>${sellOpen === id ? `<div class="sellq">${costHTML(verkaufswert_(d.price))}<button class="btn x sellbtn" data-act="sellok" data-id="${id}">${ICO_SELL}Verkaufen</button></div>` : ''}</div>`; }
    }
    if (view === 'hof') return yardHTML();
    return buildingHTML(view);
  }
  function yardHTML() {
    let h = `<h2>Werkshof</h2><p>Tippe ein Gebäude an. Reparierte Gebäude kannst du betreten.</p>`;
    BUILDINGS.forEach(b => { const d = bDef(b), st = built(b) ? 'repariert' : areaOpen(d.area) ? 'Ruine' : '🔒 ' + msOf(d.area); const m = marksFor(b); h += `<div class="row click" data-act="selb" data-id="${b}"><div class="grow"><div class="t">${esc(d.name)}</div><div class="s">${st}${m === 'crate' ? ' · Kiste wartet' : m === 'repair' ? ' · kann repariert werden' : ''}</div></div></div>`; });
    return h;
  }
  function buildingHTML(b) {
    const d = bDef(b);
    let h = `<h2>${esc(d.name)}</h2><p class="small">${esc(msOf(d.area))}${d.optional ? ' · freiwillig' : ''}</p><p>${esc(d.desc || '')}</p>`;
    if (!built(b) && bauEnde(b)) {   /* Bauzeit läuft: Gerüst steht, Fortschritt und Restzeit */
      const rest = Math.max(0, bauEnde(b) - now()), p = Math.round((1 - rest / BAU_MS) * 100), min = Math.ceil(rest / 60000);
      h += `<p><b>Wird gerade renoviert.</b> Am Gerüst arbeiten die Handwerker.</p><div class="bar"><div style="width:${p}%"></div></div><p class="small">${rest > 0 ? 'Fertig in ' + (min <= 1 ? 'weniger als einer Minute' : min + ' Minuten') : 'Gleich fertig …'}</p>`;
      return h; }
    if (!built(b)) {
      if (!areaOpen(d.area)) { h += `<p>🔒 ${b === 'kraftwerk' ? 'Der Kraft-Golem versperrt den Weg. Er weicht nach deiner 1. Arbeitsprobe.' : 'Dieser Bereich öffnet sich, wenn alle Hauptquests von ' + msOf(R().areas[R().areas.findIndex(a => a.id === d.area) - 1].id) + ' erledigt sind.'}</p>`; return h; }
      const ok = plans() > 0 && gears() >= d.gears;
      h += `<div class="btns"><button class="btn main" data-act="build" data-id="${b}" ${ok ? '' : 'disabled'}>Reparieren ${costHTML({ plans: 1, gears: d.gears })}</button></div>`;
      if (!ok) h += `<p class="small">Zahnräder gibt es für erledigte Quests in Mebis.</p>`;
      return h;
    }
    const sts = stationsOf(b);
    if (view !== b) {
      const nC = sts.filter(s => collectable(s) > 0).length, nB = sts.filter(s => !stOf(s)).length;
      if (sts.length) h += `<p>${sts.length - nB} von ${sts.length} Maschinen repariert${nC ? ` · <b>${nC === 1 ? 'eine Kiste wartet' : nC + ' Kisten warten'}</b>` : ''}.</p>`;
      h += `<div class="btns"><button class="btn main" data-act="view" data-id="${b}">Hineingehen</button></div>`;
      if (sts.length) h += `<p class="small">Maschinen reparieren, ausbauen und abholen kannst du drinnen.</p>`;
      return h;
    }
    if (sts.length) { h += `<h3>Arbeitsbereiche</h3>`; sts.forEach(s => h += stationRow(s)); }
    if (b === 'pfoertner') h += `<div class="btns"><button class="btn" data-act="badgeroom">Ehrentafel</button><button class="btn" data-act="mode" data-id="orders">Auftragsbrett</button></div>`;
    return h;
  }
  function stationRow(s) {
    const d = sDef(s), ss = stOf(s);
    let sub = !ss ? `kaputt · Reparatur ${d.gears} Zahnräder` : d.out ? `Stufe ${ss.lvl} · ${ss.on ? 'läuft' : 'aus'}` : s === 'notstrom' ? (built('kraftwerk') ? `Stufe ${ss.lvl} · aus, das Kraftwerk liefert Strom` : `Stufe ${ss.lvl} · ${d.slots[ss.lvl - 1]} Anschlüsse`) : `Stufe ${ss.lvl} · ${fmt(storeCap_(S()))} Teile`;
    return `<div class="row click" role="button" tabindex="0" data-act="sels" data-id="${s}"><div class="grow"><div class="t">${esc(d.name)}</div><div class="s">${sub}</div></div><span class="chev" aria-hidden="true">›</span></div>`;
  }
  const switchHTML = (s, on, name) => `<button class="switch${on ? ' on' : ''}" role="switch" aria-checked="${on}" data-act="power" data-id="${s}" title="${on ? 'Läuft: zum Ausschalten tippen' : 'Aus: zum Einschalten tippen'}" aria-label="${esc(name)} an/aus"><i aria-hidden="true">${on ? 1 : 0}</i><span aria-hidden="true"></span></button>`;
  const missGears = c => gears() >= c ? '' : `<p class="small hint">Dir fehlen noch ${fmt(c - gears())} Zahnräder. Erledige Quests in Mebis.</p>`;
  function stationHTML(s) {
    const d = sDef(s), ss = stOf(s);
    if (view !== d.building) return buildingHTML(d.building);
    // Kopf: Name, daneben Schalter (0/1) und Abholen als Symbol mit Anzahl
    let ctl = '';
    if (!ss && d.out) ctl = `<span class="ctlph" aria-hidden="true">${switchHTML(s, false, d.name)}<button class="btn pick" tabindex="-1" disabled>${img(d.out)}<b>0</b></button></span>`;   /* unsichtbarer Platzhalter: nach der Reparatur rutscht nichts */
    if (ss && d.out) {
      const n = collectable(s);
      ctl = switchHTML(s, ss.on, d.name)
        + `<button class="btn pick${n > 0 ? ' good' : ''}" data-act="collect" data-id="${s}" ${n > 0 ? '' : 'disabled'} title="Fertige Teile abholen" aria-label="${n} Teile abholen">${img(d.out)}<b>${n}</b></button>`;
    }
    let h = `<div class="sthead"><h2>${esc(d.name)}</h2>${ctl ? '<span class="stctl">' + ctl + '</span>' : ''}</div>`;
    if (d.desc) h += `<p>${esc(d.desc)}</p>`;
    const cur = ss ? ss.lvl : 0;
    if (d.out) {
      h += `<p class="small">Stellt <b>${esc(R().parts[d.out].name)}</b> her, Teile pro Stunde:${d.uses ? ' (je Baugruppe ein Blech-, Fräs-, Dreh- und Gewindeteil)' : ''}</p>`;
      h += `<div class="levels">${d.rate.map((r, i) => `<div class="lv${i + 1 === cur ? ' cur' : ''}"><span>Stufe ${i + 1}</span><b>${fmt1(r)}</b></div>`).join('')}</div>`;
    }
    if (!ss) {
      const ok = built(d.building) && gears() >= d.gears;
      if (d.out) h += `<div class="ctlph" style="display:block" aria-hidden="true"><div class="bar"><div></div></div><p class="small">Ausgabelager</p></div>`;   /* gleiche Höhe wie später: der Knopf bleibt an seiner Stelle */
      h += `<div class="btns"><button class="btn main" data-act="repair" data-id="${s}" ${ok ? '' : 'disabled'}>Reparieren ${costHTML({ gears: d.gears })}</button></div>`;
      if (built(d.building)) h += missGears(d.gears);
      if (!built(d.building)) h += `<p class="small">Repariere zuerst ${esc(bDef(d.building).name)}.</p>`;
      return h;
    }
    if (s === 'notstrom' && built('kraftwerk')) { h += `<p><b>Ausgeschaltet.</b> Das Kraftwerk liefert jetzt Strom für alle Maschinen, das Notstromaggregat wird nicht mehr gebraucht.</p>`; return h; }
    if (!d.out) h += `<p><b>Stufe ${ss.lvl}</b> von 3 · ${upInfo(s, ss.lvl)}</p>`;
    if (d.out) {
      const pend = puffer_(s, ss, now()), cap = rate_(s, ss) * R().bufferHours, n = collectable(s);
      h += `<div class="bar"><div style="width:${Math.round(Math.min(100, pend / cap * 100))}%"></div></div><p class="small">Ausgabelager ${fmt(pend)} von ${fmt(cap)}</p>`;
      if (Math.floor(pend) > n) h += `<p class="small warn">${s === 'montage' ? 'Es fehlen Teile zum Zusammenbauen.' : 'Das Teilelager ist voll. Unter „Fabrik“ kannst du Teile entsorgen.'}</p>`;
    }
    if (ss.lvl < 3) { const c = d.up[ss.lvl - 1]; h += `<div class="btns"><button class="btn main" data-act="upgrade" data-id="${s}" ${gears() >= c ? '' : 'disabled'}>Ausbauen auf Stufe ${ss.lvl + 1} ${costHTML({ gears: c })}</button></div>${missGears(c)}${d.out ? '' : `<p class="small">Stufe ${ss.lvl + 1}: ${upInfo(s, ss.lvl + 1)}</p>`}`; }
    else h += `<p class="small">Höchste Stufe erreicht.</p>`;
    return h;
  }
  function upInfo(s, l) { const d = sDef(s); if (d.out) return fmt1(d.rate[l - 1]) + ' ' + R().parts[d.out].name + ' pro Stunde'; if (s === 'notstrom') return d.slots[l - 1] + ' Maschinen gleichzeitig'; return fmt(R().storeCaps[l]) + ' Teile im Lager'; }
  function keysHTML() {   /* Schlüsselbrett: welche Bereiche offen sind, was für den nächsten fehlt */
    const A = R().areas; let h = '<h2>Schlüsselbrett</h2><p>Für jeden offenen Bereich hängt ein Schlüssel am Brett.</p>', nextDone = false;
    A.forEach((a, i) => {
      let t;
      if (areaOpen(a.id)) t = '<span style="color:var(--ok)">✓ Schlüssel hängt, Bereich offen</span>';
      else if (!nextDone) { nextDone = true;
        if (a.id === 'ms5') t = 'fehlt: die <strong>1. Arbeitsprobe</strong> (besiegt den Kraft-Golem)';
        else { const prev = A[i - 1].ms, n = D.quests.filter(q => q.ms === prev && q.hq && !q.done).length; t = `fehlt: noch <strong>${n} Hauptquest${n === 1 ? '' : 's'} in ${esc(prev)}</strong>`; } }
      else t = '🔒 später';
      h += `<p><strong>${esc(a.name)}</strong> (${esc(a.ms)})<br>${t}</p>`;
    });
    return h;
  }
  function questsHTML() {
    const open = unclaimed();
    let h = `<h2>Questbuch</h2><p>${D.quests.filter(q => q.done).length} von ${D.quests.length} Quests erledigt.</p>`;
    if (open.length) { const g = open.reduce((s, q) => s + Math.round(q.xp * R().gearsPerXp), 0); h += `<div class="btns"><button class="btn main" data-act="claim">${open.length} Kiste${open.length > 1 ? 'n' : ''} öffnen ${costHTML({ gears: g })}</button></div>`; }
    const byMs = {}; D.quests.forEach(q => (byMs[q.ms] = byMs[q.ms] || []).push(q));
    Object.keys(byMs).forEach(ms => {
      const list = byMs[ms], a = areaOfMs(ms);
      h += `<h3>${esc(ms)} · ${esc((R().areas.find(x => x.id === a) || {}).name || '')} ${list.filter(q => q.done).length}/${list.length}</h3>`;
      list.forEach(q => h += `<div class="row"><div class="grow"><div class="t">${q.done ? (q.claimed ? '✓ ' : '🎁 ') : ''}${esc(short(q.n))}</div><div class="s"><span class="tag ${q.hq ? 'hq' : 'nq'}">${q.hq ? 'HQ' : 'NQ'}</span>${q.xp} XP · ${Math.round(q.xp * R().gearsPerXp)} Zahnräder</div></div></div>`);
    });
    return h;
  }
  let trashOpen = null;
  function factoryHTML() {
    const st = S();
    let h = `<h2>Meine Fabrik</h2><p>${img('power')} Strom: ${onCount_(st)} von ${slotTxt(st)} Anschlüssen belegt${built('kraftwerk') ? ' (das Kraftwerk versorgt alle Maschinen)' : ''}. Welche Maschine läuft, schaltest du hier.</p>`;
    const capS = storeCap_(st), full = PARTS.some(k => (st.store[k] || 0) >= capS);
    h += `<h3>Teilelager · je Sorte bis ${fmt(capS)}</h3>${full ? '<p class="small">Ein Regal ist voll: Diese Maschine kann erst wieder abgeben, wenn Platz ist. Teile, die du gerade nicht brauchst, kannst du entsorgen oder die Maschine ausschalten.</p>' : ''}` + PARTS.map(k => {
      const have = Math.floor(st.store[k] || 0);
      let r = `<div class="row"><img class="pv" src="${IC[k]}" alt=""><div class="grow"><div class="t">${esc(R().parts[k].name)} <span class="small ${have >= capS ? 'warnc' : 'muted'}">${fmt(have)} / ${fmt(capS)}</span></div><div class="bar sm"><div style="width:${Math.min(100, Math.round(have / capS * 100))}%"></div></div></div><button class="btn x icon" data-act="trash" data-id="${k}" ${have ? '' : 'disabled'} title="${trashOpen === k ? 'Abbrechen' : 'Entsorgen'}" aria-label="${trashOpen === k ? 'Abbrechen' : 'Entsorgen'}">${img(trashOpen === k ? 'close' : 'trash')}</button></div>`;
      if (trashOpen === k && have) r += `<div class="row trash"><span class="grow">${img('trash')}</span>${[50, 250, 1000].filter(n => n < have).map(n => `<button class="btn x" data-act="discard" data-id="${k}:${n}">${fmt(n)}</button>`).join('')}<button class="btn x bad" data-act="discard" data-id="${k}:${have}">alle ${fmt(have)}</button></div>`;
      return r; }).join('');
    h += `<h3>Maschinen</h3>`;
    Object.keys(R().stations).filter(s => sDef(s).out).forEach(s => {
      const ss = stOf(s);
      h += `<div class="row"><div class="grow"><div class="t">${esc(sDef(s).name)}</div><div class="s">${ss ? 'Stufe ' + ss.lvl + ' · ' + fmt1(rate_(s, ss)) + '/h' : 'noch kaputt'}</div></div>${ss ? switchHTML(s, ss.on, sDef(s).name) : ''}</div>`;
    });
    return h;
  }
  function ordersHTML() {
    const o = auftraege_(now()), done = S().orders && S().orders.w === o.w ? S().orders.done : [];
    const stamps = S().stamps || 0, need = R().orders.stampsForTitle;
    const SP = R().orders.stamps || {}, fertig = stamps >= need;
    let h = `<h2>Auftragsbrett</h2><p>Jede Woche drei Aufträge, für alle gleich. Kleine Aufträge geben ${SP.klein || 1} Stempel, mittlere ${SP.mittel || 1}, große ${SP['groß'] || 1}. Ab ${need} Stempeln trägst du den Titel „${esc(R().orders.title)}“.</p>`;
    if (stamps >= need) h += `<div class="meister" role="status"><span aria-hidden="true">★</span><div><b>${esc(R().orders.title)}</b><span class="small">Titel erreicht. Am Eingangstor hängt jetzt eine goldene Plakette.</span></div></div>`;
    h += `<p class="stamps" aria-label="${Math.min(stamps, need)} von ${need} Stempeln">${'<i class="on"></i>'.repeat(Math.min(stamps, need))}${'<i></i>'.repeat(Math.max(0, need - stamps))}</p><p class="small">${Math.min(stamps, need)} von ${need} Stempeln</p>`;
    if (!built('pfoertner')) h += `<p>🔒 Das Auftragsbrett hängt im Pförtnerhaus.</p>`;
    if (fertig) { h += `<p>Als ${esc(R().orders.title)} brauchst du keine Aufträge mehr. Deine Werkstücke kannst du jetzt ganz für den Katalog und den Mecha nutzen.</p>`; return h; }
    o.list.forEach((x, i) => { const d = done.indexOf(i) >= 0, sp = SP[x.size] || 1; h += `<div class="row"><div class="grow"><div class="t">Auftrag ${esc(x.size)} <span class="small muted nw">· +${sp} Stempel</span></div><div class="s">${costHTML(x.parts)}</div></div>${d ? '<span class="box done">✓ erfüllt</span>' : `<button class="btn x ${canAfford(x.parts) ? 'good' : ''}" data-act="order" data-id="${i}" ${canAfford(x.parts) && built('pfoertner') ? '' : 'disabled'}>Liefern</button>`}</div>`; });
    const nx = new Date((o.w + 1) * 7 * 86400000 - 3 * 86400000);
    h += `<p class="small">Neue Aufträge ab ${nx.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'numeric' })}</p>`;
    return h;
  }
  function catalogHTML() {
    const c = R().catalog, st = S();
    let h = `<h2>Katalog</h2><p>Bezahlt wird mit Werkstücken. Die Plätze sind begrenzt: Überleg dir, was du aufstellen willst.</p>`;
    const isOut = d => d.where === 'aussen' || d.kind === 'fixed';
    [[true, 'Draußen im Werkshof', 'out'], [false, 'Drinnen in den Hallen', 'in']].forEach(([outSec, title, cls]) => {
    h += `<section class="catsec ${cls}"><h3>${title}</h3><div class="grid2">`;
    Object.keys(c).filter(id => isOut(c[id]) === outSec).forEach(id => {
      const d = c[id], open = areaOpen(d.area), owned = d.kind !== 'place' && st.owned && st.owned[id], cnt = (st.items && st.items[id]) || 0;
      h += `<div class="cat"><div class="catimg"><canvas data-prev="${id}" width="1" height="1"></canvas></div><b>${esc(d.name)}</b>${d.where ? (d.where === 'aussen' ? '' : `<span class="small muted">${WHERE_TXT[d.where]}${d.only ? ', nur Pförtnerhaus' : ''}</span>`) : ''}${open ? costHTML(d.price) : '<span class="small">🔒 ab ' + esc(msOf(d.area)) + '</span>'}
        <div class="catbtns">${owned ? ((S().hidden || {})[id] ? `<span class="box done">✓ Gekauft</span><button class="btn x icon place" data-act="zeigen" data-id="${id}" data-on="1" aria-label="${esc(d.name)} wieder aufstellen" title="Wieder aufstellen">${ICO_PLACE}</button>` : '<span class="box done">✓ Gekauft</span>') : `<button class="btn x icon ${open && canAfford(d.price) ? 'good' : ''}" data-act="buy" data-id="${id}" ${open && canAfford(d.price) ? '' : 'disabled'} aria-label="${esc(d.name)} kaufen" title="Kaufen">${ICO_BUY}</button>`}
        ${cnt ? `<button class="btn x icon place" data-act="place" data-id="${id}" aria-label="${esc(d.name)} aufstellen, ${cnt} vorhanden" title="Aufstellen">${ICO_PLACE}<span class="n">${cnt}</span></button>` : ''}${cnt || owned ? `<button class="btn x icon" data-act="sell" data-id="${id}" aria-label="${esc(d.name)} verkaufen" title="Verkaufen">${ICO_SELL}</button>` : ''}</div>${sellOpen === id && (cnt || owned) ? `<div class="sellq">${costHTML(verkaufswert_(d.price))}<button class="btn x sellbtn" data-act="sellok" data-id="${id}">${ICO_SELL}Verkaufen</button></div>` : ''}</div>`;
    });
    h += `</div></section>`; });
    return h;
  }
  // ---------- Rangliste: Top 10 der eigenen Klasse + eigener Platz (Lehrkraft: jede Klasse vollständig) ----------
  let RANK = null, rankKl = null;
  function loadRank(kl) { RANK = RANK && !kl ? RANK : null; api({ action: 'rangliste', klasse: kl || rankKl || undefined }).then(r => { if (r && r.ok) { RANK = r; rankKl = r.klasse; } else RANK = { ok: false }; if (mode === 'rank') renderPanel(true); }).catch(() => { RANK = { ok: false }; if (mode === 'rank') renderPanel(true); }); }
  function rankHTML() {
    let h = `<h2>Rangliste</h2>`;
    if (!RANK) return h + `<p class="muted">Wird geladen …</p>`;
    if (!RANK.ok) return h + `<p>Die Rangliste ist gerade nicht erreichbar. Versuch es später noch einmal.</p>`;
    const me = (S() && D.user && D.user.tag) || '';
    const row = e => `<tr class="${e.tag === me ? 'me' : ''}"><td class="pl">${e.p}</td><td>${esc(e.tag)}${e.stufe ? `<span class="st">${esc(e.stufe)}</span>` : ''}</td><td class="num">${fmt(e.xp)}</td><td class="num">${e.level}</td></tr>`;
    if (RANK.lehrer) h += `<p class="small">Lehrer-Ansicht: alle Klassen vollständig.</p><div class="klwahl" role="group" aria-label="Klasse wählen">${RANK.klassen.map(k => `<button class="btn x ${k === RANK.klasse ? 'main' : ''}" data-act="rankkl" data-id="${esc(k)}">${esc(k)}</button>`).join('')}</div>`;
    else h += `<p class="small">Klasse ${esc(RANK.klasse)} · die besten 10${RANK.gesamt ? ' von ' + RANK.gesamt : ''}</p>`;
    h += `<table class="rank"><thead><tr><th>Rang</th><th>Gamertag · Stufe</th><th class="num">XP</th><th class="num">Level</th></tr></thead><tbody>${(RANK.liste || []).map(row).join('')}`;
    if (!RANK.lehrer && RANK.ich && RANK.ich.p > 10) h += `<tr class="gap"><td colspan="4">…</td></tr>${row(RANK.ich)}`;
    h += `</tbody></table>`;
    if (!RANK.lehrer && !RANK.ich) h += `<p class="small muted">Du stehst noch nicht in der Rangliste.</p>`;
    return h;
  }
  function badgesHTML() {
    const list = badgeList(), got = list.filter(b => b.ok).length;
    return `<h2>Ehrentafel</h2><p>${got} von ${list.length} Badges verdient. Tippe ein Badge an.</p><canvas id="bcv" width="${BADGEROOM.W}" height="${BADGEROOM.H}" aria-label="Ehrentafel mit Badges"></canvas><p class="bcap" id="bcap"></p>`;
  }
  function badgeHint(b) { if (b.mecha) return 'den Riesen-Mecha im Kraftwerk fertig bauen'; if (b.hq) return 'alle Hauptquests ' + b.hq.join(', '); if (b.all) return 'alle Quests ' + b.all[0] + '–' + b.all[b.all.length - 1]; return b.quest.replace(/\\./g, '.').replace(/\\s\*/g, ' ') + ' bestanden'; }
  function placedHTML(p) { const d = R().catalog[p.item], nm = esc(d ? d.name : p.item); return `<h2>${nm}</h2><p>Willst du das wegräumen? Es kommt zurück in deinen Katalog. Dort kannst du es auch für die Hälfte verkaufen.</p><div class="cat one"><div class="catimg"><canvas data-prev="${p.item}" width="1" height="1"></canvas></div><b>${nm}</b><div class="catbtns"><button class="btn x icon place" data-act="unplace" data-id="${p.m}:${p.slot}:${p.lvl || 0}" aria-label="${nm} wegräumen" title="Wegräumen">${ICO_TAKE}</button></div></div>`; }
  function menuHTML() {
    const u = D.user;
    let h = `<h2>Menü</h2><p><b>${esc(u.tag)}</b> · ${esc(u.klasse || '')} · ${fmt(u.xp)} XP · Level ${u.level}${(S().stamps || 0) >= R().orders.stampsForTitle ? ' · ' + esc(R().orders.title) : ''}</p>
      <div class="btns"><button class="btn" data-act="tutorial">So funktioniert's</button><button class="btn" data-act="refresh">Neu laden</button><button class="btn" data-act="theme">Hell / Dunkel</button><button class="btn" data-act="logout">Abmelden</button></div>`;
    if (MOCK) h += `<h3>Vorschau-Werkzeuge</h3><div class="btns"><button class="btn" data-act="mock" data-id="mockSkip">12 Stunden vorspulen</button><button class="btn" data-act="mock" data-id="mockBau">Bauarbeiten beenden</button><button class="btn" data-act="mock" data-id="mockRich">+500 Zahnräder</button><button class="btn" data-act="mock" data-id="mockParts">+300 Teile</button><button class="btn" data-act="mock" data-id="mockStamps">+10 Stempel</button><button class="btn" data-act="mock" data-id="mockReset">Zurücksetzen</button></div>
      <p class="small">Fortschritt in Mebis:</p><div class="btns">${['frueh', 'mitte', 'weit', 'alles'].map(s => `<button class="btn x" data-act="stand" data-id="${s}">${s}</button>`).join('')}</div>`;
    h += `<p class="small">Die Alte Fabrik · Fortschritt aus deinem Mebis-Kurs. Die Fabrik zählt nicht für XP oder Noten.</p>`;
    h += `<details class="lizenz"><summary>Lizenzen &amp; Quellen</summary><div class="small">
      <p><b>Geräusche</b> (frei nutzbar): Kenney, kenney.nl (RPG Audio, Impact Sounds, Sci-Fi Sounds, CC0) · „Crickets Ambient Noise“ von Wolfgang_, OpenGameArt (CC0) · „Wind“ von felix.blume, freesound (CC0) · „Rocket launch“ von Sanderboah, freesound (CC0) · „Neutral ambient drone“ von xkeril, freesound (CC0) · „firework single“, Pixabay (Pixabay-Lizenz). Weitere Töne entstehen im Spiel selbst.</p>
      <p><b>Mit Namensnennung</b> (CC BY 3.0): „Stream“ von mystiscool (freesound.org) · „Hoot Owl“ von Mike Koenig (soundbible.com).</p>
      <p><b>Schrift</b>: Pixelify Sans von Stefie Justprince (SIL Open Font License 1.1).</p>
      <p><b>Grafik</b>: Pixelgrafik für die Alte Fabrik gezeichnet. Pflanzen nach dem Projekt „Stilles Ufer“, Plaketten aus dem XP-Rechner des Kurses.</p></div></details>`;   /* Namensnennung für die Aufnahmen, aufklappbar; beim Verlassen des Menüs wieder zu (Panel wird neu gebaut) */
    return h;
  }

  // ---------- Bedienung ----------
  function setView(v) {
    const vv = VIEWS.find(x => x.id === v); if (!vv) return;
    if (vv.b && !built(vv.b)) { view = 'hof'; select({ kind: 'building', id: vv.b, hit: vv.b }); return; }
    if (view !== v) { SFX.cut(); SFX.play(v !== 'hof' ? 'door' : 'swoosh');   /* Gebäude betreten: Tür geht auf */   /* Dauergeräusche des alten Raums blenden mit dem Bildübergang aus */ XSHOT.width = cvs.width; XSHOT.height = cvs.height; XSHOT.getContext('2d').drawImage(cvs, 0, 0); view = v; fade = 1; ART.parts.length = 0; }
    sel = null; if (mode !== 'catalog') mode = null; renderChrome(); renderPanel(true);   // der Katalog bleibt beim Ortswechsel offen
  }
  function select(s) { sel = s; mode = null; renderPanel(true); }
  $('views').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
  function showBadges() { if (built('pfoertner') && view !== 'pfoertner') setView('pfoertner'); mode = 'badges'; sel = null; renderPanel(true); }
  $('bar').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; if (b.dataset.p === 'badges' && mode !== 'badges') return showBadges(); if (b.dataset.p === 'quests' && mode !== 'quests') { if (built('pfoertner') && view !== 'pfoertner') setView('pfoertner'); mode = 'quests'; sel = null; return renderPanel(true); } if (b.dataset.p === 'orders' && mode !== 'orders') { if (built('pfoertner') && view !== 'pfoertner') setView('pfoertner'); mode = 'orders'; sel = null; return renderPanel(true); } if (b.dataset.p === 'rank' && mode !== 'rank') { if (view !== 'hof') setView('hof'); mode = 'rank'; sel = null; loadRank(); return renderPanel(true); } mode = mode === b.dataset.p ? null : b.dataset.p; sel = null; if (mode === 'rank') loadRank(); renderPanel(true); });
  $('panel').addEventListener('change', async e => { const pw = e.target.closest('[data-pw]'); if (pw) { await act({ action: 'power', station: pw.dataset.pw, on: pw.checked }); renderPanel(true); } });
  $('panel').addEventListener('click', async e => {
    if (e.target.id === 'bcv') return badgeClick(e);
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const a = b.dataset.act, id = b.dataset.id;
    if (a === 'selb') { if (view !== 'hof') setView('hof'); return select({ kind: 'building', id, hit: id }); }
    if (a === 'sels') { const sd = sDef(id); if (view !== sd.building && built(sd.building)) setView(sd.building); return select({ kind: 'station', id, hit: id }); }
    if (a === 'view') return setView(id);
    if (a === 'badgeroom') return showBadges();
    if (a === 'tutorial') return openTutorial();
    if (a === 'mode') { mode = id; sel = null; return renderPanel(true); }
    if (a === 'build') { const r = await act({ action: 'build', building: id }); if (r.ok) { popAt(id, 'gears'); select({ kind: 'building', id, hit: id }); } return; }
    if (a === 'repair') { const r = await act({ action: 'repair', station: id }); if (r.ok) renderPanel(true); return; }
    if (a === 'upgrade') { await act({ action: 'upgrade', station: id }); return renderPanel(true); }
    if (a === 'power') { await act({ action: 'power', station: id, on: !stOf(id).on }); return renderPanel(true); }
    if (a === 'collect') return collect(id);
    if (a === 'claim') return claimAll();
    if (a === 'order') { const r = await act({ action: 'order', i: +id }); if (r.ok) renderPanel(true); return; }
    if (a === 'trash') { trashOpen = trashOpen === id ? null : id; return renderPanel(true); }
    if (a === 'discard') { const [k, n] = id.split(':'); const r = await act({ action: 'discard', part: k, n: +n }); if (r.ok) { trashOpen = null; renderPanel(true); } return; }
    if (a === 'buy') { await act({ action: 'buy', item: id }); return renderPanel(true); }
    if (a === 'mecha') { await act({ action: 'mecha' }); return renderPanel(true); }
    if (a === 'mpaint') { await act({ action: 'mechaPaint', paint: id }); return renderPanel(true); }
    if (a === 'mname') { await act({ action: 'mechaName', name: id }); return renderPanel(true); }
    if (a === 'rankkl') { RANK = null; rankKl = id; renderPanel(true); return loadRank(id); }
    if (a === 'place') return startPlace(id);
    if (a === 'sell') { sellOpen = sellOpen === id ? null : id; return renderPanel(true); }
    if (a === 'sellok') { sellOpen = null; const r = await act({ action: 'sell', item: id }); if (r.ok && sel && sel.kind === 'fixed') sel = null; return renderPanel(true); }
    if (a === 'zeigen') { const r = await act({ action: 'zeigen', item: id, on: b.dataset.on === '1' }); if (r.ok) { sel = null; renderPanel(true); } return; }
    if (a === 'unplace') { const [m, x, y] = id.split(':').map(Number); const r = await act({ action: 'unplace', m, x, y: y || 0 }); if (r.ok) { sel = null; renderPanel(true); } return; }
    if (a === 'refresh') { await act({ action: 'login' }, true); return toast('Aktualisiert.'); }
    if (a === 'theme') { const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); const nx = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = nx; store.set('altefabrik_theme', nx); return; }
    if (a === 'logout') { store.del('altefabrik_cred'); location.reload(); return; }
    if (a === 'mock') { await act({ action: id }); return renderPanel(true); }
    if (a === 'stand') { await act({ action: 'mockStand', stand: id }); return renderPanel(true); }
  });
  async function collect(id) {
    const r = await act({ action: 'collect', station: id }, true);
    if (r.ok && r.got) { Object.keys(r.got).forEach(k => popAt(id, k)); toast(r.msg); }
    renderPanel(true);
  }
  async function claimAll() {
    const open = unclaimed(); if (!open.length) return;
    const r = await act({ action: 'claim', quests: open.map(q => q.n) });
    if (r.ok) { for (let i = 0; i < Math.min(6, open.length); i++) setTimeout(() => { const h = SCENE.HIT.truck || { x: 40, y: ART.ROAD - 12, w: 30 }; pops.push({ k: 'gears', x: h.x + Math.random() * h.w, y: h.y, age: 0 }); }, i * 120); sel = null; renderPanel(true); }
  }
  function popAt(id, k) {
    const h = (view === 'hof' ? SCENE.HIT : INNER.HIT)[id] || (view === 'hof' ? SCENE.HIT[sDef(id) ? sDef(id).building : id] : null);
    const x = h ? h.x + h.w / 2 : W / 2, y = h ? h.y : H / 2;
    pops.push({ k, x, y, age: 0 });
  }
  function startPlace(item) {
    const d = R().catalog[item]; placeItem = item; mode = null; sel = null;
    if (d.where === 'aussen' && view !== 'hof') setView('hof');
    else if (d.only) setView(VIEWS.find(v => v.m === d.only).id);
    else if (d.where !== 'aussen' && view === 'hof') { const b = BUILDINGS.find(x => built(x)); if (b) setView(b); }
    renderPanel(true);
    $('placeHint').classList.remove('hidden'); $('stage').classList.add('placing'); $('placeText').textContent = (d.where === 'aussen' ? 'Platz' : d.where === 'wand' ? 'Wandplatz' : 'Bodenplatz') + ' für ' + d.name + ' antippen';
  }
  function stopPlace() { placeItem = null; $('placeHint').classList.add('hidden'); $('stage').classList.remove('placing'); }
  $('placeDone').onclick = stopPlace;

  // Klicks ins Spielbild
  // Kleine Gimmicks beim Antippen (nur optisch, nur der Spind gibt einmal am Tag 5 Blech)
  function gimmick(g) {
    if (g === 'ducks') { SCENE.gim('ducks'); SFX.play('quack', { vol: .9 }); return; }
    if (g === 'owl') { SFX.play('hoot', { vol: 1, gap: 1.2 }); return; }   /* Eule ruft „Huhu“ */
    if (g === 'spind') { INNER.gim('spind'); SFX.play('creak');
      if (S().spind === Utilities_datum_(now())) return toast('Der Spind ist leer. Morgen liegt bestimmt wieder etwas darin.');
      act({ action: 'spind' }).then(r => { if (r && r.ok) { INNER.gim('spind', { reward: true }); toast(r.msg); } }); return; }
    const SND = { chair: 'squeak', lamp: 'lampclick', plantP: 'rustle', plantL: 'rustle', peg: 'clink' };
    SFX.play(g === 'cuckoo' ? 'kuckuck' : SND[g] || 'click'); INNER.gim(g);
    if (g === 'lamp') SFX.play('lampclick', { delay: 1.3 });
  }
  function pick(e) {
    if (!D) return;
    const r = cvs.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
    const HIT = view === 'hof' ? SCENE.HIT : INNER.HIT;
    const inside = h => h && x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h;
    const m = VIEWS.find(v => v.id === view).m;
    if (placeItem) {
      const wh = whereOf(placeItem), pre = wh === 'wand' ? 'wall' : 'slot';
      if ((wh === 'aussen') !== (view === 'hof')) return toast(wh === 'aussen' ? 'Das gehört nach draußen in den Werkshof.' : 'Das kommt in eine Halle. Wähle oben ein Gebäude.');
      const slot = Object.keys(HIT).find(k => k.startsWith(pre) && inside(HIT[k]));
      if (!slot) return toast('Tippe auf einen der markierten Plätze.');
      if (HIT[slot].item) return toast('Dort steht schon etwas.', true);
      act({ action: 'place', item: placeItem, m, x: HIT[slot].slot, y: HIT[slot].lvl || 0 }).then(res => { if (res.ok) stopPlace(); });
      return;
    }
    if (cut) { if (cut.k === 'mecha') { cut = { k: 'fw', t0: time + 1 }; setView('hof'); } else endCut(); return; }   /* Tippen überspringt die Szene */
    // Reihenfolge: Kisten, Lieferwagen, Maschinen/Gebäude, Bretter, Deko
    const keys = Object.keys(HIT).sort((a, b) => prio(a) - prio(b));
    const k = keys.find(kk => inside(HIT[kk]));
    if (!tutSeen() && k !== 'tor') return toast('Tippe zuerst auf das Eingangstor und lies die Einführung.');   /* Einführung ist Pflicht */
    if (!k) { sel = null; mode = null; renderPanel(true); return; }
    const h = HIT[k];
    if (h.collect) return collect(h.collect);
    if (k === 'truck') return claimAll().then(() => select({ kind: 'truck', hit: 'truck' }));
    if (k === 'golem') return select({ kind: 'golem', hit: 'golem' });
    if (k === 'brett' || h.brett) { SFX.play('glint'); mode = 'badges'; sel = null; return renderPanel(true); }
    if (k === 'tor') return openTutorial();
    if (h.quests) { mode = 'quests'; sel = null; return renderPanel(true); }
    if (h.keys) { store.set(keysKey(), String(keysOpen())); mode = 'keys'; sel = null; return renderPanel(true); }
    if (k === 'rang') { mode = 'rank'; sel = null; loadRank(); return renderPanel(true); }
    if (h.orders) { mode = 'orders'; sel = null; return renderPanel(true); }
    if (h.mecha) { if (mechaDone()) mechaTap(); return select({ kind: 'mecha', hit: k }); }
    if (h.ymecha) { mechaTap(); return; }
    if (h.info) return select({ kind: 'turbine', hit: k });
    if (h.gim) return gimmick(h.gim);
    if (h.fixed) return select({ kind: 'fixed', id: h.fixed, hit: k });
    if (h.slot !== undefined) { if (h.item === 'vogelhaus' && view === 'hof') { SCENE.gim('vogel', { x: h.x + h.w / 2, y: h.y }); SFX.play('chirp', { vol: .9 }); } if (h.item) return select({ kind: 'placed', slot: h.slot, lvl: h.lvl || 0, m, item: h.item, hit: k }); sel = null; return renderPanel(true); }
    if (view === 'hof') {
      const b = k;
      if (BUILDINGS.includes(b)) { if (sel && sel.kind === 'building' && sel.id === b && built(b)) return setView(b); return select({ kind: 'building', id: b, hit: k }); }
      return;
    }
    if (h.station) return select({ kind: 'station', id: h.station, hit: k });
  }
  const prio = k => k.startsWith('crate') ? 0 : k === 'tor' ? .5 : k === 'truck' ? 1 : k.startsWith('fx_') ? 3 : k.startsWith('slot') || k.startsWith('wall') ? 4 : 2;
  cvs.addEventListener('click', pick);
  // Bis die Einführung einmal gelesen wurde, ist außer dem Eingangstor nichts anklickbar
  document.addEventListener('click', e => { if (tutSeen() || $('app').classList.contains('hidden')) return; const t = e.target;
    if (t.closest('#modal') || t.closest('#game')) return;
    if (t.closest('#views, #bar, #panel, #res')) { e.preventDefault(); e.stopPropagation(); toast('Tippe zuerst auf das Eingangstor und lies die Einführung.'); } }, true);


  // ---------- Fenster: Einführung am Tor ----------
  const TUT = [
    { ic: ['gears'], t: 'Willkommen in der Alten Fabrik!', p: 'Diese Fabrik stand lange still. Mit jeder Quest, die du erledigst, erwacht ein Stück davon wieder zum Leben. Du kannst hier nichts kaputt machen und nichts verlieren. Und keine Sorge: Die Fabrik zählt nicht für deine Noten.' },
    { ic: ['book', 'gears'], t: 'Quests bringen Kisten', p: 'Hast du eine Quest erledigt, rollt der Lieferwagen ans Tor und bringt eine Kiste für dich. Tippe auf den Wagen: In jeder Kiste stecken Zahnräder. Für je 10 XP gibt es 1 Zahnrad.' },
    { ic: ['plans', 'gears'], t: 'Reparieren', p: 'Für jeden offenen Bereich bekommst du einen Bauplan. Mit Bauplan und Zahnrädern reparierst du ein Gebäude. Dein erstes Ziel ist das Pförtnerhaus gleich hinter dem Tor.' },
    { ic: ['blech', 'power'], t: 'Maschinen arbeiten für dich', p: 'In den Gebäuden setzt du Maschinen wieder instand. Sie stellen Werkstücke her, auch wenn du gerade nicht da bist. Schau ab und zu vorbei und hol die produzierten Teile ab. Beachte, dass jede Maschine Strom benötigt!' },
    { ic: ['clip', 'cart', 'medal'], t: 'Aufträge, Katalog, Ehrentafel', p: 'Mit deinen Werkstücken kannst du die Wochenaufträge erfüllen und Dekoration für deine Fabrik kaufen. Deine Badges aus dem Questbuch hängen an der Ehrentafel im Pförtnerhaus.' },
    { ic: ['book', 'rank'], t: 'Schritt für Schritt', p: 'Schaffst du alle Hauptquests eines Meilensteins (MS), öffnet sich der nächste Bereich. Ganz rechts auf dem Hügel wacht der Kraft-Golem vor dem Kraftwerk. Jeder kleine Schritt zählt. Viel Spaß beim Wiederaufbau!' }
  ];
  let tutI = 0, tutMax = 0, badgeSel = -1;
  function modal(title, html, cls) { $('mTitle').textContent = title; $('mBody').innerHTML = html; $('modal').className = 'modal ' + (cls || ''); $('modal').classList.remove('hidden'); }
  function closeModal() { $('modal').classList.add('hidden'); }
  /* Einführung als Holzschild mit Messingrand (wie das Schild am Tor). Alle Seiten liegen übereinander, so ist die Höhe immer gleich und die Knöpfe bleiben an derselben Stelle. */
  function openTutorial(i) {
    const open = !$('modal').classList.contains('hidden') && $('mBody').querySelector('.tut');
    if (!open) {
      modal('Am Eingangstor', `<div class="tut"><div class="tsign"><div class="tpages">${TUT.map((p, j) => `<section class="tpage" data-i="${j}" aria-hidden="true"><div class="tutic">${p.ic.map(k => `<img src="${IC['nav_' + k] || IC[k]}" alt="">`).join('')}</div><h2>${esc(p.t)}</h2><p>${esc(p.p)}</p></section>`).join('')}</div></div>
        <div class="tnav"><button class="btn" data-m="tprev">Zurück</button><div class="dots" aria-hidden="true">${TUT.map(() => '<span></span>').join('')}</div><button class="btn main" data-m="tnext"></button></div>
        <p class="tcount" aria-live="polite"></p></div>`, 'small tutm');
      tutMax = 0;
    }
    const prev = tutI; tutI = Math.max(0, Math.min(TUT.length - 1, i || 0)); tutMax = Math.max(tutMax, tutI);
    const body = $('mBody'), last = tutI === TUT.length - 1;
    body.querySelectorAll('.tpage').forEach((el, j) => { el.classList.toggle('on', j === tutI); el.classList.toggle('back', open && j === tutI && tutI < prev); el.setAttribute('aria-hidden', j === tutI ? 'false' : 'true'); });
    body.querySelectorAll('.dots span').forEach((el, j) => { el.className = j === tutI ? 'on' : (j <= tutMax ? 'seen' : ''); });
    const bp = body.querySelector('[data-m="tprev"]'), bn = body.querySelector('[data-m="tnext"], [data-m="tend"]');
    bp.disabled = !tutI; bn.dataset.m = last ? 'tend' : 'tnext'; bn.textContent = last ? 'Los geht\'s!' : 'Weiter';
    body.querySelector('.tcount').textContent = `Seite ${tutI + 1} von ${TUT.length}`;
    if (open && prev !== tutI) SFX.play('page');
    if (open && document.activeElement && document.activeElement.disabled) bn.focus();
  }
  function badgeClick(e) {
    const c = e.target, r = c.getBoundingClientRect(), i = BADGEROOM.hit((e.clientX - r.left) * BADGEROOM.W / r.width, (e.clientY - r.top) * BADGEROOM.H / r.height);
    badgeSel = i; const b = badgeList()[i];
    $('bcap').innerHTML = b ? `<b>${esc(b.name)}</b> · ${b.ok ? 'verdient' : 'noch offen: ' + esc(b.hint)}` : '';
  }
  function drawBadgeRoom() {
    const c = $('bcv'); if (!c) return; const g = c.getContext('2d');
    BADGEROOM.draw(g, badgeList(), time, badgeSel, gg => { gg.fillStyle = '#5c3a2e'; gg.font = '600 8px "Pixelify Sans", monospace'; gg.textAlign = 'center'; gg.fillText('EHRENTAFEL', BADGEROOM.W / 2, 28); });
  }
  $('modal').addEventListener('click', e => {
    if (e.target.id === 'modal') return closeModal();
    const b = e.target.closest('[data-m]'); if (!b || b.disabled) return;
    const a = b.dataset.m;
    if (a === 'close') return closeModal();
    if (a === 'tprev') return openTutorial(tutI - 1);
    if (a === 'tnext') return openTutorial(tutI + 1);
    if (a === 'tend') { store.set('altefabrik_tut', '1'); closeModal(); renderChrome(); SFX.play('gateCreak'); SFX.play('unlock', { delay: .6 }); return; }
  });
  $('panel').addEventListener('keydown', e => { const r = e.target.closest('.row.click'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); r.click(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal').classList.contains('hidden')) closeModal(); else if (e.key === 'Escape' && placeItem) stopPlace(); });

  // ---------- Anmeldung ----------
  async function doLogin(tag, pin, remember) {
    cred = { tag, pin };
    $('loginError').textContent = ''; $('btnLogin').disabled = true;
    try {
      const r = await api({ action: 'login' });
      if (!r.ok) { $('loginError').textContent = r.error || 'Anmeldung fehlgeschlagen.'; return false; }
      if (remember) store.set('altefabrik_cred', JSON.stringify({ tag, pin }));
      if (r.leitstand) {   /* Lehrkraft: Leitstand statt Fabrik */
        $('login').classList.add('hidden'); $('app').classList.add('hidden');
        LEITSTAND.start(r.leitstand, () => api({ action: 'leitstand' }), () => { store.set('altefabrik_cred', ''); location.reload(); });
        return true;
      }
      apply(r);
      $('login').classList.add('hidden'); $('app').classList.remove('hidden');
      const u = unclaimed().length; if (u) setTimeout(() => toast(`Der Lieferwagen ist da: ${u} Kiste${u > 1 ? 'n' : ''} für dich!`), 600);
      return true;
    } catch (e) { console.error(e); $('loginError').textContent = 'Keine Verbindung zum Server.'; return false; }
    finally { $('btnLogin').disabled = false; }
  }
  $('inTag').addEventListener('keydown', e => { if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') { e.preventDefault(); $('inPin').focus(); } });   /* immer weiter zur PIN, auch wenn eine Vorschlagsliste offen ist */
  $('loginForm').addEventListener('submit', e => { e.preventDefault(); doLogin($('inTag').value.trim(), $('inPin').value.trim(), $('inRemember').checked); });
  let bauHolt = false;   /* Bauzeit: Restzeit im Panel aktuell halten; ist ein Bau fertig, neuen Stand holen und melden */
  setInterval(() => { if (!D || !S().bau) return; const ids = Object.keys(S().bau); if ((sel && sel.kind === 'building' && ids.includes(sel.id)) || ids.includes(view)) renderPanel(); if (bauHolt || !ids.some(id => S().bau[id] <= now())) return;
    bauHolt = true; api({ action: 'login' }).then(r => { bauHolt = false; if (!r.ok) return; const fertig = ids.filter(id => r.state.b[id]); apply(r); fertig.forEach(id => { toast(bDef(id).name + ' ist fertig renoviert!'); SFX.play('unlock'); }); }).catch(() => { bauHolt = false; }); }, 5000);
  setInterval(() => { if (D && !document.hidden && !MOCK) api({ action: 'login' }).then(r => { if (r.ok) apply(r); }).catch(() => {}); }, 5 * 60000);

  (async function init() {
    const th = store.get('altefabrik_theme'); if (th) document.documentElement.dataset.theme = th;
    [['quests', 'book'], ['factory', 'gears'], ['orders', 'clip'], ['catalog', 'cart'], ['badges', 'medal'], ['rank', 'rank'], ['menu', 'menu']].forEach(([a, k]) => { $('ico_' + a).src = IC['nav_' + k] || IC[k]; });
  /* Leistensymbole so grob wie die Spielgrafik: 21 Symbolpixel x Pixelgröße des Werkshofs */
  (() => { const st = $('stage'); if (!st || !window.ResizeObserver) return; const fit = () => { const k = st.clientWidth / W; if (k > 0) document.documentElement.style.setProperty('--icpx', Math.round(Math.max(30, Math.min(56, 21 * k))) + 'px'); document.documentElement.style.setProperty('--respx', Math.round(Math.max(24, Math.min(40, 14 * k))) + 'px'); }; new ResizeObserver(fit).observe(st); fit(); })()   /* detaillierte Leistensymbole */;
    try { if (document.fonts) await Promise.race([document.fonts.load('16px "Pixelify Sans"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
    $('loading').classList.add('hidden');
    requestAnimationFrame(frame);
    if (MOCK) $('mockHint').textContent = 'Vorschau-Modus: Es ist kein Server eingetragen. Melde dich mit beliebigem Namen und PIN an.';
    let saved = null; try { saved = JSON.parse(store.get('altefabrik_cred')); } catch (e) {}
    if (saved && saved.tag && saved.pin && await doLogin(saved.tag, saved.pin, true)) return;
    $('login').classList.remove('hidden');
  })();

  window.__G = { startCut, get D() { return D; }, setView, pick, openTutorial, closeModal, setMode: m => { mode = m; sel = null; renderPanel(true); }, get view() { return view; }, get sel() { return sel; }, SCENE, INNER };
})();

// Spielsymbol in Lade- und Anmeldefenster, dazu als Tab-Symbol
(() => { const E = ART.EMBLEM; if (!E) return; document.querySelectorAll("[data-emblem]").forEach(c => { c.width = E.c.width; c.height = E.c.height; c.getContext("2d").drawImage(E.c, 0, 0); });
  try { const f = document.createElement("canvas"); f.width = f.height = 64; const g = f.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(E.c, 0, 0, 64, 64); const l = document.createElement("link"); l.rel = "icon"; l.href = f.toDataURL(); document.head.appendChild(l); } catch (e) {} })();
