import { chromium } from 'playwright-core'; import fs from 'fs'; import path from 'path';
const [,, dir, out, ...names] = process.argv;
const html = '<body style="margin:0;background:#333;display:flex;gap:6px;align-items:flex-start">' + names.map(n => `<div style="flex:1"><div style="color:#f0f;font:13px sans-serif">${n}</div><img src="file:///${path.resolve(dir, n + '.png').split(path.sep).join('/')}" style="width:100%"></div>`).join('') + '</body>';
fs.writeFileSync(dir + '/_t.html', html);
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1800, height: 900 } });
await p.goto('file:///' + path.resolve(dir, '_t.html').split(path.sep).join('/')); await p.waitForTimeout(800);
await p.screenshot({ path: out, fullPage: true, clip: undefined }); await b.close();
