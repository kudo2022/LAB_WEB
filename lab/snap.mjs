import { chromium } from 'playwright-core';
const [,, url, out, w='1400', h='900', full='1'] = process.argv;
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(url); await p.waitForTimeout(1200);
await p.screenshot({ path: out, fullPage: full === '1' });
await b.close();
