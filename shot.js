// node shot.js <url> <png> [w] [h] [selector]
const { chromium } = require('playwright');
(async () => {
  const [url, out, w, h, sel] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w || 1500, height: +h || 900 } });
  p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
  await p.goto(url); await p.waitForFunction(() => document.title === 'done', null, { timeout: 30000 }).catch(() => console.log('timeout'));
  if (sel) await (await p.$(sel)).screenshot({ path: out }); else await p.screenshot({ path: out });
  await b.close();
})();
