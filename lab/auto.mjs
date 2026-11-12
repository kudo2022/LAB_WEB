// Self-moving arm: angle changes on its own, a drag takes over and holds, auto resumes after idle,
// reduced motion keeps a still pose.
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const out = {};
async function run(reduced) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4500/index.html', { waitUntil: 'networkidle' });
  const ang = () => p.evaluate(() => +document.getElementById('arm-handle').getAttribute('aria-valuenow'));
  const st = () => p.evaluate(() => document.getElementById('arm').getAttribute('data-sc-verify-state'));
  const samples = [];
  for (let i = 0; i < 6; i++) { samples.push(await ang()); await p.waitForTimeout(500); }
  const r = { samples, state: await st(), errs };
  if (!reduced) {
    const h = await p.$('#arm-handle'); const box = await h.boundingBox();
    const svg = await (await p.$('#arm-svg')).boundingBox();
    // drag the mass to roughly horizontal-right of the pivot
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down();
    await p.mouse.move(svg.x + svg.width * 0.85, svg.y + svg.height * 0.52, { steps: 8 }); await p.mouse.up();
    const held = []; for (let i = 0; i < 4; i++) { held.push(await ang()); await p.waitForTimeout(500); }
    r.afterDrag = { held, state: await st() };
    await p.waitForTimeout(3500);
    const later = []; for (let i = 0; i < 4; i++) { later.push(await ang()); await p.waitForTimeout(400); }
    r.resumed = { later, state: await st() };
    await p.click('#arm-spring'); await p.waitForTimeout(2500);
    r.noSpring = { deg: await ang(), state: await st() };
    await p.click('#arm-reset'); await p.waitForTimeout(1500);
    r.reset = { deg: await ang(), state: await st() };
  }
  await ctx.close();
  return r;
}
out.motion = await run(false);
out.reduced = await run(true);
console.log(JSON.stringify(out, null, 1));
await b.close();
