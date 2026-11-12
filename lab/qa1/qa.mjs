import { chromium } from 'playwright-core';
import fs from 'fs';
const base = 'http://localhost:4500/';
const OUT = 'lab/qa1/result.json';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const R = { pages: [], broken: [], errs: [], mix: [], both: [], title: [], overflow: [], attrs: [], toggle: [] };
const add = (k, s) => { if (!R[k].includes(s)) R[k].push(s); };

async function newCtx(theme, lang, w = 1440) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  if (theme) await ctx.addInitScript(([t, l]) => { try { localStorage.setItem('irod-theme', t); localStorage.setItem('irod-lang', l); } catch (e) {} }, [theme, lang]);
  return ctx;
}
function relOf(href) { const u = new URL(href); let r = u.pathname.replace(/^\//, ''); if (r === '') r = 'index.html'; return r; }

// Phase 1: crawl light/en, link/image/anchor check
{
  const ctx = await newCtx('light', 'en');
  const seen = new Set(), queue = ['index.html', 'content/people/members/chinh.td/index.html'];
  while (queue.length) {
    const path = queue.shift(); if (seen.has(path)) continue; seen.add(path);
    const p = await ctx.newPage();
    const r = await p.goto(base + path, { waitUntil: 'load' }).catch(e => null);
    if (!r || r.status() >= 400) { add('broken', 'PAGE ' + path + ' ' + (r && r.status())); await p.close(); continue; }
    await p.waitForTimeout(300);
    const { links, imgs, ids } = await p.evaluate(() => ({
      links: [...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith(location.origin)),
      imgs: [...document.querySelectorAll('img')].map(i => i.currentSrc || i.src).concat([...document.querySelectorAll('source[srcset]')].map(s => new URL(s.srcset.split(/[ ,]/)[0], location.href).href)).filter(s => s.startsWith(location.origin)),
      ids: [...document.querySelectorAll('[id]')].map(e => e.id),
    }));
    for (const s of new Set(imgs)) { const res = await ctx.request.get(s); if (res.status() >= 400) add('broken', 'IMG ' + s.replace(base, '') + ' on ' + path); }
    for (const l of new Set(links)) {
      const u = new URL(l); let rel = relOf(l);
      if (rel.endsWith('/')) { const res = await ctx.request.get(base + rel); if (res.status() >= 400) add('broken', 'LINK ' + rel + ' on ' + path); else rel = rel + 'index.html'; }
      if (!seen.has(rel) && !queue.includes(rel)) {
        const res = await ctx.request.get(base + rel); if (res.status() >= 400) add('broken', 'LINK ' + rel + ' on ' + path); else if (rel.endsWith('.html')) queue.push(rel);
      }
      if (u.hash.length > 1 && !u.hash.startsWith('#cat=')) {
        const id = decodeURIComponent(u.hash.slice(1));
        if (rel === path) { if (!ids.includes(id)) add('broken', 'ANCHOR ' + u.hash + ' on ' + path); }
        else { const html = await (await ctx.request.get(base + rel)).text(); if (!html.includes('id="' + id + '"')) add('broken', 'XANCHOR ' + rel + u.hash + ' on ' + path); }
      }
    }
    await p.close();
  }
  R.pages = [...seen];
  await ctx.close();
}

// Phase 2: per combo checks
const probe = (lang) => {
  const vis = el => { if (!el.checkVisibility({ checkVisibilityCSS: true })) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(el); if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') return false; return true; };
  const viRe = /[àáâãèéêìíòóôõùúýăđĩũơưạ-ỹ]/i;
  const stop = /\b(the|and|of|to|for|with|is|are|our|we|in|on|at|from|by|this|that|an|a|or|be|has|have|will|can|more|about|view|read|all|see|join|apply|its)\b/gi;
  const ign = /^(GitHub|Google Scholar|IRoD Lab|Interactive Robot Design Lab|VinUniversity|VinUni|IRoD|EN|VI|Email|ORCID|LinkedIn|Scopus|ResearchGate)$/i;
  const out = { mix: [], both: [], title: document.title, titleVi: document.documentElement.getAttribute('data-title-vi'), tog: [...document.querySelectorAll('[data-theme-toggle]')].map(e => e.getAttribute('aria-label')), attrs: [] };
  const sel = el => { const parts = []; let e = el; for (let i = 0; i < 3 && e && e !== document.body; i++, e = e.parentElement) parts.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList.length ? '.' + [...e.classList].slice(0, 2).join('.') : '')); return parts.join('>'); };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.textContent.replace(/\s+/g, ' ').trim(); if (t.length < 3) continue;
    const el = n.parentElement; if (!el || el.closest('script,style,noscript,template,svg')) continue;
    if (!vis(el)) continue;
    if (lang === 'vi') {
      if (el.closest('[lang="en"]')) continue;
      if (viRe.test(t) || ign.test(t)) continue;
      if (/^[\w.+-]+@[\w.-]+$/.test(t) || /^https?:/.test(t)) continue;
      const words = t.match(/[A-Za-z']+/g) || [];
      const st = (t.match(stop) || []).length;
      if ((words.length >= 3 && st >= 1) || (words.length >= 2 && /^[A-Z][a-z]+( [a-z]+)+$/.test(t))) out.mix.push(sel(el) + ' :: ' + t.slice(0, 90));
    } else {
      if (el.closest('.pcard__vi,.member__vi')) continue;
      if (viRe.test(t)) out.mix.push(sel(el) + ' :: ' + t.slice(0, 90));
    }
  }
  for (const e of document.querySelectorAll('[data-l="en"]')) {
    const sib = e.nextElementSibling && e.nextElementSibling.getAttribute('data-l') === 'vi' ? e.nextElementSibling : null;
    if (sib && vis(e) && vis(sib)) out.both.push(sel(e) + ' :: ' + e.textContent.trim().slice(0, 60));
  }
  for (const e of document.querySelectorAll('[aria-label],img[alt]')) {
    for (const a of ['aria-label', 'alt']) {
      const v = e.getAttribute(a); if (!v || v.length < 4) continue;
      if (lang === 'vi' && !viRe.test(v) && (v.match(/[A-Za-z]+/g) || []).length >= 2 && !e.closest('[lang="en"]') && !ign.test(v)) out.attrs.push(sel(e) + ' [' + a + '] ' + v.slice(0, 60));
      if (lang === 'en' && viRe.test(v)) out.attrs.push(sel(e) + ' [' + a + '] ' + v.slice(0, 60));
    }
  }
  return out;
};
const TXT = { en: { dark: 'Switch to light mode', light: 'Switch to dark mode' }, vi: { dark: 'Chuyển sang giao diện sáng', light: 'Chuyển sang giao diện tối' } };
for (const theme of ['light', 'dark']) for (const lang of ['en', 'vi']) {
  const ctx = await newCtx(theme, lang); const mode = theme + '/' + lang;
  for (const path of R.pages) {
    const p = await ctx.newPage();
    p.on('pageerror', e => add('errs', path + ' ' + mode + ': ' + e.message));
    p.on('console', m => { if (m.type() === 'error') add('errs', path + ' ' + mode + ': ' + m.text().slice(0, 150)); });
    p.on('requestfailed', rq => { if (rq.url().startsWith(base)) add('errs', path + ' ' + mode + ': reqfail ' + rq.url().replace(base, '')); });
    p.on('response', rs => { if (rs.url().startsWith(base) && rs.status() >= 400) add('errs', path + ' ' + mode + ': HTTP ' + rs.status() + ' ' + rs.url().replace(base, '')); });
    await p.goto(base + path, { waitUntil: 'load' }); await p.waitForTimeout(400);
    await p.evaluate(() => document.querySelectorAll('[data-sc-in],[data-sc-stagger]>*').forEach(e => e.classList.add('sc-in')));
    const o = await p.evaluate(probe, lang);
    const ht = await p.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.lang]);
    if (ht[0] !== theme || ht[1] !== lang) add('title', path + ' ' + mode + ': html attrs ' + ht.join('/'));
    o.mix.forEach(s => add('mix', path + ' ' + mode + ' :: ' + s));
    o.both.forEach(s => add('both', path + ' ' + mode + ' :: ' + s));
    o.attrs.forEach(s => add('attrs', path + ' ' + mode + ' :: ' + s));
    if (lang === 'vi') { if (!o.titleVi) add('title', path + ': no data-title-vi'); else if (o.title !== o.titleVi) add('title', path + ' ' + mode + ': title "' + o.title + '"'); }
    else if (/[ăâđêôơư]/i.test(o.title)) add('title', path + ' ' + mode + ': VI title in EN ' + o.title);
    if (!o.tog.length) add('title', path + ': no [data-theme-toggle]');
    o.tog.forEach(a => { if (a !== TXT[lang][theme]) add('title', path + ' ' + mode + ': toggle aria-label "' + a + '"'); });
    await p.close();
  }
  await ctx.close();
  console.error('done', mode);
}

// Phase 3: overflow
for (const w of [390, 1440]) {
  const ctx = await newCtx('light', 'en', w);
  for (const path of R.pages) {
    const p = await ctx.newPage(); await p.goto(base + path, { waitUntil: 'load' }); await p.waitForTimeout(300);
    const o = await p.evaluate(() => {
      const sw = document.documentElement.scrollWidth, iw = innerWidth; if (sw <= iw) return null;
      const off = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > iw + 1 && r.width > 0; }).slice(0, 4).map(e => e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + '(' + Math.round(e.getBoundingClientRect().right) + ')');
      return sw + '>' + iw + ' ' + off.join(' ');
    });
    if (o) add('overflow', path + ' @' + w + ': ' + o);
    await p.close();
  }
  await ctx.close();
}

// Phase 4: toggle persistence (no init script)
{
  const ctx = await newCtx(null, null);
  const p = await ctx.newPage();
  const sub = 'content/people/index.html', other = 'content/research/index.html';
  await p.goto(base + sub); await p.waitForTimeout(400);
  const before = await p.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.lang, document.title]);
  const lb = p.locator('[data-set-lang="vi"]').first();
  if (!(await lb.isVisible())) { R.toggle.push('vi button not visible at 1440 on ' + sub); await p.evaluate(() => document.querySelector('[data-set-lang="vi"]').click()); } else await lb.click();
  const tb = p.locator('[data-theme-toggle]').first();
  if (!(await tb.isVisible())) { R.toggle.push('theme toggle not visible on ' + sub); await p.evaluate(() => document.querySelector('[data-theme-toggle]').click()); } else await tb.click();
  await p.waitForTimeout(500);
  const after = await p.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.lang, document.title, document.querySelector('[data-theme-toggle]').getAttribute('aria-label'), localStorage.getItem('irod-theme'), localStorage.getItem('irod-lang'), document.querySelector('[data-set-lang="vi"]').getAttribute('aria-pressed')]);
  await p.goto(base + other); await p.waitForTimeout(400);
  const nav = await p.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.lang, document.title, document.querySelector('[data-theme-toggle]').getAttribute('aria-label')]);
  await p.locator('[data-set-lang="en"]').first().click().catch(e => R.toggle.push('en click failed ' + e.message.slice(0, 80)));
  await p.waitForTimeout(300);
  const back = await p.evaluate(() => [document.documentElement.dataset.lang, document.title]);
  R.toggle.push({ before, after, nav, back });
  await p.close(); await ctx.close();
}
fs.writeFileSync(OUT, JSON.stringify(R, null, 1));
console.log('pages', R.pages.length, JSON.stringify(Object.fromEntries(Object.entries(R).map(([k, v]) => [k, v.length]))));
await b.close();
