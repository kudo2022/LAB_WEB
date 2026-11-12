import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const lang of ['en','vi']) {
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(l => { localStorage.setItem('irod-theme', 'dark'); localStorage.setItem('irod-lang', l); }, lang);
const p = await ctx.newPage();
await p.goto('http://localhost:4500/content/people/index.html', { waitUntil: 'networkidle' });
console.log(lang, await p.evaluate(() => {
  const n = document.querySelector('.bar__nav'); const ul = n.querySelector('.navlist');
  const last = [...ul.querySelectorAll('a')].pop().getBoundingClientRect();
  const pi = document.querySelector('.pgrid--pi'); 
  return JSON.stringify({ navClient: n.clientWidth, navScroll: n.scrollWidth, lastRight: last.right, piCols: getComputedStyle(pi).gridTemplateColumns, docW: document.documentElement.scrollWidth,
    arrSvgScale: null, ticks: getComputedStyle(document.body).lineHeight });
}));
await ctx.close();
}
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => { localStorage.setItem('irod-theme', 'dark'); localStorage.setItem('irod-lang', 'en'); });
const p = await ctx.newPage();
await p.goto('http://localhost:4500/index.html', { waitUntil: 'networkidle' });
console.log(await p.evaluate(() => { const s = document.querySelector('.arm__svg'); const t = s.querySelector('text'); return JSON.stringify({ svgW: s.getBoundingClientRect().width, vb: s.getAttribute('viewBox'), textH: t && t.getBoundingClientRect().height, txt: t && t.textContent }); }));
await p.goto('http://localhost:4500/content/openings/positions/vishc_phd_2025/index.html', { waitUntil: 'networkidle' });
console.log(await p.evaluate(() => JSON.stringify({ ticks: getComputedStyle(document.querySelector('.prose-block .ticks')||document.body).fontSize, body: getComputedStyle(document.querySelector('.prose-block .body')||document.body).fontSize })));
await b.close();
