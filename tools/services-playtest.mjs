// Isolated completed-quest/gear fixtures, then native UI and short world walks.
// Fixture placements are explicit; this is not an earned campaign playthrough.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Combat} from '../game/src/combat-model.js';
import {Progression,SAVE_KEY,validSave,sellPrice} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
import {travelFixture} from './travel-fixture.mjs';
const out='_artifacts/services';await fs.mkdir(out,{recursive:true});
const m=new Combat(),p=new Progression(),c=new Campaign(p,m);p.restore(m);
for(let r=0;r<4;r++){if(r)assert(travelFixture(c,r));m.damageShard(999);for(let i=0;i<100;i++)m.update(1/60);for(const e of m.enemies)m.damageEnemy(e,e.maxHp);p.events(m.consume(),m);c.observe();}
assert(travelFixture(c,0));const spare=p.makeItem('sword','rare',1);p.data.items.push(spare,p.makeItem('armor','uncommon'));const fixture=p.snapshot(m);assert(validSave(fixture));
const main=(await fs.readFile('game/src/main.js','utf8')).replace('await rig.ready;','window.serviceFixture={model,hero,orbit,input};await rig.ready;');
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const report={scope:'completed-campaign/gear and position fixtures; native buttons, keys and touch; full-quality rendering',runs:[],errors:[]};
try{for(const mobile of [false,true]){
 const context=await browser.createBrowserContext(),page=await context.newPage();page.setDefaultTimeout(120000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 await page.setViewport(mobile?{width:390,height:844,isMobile:true,hasTouch:true}:{width:1100,height:760});
 await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:main}):r.continue());
 await page.evaluateOnNewDocument((key,saved)=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},SAVE_KEY,fixture);
 await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__);
 const press=async selector=>{const e=await page.waitForSelector(selector,{visible:true});await e.evaluate(n=>n.scrollIntoView({block:'center'}));if(mobile)await e.tap();else await e.click();};
 const state=()=>page.evaluate(()=>window.__GAME__);
 await press('#startb');await page.waitForFunction(()=>window.__GAME__.started);console.log(mobile?'Phone services ready':'Desktop services ready');
 const place=async(x,z)=>{await page.evaluate(({x,z})=>{const f=window.serviceFixture;f.input.clear();f.model.player.x=x;f.model.player.z=z;f.hero.position.set(x,.06,z);f.orbit.reset(true);},{x,z});await page.waitForFunction(({x,z})=>Math.hypot(window.__GAME__.pos[0]-x,window.__GAME__.pos[1]-z)<.01,{}, {x,z});};
 await place(-1.8,13);const before=await state();await press('#smith-button');await page.waitForSelector('#inventory:not([hidden])');assert.match(await page.$eval('#bag-title',e=>e.textContent),/Borin/);await press('[data-item-action="upgrade"]');await page.waitForFunction(gold=>window.__GAME__.rpg.gold===gold,{},before.rpg.gold-40);assert.equal((await state()).rpg.items.find(i=>i.id===1).upgrade,1);await press('#bag-close');
 await place(6,4);await press('#npc-button');await page.waitForSelector('#town-dialog:not([hidden])');await press('#town-trade');await page.waitForSelector('#inventory:not([hidden])');assert.match(await page.$eval('#bag-title',e=>e.textContent),/Mara/);
 const tradeBefore=await state();await press('[data-item-action="sell"]');await press('[data-item-action="cancel-sale"]');assert.equal((await state()).rpg.gold,tradeBefore.rpg.gold);assert((await state()).rpg.items.some(i=>i.id===spare.id));
 await press('[data-item-action="sell"]');assert.match(await page.$eval('[data-item-action="confirm-sale"]',e=>e.textContent),new RegExp(String(sellPrice(spare))));await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-sale-confirmation.png`});await press('[data-item-action="confirm-sale"]');await page.waitForFunction(id=>!window.__GAME__.rpg.items.some(i=>i.id===id),{},spare.id);assert.equal((await state()).rpg.gold,tradeBefore.rpg.gold+sellPrice(spare));
 await press('#loadout-slots [data-select-item="1"]');assert(await page.$eval('[data-item-action="sell"]',e=>e.disabled));assert.equal(await page.$$eval('[data-item-action="confirm-sale"]',e=>e.length),0);await press('#buy-potion');await page.waitForFunction(gold=>window.__GAME__.rpg.gold===gold,{},tradeBefore.rpg.gold+sellPrice(spare)-25);
 assert(await page.$eval('#inventory',e=>e.scrollWidth<=e.clientWidth+1));await press('#bag-close');const sold=await state();
 await page.reload();await page.waitForFunction(()=>window.__READY__);await press('#startb');await page.waitForFunction(()=>window.__GAME__.started);const restored=await state();assert.equal(restored.rpg.gold,sold.rpg.gold);assert.deepEqual(restored.rpg.items,sold.rpg.items);console.log(mobile?'Phone trade and reload PASS':'Desktop trade and reload PASS');
 const walkZ=async(target,key)=>{
  const start=(await state()).pos[1],dir=Math.sign(target-start);
  if(mobile){const stick=await page.$eval('#stick',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});await page.touchscreen.touchStart(stick.x,stick.y);await page.touchscreen.touchMove(stick.x,stick.y+dir*34);}else await page.keyboard.down(key);
  await page.waitForFunction(({target,dir})=>dir*(window.__GAME__.pos[1]-target)>=0,{}, {target,dir});if(mobile)await page.touchscreen.touchEnd();else await page.keyboard.up(key);
 };
 await place(0,-10);await page.evaluate(()=>{window.gateSamples=[];window.sampleGate=true;const sample=()=>{if(!window.sampleGate)return;window.gateSamples.push({z:window.__GAME__.pos[1],distance:window.__GAME__.camera.distance});requestAnimationFrame(sample);};requestAnimationFrame(sample);});
 await walkZ(-15,'KeyW');await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-under-gate.png`});await walkZ(-21,'KeyW');
 const samples=await page.evaluate(()=>{window.sampleGate=false;return window.gateSamples;});const distances=samples.filter(s=>s.z<-10.1).map(s=>s.distance);assert(distances.length>10);assert(Math.max(...distances)-Math.min(...distances)<.03,'gate must not auto-zoom');console.log(mobile?'Phone gate distance PASS':'Desktop gate distance PASS');
 await place(0,-51);await press('#journal-button');assert.equal(await page.$$eval('[data-travel]',es=>es.length),0);await press('[data-region="1"]');assert.equal((await state()).campaign.region,0);await press('#journal-close');
 await walkZ(-54,'KeyW');await page.waitForSelector('#gate-button:not([hidden])');assert(!await page.$eval('#gate-button',e=>e.disabled));await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-portal.png`});
 await press('#journal-button');await page.keyboard.press('KeyE');assert.equal((await state()).campaign.region,0);await press('#journal-close');const departure=await state();await press('#gate-button');await page.waitForFunction(()=>window.__GAME__.campaign.region===1);
 await press('#map-button');assert(await page.$('[data-location="return"]'));assert(await page.$('[data-location="exit"]'));await press('#atlas-close');await place(0,49);await walkZ(54,'KeyS');await page.waitForSelector('#gate-button:not([hidden])');assert.match(await page.$eval('#gate-button',e=>e.textContent),/Hearthstead/);
 if(mobile)await press('#gate-button');else await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.__GAME__.campaign.region===0);const returned=await state();assert.equal(returned.rpg.gold,departure.rpg.gold);assert.deepEqual(returned.rpg.items,departure.rpg.items);assert.deepEqual(returned.rpg.drops,departure.rpg.drops);
 assert(validSave(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY)));
 const viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));assert.equal(viewport.width,mobile?390:1100);assert.equal(viewport.height,mobile?844:760);
 report.runs.push({device:mobile?'phone':'desktop',viewport,merchant:'sale, cancellation, protected loadout, potion, reload PASS',smith:'paid +1 upgrade PASS',portals:'world-only forward and return, paused E blocked, loot preserved PASS',gateDistanceRange:[Math.min(...distances),Math.max(...distances)],sampledDraws:returned.draws,sampledTriangles:returned.tris});console.log(report.runs.at(-1));await context.close();
}assert.deepEqual(report.errors,[]);await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));}finally{await browser.close();}
