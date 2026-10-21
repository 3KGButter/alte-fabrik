// ============ EINSTELLUNGEN DES SPIELS ============
// Nach dem Veröffentlichen des Apps Scripts hier die Web-App-URL eintragen.
// Leer lassen = Vorschau-Modus ohne Server (Daten nur auf diesem Gerät).
window.API_URL = 'https://script.google.com/macros/s/AKfycbzMcUk6jh7ICRbSCgIS3m-cb2s1sW-Lc_QrAt6P0RNWzYOZXm5bdWyFvqWAVj8Qh0TK/exec';

// ============ WIE DAS SPIEL DIE RPG-MAKER-KARTEN LIEST ============
// Karten, Ereignisse, Schalter und Notizen kommen aus assets/data/world.json (erzeugt mit tools/export_world.py).
window.LAYOUT = {
  avatars: ['MS_Spieler1', 'MS_Spieler2', 'MS_Spieler3', 'MS_Spieler4'],

  // Regionen auf der reparierten Karte: solange das Gebäude / der Arbeitsbereich nicht repariert ist,
  // kommen die Kacheln dieser Region aus der Karte "... [Ruine]".
  regions: {
    1: { blocked: true },
    2: { deco: true },
    10: { b: 'pfoertner' }, 11: { s: 'notstrom' }, 12: { b: 'pfoertner' },
    20: { b: 'blechwerkstatt' }, 21: { s: 'abkant' }, 22: { s: 'lager' },
    30: { b: 'maschinenhalle' }, 31: { s: 'fraese' }, 32: { s: 'dreh' },
    40: { b: 'prueflabor' }, 41: { s: 'gewinde' }, 42: { s: 'montage' },
    50: { b: 'kraftwerk' },
    60: { area: 'ms2' }
  },

  // Notiz <bau:...> → Gebäude (b) oder Arbeitsbereich (s)
  bau: {
    pfoertnerhaus: { b: 'pfoertner' }, pfoertner: { b: 'pfoertner' },
    blechwerkstatt: { b: 'blechwerkstatt' }, maschinenhalle: { b: 'maschinenhalle' },
    prueflabor: { b: 'prueflabor' }, kraftwerk: { b: 'kraftwerk' },
    notstrom: { s: 'notstrom' }, notstromaggregat: { s: 'notstrom' },
    abkantbank: { s: 'abkant' }, abkant: { s: 'abkant' },
    lager: { s: 'lager' }, teilelager: { s: 'lager' },
    fraese: { s: 'fraese' }, fraesmaschine: { s: 'fraese' },
    drehmaschine: { s: 'dreh' }, dreh: { s: 'dreh' },
    gewinde: { s: 'gewinde' }, gewindeschneidplatz: { s: 'gewinde' },
    montage: { s: 'montage' }, montageplatz: { s: 'montage' }
  },

  icons: { gears: '⚙️', plans: '📜', blech: '🔲', fraes: '🧱', dreh: '🔩', gewinde: '🪛', baugruppe: '🧩', power: '⚡', store: '📦' },

  // Aufstellbare Gegenstände: Kacheln aus SF_Outside_B_MS (B) oder SF_Outside_C (C), x/y = Spalte/Zeile, w/h in Kacheln
  deco: {
    blumen:  { set: 'B', x: 12, y: 3, w: 1, h: 1 },
    laterne: { set: 'B', x: 5, y: 10, w: 1, h: 2 },
    schild:  { set: 'B', x: 1, y: 15, w: 1, h: 1 },
    fass:    { set: 'B', x: 11, y: 0, w: 2, h: 1 },
    bank:    { set: 'C', x: 3, y: 2, w: 2, h: 1 },
    regal:   { set: 'B', x: 13, y: 12, w: 1, h: 2 },
    brunnen: { set: 'C', x: 0, y: 0, w: 2, h: 2 }
  },
  decoSheets: { B: 'SF_Outside_B_MS', C: 'SF_Outside_C' },
  catalogIcon: { turm: '🗼', stapler: '🚜', katze: '🐈', kran: '🏗️', statue: '🏆' }
};
