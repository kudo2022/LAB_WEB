import { chromium } from 'playwright-core';
const [,, out='lab/walk', w='1440', h='900', rm='0'] = process.argv;
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: +w, height: +h }, reducedMotion: rm==='1'?'reduce':'no-preference' });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:4500/'); await p.waitForTimeout(1500);
const H = await p.evaluate(()=>document.documentElement.scrollHeight);
const vh=+h; const n=Math.ceil(H/(vh*0.5));
const fs = await import('fs'); fs.mkdirSync(out,{recursive:true});
for(let i=0;i<=n;i++){ const y=Math.min(i*vh*0.5,H-vh); await p.evaluate(y=>window.scrollTo(0,y),y); await p.waitForTimeout(700);
  await p.screenshot({path:`${out}/${String(i).padStart(2,'0')}.png`}); }
console.log('height',H,'shots',n+1,'errors',JSON.stringify(errs));
await b.close();
