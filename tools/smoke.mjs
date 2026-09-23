import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

await fs.mkdir('_artifacts',{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const results=[];
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
  page.on('console',m=>{console.log('BROWSER',m.type(),m.text());if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.setViewport(mobile?{width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true}:{width:1440,height:900,deviceScaleFactor:1});
  const t=Date.now();await page.goto('http://localhost:4173/preview/',{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>window.__READY__,{timeout:60000});
  const ready=(Date.now()-t)/1000;
  await page.screenshot({path:`_artifacts/${mobile?'mobile':'desktop'}-title.png`});
  if(mobile){const b=await page.$eval('#startb',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});await page.touchscreen.tap(b.x,b.y);}else await page.click('#startb');
  await new Promise(r=>setTimeout(r,600));
  const before=await page.evaluate(()=>window.__GAME__.pos);
  if(mobile){const b=await page.$eval('#stick',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});await page.touchscreen.touchStart(b.x,b.y);await page.touchscreen.touchMove(b.x,b.y-40);}else await page.keyboard.down('KeyW');
  // Assert distance rather than a fixed wall-clock interval: software rendering
  // can deliver only a few simulation frames while parallel art renders run.
  try{await page.waitForFunction(before=>Math.hypot(window.__GAME__.pos[0]-before[0],window.__GAME__.pos[1]-before[1])>=1.5,{timeout:60000,polling:'raf'},before);}
  finally{if(mobile)await page.touchscreen.touchEnd();else await page.keyboard.up('KeyW');}
  const state=await page.evaluate(()=>window.__GAME__);
  const moved=Math.hypot(state.pos[0]-before[0],state.pos[1]-before[1]);
  assert(moved>=1,`movement failed: ${moved}`);
  assert(state.draws<=500,`draw budget ${state.draws}`);assert(state.tris<=600000,`triangle budget ${state.tris}`);
  await page.screenshot({path:`_artifacts/${mobile?'mobile':'desktop'}-play.png`});
  await page.click('#menu-button');
  const paused=await page.evaluate(()=>window.__GAME__.pos);await page.keyboard.down('KeyW');await new Promise(r=>setTimeout(r,250));await page.keyboard.up('KeyW');
  assert.deepEqual(await page.evaluate(()=>window.__GAME__.pos),paused,'pause must stop movement');
  await page.click('#resume');
  if(mobile){await page.setViewport({width:844,height:390,deviceScaleFactor:1,isMobile:true,hasTouch:true});await new Promise(r=>setTimeout(r,400));await page.screenshot({path:'_artifacts/mobile-landscape.png'});}
  assert.deepEqual(errors,[]);
  results.push({mobile,ready,moved,...state,errors});await page.close();
 }
 await fs.writeFile('_artifacts/smoke.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({mobile,ready,moved,draws,tris,errors})=>({mobile,ready,moved,draws,tris,errors})),null,2));
}finally{await browser.close();}
