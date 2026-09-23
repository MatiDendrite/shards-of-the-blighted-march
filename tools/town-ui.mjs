import {travelFixture} from './travel-fixture.mjs';
// Isolated completed-campaign fixture for traversal/settlement UI, not earned wins.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Combat} from '../game/src/combat-model.js';
import {Progression,SAVE_KEY,validSave} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
import {route} from './navigation.mjs';
const out='_artifacts/expanded-world';await fs.mkdir(out,{recursive:true});
const m=new Combat(),p=new Progression(),c=new Campaign(p,m);p.restore(m);
for(let i=0;i<4;i++){if(i)travelFixture(c,i);m.damageShard(999);for(let t=0;t<100;t++)m.update(1/60);for(const e of m.enemies)m.damageEnemy(e,999);p.events(m.consume(),m);c.observe();}
travelFixture(c,0);const fixture=p.snapshot(m);assert(validSave(fixture));
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const mobile=process.argv.includes('--mobile');await page.setViewport(mobile?{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1}:{width:640,height:480,deviceScaleFactor:1});
 await page.evaluateOnNewDocument((key,data)=>{if(!localStorage.getItem(key))localStorage.setItem(key,data);},SAVE_KEY,JSON.stringify(fixture));
 // Stop through the same public input handlers in the browser frame that reaches
 // a waypoint. CDP release alone can arrive several frames late on SwiftShader.
 await page.evaluateOnNewDocument(()=>addEventListener('pointerdown',e=>{if(e.target.closest?.('#stick'))window.__testStickPointer=e.pointerId;},true));
 await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__,{timeout:90000});await page.click('#startb');
 const state=()=>page.evaluate(()=>window.__GAME__);
 async function walk(x,z,radius=1.5){const g=await state(),path=route(g.pos,{x,z},g.obstacles,radius-.3,1.3);for(const point of path)for(const axis of [0,1]){
   const g=await state();if(Math.hypot(x-g.pos[0],z-g.pos[1])<radius)return;
   const target=axis?point.z:point.x,d=target-g.pos[axis];if(Math.abs(d)<.25)continue;const dir=Math.sign(d),key=axis?(dir>0?'KeyS':'KeyW'):(dir>0?'KeyD':'KeyA');
   if(mobile){const s=await page.$eval('#stick',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});await page.touchscreen.touchStart(s.x,s.y);await page.touchscreen.touchMove(s.x+(axis?0:dir*34),s.y+(axis?dir*34:0));}else await page.keyboard.down(key);
   try{await page.waitForFunction(({axis,target,dir,key,mobile})=>{
    if(dir*(window.__GAME__.pos[axis]-target)<-.28)return false;
    if(mobile)document.querySelector('#stick').dispatchEvent(new PointerEvent('pointercancel',{pointerId:window.__testStickPointer,bubbles:true}));
    else window.dispatchEvent(new KeyboardEvent('keyup',{code:key,bubbles:true}));
    return true;
   },{timeout:180000,polling:'raf'},{axis,target,dir,key,mobile});}catch(error){await fs.writeFile(`${out}/route-failure.json`,JSON.stringify({x,z,path,axis,target,dir,state:await state(),error:error.message},null,2));throw error;}finally{if(mobile)await page.touchscreen.touchEnd();else await page.keyboard.up(key);}
  }assert(Math.hypot(x-(await state()).pos[0],z-(await state()).pos[1])<radius+.4);}
 async function press(selector){if(mobile)await page.tap(selector);else await page.click(selector);}
 // Reach the actual NPC with input, pay real fixture currency through the public UI.
 await walk(6,2,2.4);const before=await state();await press('#npc-button');await page.waitForSelector('#town-dialog:not([hidden])');await page.waitForFunction(()=>window.__GAME__.paused);assert(await page.$eval('#town-dialog',e=>e.scrollWidth<=e.clientWidth+1));
 await press('#town-buy');await page.waitForFunction(gold=>window.__GAME__.rpg.gold===gold,{},before.rpg.gold-25);assert.equal((await state()).rpg.potions,before.rpg.potions+1);await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-merchant.png`});
 await press('#town-journal');await page.waitForSelector('#journal:not([hidden])');assert(await page.$eval('#journal',e=>e.scrollWidth<=e.clientWidth+1));await page.$eval('#local-map',e=>e.scrollIntoView({block:'center'}));await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-map.png`});await press('#journal-close');
 for(let region=0;region<(mobile||process.argv.includes('--first-region')?1:4);region++){
  if(region){await walk(0,-56,2.2);await press('#gate-button');await page.waitForFunction(i=>window.__GAME__.campaign.region===i,{timeout:90000},region);}
  console.log('Exploring expanded region',region);if(!mobile)await walk(0,11);await page.screenshot({path:`${out}/town-${region}${mobile?'-mobile':''}.png`});
  if(!mobile){await walk(0,8);await walk(-36,8);const west=await state();assert(!west.inTown);assert(west.pos[0]<-34);await page.screenshot({path:`${out}/west-${region}.png`});await walk(0,8);await walk(36,8);const east=await state();assert(east.pos[0]>34);await page.screenshot({path:`${out}/east-${region}.png`});assert(east.draws<=500);assert(east.tris<=600000);results.push({region,west:west.pos,east:east.pos,draws:east.draws,tris:east.tris,result:'PASS'});console.log(results.at(-1));}
 }
 const saved=await state();await page.reload();await page.waitForFunction(()=>window.__READY__,{timeout:90000});await press('#startb');assert.equal((await state()).rpg.gold,saved.rpg.gold);assert.equal((await state()).campaign.region,saved.campaign.region);assert((await state()).inTown);
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/${mobile?'mobile':'desktop'}-review.json`,JSON.stringify({fixture:true,result:'PASS',merchant:true,reload:true,results,errors},null,2));console.log('Settlement interaction and expanded-world review: PASS');
}finally{await browser.close();}
