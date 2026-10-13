// ============ EINSTELLUNGEN DES SPIELS ============
// Nach dem Veröffentlichen des Apps Scripts hier die Web-App-URL eintragen.
// Leer lassen = Vorschau-Modus ohne Server (Daten nur auf diesem Gerät).
window.API_URL = '';

// ============ KARTE: Bereiche, Gebäude, Questpfade (Kachel-Koordinaten der RPG-Maker-Karte "alte Fabrik") ============
window.LAYOUT = {
  start: { x: 19, y: 36 },

  // Welcher Bereich gehört zu welcher Kachel? (erste passende Regel gewinnt)
  zoneOf(x, y) {
    if (y >= 30) return 'ms1';
    if (x >= 33 && y < 17) return 'ms3';
    if (x >= 33) return 'ms4';
    if (y < 11) return 'ms5';
    return 'ms2';
  },
  zoneLabel: {
    ms2: { x: 16, y: 20 }, ms3: { x: 40, y: 10 }, ms4: { x: 40, y: 23 }, ms5: { x: 22, y: 6 }
  },

  // Gebäude-Flächen auf der Karte: x,y,w,h in Kacheln; icon = Kachel für Baustellen-Symbol
  plots: {
    pfoertner:   { x: 14, y: 31, w: 4, h: 4, icon: { x: 15.5, y: 31 } },
    werkbank:    { x: 29, y: 32, w: 3, h: 3, icon: { x: 30, y: 32 } },
    notstrom:    { x: 6,  y: 13, w: 6, h: 5, icon: { x: 8.5, y: 13.5 } },
    blechschere: { x: 20, y: 12, w: 12, h: 9, icon: { x: 25.5, y: 13 } },
    lager:       { x: 20, y: 21, w: 12, h: 4, icon: { x: 25.5, y: 21.5 } },
    zeichensaal: { x: 36, y: 6,  w: 5, h: 9, icon: { x: 38, y: 7 } },
    turm:        { x: 43, y: 6,  w: 2, h: 3, icon: { x: 43.5, y: 6 } },
    kantbank:    { x: 41, y: 7,  w: 4, h: 8, icon: { x: 42.5, y: 10 } },
    drehbank:    { x: 35, y: 17, w: 10, h: 7, icon: { x: 39.5, y: 18 } },
    montage:     { x: 35, y: 24, w: 10, h: 4, icon: { x: 39.5, y: 24.5 } },
    kraftwerk:   { x: 23, y: 5,  w: 9, h: 6, icon: { x: 27, y: 6 } }
  },

  // Questpfade: die Quests eines Meilensteins werden gleichmäßig auf dieser Linie verteilt
  paths: {
    MS1: [[19, 38], [19, 34], [15, 30]],
    MS2: [[12, 29], [7, 28], [5, 24], [7, 20], [12, 18], [13, 13], [16, 11], [18, 27], [25, 27], [31, 27]],
    MS3: [[33, 27], [33, 20], [33, 14], [33, 6], [36, 4], [41, 4], [46, 5], [47, 10], [47, 15]],
    MS4: [[47, 18], [47, 24], [46, 29], [41, 29], [36, 29]],
    MS5: [[27, 12]]
  },

  // Deko-Objekte: Kacheln aus SF_Outside_B (Spalte, Zeile), von oben nach unten
  deco: {
    blumen:  [[12, 3]],
    laterne: [[5, 10], [5, 11]],
    schild:  [[14, 4]],
    fass:    [[12, 0]],
    reifen:  [[11, 7]],
    baum:    [[11, 1], [11, 2]],
    automat: [[9, 3]]
  },
  avatars: ['MS_Spieler1', 'MS_Spieler2', 'MS_Spieler3', 'MS_Spieler4']
};
