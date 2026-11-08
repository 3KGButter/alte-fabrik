// Geräusche der Alten Fabrik: alles wird live erzeugt (Web Audio), es gibt keine Tondateien und keine Musik.
// Leise und unaufdringlich. Zwei Arten:
//   SFX.play(name, { vol, pan })   einmaliges Ereignis (Presse schlägt zu, Münze, Hupe …)
//   SFX.hum(name, stärke, pan)    Dauergeräusch, in jedem Bild aufrufen, solange es klingen soll (verstummt sanft von selbst)
//   SFX.edge(key, bedingung, name, opts)  spielt name genau dann, wenn bedingung von false auf true wechselt
// WICHTIG für Erweiterungen: Bekommt das Spiel etwas Neues (Maschine, Fahrzeug, Tier, Aktion), bekommt es hier ein passendes Geräusch.
const SFX = (() => {
  let ac = null, out = null, nb = null, frameN = 0, on = true;
  try { on = localStorage.getItem('altefabrik_sound') !== '0'; } catch (e) {}
  const MASTER = .8;   /* Gesamtlautstärke (vorher zu leise) */
  /* iPhone/iPad: Im Stumm-Modus schaltet Safari Web-Audio ab. Eine stumme, laufende Audiodatei und audioSession = 'playback' machen das Spiel zur „Wiedergabe“, dann ist es hörbar (wie bei Videos). */
  let unlockEl = null;
  function iosUnlock() {
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) {}
    if (unlockEl) return; try { unlockEl = document.createElement('audio'); unlockEl.setAttribute('playsinline', ''); unlockEl.loop = true; unlockEl.src = 'data:audio/wav;base64,UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; const pr = unlockEl.play(); if (pr && pr.catch) pr.catch(() => { unlockEl = null; }); } catch (e) { unlockEl = null; }
  }
  function ensure() {
    if (on) iosUnlock();
    if (ac) { if (ac.state !== 'running' && on && !document.hidden) ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ac = new AC(); } catch (e) { ac = null; return; }
    ac.onstatechange = () => { if (ac.state !== 'running' && on && !document.hidden) { try { ac.resume(); } catch (e) {} } };   /* nach Unterbrechung (Anruf, andere App) selbst wieder anlaufen */
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -8; comp.knee.value = 10; comp.ratio.value = 2.5; comp.attack.value = .01; comp.release.value = .3;   /* nur Schutz vor Übersteuern: Geräusche überlagern sich, statt sich gegenseitig wegzudrücken */
    out = ac.createGain(); out.gain.value = on ? MASTER : 0; out.connect(comp); comp.connect(ac.destination);
    nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    loadSamples();
  }
  // ---------- Aufnahmen (CC0/CC BY, siehe sounds/QUELLEN.md): werden beim ersten Tippen dekodiert; bis dahin bzw. falls etwas fehlt, klingen die erzeugten Töne ----------
  const BUF = {};
  function loadSamples() {
    const D = window.SFX_DATA || {};
    Object.keys(D).forEach(k => { try { const b64 = D[k].split(',')[1], bin = atob(b64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const pr = ac.decodeAudioData(arr.buffer, b => { BUF[k] = b; }, () => {}); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {} }); }
  function sample(dst, t, name, o) {   // eine Aufnahme abspielen; o: rate, lp (Tiefpass), vol
    const b = BUF[name]; if (!b) return false; o = o || {}; const s = ac.createBufferSource(); s.buffer = b; s.playbackRate.value = (o.rate || 1) * (1 + (Math.random() - .5) * (o.vary === undefined ? .08 : o.vary));
    let n = s; if (o.lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; s.connect(f); n = f; } const g = ac.createGain(); g.gain.value = o.vol === undefined ? 1 : o.vol; n.connect(g); g.connect(dst); s.start(t); return true; }
  function loopSample(name, dst, vol, lp, hp) { const b = BUF[name]; if (!b) return null; const s = ac.createBufferSource(); s.buffer = b; s.loop = true; let n = s;
    if (hp) { const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; n.connect(f); n = f; } if (lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; n.connect(f); n = f; }
    const g = ac.createGain(); g.gain.value = vol; n.connect(g); g.connect(dst); s.start(ac.currentTime, Math.random() * Math.max(0, b.duration - 2)); return s; }
  // Ereignisse, die eine Aufnahme statt des erzeugten Tons verwenden (Lautstärken bewusst leise, „cozy“)
  const SAMPLED = {
    coin: ['muenze_teile_erhalten', .35], page: ['blaettern', .3, { lp: 2400 }], stamp: ['stempel', .3], place: ['ablegen', .5], unplace: ['ablegen', .4, { rate: 1.2 }], crate: ['holz_bauen', .5, { rate: 1.15, lp: 2600 }], gateCreak: ['knarren_kiste', .45, { rate: .55, lp: 2200, vary: .02 }],   /* Werkstor: langsam, lang gezogen */   /* Kiste öffnen: hölzernes Klonk */
    press: ['presse_schlag', .3, { lp: 2600, rate: .9 }], clank: ['metall_klong', .25, { lp: 3000 }], hammer: [['hammer_holz', 'hammer_holz2'], .32], build: ['holz_bauen', .45], thud: ['dumpfer_aufprall', .4, { lp: 1800 }],
    step: ['schritt_beton', .22, { lp: 2400 }], creak: ['knarren_kiste', .4], wood: ['hammer_holz', .35], assemble: ['metall_klick_montage', .3, { lp: 3500 }], latch: ['metall_einrasten_montage', .28, { lp: 3500 }], blade: ['klinge_ausfahren', .45, { vary: .03 }], mstep: ['mecha_schritt', .55, { lp: 2400 }, true], door: ['tuer_auf', .32, { lp: 3500 }]
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(e => addEventListener(e, ensure, { capture: true, passive: true }));   // Browser erlauben Ton erst nach dem ersten Tippen
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) { ac.suspend(); if (unlockEl) unlockEl.pause(); } else if (on) { ac.resume(); if (unlockEl) unlockEl.play().catch(() => {}); } });
  const ready = () => !!ac && on && ac.state === 'running';
  const clampPan = p => Math.max(-1, Math.min(1, p || 0));

  // ---------- Bausteine ----------
  function bus(vol, pan, keep) { const g = ac.createGain(); g.gain.value = vol; let p = null; if (pan && ac.createStereoPanner) { p = ac.createStereoPanner(); p.pan.value = clampPan(pan); g.connect(p); p.connect(out); } else g.connect(out);
    if (!keep) setTimeout(() => { try { g.disconnect(); if (p) p.disconnect(); } catch (e) {} }, 6000);   /* aufräumen: sonst wächst der Audio-Graph, bis der Ton ausfällt */
    return g; }
  function env(g, t0, a, peak, d) { g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t0 + a); g.gain.exponentialRampToValueAtTime(.0001, t0 + a + d); }
  function tone(dst, t0, f, dur, vol, o) {
    o = o || {}; const s = ac.createOscillator(); s.type = o.type || 'sine'; s.frequency.setValueAtTime(f, t0);
    if (o.to) s.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.slide || dur));
    const g = ac.createGain(); env(g, t0, o.a || .005, vol, dur); let n = s;
    if (o.lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t0); if (o.lpTo) fl.frequency.exponentialRampToValueAtTime(o.lpTo, t0 + dur); s.connect(fl); n = fl; }
    n.connect(g); g.connect(dst); s.start(t0); s.stop(t0 + (o.a || .005) + dur + .05);
  }
  function hiss(dst, t0, dur, vol, o) {
    o = o || {}; const s = ac.createBufferSource(); s.buffer = nb; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.f || 1000, t0); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur); f.Q.value = o.q || .7;
    const g = ac.createGain(); env(g, t0, o.a || .004, vol, dur); s.connect(f); f.connect(g); g.connect(dst); s.start(t0, Math.random() * 1.5); s.stop(t0 + (o.a || .004) + dur + .05);
  }
  // weiche „Tink“-Töne statt hartem Metall: Dreieckswelle, sanft abklingend, oben abgerundet
  const tink = (d, t, v, f) => { tone(d, t, f, .18, v, { type: 'triangle', lp: 2600 }); tone(d, t, f * 2.01, .1, v * .25, { lp: 3000 }); };
  const knock = (d, t, v, f) => { tone(d, t, f || 420, .07, v, { type: 'triangle', to: (f || 420) * .7, lp: 1400 }); hiss(d, t, .03, v * .25, { type: 'bandpass', f: (f || 420) * 2.4, q: 5 }); };   // Holzklopfen
  const R = (a, b) => a + Math.random() * (b - a);
  const N = [523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5, 1568, 1760];   // Pentatonik (C-Dur), damit alles freundlich zusammenklingt

  // ---------- Einmal-Geräusche (gemütlich: rund, leise, eher Holz und Glöckchen als Industrie) ----------
  const LIB = {
    click: (d, t) => knock(d, t, .04, 520),   /* weicher, tieferer Klick */
    coin: (d, t) => { tone(d, t, N[7], .16, .09, { type: 'triangle', lp: 3000 }); tone(d, t + .08, N[9], .32, .08, { type: 'triangle', lp: 3200 }); tone(d, t + .08, N[9] * 2, .2, .012); },
    build: (d, t) => { for (let i = 0; i < 3; i++) knock(d, t + i * .12, .12, 380 + i * 40); [N[2], N[4], N[5]].forEach((f, i) => tone(d, t + .42 + i * .07, f, .3, .06, { type: 'triangle', lp: 2600 })); },
    place: (d, t) => { tone(d, t, 260, .16, .16, { to: 130, lp: 900 }); hiss(d, t, .08, .05, { f: 600 }); },
    unplace: (d, t) => tone(d, t, 330, .14, .1, { type: 'triangle', to: 660, lp: 1800 }),
    error: (d, t) => { tone(d, t, 440, .12, .06, { type: 'triangle', lp: 1500 }); tone(d, t + .13, 349, .18, .06, { type: 'triangle', lp: 1400 }); },
    badge: (d, t) => { [N[0], N[2], N[3], N[5]].forEach((f, i) => tone(d, t + i * .13, f, .45, .08, { type: 'triangle', a: .02, lp: 2600 })); [N[7], N[9]].forEach((f, i) => tone(d, t + .55 + i * .09, f, .7, .025)); },
    unlock: (d, t) => { [N[5], N[7], N[8]].forEach((f, i) => tink(d, t + i * .1, .05, f)); },
    crate: (d, t) => { knock(d, t, .1, 330); knock(d, t + .1, .08, 300); tone(d, t + .22, N[5], .3, .05, { type: 'triangle' }); tone(d, t + .3, N[7], .4, .045, { type: 'triangle' }); },
    stamp: (d, t) => { tone(d, t, 180, .12, .14, { to: 90, lp: 700 }); knock(d, t, .06, 260); },
    page: (d, t) => { hiss(d, t, .18, .03, { type: 'bandpass', f: 2400, to: 1200, q: .8, a: .03 }); knock(d, t + .12, .025, 520); },   /* Schildseite umblättern: kurzes Rascheln */
    quack: (d, t) => { for (let i = 0; i < 2; i++) { const t0 = t + i * .22, o2 = ac.createOscillator(), f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(), g = ac.createGain(), g2 = ac.createGain();   /* Enten: nasales „Wak-wak“ */
      o2.type = 'sawtooth'; o2.frequency.setValueAtTime(330 - i * 20, t0); o2.frequency.exponentialRampToValueAtTime(230 - i * 15, t0 + .16);
      f1.type = 'bandpass'; f1.frequency.value = 1150; f1.Q.value = 5; f2.type = 'bandpass'; f2.frequency.value = 2300; f2.Q.value = 6;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.045, t0 + .015); g.gain.exponentialRampToValueAtTime(.001, t0 + .17); g2.gain.value = .5;
      o2.connect(f1); o2.connect(f2); f1.connect(g); f2.connect(g2); g2.connect(g); g.connect(d); o2.start(t0); o2.stop(t0 + .2); } },
    hoot: (d, t) => { if (sample(d, t, 'eule_huhu', { vol: .6, vary: .04 })) return;   /* Aufnahme, sobald hochgeladen */ for (const [dt0, f, f2, dur, v] of [[0, 410, 385, .34, .07], [.5, 410, 400, .22, .05], [.8, 395, 340, .55, .07]]) { tone(d, t + dt0, f, dur, v, { a: .07, to: f2, lp: 900 }); tone(d, t + dt0, f * 2, dur, v * .15, { a: .07, to: f2 * 2, lp: 1200 }); hiss(d, t + dt0, dur, v * .12, { type: 'bandpass', f: 800, q: 2, a: .06 }); } },   /* Eule: „Huu – hu – huuu“, hörbar */   /* Eule: „Huu – hu – huuu“ */
    plop: (d, t) => { tone(d, t, 900, .09, .04, { to: 300, lp: 1600 }); hiss(d, t + .02, .12, .015, { f: 1200 }); },   /* Schwimmer oder Fisch: kleines Platschen */
    oar: (d, t) => { hiss(d, t, .35, .03, { type: 'bandpass', f: 700, to: 400, q: .8, a: .06 }); tone(d, t + .05, 260, .12, .015, { to: 180, lp: 700 }); },   /* Ruder ziehen durchs Wasser */
    shift: (d, t) => { tone(d, t, 494, 1.3, .035, { type: 'triangle', a: .2, lp: 1400 }); tone(d, t, 587, 1.3, .025, { type: 'triangle', a: .2, lp: 1400 }); hiss(d, t, 1.4, .02, { type: 'bandpass', f: 2200, q: .7, a: .2 }); },   /* Werkspfeife: weicher Dampfton zu Schichtbeginn, Mittag und Feierabend */
    flap: (d, t) => { for (let i = 0; i < 4; i++) hiss(d, t + i * .07, .05, .018, { type: 'bandpass', f: 1500, q: 1 }); },   /* Flügelschlag */
    sweep: (d, t) => tone(d, t, 240, .6, .025, { type: 'triangle', to: 300, lp: 700, a: .1 }),   /* Scheinwerfer schwenkt */
    lantern: (d, t) => { tink(d, t, .02, 1568); tink(d, t + .09, .015, 1760); },   /* Laterne klirrt leise */
    mstep: (d, t) => { tone(d, t, 58, .5, .24, { to: 38, lp: 220, a: .008 }); tone(d, t, 104, .2, .06, { type: 'triangle', to: 74, lp: 380 }); hiss(d, t, .18, .045, { f: 240 }); knock(d, t + .03, .035, 170); },   /* Mecha-Schritt: tiefer, weicher Stampfer mit leisem Metallklang */
    mthud: (d, t) => { tone(d, t, 48, .8, .26, { to: 30, lp: 190, a: .01 }); hiss(d, t, .4, .07, { f: 300, to: 110 }); knock(d, t + .05, .045, 140); tone(d, t + .08, 82, .4, .05, { type: 'triangle', to: 60, lp: 300 }); },   /* Landung: schweres, dumpfes Aufsetzen */
    mservo: (d, t) => { tone(d, t, 72, .5, .06, { type: 'sawtooth', to: 104, lp: 320, a: .05 }); hiss(d, t, .45, .02, { type: 'bandpass', f: 420, q: 3 }); for (let i = 0; i < 4; i++) knock(d, t + .06 + i * .1, .012, 150); },   /* Gelenkmotor: tiefes, rauhes Surren mit Zahnradticken */
    mbeep: (d, t) => { tone(d, t, 330, .08, .045, { type: 'square', lp: 900 }); tone(d, t + .12, 247, .11, .045, { type: 'square', lp: 800 }); },   /* tiefer Roboter-Pieper (zwei Töne) */
    mscan: (d, t) => { tone(d, t, 196, .14, .035, { type: 'square', lp: 700 }); tone(d, t + .18, 196, .14, .03, { type: 'square', lp: 700 }); tone(d, t + .36, 262, .2, .035, { type: 'square', lp: 800 }); },   /* Suchscheinwerfer: Abtast-Signal */
    mzap: (d, t) => { hiss(d, t, .28, .05, { type: 'bandpass', f: 1100, q: 2 }); tone(d, t, 170, .22, .05, { type: 'sawtooth', lp: 700, to: 85 }); },   /* Energiestoß, tief */
    mpower: (d, t) => { tone(d, t, 55, 1.3, .08, { type: 'sawtooth', to: 120, lp: 420, a: .3 }); hiss(d, t, 1.2, .03, { type: 'bandpass', f: 500, to: 1400, q: 1, a: .3 }); },   /* Hochfahren: schweres Anlaufen */
    mjet: (d, t) => { hiss(d, t, 1.1, .08, { f: 170, to: 650, a: .25 }); tone(d, t, 52, .9, .08, { type: 'triangle', to: 92, lp: 240, a: .2 }); },   /* Düsen zünden: tiefes Fauchen */
    msteam: (d, t) => { hiss(d, t, 1, .05, { type: 'bandpass', f: 850, to: 500, q: .6, a: .12 }); tone(d, t, 90, .5, .03, { type: 'triangle', lp: 260, a: .1 }); },   /* Dampf aus den Schultern */
    hammer: (d, t) => { knock(d, t, .035, 640); tink(d, t + .01, .01, 1900); knock(d, t + .22, .03, 600); },   /* Hammerschläge am Gerüst */
    reward: (d, t) => { const ok = sample(d, t, 'muenze_teile_erhalten', { vol: .5 }); sample(d, t + .14, 'muenze_teile_erhalten', { vol: .35, rate: 1.15 }); sample(d, t + .3, 'muenze_teile_erhalten', { vol: .25, rate: 1.3 });   /* Münzklingeln, dreifach */
      for (const [dt0, f] of [[.05, 784], [.17, 988], [.29, 1175]]) tone(d, t + dt0, f, .35, ok ? .025 : .04, { type: 'triangle', lp: 2600 }); },   /* plus leises Glöckchen */
    fwPfiff: (d, t) => { if (sample(d, t, 'feuerwerk_pfiff', { vol: .14, vary: .1 })) return; tone(d, t, 900, .85, .012, { type: 'sine', to: 2100, lp: 3000, a: .08 }); hiss(d, t, .8, .006, { type: 'bandpass', f: 2400, to: 3600, q: 3, a: .08 }); },   /* leises Pfeifen beim Aufsteigen */   /* Rakete steigt pfeifend auf */
    fwKnall: (d, t) => { if (sample(d, t, 'feuerwerk_knall', { vol: .32, vary: .12 })) return;   /* Aufnahme (deine Vorlage) */ hiss(d, t, .35, .14, { type: 'highpass', f: 500, to: 300 }); hiss(d, t, .5, .05, { f: 1800, to: 500 }); tone(d, t, 140, .25, .06, { to: 70, lp: 600 });   /* heller Knall statt Donner */
      for (let i = 0; i < 14; i++) { const tt = t + .25 + Math.random() * 1.1; hiss(d, tt, .025, .02 + Math.random() * .02, { type: 'bandpass', f: 2500 + Math.random() * 2500, q: 3 }); } },   /* Knall mit Nachknistern */
    mlaser: (d, t) => { tone(d, t, 620, .22, .03, { type: 'sine', to: 260, lp: 1400 }); },   /* Platzhalter: weicher, leiser Laser (bis die Aufnahme da ist) */
    squeak: (d, t) => { for (let i = 0; i < 3; i++) tone(d, t + i * .28, 1400 + i * 60, .16, .012, { type: 'sine', to: 1650 + i * 40, lp: 2600, a: .03 }); },   /* Bürostuhl quietscht leise beim Drehen */
    kuckuck: (d, t) => { for (let i = 0; i < 2; i++) { tone(d, t + i * .55, 784, .2, .045, { type: 'triangle', lp: 1800, a: .02 }); tone(d, t + i * .55 + .22, 659, .28, .045, { type: 'triangle', lp: 1800, a: .02 }); } },   /* „Kuck-kuck“ zweimal */
    lampclick: (d, t) => { knock(d, t, .03, 1200); },
    rustle: (d, t) => { if (sample(d, t, 'blaetter_rascheln', { vol: .5, vary: .1 })) return;   /* Aufnahme (Kenney, Gras), sonst erzeugt */ for (let i = 0; i < 14; i++) { const tt = t + i * .045 + Math.random() * .03, v = .006 + Math.sin(i / 13 * Math.PI) * .012; hiss(d, tt, .05 + Math.random() * .04, v, { type: 'bandpass', f: 2200 + Math.random() * 3000, q: .8 }); } },   /* Blätter rascheln: viele weiche, unregelmäßige Rauschtupfer, an- und abschwellend */
    clink: (d, t) => { tink(d, t, .025, 1760); tink(d, t + .09, .02, 1320); tink(d, t + .2, .015, 1568); },   /* Werkzeug klirrt */
    glint: (d, t) => { tone(d, t, 1568, .4, .015, { type: 'sine', lp: 4000 }); tone(d, t + .08, 2093, .5, .012, { type: 'sine', lp: 4000 }); },   /* Glanz läuft über die Abzeichen */
    tapRev: (d, t) => { tone(d, t, 260, .35, .03, { type: 'triangle', to: 190, lp: 900, a: .02 }); hiss(d, t, .3, .008, { type: 'bandpass', f: 3500, q: 4 }); },   /* Gewindebohrer läuft zurück: Motor kurz tiefer, leises Ölzischen */
    binDrop: (d, t) => { for (let i = 0; i < 5; i++) tink(d, t + .03 + i * .045 + Math.random() * .02, .012 + Math.random() * .008, 2400 + Math.random() * 1600); knock(d, t, .02, 340); },   /* kleines Teil fällt klimpernd zu den anderen */
    tapRun: (d, t) => { tone(d, t, 300, .55, .022, { type: 'triangle', to: 330, lp: 1000, a: .06 }); hiss(d, t, .5, .005, { type: 'bandpass', f: 3200, q: 3, a: .06 }); },   /* zweiter Bohrer: kurzes Anlaufen beim Schneiden */
    tick: (d, t) => { knock(d, t, .012, 2200); tink(d, t, .004, 3400); },   /* Pendeluhr: leises Tick … */
    tock: (d, t) => { knock(d, t, .011, 1700); },   /* … und Tack */
    swoosh: (d, t) => hiss(d, t, .4, .025, { type: 'bandpass', f: 700, to: 300, q: .7, a: .1 }),
    lamp: (d, t) => { knock(d, t, .05, 900); tone(d, t + .02, N[4], .12, .02); },
    press: (d, t) => { tone(d, t, 110, .3, .16, { to: 60, lp: 400, a: .01 }); hiss(d, t, .12, .04, { f: 300 }); },
    clank: (d, t) => tink(d, t, .04, R(700, 820)),
    drop: (d, t) => tink(d, t, .035, R(900, 1100)),
    hiss: (d, t) => hiss(d, t, .9, .05, { type: 'bandpass', f: 1800, q: .6, a: .15 }),
    servo: (d, t) => tone(d, t, 300, .28, .04, { type: 'triangle', to: 480, lp: 1200, a: .03 }),
    thud: (d, t) => tone(d, t, 95, .35, .2, { to: 55, lp: 300, a: .01 }),
    step: (d, t) => { tone(d, t, 80, .3, .16, { to: 50, lp: 260, a: .01 }); hiss(d, t, .1, .02, { f: 200 }); },
    chirp: (d, t) => { const f = R(2600, 3800), n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) tone(d, t + i * R(.08, .12), f * R(.92, 1.08), .07, .025, { to: f * R(1.1, 1.3), slide: .05 }); },
    horn: (d, t) => { tone(d, t, 196, 1.2, .05, { type: 'triangle', lp: 500, a: .25 }); tone(d, t, 247, 1.2, .04, { type: 'triangle', lp: 500, a: .25 }); },
    hornShort: (d, t) => { tone(d, t, 196, .5, .04, { type: 'triangle', lp: 500, a: .1 }); tone(d, t, 247, .5, .03, { type: 'triangle', lp: 500, a: .1 }); },
    whistle: (d, t) => tone(d, t, 700, .9, .015, { to: 1600, a: .1 }),
    boom: (d, t) => { tone(d, t, 120, .45, .12, { to: 60, lp: 500, a: .005 }); hiss(d, t, .5, .07, { f: 700, to: 200 }); for (let i = 0; i < 6; i++) tone(d, t + R(.2, .8), N[5 + Math.floor(Math.random() * 5)], .25, .012); },   // weiches Puff mit Glitzern
    beep: (d, t) => tone(d, t, N[4], .12, .03, { type: 'triangle', lp: 2000 }),
    meow: (d, t) => { tone(d, t, 620, .14, .03, { to: 900, type: 'triangle', lp: 1800 }); tone(d, t + .14, 900, .22, .025, { to: 560, type: 'triangle', lp: 1600 }); },
    creak: (d, t) => tone(d, t, 140, .5, .03, { type: 'triangle', to: 110, lp: 500, a: .1 }),
    crash: (d, t) => { hiss(d, t, .6, .12, { f: 700, to: 200 }); tone(d, t, 90, .4, .2, { to: 45, lp: 300 }); for (let i = 0; i < 4; i++) knock(d, t + R(0, .3), .06, R(250, 450)); },
    wood: (d, t) => { for (let i = 0; i < 5; i++) knock(d, t + R(0, .35), .08, R(220, 420)); },
    zap: (d, t) => tone(d, t, N[Math.floor(Math.random() * 6) + 3], .25, .03, { type: 'triangle', lp: 3000 }),
    powerup: (d, t) => { tone(d, t, 130, 2.6, .05, { type: 'triangle', to: 520, lp: 900, a: .6 }); [N[0], N[2], N[3], N[5]].forEach((f, i) => tone(d, t + 1.6 + i * .18, f, .8, .04, { type: 'triangle', a: .03 })); },
    ding: (d, t) => tone(d, t, N[8], .4, .025, { type: 'triangle' }),
    whoosh: (d, t) => hiss(d, t, .5, .06, { type: 'bandpass', f: 400, to: 1200, q: .7, a: .12 }),
    jetStart: (d, t) => { hiss(d, t, .9, .08, { f: 300, to: 1400, a: .25 }); tone(d, t, 90, .7, .05, { type: 'triangle', to: 160, lp: 400, a: .2 }); },
    chain: (d, t) => { for (let i = 0; i < 14; i++) tink(d, t + i * .14 + R(0, .04), .018, R(1300, 1700)); },   // Kette rasselt leise nach oben
    blade: (d, t) => { tone(d, t, 1568, .5, .035, { type: 'triangle', to: 2350, slide: .25, a: .02 }); tone(d, t + .05, 3136, .35, .01); },   // Klinge: helles „Ssching“
    cheer: (d, t) => { [N[0], N[2], N[3], N[5], N[7]].forEach((f, i) => tone(d, t + i * .12, f, .6, .05, { type: 'triangle', a: .02, lp: 2800 })); }
  };
  const last = {};
  function play(name, o) {
    if (!ready()) return; const f = LIB[name], sm = SAMPLED[name]; if (!f && !sm) return; o = o || {};
    const now = ac.currentTime; if (last[name] && now - last[name] < (o.gap || .06)) return; last[name] = now;
    try { const dst = bus(o.vol === undefined ? 1 : o.vol, o.pan), t = now + (o.delay || 0);
      if (sm) { const nm = Array.isArray(sm[0]) ? sm[0][Math.floor(Math.random() * sm[0].length)] : sm[0]; if (sample(dst, t, nm, Object.assign({ vol: sm[1] }, sm[2] || {})) && !sm[3]) return; }   /* sm[3]: zusätzlich der erzeugte Ton (z. B. tiefer Bass beim Mecha-Schritt) */
      if (f) f(dst, t); } catch (e) {}   /* Aufnahme, sonst erzeugter Ton */
  }

  // ---------- Dauergeräusche ----------
  const src = () => { const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; s.start(0, Math.random() * 1.5); return s; };
  const osc = (type, f) => { const s = ac.createOscillator(); s.type = type; s.frequency.value = f; s.start(); return s; };
  const filt = (type, f, q) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || .7; return b; };
  const gain = v => { const g = ac.createGain(); g.gain.value = v; return g; };
  // a -> b -> c verbinden; gibt das letzte Glied zurück
  const ch = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };
  function am(node, rate, depth, type) {   // Lautstärke rhythmisch schwanken lassen (Grillen, Tuckern, Rattern)
    const g = gain(1 - depth / 2), l = osc(type || 'sine', rate), lg = gain(depth / 2);   /* schwankt zwischen 1 - depth und 1 */ ch(l, lg, g.gain); node.connect(g); return { out: g, nodes: [l] };
  }
  // Dauergeräusche: leise, gedämpft (Tiefpass), eher Brummen und Rascheln als Kreischen
  const HUMS = {
    crickets: o => { const mg = gain(.5), l = osc('sine', .045), lg = gain(.42); ch(l, lg, mg.gain); mg.connect(o); const r0 = loopSample('grillen_schleife', mg, 1, 4200); if (r0) return [r0, l];   /* Aufnahme, langsam an- und abschwellend */ const ns = []; [[4200, 22, .8], [3900, 26, 1.1]].forEach(([f, r, s2]) => { const s1 = osc('sine', f); const a = am(s1, r, 1, 'sine'); const b = am(a.out, s2, .9); ch(b.out, gain(.025), o); ns.push(s1, ...a.nodes, ...b.nodes); }); return ns; },
    water: o => { const r = loopSample('wasser_see_schleife', o, .5, 650); if (r) return [r]; const s1 = src(), a = am(ch(s1, filt('lowpass', 350)), .2, .5); ch(a.out, gain(.35), o); return [s1, ...a.nodes]; },   /* Plätschern des Sees (Aufnahme) */
    wind: o => { const r = loopSample('wind_schleife', o, .5, 1600, 120); return r ? [r] : []; },   /* leiser Wind, vor allem nachts */
    plane: o => { const s1 = src(); ch(s1, filt('lowpass', 220), gain(.35), o); return [s1]; },
    chug: o => { const s1 = src(), a = am(ch(s1, filt('lowpass', 180)), 2.6, .8); ch(a.out, gain(.5), o); return [s1, ...a.nodes]; },
    engine: o => { const a1 = osc('triangle', 55), f = filt('lowpass', 220); a1.connect(f); const a = am(f, 9, .3); ch(a.out, gain(.2), o); return [a1, ...a.nodes]; },
    forklift: o => { const a1 = osc('triangle', 70), f = filt('lowpass', 260); a1.connect(f); const a = am(f, 11, .3); ch(a.out, gain(.15), o); return [a1, ...a.nodes]; },
    motor: o => { const a1 = osc('triangle', 150); ch(a1, filt('lowpass', 420), gain(.1), o); return [a1]; },
    fountain: o => { const s1 = src(), a = am(ch(s1, filt('bandpass', 1400, .6)), .7, .4); ch(a.out, gain(.06), o); const s2 = src(); ch(s2, filt('lowpass', 420), gain(.08), o); return [s1, s2, ...a.nodes]; },   /* sanftes Plätschern statt Rauschen */
    diesel: o => { const a1 = osc('triangle', 42), f = filt('lowpass', 160); a1.connect(f); const a = am(f, 7, .4); ch(a.out, gain(.3), o); return [a1, ...a.nodes]; },
    turbine: o => { const a1 = osc('sine', 98), a2 = osc('sine', 147); ch(a1, gain(.18), o); ch(a2, gain(.05), o); return [a1, a2]; },
    spindle: o => { const a1 = osc('triangle', 110); ch(a1, filt('lowpass', 240), gain(.14), o); return [a1]; },
    mill: o => { const a1 = osc('triangle', 330), s1 = src(); ch(a1, filt('lowpass', 600), gain(.05), o); const a = am(ch(s1, filt('bandpass', 1500, .8)), 12, .5); ch(a.out, gain(.05), o); return [a1, s1, ...a.nodes]; },
    lathe: o => { const s1 = src(), w = osc('sine', 392); ch(s1, filt('bandpass', 1200, .8), gain(.06), o); ch(w, gain(.012), o); return [s1, w]; },
    drill: o => { const a1 = osc('triangle', 260); ch(a1, filt('lowpass', 700), gain(.05), o); return [a1]; },
    servo: o => { const a1 = osc('triangle', 220); ch(a1, filt('lowpass', 600), gain(.05), o); return [a1]; },
    conveyor: o => { const s1 = src(), a = am(ch(s1, filt('bandpass', 600, .8)), 7, .6); ch(a.out, gain(.1), o); return [s1, ...a.nodes]; },
    fan: o => { const s1 = src(), a = am(ch(s1, filt('lowpass', 450)), 4, .2); ch(a.out, gain(.2), o); return [s1, ...a.nodes]; },
    hoist: o => { const a1 = osc('sine', 118), a2 = osc('sine', 177); ch(a1, gain(.05), o); ch(a2, filt('lowpass', 400), gain(.015), o); return [a1, a2]; },   /* Kran: nur ein leises, warmes Summen */
    hydraulic: o => { const n = src(), a1 = osc('triangle', 170); ch(n, filt('lowpass', 900), gain(.12), o); ch(a1, filt('lowpass', 500), gain(.03), o); return [n, a1]; },   /* Hebebühne: weiches Hydraulikzischen */
    jet: o => { const r = loopSample('duesen_schleife', o, .9, 1500, 70); if (r) return [r]; const s1 = src(); ch(s1, filt('lowpass', 700), gain(.3), o); return [s1]; },   /* Düsen: ruhiges Raketenrauschen (Aufnahme) */
    reactor: o => { const r = loopSample('maschinenraum_brummen_schleife', o, .7, 1400, 140); if (r) return [r]; const a2 = osc('sine', 98.1); ch(a2, filt('lowpass', 300), gain(.05), o); return [a2]; },   /* weiches Raumbrummen statt tiefem Wummern */
    weld: o => { const s1 = src(), a = am(ch(s1, filt('bandpass', 2400, .7)), 9, .8); ch(a.out, gain(.04), o); return [s1, ...a.nodes]; }
  };
  const live = {};
  const QUIET = { spindle: .45, mill: .45, lathe: .45, drill: .4, conveyor: .5, fan: .5, turbine: .45, diesel: .45, chug: .9, engine: .6, forklift: .6, motor: .6, weld: .4, servo: .55 };
  function hum(name, level, pan) {
    if (!ready() || !(level > .001)) return; if (QUIET[name]) level *= QUIET[name]; let L = live[name];   /* Dauergeräusche der Maschinen gedämpft */
    if (!L) { const def = HUMS[name]; if (!def) return; const g = gain(0); let p = null;
      if (ac.createStereoPanner) { p = ac.createStereoPanner(); g.connect(p); p.connect(out); } else g.connect(out);
      let nodes = []; try { nodes = def(g); } catch (e) {} L = live[name] = { g, p, nodes, want: 0, seen: -1, quiet: 0 }; }
    L.want = L.seen === frameN ? Math.max(L.want, level) : level; L.seen = frameN;
    if (L.p && pan !== undefined) L.p.pan.setTargetAtTime(clampPan(pan), ac.currentTime, .15);
  }
  function cut() {   // Raumwechsel: alle Dauergeräusche während des Bildübergangs sanft ausblenden
    if (!ac) return; for (const k in live) { const L = live[k]; try { L.g.gain.cancelScheduledValues(ac.currentTime); L.g.gain.setTargetAtTime(0, ac.currentTime, .08); } catch (e) {} L.want = 0; L.seen = -1; L.quiet = 1.5; } }
  let lastResume = 0;
  function frame(dt) {   // am Ende jedes Bildes: nicht mehr gerufene Dauergeräusche ausblenden
    if (!ac) return; const now = ac.currentTime;
    if (ac.state !== 'running' && on && !document.hidden && performance.now() - lastResume > 2000) { lastResume = performance.now(); try { ac.resume(); } catch (e) {} if (unlockEl && unlockEl.paused) unlockEl.play().catch(() => {}); }
    for (const k in live) { const L = live[k], w = L.seen === frameN ? Math.min(1, L.want) : 0; L.g.gain.setTargetAtTime(w, now, .18);
      if (w === 0) { L.quiet += dt || .016; if (L.quiet > 2) { L.nodes.forEach(n => { try { n.stop(); } catch (e) {} }); try { L.g.disconnect(); } catch (e) {} delete live[k]; } } else L.quiet = 0; }
    frameN++;
  }
  const edges = {};
  const onceSeen = new Map();
  function once(key, name, o) { if (onceSeen.has(key)) return; onceSeen.set(key, 1); if (onceSeen.size > 400) onceSeen.delete(onceSeen.keys().next().value); play(name, o); }
  function edge(key, cond, name, o) { const was = edges[key]; edges[key] = !!cond; if (cond && was === false) play(name, o); }
  function setOn(v) { on = !!v; try { localStorage.setItem('altefabrik_sound', on ? '1' : '0'); } catch (e) {} if (!on && unlockEl) unlockEl.pause(); ensure(); if (out) out.gain.setTargetAtTime(on ? MASTER : 0, ac.currentTime, .05); if (on && ac && ac.state === 'suspended') ac.resume(); }
  const panX = (x, W) => (x / (W || 384) * 2 - 1) * .7;
  return { _bufs: () => Object.keys(BUF), once, cut, play, hum, frame, edge, setOn, get on() { return on; }, panX, _test: () => { ensure(); const errs = []; for (const k in LIB) { try { LIB[k](bus(.0001), ac.currentTime); } catch (e) { errs.push(k + ": " + e.message); } } for (const k in HUMS) { try { const g = gain(0); g.connect(out); HUMS[k](g).forEach(n => n.stop()); } catch (e) { errs.push(k + ": " + e.message); } } return errs; } };
})();
window.SFX = SFX;
