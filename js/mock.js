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

  // Vorschau-Fortschritt: MS1 + MS2 komplett, MS3 die ersten 6 Quests
  const done = (q, i) => q.ms === 'MS1' || q.ms === 'MS2' || (q.ms === 'MS3' && i < 18);
  const profile = { xp: 2950, level: 8, stufe: 'Zeichenbrettbrecher', klasse: 'Vorschau' };
  const KEY = 'altefabrik_mock_state';
  let offset = 0; // Zeitsprung für Produktionstest

  function load() { try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) {} return neuerStand_(); }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  function ctx() {
    const quests = QUESTS.map((q, i) => Object.assign({}, q, { done: done(q, i) }));
    const allHq = ms => quests.filter(q => q.ms === ms && q.hq).every(q => q.done);
    const areas = { ms1: true, ms2: allHq('MS1') };
    areas.ms3 = areas.ms2 && allHq('MS2'); areas.ms4 = areas.ms3 && allHq('MS3'); areas.ms5 = areas.ms4;
    return { quests, profile, areas, bossDefeated: quests.filter(q => q.ms === 'MS5').every(q => q.done), stand: new Date().toISOString() };
  }
  function answer(state) {
    const c = ctx(), claimed = {};
    (state.claimed || []).forEach(n => claimed[n] = true);
    return { ok: true, now: Date.now() + offset, mock: true, user: { tag: 'Vorschau', klasse: 'Vorschau', xp: profile.xp, level: profile.level, stufe: profile.stufe },
      quests: c.quests.map(q => Object.assign({}, q, { claimed: !!claimed[q.n] })), areas: c.areas, bossDefeated: c.bossDefeated, stand: c.stand, state, rules: REGELN };
  }
  async function call(req) {
    await new Promise(r => setTimeout(r, 250));
    const state = load();
    if (!req.action || req.action === 'login') return answer(state);
    if (req.action === 'mockReset') { save(neuerStand_()); offset = 0; return answer(load()); }
    if (req.action === 'mockSkip') { offset += 4 * 3600000; return Object.assign(answer(state), { msg: '+4 Stunden vorgespult' }); }
    const res = aktion_(req.action, req, state, ctx(), Date.now() + offset);
    if (!res.ok) return Object.assign(answer(state), { ok: false, error: res.error });
    save(state);
    return Object.assign(answer(state), { msg: res.msg || '' });
  }
  return { call };
})();
