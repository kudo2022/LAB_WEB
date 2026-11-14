import { chromium } from 'playwright-core';
const [,, url, out, sel, n='4', gap='900', reduced='0'] = process.argv;
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: reduced === '1' ? 'reduce' : 'no-preference' });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(url); const el = p.locator(sel).first(); await el.scrollIntoViewIfNeeded();
for (let i = 0; i < +n; i++) { await p.waitForTimeout(+gap); await el.screenshot({ path: `${out}-${i}.png` }); }
console.log('errors:', JSON.stringify(errs));
await b.close();
