/**
 * DIE ALTE FABRIK – Schnittstelle (Google Apps Script)
 * ----------------------------------------------------
 * Dieses Script gehört zur Tabelle "Alte Fabrik – Spieldaten".
 * Es LIEST den XP-Rechner nur (keine einzige Schreiboperation dort!)
 * und speichert Zugänge + Spielstände ausschließlich in der eigenen Tabelle.
 *
 * Einrichtung: siehe ANLEITUNG.md
 */

// ===================== EINSTELLUNGEN =====================
const XP_RECHNER_ID = ''; // im Spiel nicht nötig
const BLATT_QUESTBUCH = 'Questbuch 4.0';
const BLATT_XP = 'XP Rechner 3.0';
const SPIEL_URL = 'https://DEIN-GITHUB-NAME.github.io/alte-fabrik/'; // nach GitHub-Einrichtung anpassen
const CACHE_SEKUNDEN = 300;      // so lange werden XP-Rechner-Daten zwischengespeichert
const MAX_FEHLVERSUCHE = 5;      // danach Sperre
const SPERRE_SEKUNDEN = 15 * 60;

// ===================== SPIELREGELN =====================
// Wird auch an das Spiel geschickt, damit Anzeige und Prüfung identisch sind.
const REGELN = {
  version: 1,
  bufferHours: 8,                 // Produktionslager eines Gebäudes ist nach 8 h voll
  goodsBaseCap: 50,               // Lagerplatz für Güter ohne Lager-Gebäude
  goodsCapPerLagerLevel: 50,
  gearsPerXp: 0.1,                // 1 Zahnrad je 10 XP
  areas: [
    { id: 'ms1', ms: 'MS1', name: 'Werkstor und Hof' },
    { id: 'ms2', ms: 'MS2', name: 'Blechwerkstatt' },
    { id: 'ms3', ms: 'MS3', name: 'Zeichensaal' },
    { id: 'ms4', ms: 'MS4', name: 'Schneidhalle' },
    { id: 'ms5', ms: 'MS5', name: 'Kraftwerk' }
  ],
  goods: {
    gears:   { name: 'Zahnräder' },
    plans:   { name: 'Baupläne' },
    power:   { name: 'Strom', capped: true },
    sheet:   { name: 'Blechzuschnitte', capped: true },
    kant:    { name: 'Kantteile', capped: true },
    dreh:    { name: 'Drehteile', capped: true },
    machine: { name: 'Maschinen', capped: true }
  },
  buildings: {
    pfoertner:   { name: 'Pförtnerhaus', area: 'ms1', cost: { plans: 1, gears: 5 }, desc: 'Zeigt dein Questbuch mit allen offenen Quests.' },
    werkbank:    { name: 'Werkbank', area: 'ms1', cost: { gears: 8 }, req: 'pfoertner', desc: 'Damit kannst du reparieren und bauen.' },
    notstrom:    { name: 'Notstromaggregat', area: 'ms2', cost: { plans: 1, gears: 20 }, req: 'werkbank', maxLevel: 3,
                   produces: { out: 'power', perHour: 6 }, desc: 'Erzeugt Strom für die Maschinen.' },
    blechschere: { name: 'Blechschere', area: 'ms2', cost: { gears: 25 }, req: 'notstrom', maxLevel: 3,
                   produces: { out: 'sheet', perHour: 4, uses: { power: 1 } }, desc: 'Schneidet Blechzuschnitte zu (braucht Strom).' },
    lager:       { name: 'Lager', area: 'ms2', cost: { gears: 15 }, req: 'werkbank', maxLevel: 3,
                   desc: 'Mehr Platz für Strom und Bauteile (+50 je Stufe).' },
    zeichensaal: { name: 'Zeichensaal', area: 'ms3', cost: { plans: 2, gears: 60 }, minLevel: 5, desc: 'Schaltet Stufe 2 und 3 aller Maschinen frei.' },
    turm:        { name: 'Aussichtsturm', area: 'ms3', cost: { gears: 40 }, req: 'zeichensaal', desc: 'Deckt die ganze Karte auf.' },
    kantbank:    { name: 'Kantbank', area: 'ms3', cost: { gears: 50, sheet: 10 }, req: 'zeichensaal', maxLevel: 3,
                   produces: { out: 'kant', perHour: 2, uses: { sheet: 2, power: 1 } }, desc: 'Biegt Blechzuschnitte zu Kantteilen.' },
    drehbank:    { name: 'Drehbank', area: 'ms4', cost: { plans: 1, gears: 80 }, minLevel: 7, maxLevel: 3,
                   produces: { out: 'dreh', perHour: 2, uses: { power: 2 } }, desc: 'Dreht Drehteile.' },
    montage:     { name: 'Montagehalle', area: 'ms4', cost: { gears: 120, kant: 20 }, req: 'drehbank', maxLevel: 3,
                   produces: { out: 'machine', perHour: 0.5, uses: { kant: 2, dreh: 2 } }, desc: 'Baut aus Kant- und Drehteilen Maschinen.' },
    kraftwerk:   { name: 'Kraftwerk', area: 'ms5', cost: { plans: 3, gears: 150 }, boss: true, maxLevel: 3,
                   produces: { out: 'power', perHour: 20 }, desc: 'Volle Stromversorgung – die Fabrik erwacht.' }
  },
  upgradeNeeds: 'zeichensaal',    // Stufe 2+ erst mit Zeichensaal
  deco: {
    blumen:  { name: 'Blumenkübel', gears: 2 },
    laterne: { name: 'Laterne', gears: 3 },
    schild:  { name: 'Schild', gears: 3 },
    fass:    { name: 'Fass', gears: 3 },
    reifen:  { name: 'Reifenstapel', gears: 4 },
    baum:    { name: 'Tanne', gears: 6 },
    automat: { name: 'Automat', gears: 10 }
  },
  maxDeco: 60
};

// ===================== WEB-SCHNITTSTELLE =====================
function doGet() {
  return json_({ ok: true, msg: 'Die Alte Fabrik – Schnittstelle läuft.' });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Ungültige Anfrage.' }); }
  try {
    const who = anmelden_(req.tag, req.pin);
    if (!who.ok) return json_(who);
    const action = req.action || 'login';
    if (action === 'login') return json_(antwort_(who.user, ladeStand_(who.user.tag)));

    // Schreibende Aktionen: nacheinander abarbeiten
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const state = ladeStand_(who.user.tag);
      const ctx = kontext_(who.user);
      const res = aktion_(action, req, state, ctx, Date.now());
      if (!res.ok) return json_(Object.assign(antwort_(who.user, state), { ok: false, error: res.error }));
      speichereStand_(who.user.tag, state);
      const out = antwort_(who.user, state);
      out.msg = res.msg || '';
      return json_(out);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Serverfehler: ' + err.message });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ===================== ANMELDUNG =====================
function normTag_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toLowerCase();
}

function anmelden_(tag, pin) {
  const n = normTag_(tag);
  pin = String(pin || '').trim();
  if (!n || !pin) return { ok: false, error: 'Bitte Gamertag und PIN eingeben.' };
  const cache = CacheService.getScriptCache();
  const fKey = 'f_' + n;
  const fails = Number(cache.get(fKey) || 0);
  if (fails >= MAX_FEHLVERSUCHE) return { ok: false, error: 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.' };

  // Demo-Zugang für die Lehrkraft (PIN in den Script-Eigenschaften: DEMO_PIN)
  const demoPin = PropertiesService.getScriptProperties().getProperty('DEMO_PIN');
  if (n === 'demo' && demoPin && pin === demoPin) return { ok: true, user: { tag: 'DEMO', klasse: 'Demo', demo: true } };

  const rows = zugangsliste_();
  const hit = rows.find(r => r.norm === n && r.pin === pin && r.aktiv);
  if (!hit) {
    cache.put(fKey, String(fails + 1), SPERRE_SEKUNDEN);
    return { ok: false, error: 'Gamertag oder PIN stimmt nicht.' };
  }
  cache.remove(fKey);
  return { ok: true, user: { tag: hit.tag, klasse: hit.klasse } };
}

function zugangsliste_() {
  const sh = SpreadsheetApp.getActive().getSheetByName('Zugang');
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 6).getDisplayValues().map(r => ({
    tag: r[0], norm: r[1] || normTag_(r[0]), klasse: r[2], name: r[3], pin: String(r[4]).trim(), aktiv: String(r[5]).toUpperCase() !== 'FALSE'
  })).filter(r => r.tag);
}

// ===================== XP-RECHNER LESEN (NUR LESEN!) =====================
function snapshot_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('snap');
  if (hit) return JSON.parse(hit);
  const snap = leseXpRechner_();
  try { cache.put('snap', JSON.stringify(snap), CACHE_SEKUNDEN); } catch (e) { console.warn('Cache zu groß', e); }
  return snap;
}

function leseXpRechner_() {
  const ss = SpreadsheetApp.openById(XP_RECHNER_ID);

  // 1) Gamertags, XP und Level aus "XP Rechner 3.0"
  const xpVals = ss.getSheetByName(BLATT_XP).getDataRange().getDisplayValues();
  const nameToTag = {}, profile = {};
  for (let r = 2; r < xpVals.length; r++) {
    const row = xpVals[r];
    const fullName = String(row[3] || '').trim();        // Spalte D: "Vorname Nachname"
    const tag = String(row[4] || '').trim();             // Spalte E: Gamertag
    if (fullName && tag) nameToTag[fullName] = tag;
    const tag2 = String(row[11] || '').trim();           // Spalte L: Gamertag (Übersicht)
    if (tag2) profile[tag2] = {
      xp: Number(String(row[12]).replace(/\./g, '').replace(',', '.')) || 0, // Spalte M
      level: parseInt(row[13], 10) || 0,                 // Spalte N ("†" -> 0)
      stufe: row[14] || '',                              // Spalte O
      klasse: row[15] || ''                              // Spalte P
    };
  }

  // 2) Quests und Status aus "Questbuch 4.0"
  const qVals = ss.getSheetByName(BLATT_QUESTBUCH).getDataRange().getValues();
  const kachel = qVals[0], namen = qVals[1], arten = qVals[3], xps = qVals[4];
  const quests = [];
  let ms = '';
  for (let c = 2; c < namen.length; c += 2) {
    const qn = String(namen[c] || '').trim();
    if (!qn || /^gesamt/i.test(qn)) break;
    const k = String(kachel[c] || '');
    const m = k.match(/MS\s*(\d+)/i);
    if (m) ms = 'MS' + m[1];
    quests.push({ n: qn, ms: ms, hq: /haupt/i.test(String(arten[c])), xp: Number(xps[c]) || 0, col: c });
  }
  const done = {};
  for (let r = 6; r < qVals.length; r++) {
    const name = String(qVals[r][1] || '').trim();
    const tag = nameToTag[name];
    if (!tag) continue;
    done[tag] = quests.map(q => {
      const v = qVals[r][q.col];
      return (v === true || String(v).trim() === 'Abgeschlossen') ? '1' : '0';
    }).join('');
  }
  let stand = '';
  try { stand = DriveApp.getFileById(XP_RECHNER_ID).getLastUpdated().toISOString(); } catch (e) {}
  return { quests: quests.map(q => ({ n: q.n, ms: q.ms, hq: q.hq, xp: q.xp })), done: done, profile: profile, stand: stand, at: Date.now() };
}

// Fortschritt eines Spielers (aus Snapshot) + freigeschaltete Bereiche
function kontext_(user) {
  const snap = snapshot_();
  let bits, prof;
  if (user.demo) {
    // Demo: MS1 + MS2 komplett, MS3 halb
    bits = snap.quests.map((q, i) => (q.ms === 'MS1' || q.ms === 'MS2' || (q.ms === 'MS3' && i % 2 === 0)) ? '1' : '0').join('');
    prof = { xp: 3000, level: 8, stufe: 'Demo', klasse: 'Demo' };
  } else {
    bits = snap.done[user.tag] || '';
    prof = snap.profile[user.tag] || { xp: 0, level: 0, stufe: '', klasse: user.klasse };
  }
  const quests = snap.quests.map((q, i) => Object.assign({}, q, { done: bits.charAt(i) === '1' }));
  const allHq = ms => quests.filter(q => q.ms === ms && q.hq).every(q => q.done);
  const areas = { ms1: true, ms2: allHq('MS1'), ms3: false, ms4: false, ms5: false };
  areas.ms3 = areas.ms2 && allHq('MS2');
  areas.ms4 = areas.ms3 && allHq('MS3');
  areas.ms5 = areas.ms4;
  const boss = quests.filter(q => q.ms === 'MS5');
  const bossDefeated = boss.length > 0 && boss.every(q => q.done);
  return { quests: quests, profile: prof, areas: areas, bossDefeated: bossDefeated, stand: snap.stand };
}

// ===================== SPIELSTÄNDE =====================
function neuerStand_() {
  return { v: 1, inv: { gears: 0, plans: 0, power: 0, sheet: 0, kant: 0, dreh: 0, machine: 0 }, claimed: [], b: {}, deco: [], created: Date.now() };
}

function standBlatt_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Spielstaende');
  if (!sh) {
    sh = ss.insertSheet('Spielstaende');
    sh.getRange(1, 1, 1, 3).setValues([['Gamertag', 'Spielstand (nicht von Hand ändern)', 'Zuletzt gespeichert']]).setFontWeight('bold');
  }
  return sh;
}

function ladeStand_(tag) {
  const sh = standBlatt_();
  const f = sh.getRange('A:A').createTextFinder(tag).matchEntireCell(true).matchCase(true).findNext();
  if (!f) return neuerStand_();
  try { return JSON.parse(sh.getRange(f.getRow(), 2).getValue()); } catch (e) { return neuerStand_(); }
}

function speichereStand_(tag, state) {
  const sh = standBlatt_();
  const f = sh.getRange('A:A').createTextFinder(tag).matchEntireCell(true).matchCase(true).findNext();
  const row = f ? f.getRow() : sh.getLastRow() + 1;
  sh.getRange(row, 1, 1, 3).setValues([[tag, JSON.stringify(state), new Date()]]);
}

// ===================== SPIELLOGIK =====================
function antwort_(user, state) {
  const ctx = kontext_(user);
  const claimed = {};
  (state.claimed || []).forEach(n => claimed[n] = true);
  return {
    ok: true,
    now: Date.now(),
    user: { tag: user.tag, klasse: ctx.profile.klasse || user.klasse, xp: ctx.profile.xp, level: ctx.profile.level, stufe: ctx.profile.stufe },
    quests: ctx.quests.map(q => ({ n: q.n, ms: q.ms, hq: q.hq, xp: q.xp, done: q.done, claimed: !!claimed[q.n] })),
    areas: ctx.areas,
    bossDefeated: ctx.bossDefeated,
    stand: ctx.stand,
    state: state,
    rules: REGELN
  };
}

function goodsCap_(state) {
  const l = state.b.lager ? state.b.lager.lvl : 0;
  return REGELN.goodsBaseCap + REGELN.goodsCapPerLagerLevel * l;
}

// Wie viele Einheiten hat ein Gebäude seit dem letzten Abholen produziert (ohne Rohstoffprüfung)?
function pending_(id, bs, now) {
  const p = REGELN.buildings[id].produces;
  if (!p) return 0;
  const rate = p.perHour * bs.lvl;
  const hours = Math.max(0, (now - bs.last) / 3600000);
  return Math.min(rate * hours, rate * REGELN.bufferHours);
}

function canAfford_(inv, cost) {
  return Object.keys(cost).every(k => (inv[k] || 0) >= cost[k]);
}
function pay_(inv, cost) {
  Object.keys(cost).forEach(k => inv[k] = (inv[k] || 0) - cost[k]);
}
function upgradeCost_(def, lvl) {
  // Stufe lvl -> lvl+1: Zahnräder verdoppeln sich je Stufe
  return { gears: (def.cost.gears || 0) * Math.pow(2, lvl) };
}

function aktion_(action, req, state, ctx, now) {
  state.inv = state.inv || {};
  state.b = state.b || {};
  state.deco = state.deco || [];
  state.claimed = state.claimed || [];
  const R = REGELN;

  if (action === 'claim') {
    const names = Array.isArray(req.quests) ? req.quests : [req.quest];
    let gears = 0, plans = 0, n = 0;
    names.forEach(name => {
      const q = ctx.quests.find(x => x.n === name);
      if (!q || !q.done || state.claimed.indexOf(name) >= 0) return;
      state.claimed.push(name);
      gears += Math.round(q.xp * R.gearsPerXp);
      if (q.hq) plans += 1;
      n++;
    });
    if (!n) return { ok: false, error: 'Keine Kiste zum Öffnen.' };
    state.inv.gears = (state.inv.gears || 0) + gears;
    state.inv.plans = (state.inv.plans || 0) + plans;
    return { ok: true, msg: n + (n === 1 ? ' Kiste' : ' Kisten') + ' geöffnet: +' + gears + ' Zahnräder' + (plans ? ', +' + plans + (plans === 1 ? ' Bauplan' : ' Baupläne') : '') };
  }

  if (action === 'build') {
    const id = req.building, def = R.buildings[id];
    if (!def) return { ok: false, error: 'Unbekanntes Gebäude.' };
    if (state.b[id]) return { ok: false, error: def.name + ' steht schon.' };
    if (!ctx.areas[def.area]) return { ok: false, error: 'Dieser Bereich ist noch verschlossen.' };
    if (def.boss && !ctx.bossDefeated) return { ok: false, error: 'Der Kraft-Golem versperrt noch den Weg (1. Arbeitsprobe).' };
    if (def.req && !state.b[def.req]) return { ok: false, error: 'Zuerst brauchst du: ' + R.buildings[def.req].name + '.' };
    if (def.minLevel && ctx.profile.level < def.minLevel) return { ok: false, error: 'Dafür brauchst du Level ' + def.minLevel + '.' };
    if (!canAfford_(state.inv, def.cost)) return { ok: false, error: 'Dafür reichen deine Ressourcen noch nicht.' };
    pay_(state.inv, def.cost);
    state.b[id] = { lvl: 1, last: now, built: now };
    return { ok: true, msg: def.name + ' ist fertig!' };
  }

  if (action === 'upgrade') {
    const id = req.building, def = R.buildings[id], bs = state.b[id];
    if (!def || !bs) return { ok: false, error: 'Gebäude nicht gefunden.' };
    if (bs.lvl >= (def.maxLevel || 1)) return { ok: false, error: 'Höchste Stufe erreicht.' };
    if (!state.b[R.upgradeNeeds]) return { ok: false, error: 'Für Ausbauten brauchst du zuerst den Zeichensaal.' };
    const cost = upgradeCost_(def, bs.lvl);
    if (!canAfford_(state.inv, cost)) return { ok: false, error: 'Dafür reichen deine Zahnräder noch nicht.' };
    if (def.produces) aktion_('collect', { building: id }, state, ctx, now); // vorher abholen
    pay_(state.inv, cost);
    bs.lvl += 1;
    return { ok: true, msg: def.name + ' ist jetzt Stufe ' + bs.lvl + '.' };
  }

  if (action === 'collect') {
    const ids = req.building === '*' ? Object.keys(state.b) : [req.building];
    const cap = goodsCap_(state);
    let total = 0;
    ids.forEach(id => {
      const def = R.buildings[id], bs = state.b[id];
      if (!def || !bs || !def.produces) return;
      const p = def.produces;
      let units = Math.floor(pending_(id, bs, now));
      Object.keys(p.uses || {}).forEach(k => { units = Math.min(units, Math.floor((state.inv[k] || 0) / p.uses[k])); });
      units = Math.max(0, Math.min(units, cap - (state.inv[p.out] || 0)));
      Object.keys(p.uses || {}).forEach(k => { state.inv[k] -= units * p.uses[k]; });
      state.inv[p.out] = (state.inv[p.out] || 0) + units;
      // Reststunden bleiben erhalten, wenn nur der Lagerplatz/Rohstoff fehlte? Einfach: Zeit zurücksetzen.
      bs.last = now;
      total += units;
    });
    return { ok: true, msg: total ? total + ' Einheiten abgeholt.' : 'Noch nichts fertig (oder Rohstoffe/Lager fehlen).' };
  }

  if (action === 'deco') {
    const d = R.deco[req.item];
    const x = Math.floor(req.x), y = Math.floor(req.y);
    if (!d || !(x >= 0 && y >= 0 && x < 200 && y < 200)) return { ok: false, error: 'Ungültige Deko.' };
    if (state.deco.length >= R.maxDeco) return { ok: false, error: 'Maximal ' + R.maxDeco + ' Deko-Objekte.' };
    if (state.deco.some(o => o.x === x && o.y === y)) return { ok: false, error: 'Dort steht schon etwas.' };
    if (!canAfford_(state.inv, { gears: d.gears })) return { ok: false, error: 'Zu wenig Zahnräder.' };
    pay_(state.inv, { gears: d.gears });
    state.deco.push({ t: req.item, x: x, y: y });
    return { ok: true, msg: d.name + ' aufgestellt.' };
  }

  if (action === 'avatar') {
    const i = Math.floor(req.avatar);
    if (!(i >= 0 && i <= 3)) return { ok: false, error: 'Ungültige Figur.' };
    state.avatar = i;
    return { ok: true, msg: 'Figur gewählt.' };
  }

  if (action === 'decoRemove') {
    const i = state.deco.findIndex(o => o.x === Math.floor(req.x) && o.y === Math.floor(req.y));
    if (i < 0) return { ok: false, error: 'Dort steht nichts.' };
    const d = R.deco[state.deco[i].t];
    state.deco.splice(i, 1);
    state.inv.gears += Math.floor((d ? d.gears : 0) / 2); // halbe Erstattung
    return { ok: true, msg: 'Abgebaut (halbe Zahnräder zurück).' };
  }

  return { ok: false, error: 'Unbekannte Aktion.' };
}

// ===================== FÜR DIE LEHRKRAFT =====================
/** Einmal ausführen (und nach neuen Schülern erneut): legt Zugänge mit PINs an und baut die Zettel. Bestehende PINs bleiben unverändert. */
function zugaengeAnlegen() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Zugang');
  if (!sh) {
    sh = ss.insertSheet('Zugang');
    sh.getRange(1, 1, 1, 6).setValues([['Gamertag', 'Login (normalisiert)', 'Klasse', 'Name', 'PIN', 'Aktiv']]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  const vorhanden = zugangsliste_();
  const tags = {}, pins = {};
  vorhanden.forEach(r => { tags[r.tag] = true; pins[r.pin] = true; });

  const xpVals = SpreadsheetApp.openById(XP_RECHNER_ID).getSheetByName(BLATT_XP).getDataRange().getDisplayValues();
  const neu = [];
  for (let r = 2; r < xpVals.length; r++) {
    const row = xpVals[r];
    const tag = String(row[4] || '').trim(), klasse = String(row[2] || '').trim(), name = String(row[3] || '').trim();
    if (!tag || !klasse || tags[tag]) continue;
    let pin;
    do { pin = String(1000 + Math.floor(Math.random() * 9000)); } while (pins[pin]);
    pins[pin] = true; tags[tag] = true;
    neu.push([tag, normTag_(tag), klasse, name, pin, true]);
  }
  if (neu.length) {
    sh.getRange(sh.getLastRow() + 1, 1, neu.length, 6).setValues(neu);
    sh.getRange(2, 5, sh.getLastRow() - 1, 1).setNumberFormat('@');
  }
  standBlatt_();
  zettelErstellen();
  SpreadsheetApp.getActive().toast(neu.length + ' neue Zugänge angelegt. Zettel aktualisiert.', 'Alte Fabrik', 8);
}

/** Baut das Blatt "Zettel" zum Ausdrucken und Ausschneiden (3 Zettel pro Reihe). */
function zettelErstellen() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Zettel');
  if (sh) sh.clear(); else sh = ss.insertSheet('Zettel');
  const list = zugangsliste_().filter(r => r.aktiv).sort((a, b) => (a.klasse + a.name).localeCompare(b.klasse + b.name, 'de'));
  const PER_ROW = 3, H = 6;
  sh.setColumnWidths(1, 5, 20);
  [1, 3, 5].forEach(c => sh.setColumnWidth(c, 230));
  [2, 4].forEach(c => sh.setColumnWidth(c, 18));
  list.forEach((s, i) => {
    const col = 1 + (i % PER_ROW) * 2;
    const row = 1 + Math.floor(i / PER_ROW) * H;
    const vals = [['Die Alte Fabrik'], ['für ' + s.name + ' (' + s.klasse + ')'], ['Gamertag:  ' + s.tag], ['PIN:  ' + s.pin], [SPIEL_URL]];
    const rng = sh.getRange(row, col, 5, 1);
    rng.setValues(vals).setBorder(true, true, true, true, false, false, '#444444', SpreadsheetApp.BorderStyle.DASHED)
       .setFontFamily('Arial').setVerticalAlignment('middle').setHorizontalAlignment('left');
    sh.getRange(row, col).setFontWeight('bold').setFontSize(12);
    sh.getRange(row + 2, col, 2, 1).setFontSize(13).setFontWeight('bold').setFontFamily('Courier New');
    sh.getRange(row + 4, col).setFontSize(7).setFontColor('#555555');
  });
  const rows = Math.ceil(list.length / PER_ROW) * H;
  if (rows) sh.setRowHeights(1, rows, 24);
}

/** Zum Testen im Editor: zeigt, was das Script aus dem XP-Rechner liest. */
function testLesen() {
  CacheService.getScriptCache().remove('snap');
  const s = snapshot_();
  console.log('Quests: ' + s.quests.length);
  console.log(s.quests.map(q => q.ms + (q.hq ? ' HQ ' : ' NQ ') + q.xp + ' ' + q.n).join('\n'));
  console.log('Spieler mit Questdaten: ' + Object.keys(s.done).length);
  console.log('Beispiel: ' + JSON.stringify(Object.entries(s.done).slice(0, 3)));
}

/** Menü in der Tabelle */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Alte Fabrik')
    .addItem('Zugänge anlegen / aktualisieren', 'zugaengeAnlegen')
    .addItem('Zettel neu erstellen', 'zettelErstellen')
    .addItem('Test: XP-Rechner lesen', 'testLesen')
    .addToUi();
}
