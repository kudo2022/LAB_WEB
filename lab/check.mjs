import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:4500/'); await p.waitForTimeout(1000);
const out={};
for (const id of ['belief','arm','register','people','colophon']) {
  await p.evaluate(id=>{const el=document.getElementById(id); window.scrollTo(0, el.offsetTop + (id==='arm'? innerHeight*1.6 : 50));}, id);
  await p.waitForTimeout(600);
  out[id]=await p.evaluate(()=>document.querySelector('.folio').innerText.replace(/\s+/g,' ')+' | ground='+document.body.dataset.ground);
}
// arm interaction: drag, release, check it stays; then remove spring, check it falls
await p.evaluate(()=>{const el=document.getElementById('arm'); window.scrollTo(0, el.offsetTop + innerHeight*1.8);});
await p.waitForTimeout(800);
const h = await p.locator('#arm-handle').boundingBox();
const svgO = await p.evaluate(()=>{const s=document.getElementById('arm-svg');const pt=s.createSVGPoint();pt.x=200;pt.y=330;const m=pt.matrixTransform(s.getScreenCTM());return {x:m.x,y:m.y};});
await p.mouse.move(h.x+h.width/2, h.y+h.height/2); await p.mouse.down();
await p.mouse.move(svgO.x+150, svgO.y-150, {steps:8}); await p.mouse.up();
await p.waitForTimeout(900);
out.afterDrag = await p.evaluate(()=>document.getElementById('arm-handle').getAttribute('aria-valuenow')+' '+document.getElementById('arm-readout').textContent);
await p.click('#arm-spring'); await p.waitForTimeout(2500);
out.afterRemove = await p.evaluate(()=>document.getElementById('arm-handle').getAttribute('aria-valuenow')+' '+document.getElementById('arm-readout').textContent+' btn='+document.getElementById('arm-spring').textContent);
await p.screenshot({path:'lab/arm-fallen.png'});
await p.click('#arm-reset'); await p.waitForTimeout(500);
await p.focus('#arm-handle'); for(let i=0;i<4;i++) await p.keyboard.press('ArrowUp'); await p.waitForTimeout(300);
out.afterKeys = await p.evaluate(()=>document.getElementById('arm-handle').getAttribute('aria-valuenow'));
// tab order
await p.evaluate(()=>window.scrollTo(0,0)); await p.keyboard.press('Tab');
const order=[]; for(let i=0;i<14;i++){ order.push(await p.evaluate(()=>{const a=document.activeElement;return (a.id||a.textContent||a.tagName).trim().slice(0,28)})); await p.keyboard.press('Tab'); }
out.tab=order; out.errs=errs;
console.log(JSON.stringify(out,null,1)); await b.close();
