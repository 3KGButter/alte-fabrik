// ============ EINSTELLUNGEN DES SPIELS ============
// Web-App-URL des Apps Scripts. Leer lassen = Vorschau-Modus ohne Server (Daten nur auf diesem Gerät).
window.API_URL = 'https://script.google.com/macros/s/AKfycbzMcUk6jh7ICRbSCgIS3m-cb2s1sW-Lc_QrAt6P0RNWzYOZXm5bdWyFvqWAVj8Qh0TK/exec';
// Ein Spieltag im Zeitraffer dauert so viele Minuten:
window.DAY_MINUTES = 10;
// Vorschau ohne Server zum Ausprobieren: Adresse mit ?vorschau aufrufen (Daten bleiben nur auf diesem Gerät)
if (/[?&]vorschau/.test(location.search)) window.API_URL = '';
