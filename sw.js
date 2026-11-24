// Offline-Ablage (v160): erzeugt mit tools/mk_sw.py, nicht von Hand ändern.
// Beim ersten Start werden die Spieldateien still auf dem Gerät abgelegt; weitere Starts kommen von dort.
// Startseite: zuerst aus dem Netz (damit ein neuer Stand sofort ankommt), bei schlechtem Netz nach 4 s vom Gerät.
// Dateien mit ?v=… ändern bei einem neuen Stand ihren Namen und werden dann einmal neu geholt. Spielstände (Google) laufen nie hierüber.
const V = '160', C = 'altefabrik-' + V;
const CORE = [
"./",
"index.html",
"manifest.json",
"style.css?v=160",
"js/config.js?v=160",
"js/server-logic.js?v=160",
"js/mock.js?v=160",
"js/ufer_spr.js?v=160",
"js/badges.js?v=160",
"js/sfx.js?v=160",
"js/art.js?v=160",
"js/licht.js?v=160",
"js/figpx.js?v=160",
"js/workers.js?v=160",
"js/werkmeister.js?v=160",
"js/overlay.js?v=160",
"js/icons.js?v=160",
"js/scene.js?v=160",
"js/interior.js?v=160",
"js/badgeroom.js?v=160",
"js/leitraum.js?v=160",
"js/leitstand.js?v=160",
"js/game.js?v=160",
"js/sounds-data.js?v=160",
"fonts/pixelify-sans-latin-400-normal-fabrik.woff2",
"fonts/pixelify-sans-latin-600-normal-fabrik.woff2",
"icons/apple-touch-icon.png",
"icons/icon-192.png",
"icons/icon-512.png",
"icons/icon-maskable-512.png"
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => Promise.allSettled(CORE.map(u => c.add(new Request(u, { cache: 'reload' }))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('altefabrik-') && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const merke = (req, res) => { if (res && res.ok && res.type === 'basic') { const k = res.clone(); caches.open(C).then(c => c.put(req, k)); } return res; };
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    e.respondWith(new Promise(ok => {
      let fertig = false; const vomGeraet = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'));
      const t = setTimeout(() => vomGeraet().then(r => { if (r && !fertig) { fertig = true; ok(r); } }), 4000);
      fetch(req).then(r => { merke(req, r.clone()); if (!fertig) { fertig = true; clearTimeout(t); ok(r); } })
        .catch(() => vomGeraet().then(r => { if (!fertig) { fertig = true; clearTimeout(t); ok(r || Response.error()); } }));
    }));
    return;
  }
  if (url.search.includes('v=')) { e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => merke(req, res)))); return; }
  // ohne Versionsnummer (Bilder, Töne, Schrift): sofort vom Gerät, im Hintergrund auffrischen
  e.respondWith(caches.match(req).then(r => { const n = fetch(req).then(res => merke(req, res)).catch(() => r); return r || n; }));
});
