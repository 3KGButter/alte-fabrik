// Vorschau-Modus ohne Server: nutzt dieselben Spielregeln wie das Apps Script (server-logic.js = Kopie von Code.gs)
'use strict';
window.MockServer = (() => {
  const Q = (ms, hq, xp, n) => ({ ms, hq, xp, n });
  const QUESTS = [
    Q('MS1', 1, 19, 'Grundregeln des technischen Zeichnens'), Q('MS1', 1, 70, 'Linienarten'), Q('MS1', 1, 50, 'Feedback Grundlagen'),
    Q('MS2', 1, 70, 'Regeln: Bemaßung von flachen, eckigen Werkstücken in einer Ansicht'), Q('MS2', 1, 170, 'Bemaßung von flachen, eckigen Werkstücken in einer Ansicht - Lochblech'),
    Q('MS2', 1, 220, 'Bemaßung von flachen, eckigen Werkstücken in einer Ansicht - Stahlblech'), Q('MS2', 0, 340, 'Bemaßung von flachen, eckigen Werkstücken in einer Ansicht - Kantblech'),
    Q('MS2', 1, 100, 'Regeln: Bemaßung von flachen, abgerundeten Werkstücken in einer Ansicht'), Q('MS2', 1, 260, 'Bemaßung von flachen, abgerundeten Werkstücken in einer Ansicht - Radialblech'),
    Q('MS2', 0, 320, 'Bemaßung von flachen, abgerundeten Werkstücken in einer Ansicht - Führungszapfen'), Q('MS2', 0, 410, 'Bemaßung von flachen, abgerundeten Werkstücken in einer Ansicht - Lasche'),
    Q('MS2', 1, 80, 'wiederholtes Feedback'),
    Q('MS3', 1, 380, 'Erklärvideo: Was ist überhaupt eine Dreitafelprojektion?'), Q('MS3', 1, 190, 'Ergänzungsaufgabe zum Erklärvideo'), Q('MS3', 1, 120, 'Regeln: Darstellen von verdeckten Kanten'),
    Q('MS3', 0, 260, 'Raumbilder zuordnen - eckige WST'), Q('MS3', 1, 480, 'Darstellung in drei Ansichten von eckigen Werkstücken - Stufennut'), Q('MS3', 0, 670, 'Darstellung in drei Ansichten von eckigen Werkstücken - Fräsprisma'),
    Q('MS3', 1, 140, 'Regeln: Darstellen und Bemaßen von schrägen Flächen'), Q('MS3', 0, 310, 'Raumbilder zuordnen - schräge Flächen'), Q('MS3', 1, 770, 'Darstellung in drei Ansichten von schrägen Flächen - Prismenführung'),
    Q('MS3', 0, 860, 'Darstellung in drei Ansichten von schrägen Flächen - Konsolenstütze'), Q('MS3', 1, 170, 'Regeln: Darstellen und Bemaßen von Drehteilen'), Q('MS3', 0, 360, 'Raumbilder zuordnen - Drehteile'),
    Q('MS3', 1, 960, 'Darstellung in drei Ansichten von Drehteilen - Zylinderabstufung'), Q('MS3', 0, 920, 'Darstellung in drei Ansichten von Drehteilen - Passstück'), Q('MS3', 0, 250, 'Erklärvideo: Konstruktion schräg geschnittener Drehteile'),
    Q('MS3', 0, 360, 'Raumbilder zuordnen - Drehteile schräg geschnitten'), Q('MS3', 0, 640, 'Darstellung in drei Ansichten von Drehteilen schräg geschnitten - Formzylinder'),
    Q('MS3', 0, 830, 'Darstellung in drei Ansichten von Drehteilen schräg geschnitten - Einspannzapfen'), Q('MS3', 0, 770, 'Darstellung in drei Ansichten von Drehteilen schräg geschnitten - Hohlzylinder'),
    Q('MS4', 0, 200, 'Regeln: Schnittdarstellungen im Vollschnitt'), Q('MS4', 0, 520, 'Darstellung von Schnittansichten im Vollschnitt - Spannklaue'), Q('MS4', 0, 370, 'Quiz: Vollschnitt'),
    Q('MS4', 0, 730, 'Darstellung von Schnittansichten im Vollschnitt - Spannoberteil'), Q('MS4', 0, 210, 'Regeln: Schnittdarstellungen im Halb- und Teilschnitt'),
    Q('MS4', 0, 1140, 'Darstellung von Schnittansichten im Teilschnitt - Flansch'), Q('MS4', 0, 830, 'Darstellung von Schnittansichten im Teilschnitt - Spannplatte'),
    Q('MS4', 0, 230, 'Regeln: Gewindedarstellung'), Q('MS4', 0, 980, 'Darstellung von Gewinden - Schraubkloben'), Q('MS4', 0, 1040, 'Darstellung von Gewinden - Gabelkopf'),
    Q('MS5', 1, 2500, '1. Arbeitsprobe')
  ].map(q => Object.assign(q, { hq: !!q.hq }));

  // Vorschau-Fortschritt, umschaltbar mit ?stand=frueh | mitte | weit | alles
  let STAND = 'mitte';
  try { STAND = new URLSearchParams(location.search).get('stand') || localStorage.getItem('altefabrik_mock_stand') || 'mitte'; } catch (e) {}
  const done = (q, i) => {
    if (STAND === 'alles') return true;
    if (STAND === 'frueh') return q.ms === 'MS1' && i < 2;
    if (STAND === 'weit') return q.ms !== 'MS4' || i % 2 === 0;
    return q.ms === 'MS1' || q.ms === 'MS2' || (q.ms === 'MS3' && i % 3 === 0);
  };
  const profile = { xp: 9950, level: 12, stufe: 'Zeichenbrettbrecher', klasse: 'Vorschau' };
  const KEY = 'altefabrik_mock_state3';
  let offset = 0; // Zeitsprung für Produktionstest
  try { offset = Number(localStorage.getItem(KEY + '_off')) || 0; } catch (e) {}

  function ctx() {
    const quests = QUESTS.map((q, i) => Object.assign({}, q, { done: done(q, i) }));
    return kontextAusQuests_(quests, profile, new Date().toISOString());
  }
  function load(c) { let s = null; try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} return bauFertig_(migriere_(s, c), Date.now() + offset); }   /* fällige Bauten fertigstellen wie auf dem Server */
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); localStorage.setItem(KEY + '_off', String(offset)); } catch (e) {} }
  function answer(state, c) {
    return Object.assign(antwort_({ tag: 'Vorschau', klasse: 'Vorschau' }, state, c), { now: Date.now() + offset, mock: true });
  }
  async function call(req) {
    await new Promise(r => setTimeout(r, 200));
    const c = ctx(), state = load(c);
    if (!req.action || req.action === 'login') return answer(state, c);
    if (req.action === 'mockReset') { offset = 0; const s = neuerStand_(); save(s); return answer(s, c); }
    if (req.action === 'mockBau') { if (state.bau) for (const k in state.bau) state.bau[k] = Date.now() + offset - 1000; bauFertig_(state, Date.now() + offset); save(state); return Object.assign(answer(state, c), { msg: 'Bauarbeiten abgeschlossen' }); }   /* nur für Tests */
    if (req.action === 'mockSkip') { offset += 12 * 3600000; save(state); return Object.assign(answer(state, c), { msg: '+12 Stunden vorgespult' }); }
    if (req.action === 'mockStand') { try { localStorage.setItem('altefabrik_mock_stand', req.stand); } catch (e) {} STAND = req.stand; const c2 = ctx(); return Object.assign(answer(state, c2), { msg: 'Fortschritt: ' + req.stand }); }
    if (req.action === 'mockParts') { PART_KEYS_.forEach(k => state.store[k] = (state.store[k] || 0) + 300); save(state); return Object.assign(answer(state, c), { msg: '+300 Teile jeder Sorte' }); }
    if (req.action === 'rangliste') {   // erfundene Gamertags für die Vorschau
      const NAMES = ['Zahnradprofi', 'Blechbieger', 'Fraesfuchs', 'Drehwurm', 'Gewindeguru', 'Kantenkoenig', 'Spaenesammler', 'Nutenmeister', 'Schraubstock', 'Messschieber', 'Pixelpresse', 'Kurbelkind', 'Stahlstern', 'Funkenflug', 'Hebelheld', 'Lochblech', 'Passfeder', 'Bohrfutter', 'Werkbankwolf', 'Toleranztiger', 'Kugellager', 'Senkkopf'];
      const mk = (kl, me) => { const l = NAMES.map((n, i) => ({ tag: kl === '11T1' ? n : n + kl.slice(-1), xp: 5200 - i * 190 - (i % 3) * 20 })); if (me) l.splice(13, 0, { tag: me, xp: 2800 }); return l.sort((a, b) => b.xp - a.xp).map((e, i) => Object.assign(e, { p: i + 1, level: Math.max(1, Math.floor(e.xp / 400)), stufe: ['Bleistiftspitzer', 'Linienverwackler', 'Geodreieckamateur', 'Maßstabsmeister'][Math.min(3, Math.floor(e.xp / 1500))] })); };
      if (String(req.tag).toLowerCase() === 'demo') { const kl = ['11T1', '11T2', '11T3', '11T4'].indexOf(req.klasse) >= 0 ? req.klasse : '11T1'; return { ok: true, lehrer: true, klassen: ['11T1', '11T2', '11T3', '11T4'], klasse: kl, liste: mk(kl) }; }
      const all = mk('11T1', req.tag); return { ok: true, klasse: '11T1', liste: all.slice(0, 10), ich: all.find(e => e.tag === req.tag), gesamt: all.length };
    }
    if (req.action === 'mockStamps') { state.stamps = (state.stamps || 0) + 10; save(state); return Object.assign(answer(state, c), { msg: '+10 Stempel' }); }
    if (req.action === 'mockRich') { state.gears = (state.gears || 0) + 500; save(state); return Object.assign(answer(state, c), { msg: '+500 Zahnräder' }); }
    const res = aktion_(req.action, req, state, c, Date.now() + offset);
    if (!res.ok) return Object.assign(answer(load(c), c), { ok: false, error: res.error });
    save(state);
    return Object.assign(answer(state, c), { msg: res.msg || '', got: res.got });
  }
  return { call };
})();
