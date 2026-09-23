// Isolated UI fixture; completing encounters here is not a gameplay playthrough.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Combat} from '../game/src/combat-model.js';
import {Progression,SAVE_KEY,validSave} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
const out='_artifacts/detailed-map';await fs.mkdir(out,{recursive:true});
const model=new Combat(),progress=new Progression(),campaign=new Campaign(progress,model);progress.restore(model);
for(let i=0;i<4;i++){if(i)campaign.travel(i);model.damageShard(999);for(let t=0;t<100;t++)model.update(1/60);for(const e of model.enemies)model.damageEnemy(e,999);progress.events(model.consume(),model);campaign.observe();}
campaign.travel(0);const fixture=progress.snapshot(model);assert(validSave(fixture));
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const mobile of process.argv.includes('--mobile')?[true]:[false,true]){
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[],cdp=await page.createCDPSession();page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(String(r.status())+' '+r.url());});
  await page.setViewport(mobile?{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1}:{width:1000,height:800,deviceScaleFactor:1});
  await page.evaluateOnNewDocument((key,save)=>localStorage.setItem(key,save),SAVE_KEY,JSON.stringify(fixture));
  const press=async selector=>{
   await page.$eval(selector,e=>{e.dataset.testClick='pending';e.addEventListener('click',()=>{e.dataset.testClick='done';},{once:true});});
   if(mobile){
    const point=await page.$eval(selector,e=>{e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,id:1};});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }else await page.click(selector);
   // Touch dispatch may complete before its compatibility click reaches the UI.
   await page.waitForFunction(s=>document.querySelector(s)?.dataset.testClick==='done',{timeout:15000},selector);
  };
  await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__);await press('#startb');await page.waitForFunction(()=>window.__GAME__.started);
  assert.equal(await page.evaluate(()=>window.__GAME__.campaign.region),0);
  if(mobile)await press('#map-button');else await page.keyboard.press('KeyM');
  await page.waitForSelector('#atlas-dialog:not([hidden])');await page.waitForFunction(()=>window.__GAME__.paused);
  const before=await page.evaluate(()=>({pos:window.__GAME__.pos,hp:window.__GAME__.hp}));
  assert(await page.$eval('.atlas-frame',e=>e.scrollWidth<=e.clientWidth+1));
  assert.equal(await page.$eval('#atlas-canvas',e=>e.dataset.zoom),'1');
  await press('#atlas-town');assert.equal(await page.$eval('#atlas-canvas',e=>e.dataset.zoom),'3');
  const center=await page.$eval('#atlas-canvas',e=>e.dataset.center);
  const rect=await page.$eval('#atlas-canvas',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
  if(mobile){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...rect,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x+45,y:rect.y+25,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await page.mouse.move(rect.x,rect.y);await page.mouse.down();await page.mouse.move(rect.x+45,rect.y+25,{steps:4});await page.mouse.up();}
  assert.notEqual(await page.$eval('#atlas-canvas',e=>e.dataset.center),center);
  await press('#atlas-in');assert.equal(await page.$eval('#atlas-canvas',e=>e.dataset.zoom),'4');
  await press('#atlas-player');await page.keyboard.press('ArrowRight');await page.keyboard.press('KeyW');
  assert.deepEqual(await page.evaluate(()=>({pos:window.__GAME__.pos,hp:window.__GAME__.hp})),before);
  await press('[data-location="merchant"]');assert.equal(await page.$eval('#atlas-canvas',e=>e.dataset.center),'6.00,2.00');
  await page.$eval('.atlas-frame',e=>e.scrollTop=0);
  await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-town.png`});
  await press('#atlas-full');await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-region.png`});
  if(mobile)await press('#atlas-close');else await page.keyboard.press('KeyM');
  await page.waitForSelector('#atlas-dialog[hidden]');await page.waitForFunction(()=>!window.__GAME__.paused);
  if(!mobile){
   await page.keyboard.press('KeyM');await page.keyboard.press('KeyJ');assert(await page.$eval('#atlas-dialog',e=>e.hidden));assert(await page.$eval('#journal',e=>!e.hidden));
   await page.keyboard.press('KeyM');assert(await page.$eval('#journal',e=>e.hidden));await page.keyboard.press('KeyI');assert(await page.$eval('#atlas-dialog',e=>e.hidden));assert(await page.$eval('#inventory',e=>!e.hidden));
   await page.keyboard.press('KeyM');assert(await page.$eval('#inventory',e=>e.hidden));
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.__GAME__.paused);
   for(let region=1;region<4;region++){
    await page.keyboard.press('KeyJ');await page.click(`[data-travel="${region}"]`);await page.waitForFunction(i=>window.__GAME__.campaign.region===i,{},region);
    await page.keyboard.press('KeyM');assert.equal(await page.$('[data-location="smith"]'),null);
    assert.equal(!!await page.$('[data-location="exit"]'),region<3);
    assert.equal(await page.$eval('#atlas-canvas',e=>e.dataset.zoom),'1');
    await page.screenshot({path:`${out}/region-${region}.png`});await page.keyboard.press('Escape');
   }
  }
  assert.deepEqual(errors,[]);console.log(`${mobile?'Mobile touch':'Desktop keyboard'} detailed map: PASS`);await context.close();
 }
}finally{await browser.close();}
