// Screenshot pages in every theme x language combination, and check that toggles work.
import { chromium } from 'playwright-core';
import fs from 'fs';
const OUT = 'lab/modes'; fs.mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:4500/';
const W = +(process.argv[2] || 1440), H = +(process.argv[3] || 900);
const pages = (process.argv[4] || 'index.html,content/research/index.html,content/people/members/linh.nv/index.html').split(',');
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const errs = [];
for (const theme of ['light', 'dark']) for (const lang of ['en', 'vi']) {
  const ctx = await b.newContext({ viewport: { width: W, height: H } });
  await ctx.addInitScript(([th, la]) => { try { localStorage.setItem('irod-theme', th); localStorage.setItem('irod-lang', la); } catch (e) {} }, [theme, lang]);
  for (const path of pages) {
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(path + ': ' + e.message));
    await p.goto(base + path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    await p.evaluate(() => document.querySelectorAll('[data-sc-in],[data-sc-stagger]>*').forEach(e => e.classList.add('sc-in')));
    const name = `${OUT}/${W}-${path.replace(/\//g, '_').replace('.html', '')}-${theme}-${lang}`;
    await p.screenshot({ path: name + '.png' });
    if (path === 'index.html') {
      // second frame: scroll into the register and the arm
      for (const id of ['arm', 'register', 'people', 'colophon']) {
        await p.evaluate(id => { const el = document.getElementById(id); scrollTo(0, el.getBoundingClientRect().top + scrollY + (id === 'arm' ? innerHeight * 1.6 : 0)); }, id);
        await p.waitForTimeout(700);
        await p.screenshot({ path: `${name}-${id}.png` });
      }
    }
    const state = await p.evaluate(() => ({ lang: document.documentElement.dataset.lang, theme: document.documentElement.dataset.theme, title: document.title,
      both: [...document.querySelectorAll('[data-l]')].filter(e => e.offsetParent !== null && getComputedStyle(e).display !== 'none').map(e => e.dataset.l).filter((v, i, a) => a.indexOf(v) === i) }));
    if (state.lang !== lang || state.theme !== theme || state.both.length > 1) errs.push(path + ' state ' + JSON.stringify(state));
    await p.close();
  }
  await ctx.close();
}
// toggle test on a fresh page
const ctx = await b.newContext({ viewport: { width: W, height: H } });
const p = await ctx.newPage();
await p.goto(base + 'content/news/index.html');
const before = await p.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.lang]);
await p.click('[data-theme-toggle]'); await p.click('[data-set-lang="vi"]');
const after = await p.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.lang, document.title, localStorage.getItem('irod-theme'), document.querySelector('[data-theme-toggle]').getAttribute('aria-label')]);
await p.reload(); const persisted = await p.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.lang]);
console.log(JSON.stringify({ before, after, persisted, errs }, null, 1));
await b.close();
