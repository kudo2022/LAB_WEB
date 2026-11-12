// Visit every page, check local links/images resolve, collect console errors, take screenshots.
import { chromium } from 'playwright-core';
import fs from 'fs';
const W = +(process.argv[2] || 1440), OUT = process.argv[3] || 'lab/pages';
fs.mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:4500/';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
const seen = new Set(), queue = ['index.html'], broken = [], errs = [];
while (queue.length) {
  const path = queue.shift(); if (seen.has(path)) continue; seen.add(path);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(path + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(path + ': ' + m.text()); });
  const r = await p.goto(base + path);
  if (!r || r.status() >= 400) { broken.push('PAGE ' + path + ' ' + (r && r.status())); await p.close(); continue; }
  await p.waitForTimeout(500);
  // force reveal so screenshots show content
  await p.evaluate(() => document.querySelectorAll('[data-sc-in],[data-sc-stagger]>*').forEach(e => e.classList.add('sc-in')));
  const { links, imgs } = await p.evaluate(() => ({
    links: [...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith(location.origin)),
    imgs: [...document.images].map(i => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0, lazy: i.loading === 'lazy' })),
  }));
  for (const i of imgs) {
    const res = await ctx.request.get(i.src); if (res.status() >= 400) broken.push('IMG ' + i.src.replace(base, '') + ' on ' + path);
  }
  for (const l of links) {
    const u = new URL(l); const rel = u.pathname.replace(/^\//, '') || 'index.html';
    if (rel.endsWith('/')) { broken.push('DIRLINK ' + rel + ' on ' + path); continue; }
    if (!seen.has(rel) && !queue.includes(rel)) {
      const res = await ctx.request.get(base + rel); if (res.status() >= 400) broken.push('LINK ' + rel + ' on ' + path); else if (rel.endsWith('.html')) queue.push(rel);
    }
    if (u.hash && u.hash.length > 1 && !u.hash.startsWith('#cat=') && rel === path) {
      const ok = await p.evaluate(h => !!document.getElementById(decodeURIComponent(h.slice(1))), u.hash); if (!ok) broken.push('ANCHOR ' + u.hash + ' on ' + path);
    }
  }
  if (path !== 'index.html') await p.screenshot({ path: `${OUT}/${path.replace(/\//g, '_').replace('_index.html', '').replace('.html', '')}.png`, fullPage: true });
  await p.close();
}
console.log(JSON.stringify({ pages: seen.size, broken, errs }, null, 1));
await b.close();
