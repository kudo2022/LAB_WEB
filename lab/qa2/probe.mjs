import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { localStorage.setItem('irod-theme', 'dark'); localStorage.setItem('irod-lang', 'vi'); });
const p = await ctx.newPage();
await p.goto('http://localhost:4500/index.html', { waitUntil: 'networkidle' });
console.log(await p.evaluate(() => {
  const f = document.querySelector('.reg__frame'); const r = f.getBoundingClientRect();
  const s = el => ({ ...['content','width','height','top','left','bottom','right','borderTopWidth','borderLeftWidth','borderTopColor','display','position'].reduce((o,k)=>(o[k]=getComputedStyle(f, el)[k],o),{}) });
  const arm = document.querySelector('.arm'); const ar = arm.getBoundingClientRect();
  const kids = [...arm.querySelectorAll('.plot__cap, .arm__fig, .arm__text')].map(e => [e.className.baseVal ?? e.className, Math.round(e.getBoundingClientRect().bottom - ar.top), Math.round(ar.height)]);
  return JSON.stringify({ rect: [r.width, r.height], before: s('::before'), after: s('::after'), fcs: getComputedStyle(f).overflow, kids, ov: getComputedStyle(arm).overflow, armParentOv: getComputedStyle(arm.parentElement).overflow }, null, 1);
}));
await b.close();
