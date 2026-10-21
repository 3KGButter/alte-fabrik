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
const SPIEL_URL = 'https://3kgbutter.github.io/alte-fabrik/';
const CACHE_SEKUNDEN = 300;      // so lange werden XP-Rechner-Daten zwischengespeichert
const MAX_FEHLVERSUCHE = 5;      // danach Sperre
const SPERRE_SEKUNDEN = 15 * 60;

// ===================== SPIELREGELN =====================
// Wird auch an das Spiel geschickt, damit Anzeige und Prüfung identisch sind.
// Zahlen siehe Konzept "Die Alte Fabrik – Spielkonzept".
const REGELN = {
  version: 2,
  gearsPerXp: 0.1,                  // 1 Zahnrad je 10 XP
  bufferHours: 72,                  // Ausgabelager einer Maschine ist nach 72 h voll
  storeCaps: [200, 1000, 2500, 5000], // Teilelager: Stufe 0 (nicht repariert) bis Stufe 3
  maxPlaced: 80,
  areas: [
    { id: 'ms1', ms: 'MS1', name: 'Eingangsbereich' },
    { id: 'ms2', ms: 'MS2', name: 'Blechwerkstatt' },
    { id: 'ms3', ms: 'MS3', name: 'Maschinenhalle' },
    { id: 'ms4', ms: 'MS4', name: 'Prüflabor' },
    { id: 'ms5', ms: 'MS5', name: 'Kraftwerk' }
  ],
  parts: {
    blech:     { name: 'Blechteile' },
    fraes:     { name: 'Frästeile' },
    dreh:      { name: 'Drehteile' },
    gewinde:   { name: 'Gewindeteile' },
    baugruppe: { name: 'Baugruppen' }
  },
  // Gebäude = die fünf Orte. Kosten: 1 Bauplan + Zahnräder.
  buildings: {
    pfoertner:      { name: 'Pförtnerhaus',   area: 'ms1', gears: 5,   sw: 'Pfoertnerhaus',  desc: 'Hier hängen das Schwarze Brett und das Auftragsbrett.' },
    blechwerkstatt: { name: 'Blechwerkstatt', area: 'ms2', gears: 30,  sw: 'Blechwerkstatt', desc: 'Hier entstehen Blechteile.' },
    maschinenhalle: { name: 'Maschinenhalle', area: 'ms3', gears: 80,  sw: 'Maschinenhalle', desc: 'Fräsen und Drehen: hier entstehen Fräs- und Drehteile.' },
    prueflabor:     { name: 'Prüflabor',      area: 'ms4', gears: 100, sw: 'Prueflabor',     optional: true, desc: 'Freiwillig: Gewindeteile und Baugruppen für die besonderen Extras.' },
    kraftwerk:      { name: 'Kraftwerk',      area: 'ms5', gears: 150, sw: 'Kraftwerk',      powerAll: true, desc: 'Mit dem Kraftwerk laufen alle Maschinen gleichzeitig.' }
  },
  // Arbeitsbereiche in den Gebäuden. gears = Reparatur (Stufe 1), up = Ausbau auf Stufe 2 und 3.
  stations: {
    notstrom: { name: 'Notstromaggregat',    building: 'pfoertner',      gears: 8,   up: [30, 80],   slots: [1, 2, 3], sw: 'Notstrom',
                desc: 'Liefert Strom: Stufe 1 versorgt eine Maschine, Stufe 2 zwei, Stufe 3 drei.' },
    abkant:   { name: 'Abkantbank',          building: 'blechwerkstatt', gears: 40,  up: [40, 100],  out: 'blech', rate: [1, 2, 4], sw: 'Abkantbank' },
    lager:    { name: 'Teilelager',          building: 'blechwerkstatt', gears: 20,  up: [30, 60],   sw: 'Lager',
                desc: 'Vorrat für alle Werkstücke: 200 Teile ohne Reparatur, dann 1.000 / 2.500 / 5.000.' },
    fraese:   { name: 'Fräsmaschine',        building: 'maschinenhalle', gears: 100, up: [60, 150],  out: 'fraes', rate: [0.5, 1, 2], sw: 'Fraese' },
    dreh:     { name: 'Drehmaschine',        building: 'maschinenhalle', gears: 100, up: [60, 150],  out: 'dreh',  rate: [0.5, 1, 2], sw: 'Drehmaschine' },
    gewinde:  { name: 'Gewindeschneidplatz', building: 'prueflabor',     gears: 150, up: [80, 180],  out: 'gewinde', rate: [0.5, 1, 2], sw: 'Gewinde' },
    montage:  { name: 'Montageplatz',        building: 'prueflabor',     gears: 200, up: [100, 200], out: 'baugruppe', rate: [0.25, 0.5, 1], sw: 'Montage',
                uses: { blech: 1, fraes: 1, dreh: 1, gewinde: 1 } }
  },
  // Kosmetik-Katalog. kind: place = beliebig oft kaufen und aufstellen, fixed = einmalig, erscheint an festem Ort, companion = Begleiter
  catalog: {
    blumen:     { name: 'Blumenkübel',                    price: { blech: 30 },  area: 'ms2', kind: 'place' },
    laterne:    { name: 'Laterne',                        price: { blech: 60 },  area: 'ms2', kind: 'place' },
    schild:     { name: 'Firmenschild',                   price: { blech: 100 }, area: 'ms2', kind: 'place' },
    turm:       { name: 'Aussichtsturm',                  price: { blech: 150 }, area: 'ms2', kind: 'fixed', sw: 'Turm' },
    fass:       { name: 'Fässer und Kisten',              price: { blech: 150 }, area: 'ms2', kind: 'place' },
    bank:       { name: 'Bank mit Baum',                  price: { blech: 200 }, area: 'ms2', kind: 'place' },
    regal:      { name: 'Lagerregal',                     price: { blech: 300, fraes: 50 }, area: 'ms3', kind: 'place' },
    brunnen:    { name: 'Springbrunnen',                  price: { blech: 500, dreh: 100 }, area: 'ms3', kind: 'place' },
    stapler:    { name: 'Fahrender Gabelstapler',         price: { blech: 800, fraes: 150, dreh: 150 }, area: 'ms3', kind: 'fixed', sw: 'Gabelstapler' },
    katze:      { name: 'Katzenroboter',                  price: { blech: 1000, gewinde: 200, baugruppe: 50 }, area: 'ms4', kind: 'companion', sw: 'Katzenroboter' },
    kran:       { name: 'Kran',                           price: { blech: 1500, fraes: 300, dreh: 300, baugruppe: 100 }, area: 'ms4', kind: 'fixed', sw: 'Kran' },
    statue:     { name: 'Goldene Zahnrad-Statue',         price: { blech: 1500, fraes: 500, dreh: 500, gewinde: 300, baugruppe: 200 }, area: 'ms4', kind: 'fixed', sw: 'Statue' }
  },
  orders: { perWeek: 3, stampsForTitle: 25, title: 'Meisterbetrieb' },
  // Plaketten am Schwarzen Brett (aus dem Quest-Status berechnet)
  badges: [
    { id: 'b1', name: 'Grundlagenerforschung',       color: 'bronze', hq: ['MS1'] },
    { id: 'b2', name: 'Achtung der kommt flach!',    color: 'silber', hq: ['MS2'] },
    { id: 'b3', name: 'Drei mal das gleiche Teil?',  color: 'silber', hq: ['MS3'] },
    { id: 'b4', name: 'Ein fleißiges Bienchen!',     color: 'gold',   all: ['MS1', 'MS2', 'MS3'] },
    { id: 'b5', name: 'Du bist ein Überflieger!',    color: 'gold',   all: ['MS1', 'MS2', 'MS3', 'MS4'] },
    { id: 'b6', name: 'Bossgegner Papierkonstrukt',  color: 'gold',   quest: '1\\.\\s*Arbeitsprobe' },
    { id: 'b7', name: 'Bossgegner Katapult',         color: 'gold',   quest: '2\\.\\s*Arbeitsprobe' }
  ]
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
    if (action === 'login') { const ctx0 = kontext_(who.user); return json_(antwort_(who.user, migriere_(ladeStand_(who.user.tag), ctx0), ctx0)); }

    // Schreibende Aktionen: nacheinander abarbeiten
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const ctx = kontext_(who.user);
      const state = migriere_(ladeStand_(who.user.tag), ctx);
      const res = aktion_(action, req, state, ctx, Date.now());
      if (!res.ok) return json_(Object.assign(antwort_(who.user, migriere_(ladeStand_(who.user.tag), ctx), ctx), { ok: false, error: res.error }));
      speichereStand_(who.user.tag, state);
      const out = antwort_(who.user, state, ctx);
      out.msg = res.msg || '';
      if (res.got) out.got = res.got;
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

// Fortschritt eines Spielers (aus Snapshot) + freigeschaltete Bereiche + Plaketten
function kontext_(user) {
  const snap = snapshot_();
  let bits, prof;
  if (user.demo) {
    // Demo: MS1 + MS2 komplett, MS3 halb, Arbeitsprobe bestanden
    bits = snap.quests.map((q, i) => (q.ms === 'MS1' || q.ms === 'MS2' || q.ms === 'MS5' || (q.ms === 'MS3' && i % 2 === 0)) ? '1' : '0').join('');
    prof = { xp: 3000, level: 8, stufe: 'Demo', klasse: 'Demo' };
  } else {
    bits = snap.done[user.tag] || '';
    prof = snap.profile[user.tag] || { xp: 0, level: 0, stufe: '', klasse: user.klasse };
  }
  const quests = snap.quests.map((q, i) => Object.assign({}, q, { done: bits.charAt(i) === '1' }));
  return kontextAusQuests_(quests, prof, snap.stand);
}

function kontextAusQuests_(quests, prof, stand) {
  const allHq = ms => { const l = quests.filter(q => q.ms === ms && q.hq); return l.length > 0 && l.every(q => q.done); };
  const all = ms => { const l = quests.filter(q => q.ms === ms); return l.length > 0 && l.every(q => q.done); };
  const boss = quests.filter(q => q.ms === 'MS5');
  const bossDefeated = boss.length > 0 && boss.every(q => q.done);
  const areas = { ms1: true, ms2: allHq('MS1') };
  areas.ms3 = areas.ms2 && allHq('MS2');
  areas.ms4 = areas.ms3 && allHq('MS3');
  areas.ms5 = bossDefeated;                       // MS5 öffnet mit der 1. Arbeitsprobe
  // Nummer innerhalb des Meilensteins (für die Notiz <quest:MS2-4>)
  const cnt = {};
  quests.forEach(q => { cnt[q.ms] = (cnt[q.ms] || 0) + 1; q.key = q.ms + '-' + cnt[q.ms]; });
  const badges = REGELN.badges.map(b => {
    let ok = false;
    if (b.hq) ok = b.hq.every(allHq);
    else if (b.all) ok = b.all.every(all);
    else if (b.quest) { const re = new RegExp(b.quest, 'i'); const l = quests.filter(q => re.test(q.n)); ok = l.length > 0 && l.every(q => q.done); }
    return { id: b.id, ok: ok };
  });
  return { quests: quests, profile: prof, areas: areas, bossDefeated: bossDefeated, stand: stand, badges: badges };
}

// ===================== SPIELSTÄNDE =====================
function neuerStand_() {
  return { v: 2, gears: 0, claimed: [], b: {}, st: {}, store: {}, items: {}, placed: [], owned: {}, orders: { w: 0, done: [] }, stamps: 0, created: Date.now() };
}

// Alte Spielstände (Version 1) auf das neue System umstellen: Kisten bleiben geöffnet, alle Zahnräder kommen zurück.
function migriere_(state, ctx) {
  if (state && state.v === 2) return state;
  const neu = neuerStand_();
  if (!state) return neu;
  neu.claimed = (state.claimed || []).slice();
  if (state.avatar !== undefined) neu.avatar = state.avatar;
  if (state.created) neu.created = state.created;
  neu.gears = neu.claimed.reduce((s, n) => { const q = ctx.quests.find(x => x.n === n); return s + (q ? Math.round(q.xp * REGELN.gearsPerXp) : 0); }, 0);
  return neu;
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
  if (!f) return null;
  try { return JSON.parse(sh.getRange(f.getRow(), 2).getValue()); } catch (e) { return null; }
}

function speichereStand_(tag, state) {
  const sh = standBlatt_();
  const f = sh.getRange('A:A').createTextFinder(tag).matchEntireCell(true).matchCase(true).findNext();
  const row = f ? f.getRow() : sh.getLastRow() + 1;
  sh.getRange(row, 1, 1, 3).setValues([[tag, JSON.stringify(state), new Date()]]);
}

// ===================== SPIELLOGIK =====================
// Alle Funktionen hier laufen identisch im Browser (Vorschau-Modus und Anzeige).

function antwort_(user, state, ctx) {
  const claimed = {};
  (state.claimed || []).forEach(n => claimed[n] = true);
  return {
    ok: true,
    now: Date.now(),
    user: { tag: user.tag, klasse: ctx.profile.klasse || user.klasse, xp: ctx.profile.xp, level: ctx.profile.level, stufe: ctx.profile.stufe },
    quests: ctx.quests.map(q => ({ n: q.n, ms: q.ms, key: q.key, hq: q.hq, xp: q.xp, done: q.done, claimed: !!claimed[q.n] })),
    areas: ctx.areas,
    bossDefeated: ctx.bossDefeated,
    badges: ctx.badges,
    stand: ctx.stand,
    state: state,
    rules: REGELN
  };
}

const PART_KEYS_ = ['blech', 'fraes', 'dreh', 'gewinde', 'baugruppe'];

function plaene_(state, ctx) {
  const earned = ['ms1', 'ms2', 'ms3', 'ms4', 'ms5'].filter(a => ctx.areas[a]).length;
  return earned - Object.keys(state.b || {}).length;
}
function storeCap_(state) {
  const l = state.st.lager ? state.st.lager.lvl : 0;
  return REGELN.storeCaps[l];
}
function storeTotal_(state) {
  return PART_KEYS_.reduce((s, k) => s + (state.store[k] || 0), 0);
}
function slots_(state) {
  if (state.b.kraftwerk) return 99;
  const n = state.st.notstrom;
  return n ? REGELN.stations.notstrom.slots[n.lvl - 1] : 0;
}
function onCount_(state) {
  return Object.keys(state.st).filter(id => REGELN.stations[id] && REGELN.stations[id].out && state.st[id].on).length;
}
function rate_(id, ss) {
  return REGELN.stations[id].rate[ss.lvl - 1];
}
// Ausgabelager einer Maschine zum Zeitpunkt now (ohne zu speichern)
function puffer_(id, ss, now) {
  const def = REGELN.stations[id];
  if (!def || !def.out || !ss) return 0;
  const r = rate_(id, ss), cap = r * REGELN.bufferHours;
  let b = ss.buf || 0;
  if (ss.on) b += r * Math.max(0, (now - ss.last) / 3600000);
  return Math.min(b, Math.max(cap, ss.buf || 0));
}
// Produktion bis jetzt festschreiben (vor jeder Änderung an Maschinen)
function abrechnen_(state, now) {
  Object.keys(state.st).forEach(id => {
    const ss = state.st[id];
    if (!REGELN.stations[id] || !REGELN.stations[id].out) return;
    ss.buf = puffer_(id, ss, now);
    ss.last = now;
  });
}
function hatTeile_(store, price) {
  return Object.keys(price).every(k => (store[k] || 0) >= price[k]);
}
function zahleTeile_(store, price) {
  Object.keys(price).forEach(k => store[k] = (store[k] || 0) - price[k]);
}
function kannAbholen_(id, state, now) {
  const def = REGELN.stations[id], ss = state.st[id];
  if (!def || !def.out || !ss) return 0;
  let n = Math.floor(puffer_(id, ss, now) + 1e-9);
  if (def.uses) Object.keys(def.uses).forEach(k => { n = Math.min(n, Math.floor((state.store[k] || 0) / def.uses[k])); }); // verbraucht mehr Teile, als entstehen
  else n = Math.min(n, storeCap_(state) - storeTotal_(state));
  return Math.max(0, n);
}

// Aufträge der Woche: für alle gleich, aus der Kalenderwoche berechnet
function wocheNr_(now) { return Math.floor((now / 86400000 + 3) / 7); } // Wochen beginnen montags (UTC)
function auftraege_(now) {
  const w = wocheNr_(now);
  let s = (w * 2654435761) >>> 0;
  const rnd = (a, b, step) => { s = (s * 1664525 + 1013904223) >>> 0; return a + step * Math.floor((s / 4294967296) * ((b - a) / step + 1)); };
  const klein = { size: 'klein', parts: { blech: rnd(30, 60, 10) } };
  const mittel = { size: 'mittel', parts: { blech: rnd(60, 120, 20) } };
  mittel.parts[rnd(0, 1, 1) ? 'dreh' : 'fraes'] = rnd(20, 40, 10);
  const gross = { size: 'groß', parts: { blech: rnd(100, 200, 20), fraes: rnd(40, 80, 10), dreh: rnd(40, 80, 10) } };
  if (rnd(0, 1, 1)) gross.parts.gewinde = rnd(20, 40, 10); else gross.parts.baugruppe = rnd(5, 10, 1);
  return { w: w, list: [klein, mittel, gross] };
}

function aktion_(action, req, state, ctx, now) {
  const R = REGELN;
  ['b', 'st', 'store', 'items', 'owned'].forEach(k => { state[k] = state[k] || {}; });
  state.placed = state.placed || [];
  state.claimed = state.claimed || [];
  state.gears = state.gears || 0;

  if (action === 'claim') {
    const names = Array.isArray(req.quests) ? req.quests : [req.quest];
    let gears = 0, n = 0;
    names.forEach(name => {
      const q = ctx.quests.find(x => x.n === name);
      if (!q || !q.done || state.claimed.indexOf(name) >= 0) return;
      state.claimed.push(name);
      gears += Math.round(q.xp * R.gearsPerXp);
      n++;
    });
    if (!n) return { ok: false, error: 'Keine Kiste zum Öffnen.' };
    state.gears += gears;
    return { ok: true, msg: n + (n === 1 ? ' Kiste' : ' Kisten') + ' geöffnet: +' + gears + ' Zahnräder' };
  }

  if (action === 'build') {
    const id = req.building, def = R.buildings[id];
    if (!def) return { ok: false, error: 'Unbekanntes Gebäude.' };
    if (state.b[id]) return { ok: false, error: def.name + ' ist schon repariert.' };
    if (!ctx.areas[def.area]) return { ok: false, error: id === 'kraftwerk' ? 'Der Kraft-Golem versperrt noch den Weg (1. Arbeitsprobe).' : 'Dieser Bereich ist noch verschlossen.' };
    if (plaene_(state, ctx) < 1) return { ok: false, error: 'Dir fehlt ein Bauplan.' };
    if (state.gears < def.gears) return { ok: false, error: 'Dafür brauchst du ' + def.gears + ' Zahnräder.' };
    state.gears -= def.gears;
    state.b[id] = now;
    if (def.powerAll) { abrechnen_(state, now); Object.keys(state.st).forEach(s => { if (R.stations[s].out) state.st[s].on = true; }); }
    return { ok: true, msg: def.name + ' ist repariert!' };
  }

  if (action === 'repair') {
    const id = req.station, def = R.stations[id];
    if (!def) return { ok: false, error: 'Unbekannter Arbeitsbereich.' };
    if (state.st[id]) return { ok: false, error: def.name + ' ist schon repariert.' };
    if (!state.b[def.building]) return { ok: false, error: 'Repariere zuerst: ' + R.buildings[def.building].name + '.' };
    if (state.gears < def.gears) return { ok: false, error: 'Dafür brauchst du ' + def.gears + ' Zahnräder.' };
    state.gears -= def.gears;
    abrechnen_(state, now);
    const ss = { lvl: 1 };
    if (def.out) { ss.buf = 0; ss.last = now; ss.on = onCount_(state) < slots_(state); }
    state.st[id] = ss;
    let msg = def.name + ' ist repariert!';
    if (def.out && !ss.on) msg += ' Für mehr Strom: Notstromaggregat ausbauen oder Kraftwerk reparieren.';
    return { ok: true, msg: msg };
  }

  if (action === 'upgrade') {
    const id = req.station, def = R.stations[id], ss = state.st[id];
    if (!def || !ss) return { ok: false, error: 'Arbeitsbereich nicht gefunden.' };
    if (ss.lvl >= 3) return { ok: false, error: 'Höchste Stufe erreicht.' };
    const cost = def.up[ss.lvl - 1];
    if (state.gears < cost) return { ok: false, error: 'Dafür brauchst du ' + cost + ' Zahnräder.' };
    abrechnen_(state, now);
    state.gears -= cost;
    ss.lvl += 1;
    return { ok: true, msg: def.name + ' ist jetzt Stufe ' + ss.lvl + '.' };
  }

  if (action === 'power') {
    const id = req.station, def = R.stations[id], ss = state.st[id];
    if (!def || !def.out || !ss) return { ok: false, error: 'Maschine nicht gefunden.' };
    const on = !!req.on;
    if (on === !!ss.on) return { ok: true, msg: '' };
    abrechnen_(state, now);
    if (on && onCount_(state) >= slots_(state)) return { ok: false, error: 'Kein Stromanschluss frei. Schalte zuerst eine andere Maschine ab.' };
    ss.on = on;
    return { ok: true, msg: def.name + (on ? ' läuft.' : ' ist abgeschaltet.') };
  }

  if (action === 'collect') {
    abrechnen_(state, now);
    const order = ['abkant', 'fraese', 'dreh', 'gewinde', 'montage'];
    const ids = req.station && req.station !== '*' ? [req.station] : order.filter(id => state.st[id]);
    const got = {};
    ids.forEach(id => {
      const def = R.stations[id], ss = state.st[id];
      if (!def || !def.out || !ss) return;
      const n = kannAbholen_(id, state, now);
      if (n <= 0) return;
      if (def.uses) zahleTeile_(state.store, Object.keys(def.uses).reduce((o, k) => { o[k] = def.uses[k] * n; return o; }, {}));
      state.store[def.out] = (state.store[def.out] || 0) + n;
      ss.buf -= n;
      got[def.out] = (got[def.out] || 0) + n;
    });
    const keys = Object.keys(got);
    if (!keys.length) {
      const full = storeTotal_(state) >= storeCap_(state);
      return { ok: false, error: full ? 'Das Teilelager ist voll. Gib Teile aus oder baue das Teilelager aus.' : 'Noch nichts fertig zum Abholen.' };
    }
    return { ok: true, got: got, msg: 'Abgeholt: ' + keys.map(k => got[k] + ' ' + R.parts[k].name).join(', ') };
  }

  if (action === 'order') {
    const cur = auftraege_(now), i = Math.floor(req.i);
    if (!state.orders || state.orders.w !== cur.w) state.orders = { w: cur.w, done: [] };
    const o = cur.list[i];
    if (!o) return { ok: false, error: 'Unbekannter Auftrag.' };
    if (state.orders.done.indexOf(i) >= 0) return { ok: false, error: 'Diesen Auftrag hast du schon erfüllt.' };
    if (!hatTeile_(state.store, o.parts)) return { ok: false, error: 'Dafür fehlen dir noch Teile.' };
    zahleTeile_(state.store, o.parts);
    state.orders.done.push(i);
    state.stamps = (state.stamps || 0) + 1;
    const t = state.stamps === R.orders.stampsForTitle ? ' Du bist jetzt ' + R.orders.title + '!' : '';
    return { ok: true, msg: 'Auftrag erfüllt: +1 Stempel (' + state.stamps + ').' + t };
  }

  if (action === 'buy') {
    const id = req.item, d = R.catalog[id];
    if (!d) return { ok: false, error: 'Unbekannter Gegenstand.' };
    if (!ctx.areas[d.area]) return { ok: false, error: 'Das gibt es erst ab ' + R.areas.find(a => a.id === d.area).ms + '.' };
    if (d.kind !== 'place' && state.owned[id]) return { ok: false, error: 'Das hast du schon.' };
    if (!hatTeile_(state.store, d.price)) return { ok: false, error: 'Dafür fehlen dir noch Teile.' };
    zahleTeile_(state.store, d.price);
    if (d.kind === 'place') state.items[id] = (state.items[id] || 0) + 1;
    else state.owned[id] = true;
    return { ok: true, msg: d.name + (d.kind === 'place' ? ' gekauft. Stell es unter „Katalog“ auf.' : ' gehört jetzt dir!') };
  }

  if (action === 'place') {
    const id = req.item, d = R.catalog[id];
    const m = Math.floor(req.m), x = Math.floor(req.x), y = Math.floor(req.y);
    if (!d || d.kind !== 'place') return { ok: false, error: 'Das kann man nicht aufstellen.' };
    if (!((state.items[id] || 0) > 0)) return { ok: false, error: 'Davon hast du keins mehr übrig.' };
    if (!(m > 0 && x >= 0 && y >= 0 && x < 256 && y < 256)) return { ok: false, error: 'Ungültiger Platz.' };
    if (state.placed.length >= R.maxPlaced) return { ok: false, error: 'Maximal ' + R.maxPlaced + ' Gegenstände.' };
    if (state.placed.some(o => o.m === m && o.x === x && o.y === y)) return { ok: false, error: 'Dort steht schon etwas.' };
    state.items[id] -= 1;
    state.placed.push({ t: id, m: m, x: x, y: y });
    return { ok: true, msg: d.name + ' aufgestellt.' };
  }

  if (action === 'unplace') {
    const m = Math.floor(req.m), x = Math.floor(req.x), y = Math.floor(req.y);
    const i = state.placed.findIndex(o => o.m === m && o.x === x && o.y === y);
    if (i < 0) return { ok: false, error: 'Dort steht nichts.' };
    const t = state.placed[i].t;
    state.placed.splice(i, 1);
    state.items[t] = (state.items[t] || 0) + 1;
    return { ok: true, msg: 'Weggeräumt. Du kannst es woanders wieder aufstellen.' };
  }

  if (action === 'avatar') {
    const i = Math.floor(req.avatar);
    if (!(i >= 0 && i <= 3)) return { ok: false, error: 'Ungültige Figur.' };
    state.avatar = i;
    return { ok: true, msg: 'Figur gewählt.' };
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
