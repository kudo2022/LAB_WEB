// People page full-length screenshots (file://, no server needed): desktop and phone.
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
const url = pathToFileURL(process.cwd() + '/content/people/index.html').href;
const tag = process.argv[2] || 'now';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(600);
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
  await p.waitForTimeout(400);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  await p.screenshot({ path: `lab/people-${tag}-${w}.png`, fullPage: true });
  console.log(w, 'height', H);
  await p.close();
}
await b.close();
