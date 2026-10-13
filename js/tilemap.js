// Zeichnet eine RPG-Maker-MZ-Karte (Map + Tileset) auf Canvas.
// Nachbau der MZ-Tile-Logik (Autotiles A1–A4, normale Tiles A5/B–E, Schatten, Sternchen-Tiles).
'use strict';
const TM = (() => {
  const T = 48, H = 24;
  const FLOOR = [
    [[2,4],[1,4],[2,3],[1,3]],[[2,0],[1,4],[2,3],[1,3]],[[2,4],[3,0],[2,3],[1,3]],[[2,0],[3,0],[2,3],[1,3]],
    [[2,4],[1,4],[2,3],[3,1]],[[2,0],[1,4],[2,3],[3,1]],[[2,4],[3,0],[2,3],[3,1]],[[2,0],[3,0],[2,3],[3,1]],
    [[2,4],[1,4],[2,1],[1,3]],[[2,0],[1,4],[2,1],[1,3]],[[2,4],[3,0],[2,1],[1,3]],[[2,0],[3,0],[2,1],[1,3]],
    [[2,4],[1,4],[2,1],[3,1]],[[2,0],[1,4],[2,1],[3,1]],[[2,4],[3,0],[2,1],[3,1]],[[2,0],[3,0],[2,1],[3,1]],
    [[0,4],[1,4],[0,3],[1,3]],[[0,4],[3,0],[0,3],[1,3]],[[0,4],[1,4],[0,3],[3,1]],[[0,4],[3,0],[0,3],[3,1]],
    [[2,2],[1,2],[2,3],[1,3]],[[2,2],[1,2],[2,3],[3,1]],[[2,2],[1,2],[2,1],[1,3]],[[2,2],[1,2],[2,1],[3,1]],
    [[2,4],[3,4],[2,3],[3,3]],[[2,4],[3,4],[2,1],[3,3]],[[2,0],[3,4],[2,3],[3,3]],[[2,0],[3,4],[2,1],[3,3]],
    [[2,4],[1,4],[2,5],[1,5]],[[2,0],[1,4],[2,5],[1,5]],[[2,4],[3,0],[2,5],[1,5]],[[2,0],[3,0],[2,5],[1,5]],
    [[0,4],[3,4],[0,3],[3,3]],[[2,2],[1,2],[2,5],[1,5]],[[0,2],[1,2],[0,3],[1,3]],[[0,2],[1,2],[0,3],[3,1]],
    [[2,2],[3,2],[2,3],[3,3]],[[2,2],[3,2],[2,1],[3,3]],[[2,4],[3,4],[2,5],[3,5]],[[2,0],[3,4],[2,5],[3,5]],
    [[0,4],[1,4],[0,5],[1,5]],[[0,4],[3,0],[0,5],[1,5]],[[0,2],[3,2],[0,3],[3,3]],[[0,2],[1,2],[0,5],[1,5]],
    [[0,4],[3,4],[0,5],[3,5]],[[2,2],[3,2],[2,5],[3,5]],[[0,2],[3,2],[0,5],[3,5]],[[0,0],[1,0],[0,1],[1,1]]
  ];
  const WALL = [
    [[2,2],[1,2],[2,1],[1,1]],[[0,2],[1,2],[0,1],[1,1]],[[2,0],[1,0],[2,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],
    [[2,2],[3,2],[2,1],[3,1]],[[0,2],[3,2],[0,1],[3,1]],[[2,0],[3,0],[2,1],[3,1]],[[0,0],[3,0],[0,1],[3,1]],
    [[2,2],[1,2],[2,3],[1,3]],[[0,2],[1,2],[0,3],[1,3]],[[2,0],[1,0],[2,3],[1,3]],[[0,0],[1,0],[0,3],[1,3]],
    [[2,2],[3,2],[2,3],[3,3]],[[0,2],[3,2],[0,3],[3,3]],[[2,0],[3,0],[2,3],[3,3]],[[0,0],[3,0],[0,3],[3,3]]
  ];
  const WATERFALL = [[[2,0],[1,0],[2,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[2,0],[3,0],[2,1],[3,1]],[[0,0],[3,0],[0,1],[3,1]]];

  const isA1 = id => id >= 2048 && id < 2816, isA2 = id => id >= 2816 && id < 4352,
        isA3 = id => id >= 4352 && id < 5888, isA4 = id => id >= 5888 && id < 8192,
        isA5 = id => id >= 1536 && id < 1664, isAuto = id => id >= 2048;

  function drawTile(ctx, imgs, flags, id, dx, dy, frame) {
    if (id <= 0 || id >= 8192) return;
    if (!isAuto(id)) {
      const set = isA5(id) ? 4 : 5 + Math.floor(id / 256);
      const img = imgs[set]; if (!img) return;
      const sx = ((Math.floor(id / 128) % 2) * 8 + (id % 8)) * T;
      const sy = (Math.floor((id % 256) / 8) % 16) * T;
      ctx.drawImage(img, sx, sy, T, T, dx, dy, T, T);
      return;
    }
    const kind = Math.floor((id - 2048) / 48), shape = (id - 2048) % 48;
    const tx = kind % 8, ty = Math.floor(kind / 8);
    let bx = 0, by = 0, set = 0, table = FLOOR, isTable = false;
    if (isA1(id)) {
      const w = [0, 1, 2, 1][frame % 4];
      set = 0;
      if (kind === 0) { bx = w * 2; by = 0; }
      else if (kind === 1) { bx = w * 2; by = 3; }
      else if (kind === 2) { bx = 6; by = 0; }
      else if (kind === 3) { bx = 6; by = 3; }
      else {
        bx = Math.floor(tx / 4) * 8; by = ty * 6 + (Math.floor(tx / 2) % 2) * 3;
        if (kind % 2 === 0) bx += w * 2; else { bx += 6; table = WATERFALL; by += frame % 3; }
      }
    } else if (isA2(id)) {
      set = 1; bx = tx * 2; by = (ty - 2) * 3; isTable = !!(flags[id] & 0x80);
    } else if (isA3(id)) {
      set = 2; bx = tx * 2; by = (ty - 6) * 2; table = WALL;
    } else if (isA4(id)) {
      set = 3; bx = tx * 2; by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0));
      if (ty % 2 === 1) table = WALL;
    }
    const img = imgs[set]; if (!img) return;
    const q = table[shape]; if (!q) return;
    for (let i = 0; i < 4; i++) {
      const qsx = q[i][0], qsy = q[i][1];
      const sx = (bx * 2 + qsx) * H, sy = (by * 2 + qsy) * H;
      const ddx = dx + (i % 2) * H, ddy = dy + Math.floor(i / 2) * H;
      if (isTable && (qsy === 1 || qsy === 5)) {
        const qsx2 = qsy === 1 ? [0, 3, 2, 1][qsx] : qsx;
        ctx.drawImage(img, (bx * 2 + qsx2) * H, (by * 2 + 3) * H, H, H, ddx, ddy, H, H);
        ctx.drawImage(img, sx, sy, H, H / 2, ddx, ddy + H / 2, H, H / 2);
      } else {
        ctx.drawImage(img, sx, sy, H, H, ddx, ddy, H, H);
      }
    }
  }

  function drawShadow(ctx, bits, dx, dy) {
    if (!(bits & 0x0f)) return;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    for (let i = 0; i < 4; i++) if (bits & (1 << i)) ctx.fillRect(dx + (i % 2) * H, dy + Math.floor(i / 2) * H, H, H);
  }

  function loadImage(src) {
    return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => { console.warn('fehlt', src); res(null); }; im.src = src; });
  }

  // Liefert {lower: Canvas[3], upper: Canvas[3]} (3 Animationsframes für Wasser)
  async function render(map, base, nFrames) {
    nFrames = nFrames || 1;
    const imgs = await Promise.all(map.tilesetNames.map(n => n ? loadImage(base + 'tilesets/' + n + '.png') : null));
    const W = map.width, Hh = map.height, d = map.data, f = map.flags;
    const at = (x, y, z) => d[(z * Hh + y) * W + x] || 0;
    const frames = [];
    for (let fr = 0; fr < nFrames; fr++) {
      const lo = document.createElement('canvas'), up = document.createElement('canvas');
      lo.width = up.width = W * T; lo.height = up.height = Hh * T;
      const lc = lo.getContext('2d'), uc = up.getContext('2d');
      for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
        const dx = x * T, dy = y * T;
        for (let z = 0; z < 4; z++) {
          const id = at(x, y, z);
          if (z === 2) drawShadow(lc, at(x, y, 4), dx, dy);
          const upper = !isAuto(id) ? (f[id] & 0x10) : false;
          drawTile(upper ? uc : lc, imgs, f, id, dx, dy, fr);
        }
      }
      frames.push({ lower: lo, upper: up });
    }
    // Begehbarkeit (vereinfacht wie MZ: von oben nach unten der erste Tile ohne Stern entscheidet)
    const pass = new Uint8Array(W * Hh);
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      let ok = 1;
      for (let z = 3; z >= 0; z--) {
        const id = at(x, y, z), fl = f[id] || 0;
        if (id === 0 && z > 0) continue;
        if (fl & 0x10) continue;          // Sternchen: egal
        ok = (fl & 0x0f) === 0x0f ? 0 : 1; // alle 4 Richtungen gesperrt = unbegehbar
        break;
      }
      pass[y * W + x] = ok;
    }
    const region = (x, y) => at(x, y, 5);
    return { frames, pass, region, W, H: Hh };
  }

  return { render, loadImage, T };
})();
