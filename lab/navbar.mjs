// Top bar after irodlab.com: desktop light/dark, VI, a mid width, and the phone menu closed/open.
import { chromium } from 'playwright-core';
const B = 'http://localhost:4500/';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const shots = [
  ['index.html', 1440, 'light', 'en', 'nav-home-light'],
  ['index.html', 1440, 'dark', 'en', 'nav-home-dark'],
  ['content/publications/index.html', 1440, 'light', 'vi', 'nav-pubs-vi'],
  ['content/research/index.html', 1024, 'light', 'en', 'nav-research-1024'],
  ['content/people/index.html', 390, 'light', 'en', 'nav-phone'],
];
const report = [];
for (const [path, w, theme, lang, name] of shots) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 } });
  await ctx.addInitScript(([t, l]) => { localStorage.setItem('irod-theme', t); localStorage.setItem('irod-lang', l); }, [theme, lang]);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + path, { waitUntil: 'networkidle' });
  await p.screenshot({ path: `lab/${name}.png`, clip: { x: 0, y: 0, width: w, height: w < 600 ? 420 : 160 } });
  const info = await p.evaluate(() => {
    const bar = document.querySelector('.bar');
    return { overflow: bar.scrollWidth > bar.clientWidth, current: document.querySelector('.bar [aria-current]')?.textContent,
      bg: getComputedStyle(bar).backgroundColor, items: [...document.querySelectorAll('.bar .navlist a')].map(a => a.innerText) };
  });
  if (w < 600) {
    await p.click('.bar__menu'); await p.waitForTimeout(200);
    await p.screenshot({ path: `lab/${name}-open.png`, clip: { x: 0, y: 0, width: w, height: 420 } });
    info.expanded = await p.getAttribute('.bar__menu', 'aria-expanded');
    await p.keyboard.press('Escape');
    info.afterEsc = await p.getAttribute('.bar__menu', 'aria-expanded');
  }
  report.push({ name, errs, ...info });
  await ctx.close();
}
console.log(JSON.stringify(report, null, 1));
await b.close();
