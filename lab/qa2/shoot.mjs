import { chromium } from 'playwright-core';
import fs from 'fs';
const OUT = 'lab/qa2'; const base = 'http://localhost:4500/';
const pages = ['index.html','content/news/index.html','content/research/index.html','content/research/featured/delta-robot-2020/index.html','content/people/index.html','content/people/members/linh.nv/index.html','content/people/members/tien.dn/index.html','content/openings/index.html','content/openings/positions/vishc_phd_2025/index.html'];
const modes = [['dark','vi',1440,900],['light','en',1440,900],['dark','en',390,844]];
const only = process.argv[2];
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const report = {};
for (const [theme, lang, W, H] of modes) {
  const ctx = await b.newContext({ viewport: { width: W, height: H } });
  await ctx.addInitScript(([th, la]) => { try { localStorage.setItem('irod-theme', th); localStorage.setItem('irod-lang', la); } catch (e) {} }, [theme, lang]);
  const p = await ctx.newPage();
  for (const path of pages) {
    if (only && !path.includes(only)) continue;
    const slug = path.replace('content/','').replace(/\/index\.html$/,'').replace('index.html','home').replace(/\//g,'_');
    const name = `${OUT}/${slug}-${theme}-${lang}-${W}`;
    await p.goto(base + path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelectorAll('[data-sc-in],[data-sc-stagger]>*').forEach(e => e.classList.add('sc-in')));
    await p.waitForTimeout(400);
    if (path === 'index.html') {
      const total = await p.evaluate(() => document.documentElement.scrollHeight);
      let i = 0;
      for (let y = 0; y < total - H / 2 && i < 30; y += Math.round(H * 0.85), i++) {
        await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(450);
        await p.evaluate(() => document.querySelectorAll('[data-sc-in],[data-sc-stagger]>*').forEach(e => e.classList.add('sc-in')));
        await p.screenshot({ path: `${name}-${String(i).padStart(2,'0')}.png` });
      }
    } else {
      const total = await p.evaluate(() => document.documentElement.scrollHeight);
      const seg = W > 500 ? 1800 : 1600;
      let i = 0;
      for (let y = 0; y < total; y += seg, i++) await p.screenshot({ path: `${name}-${i}.png`, fullPage: true, clip: { x: 0, y, width: W, height: Math.min(seg, total - y) } });
      // viewport shot near middle for fixed bars
      await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight * 0.45)); await p.waitForTimeout(300);
      await p.screenshot({ path: `${name}-vp.png` });
    }
    if (theme === 'dark') {
      await p.evaluate(() => scrollTo(0, 0));
      report[`${slug}-${lang}-${W}`] = await p.evaluate(() => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
        const rgba = s => { cx.clearRect(0,0,1,1); cx.fillStyle = '#000'; cx.fillStyle = s; cx.fillRect(0,0,1,1); const d = cx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255]; };
        const bgOf = el => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } } let r = [8,19,31]; for (const l of layers.reverse()) r = r.map((v,i) => l[i]*l[3] + v*(1-l[3])); return r; };
        const lum = c => { const a = c.map(v => { v /= 255; return v <= .03928 ? v/12.92 : ((v+.055)/1.055)**2.4; }); return .2126*a[0]+.7152*a[1]+.0722*a[2]; };
        const out = [];
        const sels = ['body p','.body','.label','.small','.nrow__k','.prow__s','.pcard__vi','.pcard__line','.meta dt','.tblock__k','.cap','.reg__tags','.posrow__s','.sub3','.pgroup__h','.chip span','.filter__count','.pn__k','.sv__sub','.member__vi','.applies__k','.figs dt','.prow__meta','.arm__notes li','.folio','.seg__b','.bar .navlist a'];
        for (const s of sels) { const els = [...document.querySelectorAll(s)].filter(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed').filter(e => e.textContent.trim()); if (!els.length) continue;
          let worst = null; for (const e of els.slice(0, 40)) { const cs = getComputedStyle(e); const f = rgba(cs.color); const bg = bgOf(e); const op = +cs.opacity; let fg = f.slice(0,3).map((v,i) => v*f[3]*op + bg[i]*(1-f[3]*op)); const L1 = lum(fg), L2 = lum(bg); const cr = (Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05); if (!worst || cr < worst.cr) worst = { cr: +cr.toFixed(2), fg: fg.map(Math.round).join(','), bg: bg.map(Math.round).join(','), size: cs.fontSize, txt: e.textContent.trim().slice(0,30) }; }
          out.push([s, els.length, worst]); }
        return out;
      });
    }
  }
  await p.close(); await ctx.close();
}
fs.writeFileSync(OUT + '/contrast' + (only||'') + '.json', JSON.stringify(report, null, 1));
await b.close();
