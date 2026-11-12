import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p.goto('http://localhost:4500/index.html', { waitUntil: 'networkidle' });
for (const f of [0, 0.5, 1.6, 3]) {
  const r = await p.evaluate(async f => {
    const el = document.getElementById('arm'); scrollTo(0, el.getBoundingClientRect().top + scrollY + innerHeight * f);
    await new Promise(r => setTimeout(r, 700));
    const bar = document.querySelector('.bar');
    const anc = []; let n = bar.parentElement; while (n) { const cs = getComputedStyle(n); if (cs.transform !== 'none' || cs.filter !== 'none' || cs.contain !== 'none' || cs.willChange !== 'auto') anc.push(n.tagName + ' ' + cs.transform + ' ' + cs.filter + ' ' + cs.contain + ' ' + cs.willChange); n = n.parentElement; }
    const e = document.elementFromPoint(200, 5); return { at5: e && (e.tagName + '.' + e.className), f, top: bar.getBoundingClientRect().top, pos: getComputedStyle(bar).position, anc, vv: visualViewport.offsetTop };
  }, f);
  console.log(JSON.stringify(r)); await p.screenshot({ path: 'lab/modes/bartop-' + f + '.png', clip: { x: 0, y: 0, width: 390, height: 90 } });
}
await b.close();
