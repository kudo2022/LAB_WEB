import { chromium } from 'playwright-core'; import fs from 'fs'; import path from 'path';
const [,, dir, out, cols='4', from='0', to='99'] = process.argv;
const files = fs.readdirSync(dir).filter(f=>f.endsWith('.png')).sort().slice(+from, +to+1);
const html = `<body style="margin:0;background:#333;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px">`+files.map(f=>`<div style="position:relative"><img src="file:///${path.resolve(dir,f).split(path.sep).join('/')}" style="width:100%;display:block"><b style="position:absolute;top:2px;left:4px;color:#f0f;font:14px sans-serif">${f}</b></div>`).join('')+'</body>';
fs.writeFileSync(dir+'/_s.html', html);
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1600, height: 800 } });
await p.goto('file:///'+path.resolve(dir,'_s.html').split(path.sep).join('/')); await p.waitForTimeout(800);
await p.screenshot({ path: out, fullPage: true }); await b.close();
