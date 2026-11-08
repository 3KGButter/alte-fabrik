// Leitstand: Tafel der Lehrkraft für das Smartboard (nur lesen, nur Gamertags)
// Seiten: Produktionszähler, Hall of Fame, Klassenvergleich, je Klasse eine Rangliste, Levelstufen, Badges.
// Blättert von selbst weiter; Wischen, Pfeile, Tasten oder die Seitenleiste springen gezielt (dann wartet die Automatik länger).
'use strict';
const LEITSTAND = (() => {
  const AUTO_MS = 25000, PAUSE_NACH_HAND_MS = 90000, NEU_LADEN_MS = 5 * 60000;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = n => Math.round(Number(n) || 0).toLocaleString('de-DE');
  const KL_FARBEN = ['#ffbd5a', '#7fd4c4', '#f08a6a', '#a8b8ff', '#d9a0f0'];
  let D = null, pages = [], idx = 0, timer = 0, t0 = 0, dauer = AUTO_MS, pausiert = false, laden = null, root = null, raf = 0, ladeTimer = 0;
  const BADGE_IMG = {};
  const SVG = d => `<svg viewBox="0 0 16 16" width="1.1em" height="1.1em" aria-hidden="true" shape-rendering="crispEdges" fill="currentColor">${d}</svg>`;
  const ICO = {
    pause: SVG('<rect x="3" y="2" width="4" height="12"/><rect x="9" y="2" width="4" height="12"/>'),
    play: SVG('<rect x="4" y="2" width="2" height="12"/><rect x="6" y="3" width="2" height="10"/><rect x="8" y="4" width="2" height="8"/><rect x="10" y="5" width="2" height="6"/><rect x="12" y="7" width="1" height="2"/>'),
    voll: SVG('<rect x="1" y="1" width="5" height="2"/><rect x="1" y="1" width="2" height="5"/><rect x="10" y="1" width="5" height="2"/><rect x="13" y="1" width="2" height="5"/><rect x="1" y="13" width="5" height="2"/><rect x="1" y="10" width="2" height="5"/><rect x="10" y="13" width="5" height="2"/><rect x="13" y="10" width="2" height="5"/>'),
    aus: SVG('<rect x="7" y="1" width="2" height="7"/><rect x="4" y="3" width="2" height="2"/><rect x="10" y="3" width="2" height="2"/><rect x="2" y="5" width="2" height="5"/><rect x="12" y="5" width="2" height="5"/><rect x="3" y="10" width="2" height="2"/><rect x="11" y="10" width="2" height="2"/><rect x="5" y="12" width="6" height="2"/>')
  };

  function badgeBild(id) {
    if (BADGE_IMG[id] !== undefined) return BADGE_IMG[id];
    let url = '';
    try {
      const rows = (window.BADGE_PIX || {})[id];
      if (rows) { const pal = Object.assign({}, ART.PAL, { k: '#2a5ec8', K: '#4d8cf0', '8': '#9a5a22', '9': '#d68e30' }); url = ART.buildSprite(rows, pal).c.toDataURL(); }
    } catch (e) { url = ''; }
    return (BADGE_IMG[id] = url);
  }

  // ---------- Seiten aus den Daten ----------
  function seitenBauen() {
    const p = [{ id: 'zaehler', kurz: 'Zähler', titel: 'Produktionszähler' }, { id: 'top', kurz: 'Top 10', titel: 'Hall of Fame' }, { id: 'vergleich', kurz: 'Vergleich', titel: 'Klassen im Vergleich' }];
    D.klassen.forEach((k, i) => p.push({ id: 'kl:' + k.klasse, kurz: k.klasse, titel: 'Rangliste ' + k.klasse, kl: i }));
    p.push({ id: 'level', kurz: 'Level', titel: 'Levelstufen' }, { id: 'badges', kurz: 'Badges', titel: 'Verliehene Badges' });
    return p;
  }
  const klFarbe = kl => KL_FARBEN[Math.max(0, D.klassen.findIndex(k => k.klasse === kl)) % KL_FARBEN.length];
  function naechstes(xp) {
    const L = D.levels || []; if (!L.length) return null;
    let i = 0; L.forEach((e, j) => { if (xp >= e.ab) i = j; });
    const cur = L[i], nx = L[i + 1]; if (!nx) return { pct: 1, rest: 0, max: true };
    return { pct: Math.max(0, Math.min(1, (xp - cur.ab) / (nx.ab - cur.ab))), rest: nx.ab - xp };
  }
  const lvTxt = l => (l === 0 || l === '0') ? '†' : esc(l);

  function seiteHtml(pg) {
    if (pg.id === 'zaehler') {
      const badges = D.badges.reduce((a, b) => a + b.anzahl, 0);
      const ziffern = fmt(D.gesamtXp).split('').map(c => c === '.' ? '<span class="lpunkt">.</span>' : `<span class="lziff">${c}</span>`).join('');
      return `<div class="lzaehl"><div class="lzlabel">Ausgeschüttete XP aller Klassen</div><div class="lwerk" aria-label="${fmt(D.gesamtXp)} XP">${ziffern}</div>
        <div class="lkacheln"><div class="lkachel"><b>${fmt(D.schueler)}</b><span>Schüler im Werk</span></div><div class="lkachel"><b>${fmt(D.quests)}</b><span>erledigte Quests</span></div><div class="lkachel"><b>${fmt(badges)}</b><span>verliehene Badges</span></div><div class="lkachel"><b>${fmt(D.schueler ? D.gesamtXp / D.schueler : 0)}</b><span>Ø XP pro Schüler</span></div></div></div>`;
    }
    if (pg.id === 'top') {
      return `<ol class="lliste ltop">${D.top.map(e => `<li class="${e.p <= 3 ? 'lp' + e.p : ''}"><span class="lplatz">${e.p}</span><span class="ltag">${esc(e.tag)}</span><span class="lkl" style="--kf:${klFarbe(e.klasse)}">${esc(e.klasse)}</span><span class="llv">Lv ${lvTxt(e.level)}</span><span class="lstufe">${esc(e.stufe)}</span><span class="lxp">${fmt(e.xp)} XP</span></li>`).join('')}</ol>`;
    }
    if (pg.id === 'vergleich') {
      const chart = (titel, wert, einheit) => {
        const max = Math.max(1, ...D.klassen.map(wert));
        return `<figure class="lchart"><figcaption>${titel}</figcaption><div class="lbars">${D.klassen.map(k => `<div class="lbarcol"><span class="lbarval">${fmt(wert(k))}</span><div class="lbar" style="--h:${(wert(k) / max * 100).toFixed(1)}%;--kf:${klFarbe(k.klasse)}"></div><span class="lbarname">${esc(k.klasse)}</span></div>`).join('')}</div><div class="lchartfoot">${einheit}</div></figure>`;
      };
      return `<div class="lcharts">${chart('Gesamt-XP je Klasse', k => k.summe, 'XP zusammen')}${chart('Durchschnitt pro Schüler', k => k.schnitt, 'XP pro Schüler')}</div>`;
    }
    if (pg.id.startsWith('kl:')) {
      const k = D.klassen[pg.kl], half = Math.ceil(k.liste.length / 2);
      const zeile = e => { const n = naechstes(e.xp); return `<li class="${e.p <= 3 ? 'lp' + e.p : ''}"><span class="lplatz">${e.p}</span><span class="ltag">${esc(e.tag)}</span><span class="llv">Lv ${lvTxt(e.level)}</span><span class="lxp">${fmt(e.xp)}</span>${n ? `<span class="lnext" title="${n.max ? 'höchstes Level' : 'noch ' + fmt(n.rest) + ' XP'}"><i style="width:${(n.pct * 100).toFixed(0)}%"></i></span>` : ''}</li>`; };
      const cols = k.liste.length > 12 ? [k.liste.slice(0, half), k.liste.slice(half)] : [k.liste];
      return `<div class="lklkopf" style="--kf:${klFarbe(k.klasse)}"><span>${fmt(k.anzahl)} Schüler</span><span>${fmt(k.summe)} XP zusammen</span><span>Ø ${fmt(k.schnitt)} XP</span><span class="lklhint">Balken: Weg bis zum nächsten Level</span></div>
        <div class="lspalten" style="--rows:${Math.max(8, cols[0].length)}">${cols.map(c => `<ol class="lliste lkl" start="${c[0] ? c[0].p : 1}">${c.map(zeile).join('')}</ol>`).join('')}</div>`;
    }
    if (pg.id === 'level' && window.LEIT_TREPPE && D.levels.length) {   /* Entwurf: Levelstufen als Treppe */
      const anz = {}; D.klassen.forEach(k => k.liste.forEach(e => { const l = String(e.level || 0); anz[l] = (anz[l] || 0) + 1; }));
      const L = D.levels, n = L.length;
      return `<div class="ltreppe" style="--n:${n}">${L.map((e, i) => { const key = e.level === '†' ? '0' : String(e.level), a = anz[key] || 0;
        return `<div class="lstufeT" style="--i:${i}"><div class="lsinfo"><b>${esc(e.level)}</b><span class="lsname">${esc(e.stufe) || '<em>noch ohne Namen</em>'}</span><span class="lsxp">ab ${fmt(e.ab)} XP</span>${a ? `<span class="lsanz">${a} ${a === 1 ? 'Schüler' : 'Schüler'}</span>` : ''}</div><div class="lsblock"></div></div>`; }).join('')}<canvas class="lkletter" width="20" height="32"></canvas></div>`;
    }
    if (pg.id === 'level') {
      if (!D.levels.length) return '<p class="lleer">Die Leveltabelle wird beim nächsten Abruf aus dem XP-Rechner geladen.</p>';
      const anz = {}; D.klassen.forEach(k => k.liste.forEach(e => { const l = String(e.level || 0); anz[l] = (anz[l] || 0) + 1; }));
      const L = D.levels, half = Math.ceil(L.length / 2);
      const zeile = (e, i) => { const key = e.level === '†' ? '0' : String(e.level); const a = anz[key] || 0; return `<li style="--st:${i}"><span class="lstep">${esc(e.level)}</span><span class="lstufe2">${esc(e.stufe) || '<em>noch ohne Namen</em>'}</span><span class="lab">ab ${fmt(e.ab)} XP</span><span class="lanz${a ? '' : ' null'}">${a ? a + ' ' + 'Schüler' : '–'}</span></li>`; };
      return `<div class="lspalten" style="--rows:${half}">${[L.slice(0, half), L.slice(half)].map((c, j) => `<ol class="lliste llevel">${c.map((e, i) => zeile(e, i + j * half)).join('')}</ol>`).join('')}</div>`;
    }
    if (pg.id === 'badges') {
      return `<div class="lbadges">${D.badges.map(b => { const img = badgeBild(b.id), pct = D.schueler ? b.anzahl / D.schueler : 0; return `<div class="lbadge ${esc(b.color)}">${img ? `<img src="${img}" alt="">` : ''}<div class="lbname">${esc(b.name)}</div><div class="lbzahl">${fmt(b.anzahl)}<small>× verliehen</small></div><div class="lbquote"><i style="width:${(pct * 100).toFixed(0)}%"></i></div></div>`; }).join('')}</div>`;
    }
    return '';
  }

  // ---------- Anzeige ----------
  function aufbauen() {
    root = document.createElement('div'); root.id = 'leit'; root.className = 'leit';
    root.innerHTML = `<header class="lhead"><div class="ltitel"><canvas class="emblem" data-emblem width="1" height="1" aria-hidden="true"></canvas><div><div class="lname">Leitstand</div><div class="lsub">Die Alte Fabrik</div></div></div>
      <h1 class="lseite" id="lSeite" aria-live="polite"></h1>
      <div class="lrechts"><span class="luhr" id="lUhr"></span><span class="lstand" id="lStand"></span>
        <button class="lknopf" id="lPause" aria-label="Automatisch weiterblättern anhalten"></button><button class="lknopf" id="lVoll" aria-label="Vollbild">${ICO.voll}</button><button class="lknopf" id="lAus" aria-label="Abmelden">${ICO.aus}</button></div></header>
      <main class="lrahmen"><div class="lschirm" id="lSchirm"></div></main>
      <div class="lband" aria-hidden="true"></div>
      <nav class="lnav"><button class="lpfeil" id="lZur" aria-label="Vorherige Tafel">◀</button><div class="lchips" id="lChips" role="tablist" aria-label="Tafel wählen"></div><button class="lpfeil" id="lVor" aria-label="Nächste Tafel">▶</button></nav>`;
    document.body.appendChild(root);
    try { const E = ART.EMBLEM, c = root.querySelector('[data-emblem]'); if (E && c) { c.width = E.c.width; c.height = E.c.height; c.getContext('2d').drawImage(E.c, 0, 0); } } catch (e) {}
    const $ = id => root.querySelector('#' + id);
    $('lZur').onclick = () => gehe(idx - 1, true); $('lVor').onclick = () => gehe(idx + 1, true);
    $('lPause').onclick = () => { pausiert = !pausiert; SFX.play('click'); knopfPause(); starteTakt(AUTO_MS); };
    const fs = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!fs) $('lVoll').hidden = true; else $('lVoll').onclick = () => { SFX.play('click'); if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else fs.call(root); };
    $('lChips').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) gehe(Number(b.dataset.i), true); });
    document.addEventListener('keydown', e => { if (!root || root.hidden) return; if (e.key === 'ArrowRight' || e.key === 'PageDown') gehe(idx + 1, true); else if (e.key === 'ArrowLeft' || e.key === 'PageUp') gehe(idx - 1, true); else if (e.key === ' ') { e.preventDefault(); $('lPause').click(); } });
    // Wischen auf der Tafel
    let sx = null, sy = 0; const sch = $('lSchirm');
    sch.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
    sch.addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) gehe(idx + (dx < 0 ? 1 : -1), true); });
    sch.addEventListener('pointercancel', () => { sx = null; });
    setInterval(uhr, 1000); uhr();
    try { LEITRAUM.start(root, () => ({ t0, dauer, pausiert, seit: taktNr })); } catch (e) { console.warn('Kontrollraum nicht gezeichnet', e); }
  }
  function knopfPause() { const b = root.querySelector('#lPause'); b.innerHTML = pausiert ? ICO.play : ICO.pause; b.setAttribute('aria-label', pausiert ? 'Automatisch weiterblättern starten' : 'Automatisch weiterblättern anhalten'); b.classList.toggle('an', pausiert); }
  function uhr() {
    const d = new Date(); root.querySelector('#lUhr').textContent = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    if (D && D.stand) { const s = new Date(D.stand); if (!isNaN(s)) root.querySelector('#lStand').textContent = 'XP-Rechner: ' + s.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ', ' + s.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); }
  }
  function chips() {
    root.querySelector('#lChips').innerHTML = pages.map((p, i) => `<button class="lchip${i === idx ? ' on' : ''}${p.id.startsWith('kl:') ? ' kl' : ''}" data-i="${i}" role="tab" aria-selected="${i === idx}"${p.id.startsWith('kl:') ? ` style="--kf:${klFarbe(p.id.slice(3))}"` : ''}>${esc(p.kurz)}</button>`).join('');
  }
  function zeigen(richtung) {
    const pg = pages[idx], sch = root.querySelector('#lSchirm');
    fallblatt(root.querySelector('#lSeite'), pg.titel);
    sch.innerHTML = `<section class="ltafel t-${pg.id.replace(/[^a-z]/g, '')}${richtung ? (richtung > 0 ? ' von-rechts' : ' von-links') : ''}">${seiteHtml(pg)}</section>`;
    chips();
    if (pg.id === 'zaehler') hochzaehlen(sch);
    if (pg.id === 'level') kletterer(sch);
  }
  // Überschrift wie eine Fallblattanzeige: jedes Blatt klappt kurz durch und bleibt dann stehen
  const ZEICHEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789';
  let fallTimer = 0;
  function fallblatt(el, text) {
    el.setAttribute('aria-label', text); clearInterval(fallTimer);
    const ruhig = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.innerHTML = text.split(' ').map(w => `<span class="lwort">${w.split('').map(c => `<span class="lfb" aria-hidden="true">${esc(ruhig ? c : ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)])}</span>`).join('')}</span>`).join('');
    if (ruhig) return;
    const bl = Array.from(el.querySelectorAll('.lfb')), ziel = text.replace(/ /g, '').split(''), start = performance.now();
    fallTimer = setInterval(() => {
      const t = performance.now() - start; let fertig = true;
      bl.forEach((b, i) => { const ende = 180 + i * 45; if (t < ende) { fertig = false; const z = ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)]; if (b.textContent !== z) { b.textContent = z; b.classList.remove('klapp'); void b.offsetWidth; b.classList.add('klapp'); } } else if (b.textContent !== ziel[i]) { b.textContent = ziel[i]; b.classList.remove('klapp'); void b.offsetWidth; b.classList.add('klapp'); } });
      if (fertig) clearInterval(fallTimer);
    }, 70);
  }
  // Kleine Figur steigt die Treppe hinauf, winkt oben und beginnt von vorn
  let kletterRaf = 0;
  function kletterer(sch) {
    const cv = sch.querySelector('.lkletter'), tr = sch.querySelector('.ltreppe'); cancelAnimationFrame(kletterRaf); if (!cv || !tr) return;
    const blocks = Array.from(tr.querySelectorAll('.lsblock')), g = cv.getContext('2d'), W = WORKERS.set('small', 2), t0 = performance.now();
    const step = now => {
      if (!cv.isConnected) return;
      const t = Math.max(0, (now - t0) / 1000), proStufe = 1.1, n = blocks.length, zyk = n * proStufe + 3, u = t % zyk, i = Math.min(n - 1, Math.floor(u / proStufe)), q = Math.min(1, (u - i * proStufe) / proStufe);
      const tb = tr.getBoundingClientRect(), b0 = blocks[i].getBoundingClientRect(), b1 = blocks[Math.min(n - 1, i + 1)].getBoundingClientRect();
      const oben = u >= n * proStufe - .2, k = tb.width / 600 * 1.0, sc = Math.max(2, Math.round(tb.height / 240)); tr.style.setProperty('--kh', (30 * sc + 6) + 'px');
      cv.style.width = 20 * sc + 'px'; cv.style.height = 32 * sc + 'px';
      const gehQ = Math.min(1, q / .7), hop = q > .7 ? Math.sin((q - .7) / .3 * Math.PI) * 6 : 0;
      const x = oben ? b0.left + b0.width / 2 : b0.left + b0.width * .3 + (q > .7 ? (b1.left - b0.left) * (q - .7) / .3 : b0.width * .4 * gehQ);
      const y = oben ? b0.top : (q > .7 ? b0.top + (b1.top - b0.top) * (q - .7) / .3 : b0.top) - hop * sc;
      cv.style.left = (x - tb.left - 10 * sc) + 'px'; cv.style.top = (y - tb.top - 31 * sc) + 'px';
      g.clearRect(0, 0, 20, 32);
      const fr = oben ? (W.wave || W.idle)[Math.floor(t * 3) % 2] : W.walk[Math.floor(t * 8) % 8];
      WORKERS.put(g, fr, 10, 30, false);
      kletterRaf = requestAnimationFrame(step);
    };
    kletterRaf = requestAnimationFrame(step);
  }
  function hochzaehlen(sch) {   // Zählwerk rollt einmal hoch
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ziff = Array.from(sch.querySelectorAll('.lziff')); if (!ziff.length) return;
    const ziel = ziff.map(z => z.textContent), start = performance.now();
    cancelAnimationFrame(raf);
    const step = now => { const t = Math.min(1, (now - start) / 1400); ziff.forEach((z, i) => { const fertig = t >= (i + 1) / ziff.length * .9 + .1 * (i / ziff.length); z.textContent = fertig || t >= 1 ? ziel[i] : String(Math.floor(Math.random() * 10)); }); if (t < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  }
  function gehe(i, hand) {
    const n = pages.length, alt = idx; idx = ((i % n) + n) % n;
    if (hand) SFX.play('page', { vol: .7 });
    zeigen(hand ? (i < alt && !(alt === n - 1 && idx === 0) ? -1 : 1) : 1);
    starteTakt(hand ? PAUSE_NACH_HAND_MS : AUTO_MS);
  }
  let taktNr = 0;
  function starteTakt(ms) {
    clearTimeout(timer); dauer = ms; t0 = performance.now(); taktNr++;
    if (!pausiert) timer = setTimeout(() => gehe(idx + 1, false), ms);
  }
  async function neuLaden() {
    try { const r = await laden(); if (r && r.ok && r.leitstand) { const id = pages[idx] && pages[idx].id; D = r.leitstand; pages = seitenBauen(); const j = pages.findIndex(p => p.id === id); idx = j >= 0 ? j : 0; zeigen(0); uhr(); } } catch (e) { console.warn('Leitstand: neu laden fehlgeschlagen', e); }
  }

  function start(daten, ladeFn, abmelden) {
    D = daten; laden = ladeFn; pages = seitenBauen(); idx = 0;
    document.documentElement.classList.add('leitmodus');
    if (!root) aufbauen();
    root.querySelector('#lAus').onclick = () => { if (confirmAus()) abmelden(); };
    knopfPause(); zeigen(0); uhr(); starteTakt(AUTO_MS);
    clearInterval(ladeTimer); ladeTimer = setInterval(() => { if (!document.hidden) neuLaden(); }, NEU_LADEN_MS);
  }
  // Abmelden mit zweitem Tippen bestätigen (kein Browser-Dialog)
  let ausBereit = 0;
  function confirmAus() {
    const b = root.querySelector('#lAus');
    if (Date.now() - ausBereit < 3000) return true;
    ausBereit = Date.now(); b.classList.add('warn'); b.textContent = 'Abmelden?';
    setTimeout(() => { b.classList.remove('warn'); b.innerHTML = ICO.aus; }, 3000);
    return false;
  }
  return { start };
})();
