/**
 * DIE ALTE FABRIK – Schnittstelle (Google Apps Script)
 * ----------------------------------------------------
 * Dieses Script gehört zur Tabelle "Alte Fabrik – Spieldaten".
 * Es LIEST den XP-Rechner nur (keine Schreiboperation dort im Spielbetrieb)
 * und speichert Zugänge + Spielstände ausschließlich in der eigenen Tabelle.
 * Ausnahme: die einmalige Datenschutz-Umstellung (datenschutzUmstellen, ganz unten), mit der Lehrkraft abgesprochen.
 * Datenschutz: In Google stehen nur Gamertags und Klassen. Die Klarnamen bleiben in der OneDrive-Datei
 * „Mebis Umwandler.xlsx“, die den Mebis-Export vor dem Einfügen in Gamertags umwandelt.
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
  bufferHours: 120,                 // Ausgabelager einer Maschine ist nach 5 Tagen voll: wer ab und zu reinschaut, bekommt mehr
  storeCaps: [100, 400, 1000, 2500], // Teilelager: Platz JE Werkstück-Sorte (eigenes Regal), Stufe 0 (nicht repariert) bis Stufe 3.
                                     // So blockieren übrige Fräs- oder Gewindeteile nie das Blech. Kran und Statue (600 Blech) brauchen mindestens Stufe 2.
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
    kraftwerk:      { name: 'Kraftwerk',      area: 'ms5', gears: 120, sw: 'Kraftwerk',      powerAll: true, desc: 'Mit dem Kraftwerk laufen alle Maschinen gleichzeitig.' }
  },
  // Arbeitsbereiche in den Gebäuden. gears = Reparatur (Stufe 1), up = Ausbau auf Stufe 2 und 3.
  stations: {
    notstrom: { name: 'Notstromaggregat',    building: 'pfoertner',      gears: 8,   up: [25, 50],   slots: [1, 2, 3], sw: 'Notstrom',
                desc: 'Liefert Strom: Stufe 1 versorgt eine Maschine, Stufe 2 zwei, Stufe 3 drei.' },
    abkant:   { name: 'Abkantbank',          building: 'blechwerkstatt', gears: 40,  up: [40, 90],   out: 'blech', rate: [1, 2, 4], sw: 'Abkantbank' },
    lager:    { name: 'Teilelager',          building: 'blechwerkstatt', gears: 20,  up: [70, 180],   sw: 'Lager',
                desc: 'Ein Regal je Werkstück-Sorte: 100 Teile pro Sorte ohne Reparatur, dann 400 / 1.000 / 2.500.' },
    fraese:   { name: 'Fräsmaschine',        building: 'maschinenhalle', gears: 80,  up: [50, 120],  out: 'fraes', rate: [0.5, 1, 2], sw: 'Fraese' },
    dreh:     { name: 'Drehmaschine',        building: 'maschinenhalle', gears: 80,  up: [50, 120],  out: 'dreh',  rate: [0.5, 1, 2], sw: 'Drehmaschine' },
    gewinde:  { name: 'Gewindeschneidplatz', building: 'prueflabor',     gears: 90,  up: [50, 100],  out: 'gewinde', rate: [0.5, 1, 2], sw: 'Gewinde' },
    montage:  { name: 'Montageplatz',        building: 'prueflabor',     gears: 100, up: [60, 120], out: 'baugruppe', rate: [0.25, 0.5, 1], sw: 'Montage',
                uses: { blech: 1, fraes: 1, dreh: 1, gewinde: 1 } }
  },
  // Kosmetik-Katalog. kind: place = beliebig oft kaufen und aufstellen, fixed = einmalig, erscheint an festem Ort, companion = Begleiter
  // where (nur bei place): aussen = Werkshof, wand = in einer Halle an die Wand, boden = in einer Halle auf den Boden
  // Es gibt bewusst weniger Plätze als Gegenstände: man muss wählen.
  slots: { aussen: 10, wand: 3, boden: 3 },
  catalog: {
    // draußen
    blumen:     { name: 'Blumenkübel',              price: { blech: 25 },  area: 'ms2', kind: 'place', where: 'aussen' },
    laterne:    { name: 'Laterne',                  price: { blech: 50 },  area: 'ms2', kind: 'place', where: 'aussen' },
    schild:     { name: 'Firmenschild',             price: { blech: 80 }, area: 'ms2', kind: 'place', where: 'aussen' },
    vogelhaus:  { name: 'Vogelhaus',                price: { blech: 100 }, area: 'ms2', kind: 'place', where: 'aussen' },
    fass:       { name: 'Fässer und Kisten',        price: { blech: 120 }, area: 'ms2', kind: 'place', where: 'aussen' },
    bank:       { name: 'Parkbank',                 price: { blech: 150 }, area: 'ms2', kind: 'place', where: 'aussen' },
    kirschbaum: { name: 'Kirschbaum',               price: { blech: 200 }, area: 'ms2', kind: 'place', where: 'aussen' },
    fahne:      { name: 'Fahnenmast',               price: { blech: 50, dreh: 100 },  area: 'ms3', kind: 'place', where: 'aussen' },
    brunnen:    { name: 'Springbrunnen',            price: { blech: 80, fraes: 100, dreh: 150 },  area: 'ms3', kind: 'place', where: 'aussen' },
    lichter:    { name: 'Lichterbogen',             price: { blech: 50, gewinde: 100, baugruppe: 20 }, area: 'ms4', kind: 'place', where: 'aussen' },
    // drinnen an die Wand
    plakat:     { name: 'Sicherheitsplakat',        price: { blech: 50 },  area: 'ms2', kind: 'place', where: 'wand' },
    zeichnung:  { name: 'Technische Zeichnung',     price: { blech: 60 },  area: 'ms2', kind: 'place', where: 'wand' },
    ordner:     { name: 'Wandregal mit Ordnern',    price: { blech: 100 }, area: 'ms2', kind: 'place', where: 'wand' },
    werkzeugwand: { name: 'Werkzeugwand',           price: { blech: 120 }, area: 'ms2', kind: 'place', where: 'wand' },
    urkunde:    { name: 'Urkunde im Rahmen',        price: { fraes: 100 },  area: 'ms3', kind: 'place', where: 'wand' },
    banner:     { name: 'Firmenbanner',             price: { fraes: 60, dreh: 80 },   area: 'ms3', kind: 'place', where: 'wand' },
    leuchtschild: { name: 'Leuchtschild',           price: { blech: 100, gewinde: 80, baugruppe: 40 }, area: 'ms4', kind: 'place', where: 'wand' },
    // drinnen auf den Boden
    pflanze:    { name: 'Große Zimmerpflanze',      price: { blech: 80 }, area: 'ms2', kind: 'place', where: 'boden' },
    gitterbox:  { name: 'Gitterbox mit Werkstücken', price: { blech: 120 }, area: 'ms2', kind: 'place', where: 'boden' },
    werkzeugwagen: { name: 'Werkzeugwagen',         price: { blech: 60, dreh: 100 },   area: 'ms3', kind: 'place', where: 'boden' },
    werkbank:   { name: 'Werkbank mit Schraubstock', price: { blech: 60, fraes: 120 }, area: 'ms3', kind: 'place', where: 'boden' },
    kaffee:     { name: 'Kaffee-Ecke',              price: { dreh: 80, gewinde: 80 }, area: 'ms4', kind: 'place', where: 'boden', only: 2 },
    // feste Plätze und Begleiter
    turm:       { name: 'Aussichtsturm',            price: { blech: 150 }, area: 'ms2', kind: 'fixed', sw: 'Turm' },
    stapler:    { name: 'Fahrender Gabelstapler',   price: { blech: 200, fraes: 200, dreh: 200 }, area: 'ms3', kind: 'fixed', sw: 'Gabelstapler' },
    katze:      { name: 'Katzenroboter',            price: { fraes: 150, gewinde: 150, baugruppe: 60 }, area: 'ms4', kind: 'companion', sw: 'Katzenroboter' },
    kran:       { name: 'Kran',                     price: { blech: 300, dreh: 250, gewinde: 200, baugruppe: 80 }, area: 'ms4', kind: 'fixed', sw: 'Kran' },
    statue:     { name: 'Goldene Zahnrad-Statue',   price: { fraes: 400, dreh: 400, gewinde: 300, baugruppe: 150 }, area: 'ms4', kind: 'fixed', sw: 'Statue' }
  },
  orders: { perWeek: 3, stampsForTitle: 40, title: 'Meisterbetrieb', stamps: { klein: 1, mittel: 2, 'groß': 4 } },   // größere Aufträge geben mehr Stempel
  // Riesen-Mecha im Kraftwerk: 6 Bauabschnitte, bezahlt mit Werkstücken
  // (der letzte Abschnitt braucht ein paar Gewindeteile und Baugruppen aus dem Prüflabor; jeder Abschnitt passt in das Teilelager der Stufe 1)
  mecha: [
    { name: 'Beine und Becken',            cost: { blech: 120 } },
    { name: 'Rumpf mit Energiekern',       cost: { blech: 150 } },
    { name: 'Arme, Fäuste und Schläuche',  cost: { fraes: 180 } },
    { name: 'Schulterpanzer',              cost: { blech: 60, dreh: 180 } },
    { name: 'Kuppelkopf mit Augen',        cost: { fraes: 200, dreh: 200 } },
    { name: 'Inbetriebnahme',              cost: { blech: 70, fraes: 140, dreh: 180, gewinde: 60, baugruppe: 20 } }   // zusammen 400 / 520 / 560 + 60 Gewinde, 20 Baugruppen: mit Stufe 2 in etwa 3 Wochen machbar (das Kraftwerk kommt erst am Ende von Block 2)
  ],
  // Nach dem Bau: Lackierung (mit Werkstücken bezahlt, einmal gekauft bleibt sie) und Name aus einer festen Liste
  mechaPaints: [
    { id: 'stahl',   name: 'Stahlgrau',     price: {} },
    { id: 'rot',     name: 'Feuerwehrrot',  price: { blech: 150, fraes: 50 } },
    { id: 'blau',    name: 'Kobaltblau',    price: { blech: 150, dreh: 50 } },
    { id: 'petrol',  name: 'Petrol',        price: { blech: 150, fraes: 50, dreh: 50 } },
    { id: 'tarn',    name: 'Tarngrün',      price: { blech: 200, gewinde: 30 } },
    { id: 'gold',    name: 'Gold',          price: { blech: 300, fraes: 150, dreh: 150, gewinde: 50, baugruppe: 20 } }
  ],
  mechaNames: ['Bolzen', 'Titan', 'Koloss', 'Funke', 'Atlas', 'Kurbel', 'Orion', 'Turbo', 'Vulkan', 'Stahlherz', 'Gigant', 'Hebel', 'Donner', 'Rostfrei', 'Falke', 'Granit'],
  // Plaketten am Schwarzen Brett (aus dem Quest-Status berechnet)
  badges: [
    { id: 'b1', name: 'Grundlagenerforschung',       color: 'bronze', hq: ['MS1'] },
    { id: 'b2', name: 'Achtung der kommt flach!',    color: 'silber', hq: ['MS2'] },
    { id: 'b3', name: 'Drei mal das gleiche Teil?',  color: 'silber', hq: ['MS3'] },
    { id: 'b4', name: 'Ein fleißiges Bienchen!',     color: 'gold',   all: ['MS1', 'MS2', 'MS3'] },
    { id: 'b5', name: 'Du bist ein Überflieger!',    color: 'gold',   all: ['MS1', 'MS2', 'MS3', 'MS4'] },
    { id: 'b6', name: 'Bossgegner Papierkonstrukt',  color: 'gold',   quest: '1\\.\\s*Arbeitsprobe' },
    { id: 'b7', name: 'Bossgegner Katapult',         color: 'gold',   quest: '2\\.\\s*Arbeitsprobe' },
    { id: 'b8', name: 'Mecha-Ingenieur',             color: 'gold',   mecha: true }   // Riesen-Mecha fertig gebaut
  ]
};

// ===================== WEB-SCHNITTSTELLE =====================
function doGet() {
  return json_({ ok: true, msg: 'Die Alte Fabrik – Schnittstelle läuft.' });
}

function doPost(e) {
  MEMO_ = {};   // Zwischenspeicher dieser Anfrage
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Ungültige Anfrage.' }); }
  try {
    const who = anmelden_(req.tag, req.pin);
    if (!who.ok) return json_(who);
    const action = req.action || 'login';
    if (who.user.lehrer) return json_(leitstand_(snapshot_()));   // Leitstand: nur lesen, kein Spielstand
    if (action === 'login') { const ctx0 = kontext_(who.user); return json_(antwort_(who.user, demoAusbau_(who.user, bauFertig_(migriere_(ladeStand_(who.user.tag), ctx0), Date.now())), ctx0)); }
    if (action === 'rangliste') return json_(rangliste_(who.user, snapshot_(), req.klasse));   // nur lesen

    // Schreibende Aktionen: nacheinander abarbeiten. Alles, was nur liest (XP-Rechner, Zugänge), passiert vorher,
    // damit die Sperre nur für Laden, Rechnen und Speichern des eigenen Spielstands gehalten wird.
    const ctx = kontext_(who.user);
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(25000)) return json_({ ok: false, error: 'Gerade ist viel los. Bitte tippe gleich noch einmal.' });
    let out;
    try {
      const state = demoAusbau_(who.user, bauFertig_(migriere_(ladeStand_(who.user.tag), ctx), Date.now()));
      const vorher = JSON.stringify(state);   // für den Fehlerfall: unveränderter Stand ohne zweites Lesen
      const res = aktion_(action, req, state, ctx, Date.now());
      if (!res.ok) out = Object.assign(antwort_(who.user, JSON.parse(vorher), ctx), { ok: false, error: res.error });
      else {
        speichereStand_(who.user.tag, state);
        out = antwort_(who.user, state, ctx);
        out.msg = res.msg || '';
        if (res.got) out.got = res.got;
      }
    } finally {
      lock.releaseLock();
    }
    return json_(out);
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
  // Leitstand für die Lehrkraft (Tafel am Smartboard): Gamertag „Leitstand“, PIN in den Script-Eigenschaften: LEITSTAND_PIN (sonst DEMO_PIN)
  const leitPin = PropertiesService.getScriptProperties().getProperty('LEITSTAND_PIN') || demoPin;
  if (n === 'leitstand' && leitPin && pin === leitPin) { cache.remove(fKey); return { ok: true, user: { tag: 'Leitstand', klasse: '', lehrer: true } }; }

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
  if (MEMO_.zug) return MEMO_.zug;
  let rows = cacheGetJson_('zug');   // Zwischenspeicher: Änderungen im Blatt „Zugang“ leeren ihn sofort (onEdit), sonst nach 10 Minuten
  if (!rows) {
    const sh = SpreadsheetApp.getActive().getSheetByName('Zugang');
    rows = (!sh || sh.getLastRow() < 2) ? [] : sh.getRange(2, 1, sh.getLastRow() - 1, 6).getDisplayValues().map(r => ({
      tag: r[0], norm: r[1] || normTag_(r[0]), klasse: r[2], pin: String(r[4]).trim(), aktiv: String(r[5]).toUpperCase() !== 'FALSE'
    })).filter(r => r.tag);
    cachePutJson_('zug', rows, 600);
  }
  return (MEMO_.zug = rows);
}

// ===================== ZWISCHENSPEICHER =====================
// MEMO_: gilt nur für eine Anfrage. CacheService: für alle Anfragen, Werte werden in Stücke geteilt (max. 100 KB je Eintrag).
let MEMO_ = {};
function cacheGetJson_(key) {
  const c = CacheService.getScriptCache(), n = Number(c.get(key + '_n') || 0);
  if (!n) return null;
  const keys = []; for (let i = 0; i < n; i++) keys.push(key + '_' + i);
  const m = c.getAll(keys); let str = '';
  for (const k of keys) { if (m[k] == null) return null; str += m[k]; }
  try { return JSON.parse(str); } catch (e) { return null; }
}
function cachePutJson_(key, obj, sek) {
  const str = JSON.stringify(obj), teil = 40000, werte = {}; let n = 0;
  for (let i = 0; i < str.length; i += teil) werte[key + '_' + (n++)] = str.slice(i, i + teil);
  werte[key + '_n'] = String(n);
  try { CacheService.getScriptCache().putAll(werte, sek); } catch (e) { console.warn('Zwischenspeicher', key, e); }
}
function cacheLeeren_(key) { CacheService.getScriptCache().remove(key + '_n'); }

// Änderungen im Blatt „Zugang“ (PIN, aktiv) gelten sofort
function onEdit(e) {
  try { if (e && e.range && e.range.getSheet().getName() === 'Zugang') cacheLeeren_('zug'); } catch (err) {}
}

// ===================== XP-RECHNER LESEN (NUR LESEN!) =====================
function snapshot_() {
  if (MEMO_.snap) return MEMO_.snap;
  let snap = cacheGetJson_('snap');
  if (!snap) {
    // Abgelaufen: nur eine Anfrage liest den XP-Rechner neu, die anderen nehmen so lange den letzten Stand (höchstens 6 Stunden alt)
    const cache = CacheService.getScriptCache(), alt = cacheGetJson_('snapAlt');
    if (alt && cache.get('snapLiest')) snap = alt;
    else {
      cache.put('snapLiest', '1', 60);
      try {
        snap = leseXpRechner_();
        cachePutJson_('snap', snap, CACHE_SEKUNDEN);
        cachePutJson_('snapAlt', snap, 21600);
      } catch (e) {
        if (!alt) throw e;
        console.warn('XP-Rechner nicht lesbar, nehme letzten Stand', e); snap = alt;
      } finally { cache.remove('snapLiest'); }
    }
  }
  return (MEMO_.snap = snap);
}

function leseXpRechner_() {
  const ss = SpreadsheetApp.openById(XP_RECHNER_ID);

  // 1) Gamertags, XP und Level aus "XP Rechner 3.0"
  const xpVals = ss.getSheetByName(BLATT_XP).getDataRange().getDisplayValues();
  const nameToTag = {}, profile = {};
  for (let r = 2; r < xpVals.length; r++) {
    const row = xpVals[r];
    const fullName = String(row[3] || '').trim();        // Spalte D: Schlüssel für die Mebis-Daten (seit der Datenschutz-Umstellung = Gamertag)
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

  // 1a) Leveltabelle (Spalten H–J, Zeilen 3–19): ab wie vielen XP welches Level und welche Stufe
  const levels = [];
  for (let r = 2; r <= 18 && r < xpVals.length; r++) {
    const ab = String(xpVals[r][7] || '').trim(); if (ab === '') continue;
    levels.push({ ab: Number(ab.replace(/\./g, '').replace(',', '.')) || 0, level: String(xpVals[r][8] || '').trim(), stufe: String(xpVals[r][9] || '').trim() });
  }

  // 1b) Fertig sortierte Klassen-Ranglisten (Blöcke "Rangliste alle Schüler <Klasse>" im selben Blatt).
  //     Pro Zeile wird der Gamertag gesucht (oder ein Name, der über Spalte D/E auf einen Gamertag zeigt);
  //     ins Spiel gehen nur Gamertags, nie Namen.
  const ranks = {};
  const head = xpVals[0] || [];
  for (let c = 0; c < head.length; c++) {
    const m = String([0, 1, 2].map(r => (xpVals[r] || [])[c] || '').join(' ')).match(/Rangliste alle Sch\S*ler\s+(?!aller)(\S+)/i);
    if (!m) continue;
    const kl = m[1].trim(), list = [];
    for (let r = 1; r < xpVals.length; r++) {
      let tag = null;
      for (let k = c; k < c + 6 && k < head.length; k++) { const v = String(xpVals[r][k] || '').trim(); if (!v) continue; if (profile[v]) { tag = v; break; } if (nameToTag[v]) { tag = nameToTag[v]; break; } }
      if (tag && list.indexOf(tag) < 0) list.push(tag);
    }
    if (list.length) ranks[kl] = list;
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
    const tag = nameToTag[name] || (profile[name] ? name : null);   /* Questbuch Spalte B: Gamertag */
    if (!tag) continue;
    done[tag] = quests.map(q => {
      const v = qVals[r][q.col];
      return (v === true || String(v).trim() === 'Abgeschlossen') ? '1' : '0';
    }).join('');
  }
  let stand = '';
  try { stand = DriveApp.getFileById(XP_RECHNER_ID).getLastUpdated().toISOString(); } catch (e) {}
  return { quests: quests.map(q => ({ n: q.n, ms: q.ms, hq: q.hq, xp: q.xp })), done: done, profile: profile, ranks: ranks, levels: levels, stand: stand, at: Date.now() };
}

// Fortschritt eines Spielers (aus Snapshot) + freigeschaltete Bereiche + Plaketten
function kontext_(user) {
  const snap = snapshot_();
  let bits, prof;
  if (user.demo) {
    // Demo: alle Quests erledigt (Level und Stufe aus der Leveltabelle des XP-Rechners)
    bits = snap.quests.map(() => '1').join('');
    const xp = snap.quests.reduce((a, q) => a + (Number(q.xp) || 0), 0);
    let lv = { level: '16', stufe: 'Demo' }; (snap.levels || []).forEach(e => { if (xp >= e.ab) lv = e; });
    prof = { xp: xp, level: parseInt(lv.level, 10) || 0, stufe: lv.stufe || 'Demo', klasse: 'Demo' };
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

// ===================== RANGLISTE (nur lesen) =====================
// Schüler: Top 10 der eigenen Klasse plus die eigene Platzierung. Lehrkraft (Demo-Zugang): jede Klasse vollständig.
// Es gehen nur Gamertag, XP, Level und Stufe hinaus (Spalten wie in der Rangliste des XP-Rechners).
function rangliste_(user, snap, wunsch) {
  const prof = snap.profile || {}, ranks = snap.ranks || {};
  const liste = kl => {
    let tags = ranks[kl];
    if (!tags || !tags.length) tags = Object.keys(prof).filter(t => prof[t].klasse === kl).sort((a, b) => prof[b].xp - prof[a].xp);   // Ersatz: nach XP sortieren
    return tags.map((t, i) => ({ p: i + 1, tag: t, xp: (prof[t] || {}).xp || 0, level: (prof[t] || {}).level || 0, stufe: (prof[t] || {}).stufe || '' }));
  };
  const klassen = Object.keys(ranks).length ? Object.keys(ranks) : Array.from(new Set(Object.keys(prof).map(t => prof[t].klasse).filter(Boolean)));
  klassen.sort();
  if (user.demo) { const kl = klassen.indexOf(wunsch) >= 0 ? wunsch : klassen[0]; return { ok: true, lehrer: true, klassen: klassen, klasse: kl || '', liste: kl ? liste(kl) : [] }; }
  const kl = (prof[user.tag] || {}).klasse || user.klasse || '';
  const all = liste(kl), me = all.find(e => e.tag === user.tag) || null;
  return { ok: true, klasse: kl, liste: all.slice(0, 10), ich: me, gesamt: all.length };
}

// ===================== LEITSTAND (Tafel der Lehrkraft, nur lesen) =====================
// Alle Klassenranglisten, Top 10 aller Klassen, Summen und Durchschnitte, Leveltabelle, Anzahl verliehener Badges.
// Es gehen nur Gamertags, Klassen und Zahlen hinaus.
function leitstand_(snap) {
  const prof = snap.profile || {}, tags = Object.keys(prof);
  const rl = rangliste_({ demo: true }, snap, '');
  const klassen = rl.klassen.map(kl => {
    const liste = rangliste_({ demo: true }, snap, kl).liste;
    const summe = liste.reduce((a, e) => a + e.xp, 0);
    return { klasse: kl, liste: liste, summe: summe, schnitt: liste.length ? Math.round(summe / liste.length) : 0, anzahl: liste.length };
  });
  const top = tags.map(t => ({ tag: t, klasse: prof[t].klasse || '', xp: prof[t].xp || 0, level: prof[t].level || 0, stufe: prof[t].stufe || '' }))
    .sort((a, b) => b.xp - a.xp).slice(0, 10).map((e, i) => Object.assign(e, { p: i + 1 }));
  const gesamt = tags.reduce((a, t) => a + (prof[t].xp || 0), 0);
  let quests = 0; const zaehl = {}; REGELN.badges.forEach(b => zaehl[b.id] = 0);
  Object.keys(snap.done || {}).forEach(t => {
    const bits = snap.done[t]; quests += (bits.match(/1/g) || []).length;
    const qs = snap.quests.map((q, i) => Object.assign({}, q, { done: bits.charAt(i) === '1' }));
    kontextAusQuests_(qs, prof[t] || {}, '').badges.forEach(b => { if (b.ok && b.id !== 'b8') zaehl[b.id]++; });
  });
  try {   // Mecha-Ingenieur steht nur im Spielstand
    const sh = standBlatt_(), n = sh.getLastRow() - 1;
    if (n > 0) sh.getRange(2, 2, n, 1).getValues().forEach(r => { try { if ((JSON.parse(r[0]).mecha || 0) >= REGELN.mecha.length) zaehl.b8++; } catch (e) {} });
  } catch (e) { console.warn('Spielstände nicht lesbar', e); }
  return { ok: true, leitstand: {
    klassen: klassen, top: top, gesamtXp: gesamt, schueler: tags.length, quests: quests,
    levels: snap.levels || [], badges: REGELN.badges.map(b => ({ id: b.id, name: b.name, color: b.color, anzahl: zaehl[b.id] })),
    stand: snap.stand, at: snap.at } };
}

// Demo-Zugang der Lehrkraft: alle Gebäude sind repariert (Maschinen, Lager und Deko bleiben zum Ausprobieren)
function demoAusbau_(user, state) {
  if (!user.demo || !state) return state;
  state.b = state.b || {};
  Object.keys(REGELN.buildings).forEach(id => { if (!state.b[id]) state.b[id] = Date.now(); });
  delete state.bau;
  return state;
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
  if (MEMO_.standBlatt) return MEMO_.standBlatt;
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Spielstaende');
  if (!sh) {
    sh = ss.insertSheet('Spielstaende');
    sh.getRange(1, 1, 1, 3).setValues([['Gamertag', 'Spielstand (nicht von Hand ändern)', 'Zuletzt gespeichert']]).setFontWeight('bold');
  }
  return (MEMO_.standBlatt = sh);
}

// Zeile eines Spielers: zuerst die gemerkte Zeile prüfen (ein Lesezugriff), nur wenn sie nicht passt, die Spalte durchsuchen
function standZeile_(sh, tag) {
  const cache = CacheService.getScriptCache(), key = 'row_' + tag, hint = Number(cache.get(key) || 0);
  if (hint > 1) {
    try { const v = sh.getRange(hint, 1, 1, 2).getValues()[0]; if (String(v[0]) === tag) return { row: hint, json: v[1] }; } catch (e) {}
  }
  const f = sh.getRange('A:A').createTextFinder(tag).matchEntireCell(true).matchCase(true).findNext();
  if (!f) return null;
  const row = f.getRow();
  cache.put(key, String(row), 21600);
  return { row: row, json: sh.getRange(row, 2).getValue() };
}

function ladeStand_(tag) {
  const z = standZeile_(standBlatt_(), tag);
  MEMO_['row_' + tag] = z ? z.row : 0;
  if (!z) return null;
  try { return JSON.parse(z.json); } catch (e) { return null; }
}

function speichereStand_(tag, state) {
  const sh = standBlatt_();
  let row = MEMO_['row_' + tag];   // aus ladeStand_ derselben Anfrage (unter derselben Sperre)
  if (row === undefined) { const z = standZeile_(sh, tag); row = z ? z.row : 0; }
  if (!row) { row = sh.getLastRow() + 1; CacheService.getScriptCache().put('row_' + tag, String(row), 21600); }
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
    badges: ctx.badges.map(b => b.id === 'b8' ? { id: 'b8', ok: (state.mecha || 0) >= REGELN.mecha.length } : b),
    stand: ctx.stand,
    state: state,
    rules: REGELN
  };
}

const PART_KEYS_ = ['blech', 'fraes', 'dreh', 'gewinde', 'baugruppe'];

function plaene_(state, ctx) {
  const earned = ['ms1', 'ms2', 'ms3', 'ms4', 'ms5'].filter(a => ctx.areas[a]).length;
  return earned - Object.keys(state.b || {}).length - Object.keys(state.bau || {}).length;   // ein Bau in Arbeit hat seinen Plan schon verbraucht
}

// Kalendertag in deutscher Zeit (für tägliche Kleinigkeiten wie den Spind)
function Utilities_datum_(now) { const d = new Date(now + 60 * 60000 * (new Date(now).getTimezoneOffset() === 0 ? 1 : 0)); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

// Bauzeit: Gebäude werden erst nach BAU_MINUTEN fertig. Wird bei jedem Laden aufgerufen und macht fällige Bauten fertig.
const BAU_MINUTEN = 20;
function bauFertig_(state, now) {
  if (!state || !state.bau) return state;
  Object.keys(state.bau).forEach(id => {
    const t = state.bau[id];
    if (t > now) return;
    state.b[id] = t || now; delete state.bau[id];
    if (REGELN.buildings[id] && REGELN.buildings[id].powerAll) { abrechnen_(state, now); Object.keys(state.st).forEach(s => { if (REGELN.stations[s].out) state.st[s].on = true; }); }
  });
  if (!Object.keys(state.bau).length) delete state.bau;
  return state;
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
function verkaufswert_(price) { const o = {}; Object.keys(price).forEach(k => { const v = Math.floor(price[k] / 2); if (v > 0) o[k] = v; }); return o; }   // halber Preis
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
  n = Math.min(n, storeCap_(state) - Math.floor(state.store[def.out] || 0));   // eigenes Regal je Sorte
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

// Darf Gegenstand t an Ort m (1 = Werkshof, 2–6 = Gebäude), Platz x, Ebene y (0 = Boden, 1 = Wand) stehen?
function platzOk_(t, m, x, y) {
  const d = REGELN.catalog[t], S = REGELN.slots;
  if (!d || d.kind !== 'place') return false;
  if (d.where === 'aussen') return m === 1 && y === 0 && x >= 0 && x < S.aussen;
  if (m < 2 || m > 6 || (d.only && d.only !== m)) return false;
  if (d.where === 'wand') return y === 1 && x >= 0 && x < S.wand;
  return y === 0 && x >= 0 && x < S.boden;
}

// Alles gebaut und jede Maschine auf Stufe 3: Zahnräder werden nicht mehr gebraucht und auf 0 gesetzt
function allesAusgebaut_(state) {
  return Object.keys(REGELN.buildings).every(b => state.b[b]) && Object.keys(REGELN.stations).every(id => state.st[id] && state.st[id].lvl >= 3);
}
function aktion_(action, req, state, ctx, now) {
  const res = aktion0_(action, req, state, ctx, now);
  if (res && res.ok && allesAusgebaut_(state) && state.gears) { state.gears = 0; res.msg = (res.msg ? res.msg + ' ' : '') + 'Alles ist ausgebaut – Zahnräder brauchst du nicht mehr.'; }
  return res;
}
function aktion0_(action, req, state, ctx, now) {
  const R = REGELN;
  ['b', 'st', 'store', 'items', 'owned'].forEach(k => { state[k] = state[k] || {}; });
  state.placed = state.placed || [];
  // Aufräumen nach Regeländerungen: unpassend aufgestellte Dinge zurück in den Katalog, entfernte Dinge streichen
  state.placed = state.placed.filter(o => { if (platzOk_(o.t, o.m, o.x, o.y)) return true; if (R.catalog[o.t]) state.items[o.t] = (state.items[o.t] || 0) + 1; return false; });
  Object.keys(state.items).forEach(k => { if (!R.catalog[k]) delete state.items[k]; });
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
    if (state.bau && state.bau[id]) return { ok: false, error: 'Am ' + def.name + ' wird schon gebaut.' };
    state.gears -= def.gears;
    state.bau = state.bau || {}; state.bau[id] = now + BAU_MINUTEN * 60000;   // Bauzeit: erst danach ist das Gebäude fertig (bauFertig_)
    return { ok: true, msg: 'Die Bauarbeiten am ' + def.name + ' haben begonnen. In ' + BAU_MINUTEN + ' Minuten ist es fertig.' };
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
      const voll = Object.keys(state.st).filter(id => REGELN.stations[id] && REGELN.stations[id].out && puffer_(id, state.st[id], now) >= 1 && (state.store[REGELN.stations[id].out] || 0) >= storeCap_(state)).map(id => R.parts[REGELN.stations[id].out].name);
      return { ok: false, error: voll.length ? 'Regal voll: ' + voll.join(', ') + '. Gib Teile aus, entsorge welche oder baue das Teilelager aus.' : 'Noch nichts fertig zum Abholen.' };
    }
    return { ok: true, got: got, msg: 'Abgeholt: ' + keys.map(k => got[k] + ' ' + R.parts[k].name).join(', ') };
  }

  if (action === 'order') {
    const cur = auftraege_(now), i = Math.floor(req.i);
    if (!state.orders || state.orders.w !== cur.w) state.orders = { w: cur.w, done: [] };
    const o = cur.list[i];
    if (!o) return { ok: false, error: 'Unbekannter Auftrag.' };
    if ((state.stamps || 0) >= R.orders.stampsForTitle) return { ok: false, error: 'Du bist schon ' + R.orders.title + ' – es werden keine Aufträge mehr gebraucht.' };
    if (state.orders.done.indexOf(i) >= 0) return { ok: false, error: 'Diesen Auftrag hast du schon erfüllt.' };
    if (!hatTeile_(state.store, o.parts)) return { ok: false, error: 'Dafür fehlen dir noch Teile.' };
    zahleTeile_(state.store, o.parts);
    state.orders.done.push(i);
    const plus = (R.orders.stamps || {})[o.size] || 1;
    state.stamps = Math.min(R.orders.stampsForTitle, (state.stamps || 0) + plus);
    const t = state.stamps >= R.orders.stampsForTitle ? ' Du bist jetzt ' + R.orders.title + '!' : '';
    return { ok: true, msg: 'Auftrag erfüllt: +' + plus + (plus > 1 ? ' Stempel' : ' Stempel') + ' (' + state.stamps + ').' + t };
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
    if (!platzOk_(id, m, x, y)) return { ok: false, error: d.where === 'aussen' ? 'Das gehört nach draußen in den Werkshof.' : d.only ? 'Das passt nur ins Pförtnerhaus.' : d.where === 'wand' ? 'Das kommt drinnen an die Wand.' : 'Das kommt drinnen auf den Boden.' };
    if (m > 1 && !state.b[['', '', 'pfoertner', 'blechwerkstatt', 'maschinenhalle', 'prueflabor', 'kraftwerk'][m]]) return { ok: false, error: 'Repariere zuerst das Gebäude.' };
    if (state.placed.length >= R.maxPlaced) return { ok: false, error: 'Maximal ' + R.maxPlaced + ' Gegenstände.' };
    if (state.placed.some(o => o.m === m && o.x === x && o.y === y)) return { ok: false, error: 'Dort steht schon etwas.' };
    state.items[id] -= 1;
    state.placed.push({ t: id, m: m, x: x, y: y });
    return { ok: true, msg: d.name + ' aufgestellt.' };
  }

  if (action === 'discard') {   // Teile aus dem eigenen Teilelager wegwerfen (nur Spielstand, nie der XP-Rechner)
    const k = String(req.part || ''), n = Math.floor(Number(req.n));
    if (PART_KEYS_.indexOf(k) < 0) return { ok: false, error: 'Unbekannte Teileart.' };
    if (!(n > 0)) return { ok: false, error: 'Ungültige Menge.' };
    const m = Math.min(n, Math.floor(state.store[k] || 0));
    if (m <= 0) return { ok: false, error: 'Davon ist nichts im Lager.' };
    state.store[k] = (state.store[k] || 0) - m;
    return { ok: true, msg: m + ' × ' + REGELN.parts[k].name + ' entsorgt.' };
  }
  if (action === 'spind') {   // Geheimnis in der Blechwerkstatt: einmal pro Tag 5 Blech im blauen Spind
    if (!state.b.blechwerkstatt) return { ok: false, error: 'Die Blechwerkstatt ist noch nicht repariert.' };
    const tag = Utilities_datum_(now);
    if (state.spind === tag) return { ok: false, error: 'Der Spind ist leer. Morgen liegt bestimmt wieder etwas darin.' };
    state.spind = tag; state.store.blech = (state.store.blech || 0) + 5;
    return { ok: true, msg: 'Im Spind lagen 5 Blech!', got: { blech: 5 } };
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

  if (action === 'sell') {   // gekaufte Gegenstände für die Hälfte zurückgeben (aufgestellte zuerst wegräumen)
    const id = req.item, d = R.catalog[id];
    if (!d) return { ok: false, error: 'Unbekannter Gegenstand.' };
    if (d.kind === 'place') { if (!(state.items[id] > 0)) return { ok: false, error: 'Räume es zuerst weg, dann kannst du es verkaufen.' }; state.items[id]--; }
    else { if (!state.owned[id]) return { ok: false, error: 'Das gehört dir nicht.' }; delete state.owned[id]; if (state.hidden) delete state.hidden[id]; }
    const back = verkaufswert_(d.price);
    Object.keys(back).forEach(k => state.store[k] = (state.store[k] || 0) + back[k]);
    return { ok: true, msg: d.name + ' verkauft: ' + Object.keys(back).map(k => back[k] + ' ' + R.parts[k].name).join(', ') + ' zurück.' };
  }
  if (action === 'zeigen') {   // einmalige Gegenstände (Kran, Turm, Statue, Stapler, Katzenroboter) wegräumen oder wieder aufstellen
    const id = String(req.item || '');
    if (!state.owned[id]) return { ok: false, error: 'Das gehört dir noch nicht.' };
    state.hidden = state.hidden || {};
    if (req.on) delete state.hidden[id]; else state.hidden[id] = true;
    return { ok: true, msg: R.catalog[id].name + (req.on ? ' ist wieder aufgestellt.' : ' ist weggeräumt. Im Katalog kannst du es wieder aufstellen.') };
  }
  if (action === 'mecha') {   // nächsten Bauabschnitt des Riesen-Mechas mit Werkstücken bauen
    if (!state.b.kraftwerk) return { ok: false, error: 'Repariere zuerst das Kraftwerk.' };
    const i = state.mecha || 0, step = R.mecha[i];
    if (!step) return { ok: false, error: 'Der Mecha ist schon fertig.' };
    const miss = Object.keys(step.cost).filter(k => (state.store[k] || 0) < step.cost[k]);
    if (miss.length) return { ok: false, error: 'Dafür fehlen noch Werkstücke im Teilelager.' };
    Object.keys(step.cost).forEach(k => state.store[k] -= step.cost[k]);
    state.mecha = i + 1;
    return { ok: true, msg: state.mecha >= R.mecha.length ? 'Der Riesen-Mecha ist startklar!' : 'Bauabschnitt fertig: ' + step.name + '.' };
  }
  if (action === 'mechaPaint') {   // Lackierung kaufen (einmal) oder eine gekaufte auswählen
    if ((state.mecha || 0) < R.mecha.length) return { ok: false, error: 'Baue zuerst den Mecha fertig.' };
    const pnt = R.mechaPaints.find(x => x.id === req.paint);
    if (!pnt) return { ok: false, error: 'Unbekannte Farbe.' };
    state.paints = state.paints || ['stahl'];
    if (state.paints.indexOf(pnt.id) < 0) {
      const miss = Object.keys(pnt.price).filter(k => (state.store[k] || 0) < pnt.price[k]);
      if (miss.length) return { ok: false, error: 'Dafür fehlen noch Werkstücke im Teilelager.' };
      Object.keys(pnt.price).forEach(k => state.store[k] -= pnt.price[k]);
      state.paints.push(pnt.id);
    }
    state.mechaPaint = pnt.id;
    return { ok: true, msg: 'Der Mecha ist jetzt ' + pnt.name + ' lackiert.' };
  }
  if (action === 'mechaName') {   // Name nur aus der festen Liste
    if ((state.mecha || 0) < R.mecha.length) return { ok: false, error: 'Baue zuerst den Mecha fertig.' };
    const nm = String(req.name || '');
    if (nm && R.mechaNames.indexOf(nm) < 0) return { ok: false, error: 'Diesen Namen gibt es nicht.' };
    state.mechaName = nm;   /* leer = wieder ohne Namen (Riesen-Mecha) */
    return { ok: true, msg: nm ? 'Dein Mecha heißt jetzt ' + nm + '.' : 'Dein Mecha heißt wieder einfach Riesen-Mecha.' };
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
    sh.getRange(1, 1, 1, 6).setValues([['Gamertag', 'Login (normalisiert)', 'Klasse', '(frei, keine Namen)', 'PIN', 'Aktiv']]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  const vorhanden = zugangsliste_();
  const tags = {}, pins = {};
  vorhanden.forEach(r => { tags[r.tag] = true; pins[r.pin] = true; });

  const xpVals = SpreadsheetApp.openById(XP_RECHNER_ID).getSheetByName(BLATT_XP).getDataRange().getDisplayValues();
  const neu = [];
  for (let r = 2; r < xpVals.length; r++) {
    const row = xpVals[r];
    const tag = String(row[4] || '').trim(), klasse = String(row[2] || '').trim();   /* keine Namen übernehmen */
    if (!tag || !klasse || tags[tag]) continue;
    let pin;
    do { pin = String(1000 + Math.floor(Math.random() * 9000)); } while (pins[pin]);
    pins[pin] = true; tags[tag] = true;
    neu.push([tag, normTag_(tag), klasse, '', pin, true]);
  }
  if (neu.length) {
    sh.getRange(sh.getLastRow() + 1, 1, neu.length, 6).setValues(neu);
    sh.getRange(2, 5, sh.getLastRow() - 1, 1).setNumberFormat('@');
  }
  standBlatt_();
  zettelErstellen();
  cacheLeeren_('zug');
  SpreadsheetApp.getActive().toast(neu.length + ' neue Zugänge angelegt. Zettel aktualisiert.', 'Alte Fabrik', 8);
}

/** Baut das Blatt "Zettel" zum Ausdrucken und Ausschneiden (3 Zettel pro Reihe). */
function zettelErstellen() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Zettel');
  if (sh) sh.clear(); else sh = ss.insertSheet('Zettel');
  const list = zugangsliste_().filter(r => r.aktiv).sort((a, b) => (a.klasse + ' ' + a.tag).localeCompare(b.klasse + ' ' + b.tag, 'de'));
  const PER_ROW = 3, H = 6;
  sh.setColumnWidths(1, 5, 20);
  [1, 3, 5].forEach(c => sh.setColumnWidth(c, 230));
  [2, 4].forEach(c => sh.setColumnWidth(c, 18));
  list.forEach((s, i) => {
    const col = 1 + (i % PER_ROW) * 2;
    const row = 1 + Math.floor(i / PER_ROW) * H;
    const vals = [['Die Alte Fabrik'], ['Klasse ' + s.klasse], ['Gamertag:  ' + s.tag], ['PIN:  ' + s.pin], [SPIEL_URL]];
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
  cacheLeeren_('snap');
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
    .addSeparator()
    .addItem('Datenschutz: prüfen (ändert nichts)', 'datenschutzPruefen')
    .addItem('Datenschutz: Namen durch Gamertags ersetzen (einmalig)', 'datenschutzUmstellen')
    .addItem('XP-Rechner: Formeln reparieren / erneuern', 'xpRechnerReparieren')
    .addToUi();
}

// ===================== DATENSCHUTZ-UMSTELLUNG (EINMALIG) =====================
/**
 * Schritt 1: datenschutzPruefen() ausführen. Schreibt nichts, zeigt nur im Protokoll, was passieren würde.
 * Schritt 2: datenschutzUmstellen() ausführen. Danach stehen im XP-Rechner und in dieser Tabelle keine Klarnamen mehr:
 *  - XP Rechner 3.0: Gamertags in Spalte E werden feste Werte, Spalte D zeigt den Gamertag (Schlüssel für die Mebis-Daten),
 *    Vor- und Nachname (Spalten A und B) werden geleert.
 *  - Daten Mebis: Namen werden durch Gamertags ersetzt, die E-Mail-Spalte wird geleert, verbundene Zellen werden aufgehoben.
 *  - Questbuch: Spalte B zeigt danach automatisch Gamertags (Formel bleibt).
 *  - Diese Tabelle: Spalte D im Blatt „Zugang“ wird geleert, die Zettel werden ohne Namen neu gebaut.
 * Die Punkte (XP, Level) bleiben gleich: Es ändert sich nur, womit die Zeilen einander zugeordnet werden.
 * Das Protokoll enthält keine Namen, nur Anzahlen.
 */
function datenschutzPruefen() { return datenschutzUmstellung_(false); }
function datenschutzUmstellen() { return datenschutzUmstellung_(true); }
function datenschutzUmstellung_(schreiben) {
  const ss = SpreadsheetApp.openById(XP_RECHNER_ID);
  const xr = ss.getSheetByName(BLATT_XP), dm = ss.getSheetByName('aus Mebis Umwandler') || ss.getSheetByName('Daten Mebis'), qb = ss.getSheetByName(BLATT_QUESTBUCH);
  if (!xr || !dm || !qb) throw new Error('Blatt nicht gefunden: ' + BLATT_XP + ', Daten Mebis oder ' + BLATT_QUESTBUCH);
  const n = Math.max(0, xr.getLastRow() - 2);
  const xv = n ? xr.getRange(3, 1, n, 5).getDisplayValues() : [];   // A..E
  const map = {}, tags = {}; let schueler = 0;
  xv.forEach(r => {
    const vor = r[0].trim(), nach = r[1].trim(), key = r[3].trim(), tag = r[4].trim();
    if (!tag) return;
    if (tags[tag]) throw new Error('Gamertag doppelt, bitte zuerst im XP-Rechner beheben: ' + tag);
    tags[tag] = true; schueler++;
    if (vor || nach) map[key] = tag;
  });
  const dn = Math.max(0, dm.getLastRow() - 2);
  const dv = dn ? dm.getRange(3, 1, dn, 2).getDisplayValues() : [];
  let treffer = 0, schonTag = 0, ohne = 0, mails = 0;
  dv.forEach(r => { const v = r[0].trim(); if (!v) return; if (map[v]) treffer++; else if (tags[v]) schonTag++; else ohne++; if (r[1].trim()) mails++; });
  console.log('XP Rechner: ' + schueler + ' Schüler mit Gamertag, davon ' + Object.keys(map).length + ' noch mit Namen.');
  if (ohne && !Object.keys(map).length) throw new Error('Im XP-Rechner stehen keine Namen mehr, in „Daten Mebis“ aber noch ' + ohne + ' Namen. Bitte zuerst „Für Google“ aus dem Mebis Umwandler in „Daten Mebis“ A2 einfügen (oder die Version vor der Umstellung wiederherstellen). Es wurde nichts geändert.');
  console.log('Daten Mebis: ' + treffer + ' Zeilen werden zu Gamertags, ' + schonTag + ' sind schon Gamertags, ' + ohne + ' ohne Zuordnung (werden zu „nicht zugeordnet“), ' + mails + ' E-Mail-Adressen werden gelöscht.');
  if (!schreiben) { console.log('Nur geprüft, nichts geändert. Zum Umstellen datenschutzUmstellen() ausführen.'); return; }

  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    // 1) Daten Mebis zuerst (solange die Namen im XP-Rechner noch da sind): Namen -> Gamertag, E-Mail leeren
    if (dn) {
      const ganz = dm.getRange(3, 1, dm.getMaxRows() - 2, dm.getMaxColumns());
      ganz.getMergedRanges().forEach(m => m.breakApart());   // jeden Zellverbund vollständig aufheben
      dm.getRange(3, 1, dn, 1).setValues(dv.map(r => { const v = r[0].trim(); return [!v ? '' : map[v] || (tags[v] ? v : 'nicht zugeordnet')]; }));
      dm.getRange(3, 2, dn, 1).clearContent();
      SpreadsheetApp.flush();
    }
    // 2) XP Rechner: Gamertag fest, Schlüssel = Gamertag, Namen leeren
    if (n) {
      xr.getRange(3, 5, n, 1).setValues(xv.map(r => [r[4].trim()]));
      xr.getRange(3, 4, n, 1).setFormulas(xv.map((r, i) => ['=IF(E' + (i + 3) + '="", " ", E' + (i + 3) + ')']));
      xr.getRange(3, 1, n, 2).clearContent();
    }
    xr.getRange('A1').setValue('Keine Namen! Neue Schüler: Klasse in C, Gamertag in E');
    xr.getRange('A2').setValue('(leer, Datenschutz)'); xr.getRange('B2').setValue('(leer, Datenschutz)');
    xr.getRange('D2').setValue('Schlüssel für Mebis-Daten (= Gamertag)');
    SpreadsheetApp.flush();
    // 3) Questbuch: nur die Überschrift (Spalte B übernimmt per Formel den Gamertag)
    qb.getRange('B6').setValue('Gamertag');
    SpreadsheetApp.flush();
    // 4) Diese Tabelle: keine Namen mehr im Blatt „Zugang“, Zettel neu
    const zg = SpreadsheetApp.getActive().getSheetByName('Zugang');
    if (zg) { zg.getRange('D1').setValue('(frei, keine Namen)'); if (zg.getLastRow() > 1) zg.getRange(2, 4, zg.getLastRow() - 1, 1).clearContent(); }
    ['zug', 'snap', 'snapAlt'].forEach(cacheLeeren_);
    zettelErstellen();
    xpRechnerErneuern_(ss);
  } finally { lock.releaseLock(); }
  console.log('Fertig umgestellt. Namen stehen jetzt nur noch in der OneDrive-Datei.');
}

/**
 * Teil der Umstellung: XP-Rechner für 150 Schüler (5 Klassen à 30) und das Einfügen aus „Mebis Umwandler“ vorbereiten.
 * - XP Rechner 3.0: Zeilen 3–152 bekommen alle Formeln (vorher nur bis 117 und nicht in den Lücken). Leere Zeilen bleiben leer.
 *   M (XP) nimmt direkt die Summe aus dem Questbuch (gleiche Zeile + 4), statt sie per SUMIF über den Namen zu suchen.
 *   Rangliste (S3) sortiert nur belegte Zeilen. Spalten A und B werden ausgeblendet.
 *   Aufbau wie bisher in Blöcken zu 30 Zeilen je Klasse (Zeilen 3–32, 33–62, 63–92, 93–122), neu ein fünfter Block 123–152.
 * - Questbuch: Zeilen 7–156 mit allen Formeln, die Klassenbeschriftung (Spalte A, verbunden) kommt aus dem XP-Rechner, Mebis-Daten bis Zeile 400,
 *   leere Zeilen und Schüler ohne Mebis-Eintrag erzeugen keine Fehler mehr.
 * Mehrfaches Ausführen schadet nicht.
 */
const XP_ERSTE = 3, XP_LETZTE = 152, QB_VERSATZ = 4;
// Formeln in der Schreibweise der Tabelle: deutsche Tabellen trennen Argumente mit „;“ (getFormulas liefert und setFormulas erwartet das so)
let SEP_ = ',';
function L_(f) { if (SEP_ === ',') return f; let out = '', q = false; for (const ch of f) { if (ch === '"') q = !q; out += (!q && ch === ',') ? SEP_ : ch; } return out; }
/** Repariert bzw. erneuert die Formeln im XP-Rechner und Questbuch (kann jederzeit erneut ausgeführt werden). */
function xpRechnerReparieren() { const ss = SpreadsheetApp.openById(XP_RECHNER_ID); xpRechnerErneuern_(ss); ['snap', 'snapAlt'].forEach(cacheLeeren_); }
function zeileVerschieben_(f, von, nach) {   // Formel wie beim Kopieren in eine andere Zeile anpassen (nur Bezüge ohne $ vor der Zeile)
  return f.replace(/(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\d(])/g, (m, d1, c, d2, r) => d2 ? m : d1 + c + (Number(r) - von + nach));
}
function xpRechnerErneuern_(ss) {
  SEP_ = /^en/i.test(ss.getSpreadsheetLocale()) ? ',' : ';';
  const xr = ss.getSheetByName(BLATT_XP), qb = ss.getSheetByName(BLATT_QUESTBUCH);
  const n = XP_LETZTE - XP_ERSTE + 1, QB = "'" + BLATT_QUESTBUCH + "'", XP = "'" + BLATT_XP + "'";
  // XP Rechner
  const xf = [];
  for (let r = XP_ERSTE; r <= XP_LETZTE; r++) {
    const q = r + QB_VERSATZ;
    xf.push({ D: L_('=IF(E' + r + '="", " ", E' + r + ')'), L: L_('=IF(E' + r + '="","",E' + r + ')'), M: L_('=IF(E' + r + '="","",' + QB + '!CI' + q + ')'),
      N: L_('=IF(M' + r + '="","",VLOOKUP(M' + r + ',$H$3:$J$19,2))'), O: L_('=IF(M' + r + '="","",VLOOKUP(M' + r + ',$H$3:$J$19,3))'), P: L_('=IF(E' + r + '="","",C' + r + ')') });
  }
  xr.getRange(XP_ERSTE, 4, n, 1).setFormulas(xf.map(f => [f.D]));
  xr.getRange(XP_ERSTE, 12, n, 5).setFormulas(xf.map(f => [f.L, f.M, f.N, f.O, f.P]));
  xr.getRange('S3').setFormula(L_('=IFERROR(SORT(FILTER($L$3:$P$' + XP_LETZTE + ',$L$3:$L$' + XP_LETZTE + '<>""),2,FALSE),"")'));
  xr.getRange(93, 3, 30, 14).copyFormatToRange(xr, 3, 16, 123, XP_LETZTE);   // Format des 4. Blocks für den 5. Block
  xr.hideColumns(1, 2);
  // Questbuch: Formeln der ersten Schülerzeile als Vorlage
  const Q0 = XP_ERSTE + QB_VERSATZ, QN = XP_LETZTE + QB_VERSATZ, breit = 86;   // Spalten A bis CH
  const vorlage = qb.getRange(Q0, 1, 1, breit).getFormulas()[0];
  const rows = [];
  for (let q = Q0; q <= QN; q++) {
    rows.push(vorlage.map((f, i) => {
      if (i === 0) return null;   // Spalte A: verbundene Klassenbeschriftung, wird unten je Block gesetzt
      if (i === 1) return '=' + XP + '!D' + (q - QB_VERSATZ);
      if (!f) return '';
      const v = f.match(/VLOOKUP\(\s*B\d+\s*[;,]\s*'([^']+)'!\$A\$2:\$HS\$\d+\s*[;,]\s*(\d+)\s*[;,]/i);   /* Blattname egal (umbenannt in „aus Mebis Umwandler“) */   // Mebis-Spalte (auch wenn schon umhüllt)
      if (v) return L_('=IF(TRIM(B' + q + ')="","",IFERROR(VLOOKUP(B' + q + ",'" + v[1] + "'!$A$2:$HS$400," + v[2] + ',FALSE),""))');
      return zeileVerschieben_(f, Q0, q);
    }));
  }
  // Spalten ohne Formel (Häkchen von Hand, z. B. Arbeitsprobe): Häkchen behalten, nur auf alle Zeilen ausdehnen
  const hand = []; vorlage.forEach((f, i) => { if (i > 1 && !f) hand.push(i + 1); });
  const handWerte = hand.map(c => qb.getRange(Q0, c, rows.length, 1).getValues());
  qb.getRange(QN - 59, 1, 30, 88).copyFormatToRange(qb, 1, 88, QN - 29, QN);   // Format (auch verbundene Klassenzelle) des 4. Blocks für den 5. Block
  qb.getRange(Q0, 2, rows.length, breit - 1).setFormulas(rows.map(r => r.slice(1)));
  for (let b = 0; b < 5; b++) { const q = Q0 + b * 30, x = XP_ERSTE + b * 30; qb.getRange(q, 1).setFormula(L_('=IF(' + XP + '!C' + x + '="","",' + XP + '!C' + x + ')')); }
  hand.forEach((c, k) => { const rg = qb.getRange(Q0, c, rows.length, 1); rg.setValues(handWerte[k].map(v => [v[0] === true])); rg.insertCheckboxes(); });
  const ci = qb.getRange(Q0, 87).getFormula();
  qb.getRange(Q0, 87, rows.length, 1).setFormulas(rows.map((_, i) => [zeileVerschieben_(ci, Q0, Q0 + i)]));
  const cj = qb.getRange(Q0, 88, rows.length, 1), cjv = cj.getValues();
  cj.setValues(cjv.map(v => [v[0] === true]));
  cj.insertCheckboxes();
  SpreadsheetApp.flush();
  console.log('XP-Rechner erneuert: Zeilen ' + XP_ERSTE + '–' + XP_LETZTE + ' (Questbuch ' + Q0 + '–' + QN + ') haben alle Formeln. Platz für 150 Schüler.');
}

