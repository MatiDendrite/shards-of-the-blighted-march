// DOM-only viewport checks. Real movement and rendering are tested separately.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{await fs.mkdir('_artifacts/hud-loot',{recursive:true});const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:''}):r.continue());
 for(const [width,height,touch] of [[1100,700,false],[800,600,false],[390,844,true],[360,640,true],[844,390,true],[667,375,true],[600,375,true]]){
  await page.setViewport({width,height});await page.goto('http://localhost:4173/preview/');await page.evaluate(t=>{document.body.classList.toggle('touch',t);document.querySelector('#loading').hidden=true;document.querySelector('#hud').hidden=false;for(const id of ['cleave','slam','cry'])document.querySelector(`#${id} small`).textContent='20 stamina';},touch);
  const layout=await page.evaluate(()=>{const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};},dock=box(document.querySelector('#action-bar')),panels=['character-hud','vitals','combat-controls'].map(id=>({id,...box(document.getElementById(id))})),buttons=[...document.querySelectorAll('#combat-controls button')].map(e=>({id:e.id,...box(e),hit:document.elementFromPoint(e.getBoundingClientRect().x+e.clientWidth/2,e.getBoundingClientRect().y+e.clientHeight/2)?.closest('button')===e}));return{dock,panels,buttons};});
  console.log(width,height,JSON.stringify(layout));await page.screenshot({path:`_artifacts/hud-loot/layout-${width}-${height}.png`});
  assert(layout.panels.every(p=>p.y>=layout.dock.y&&p.bottom<=height&&p.width>0),`${width}: panels in dock`);
  for(let i=0;i<layout.panels.length;i++)for(let j=i+1;j<layout.panels.length;j++){const a=layout.panels[i],b=layout.panels[j];assert(!(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y),`${width}: ${a.id}/${b.id} overlap`);}
  assert(layout.buttons.every(b=>b.hit&&b.x>=0&&b.right<=width&&b.bottom<=height),`${width}: controls reachable`);
  for(let i=0;i<layout.buttons.length;i++)for(let j=i+1;j<layout.buttons.length;j++){const a=layout.buttons[i],b=layout.buttons[j];assert(!(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y),`${width}: ${a.id}/${b.id} buttons overlap`);}
 }
 console.log('All seven desktop/phone/landscape HUD layouts: PASS');
}finally{await browser.close();}
