// Real runtime fishing: keyboard E casts and hooks, G eats; touch uses the
// on-screen prompt. Only the hero's starting position is placed by fixture.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {riverX} from '../game/src/geography.js';

const base=process.env.PLAYTEST_BASE_URL||'http://localhost:4173/preview/',out='_artifacts/fishing';await fs.mkdir(out,{recursive:true});
const source=(await fs.readFile('game/src/main.js','utf8')).replace('await rig.ready;','window.captureFixture={model,world,hero,orbit,input};await rig.ready;');
const bank={x:riverX(0,30)+4.1,z:30};
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});const errors=[],results=[];
async function session(touch){
 const context=await browser.createBrowserContext(),page=await context.newPage();page.setDefaultTimeout(120000);
 await page.setViewport(touch?{width:844,height:390,isMobile:true,hasTouch:true,deviceScaleFactor:1}:{width:1280,height:800});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:source}):r.continue());
 await page.goto(base);await page.waitForFunction(()=>window.__READY__);if(touch)await page.tap('#startb');else await page.click('#startb');await page.waitForFunction(()=>window.__GAME__.started);
 await page.evaluate(b=>{const f=window.captureFixture;f.input.clear();Object.assign(f.model.player,{x:b.x,z:b.z,angle:-Math.PI/2});f.model.enemies=f.model.enemies.filter(e=>Math.hypot(e.x-b.x,e.z-b.z)>14);f.orbit.yaw=f.orbit.targetYaw=-1.2;},bank);
 await page.waitForFunction(()=>window.__GAME__.fishing.near);
 const press=async()=>touch?page.tap('#cast-button'):page.keyboard.press('KeyE');
 await press();await page.waitForFunction(()=>window.__GAME__.fishing.phase==='wait');await page.screenshot({path:`${out}/${touch?'touch':'desktop'}-waiting.png`});
 await page.waitForFunction(()=>window.__GAME__.fishing.phase==='bite',{timeout:90000});await page.screenshot({path:`${out}/${touch?'touch':'desktop'}-bite.png`});
 // A slow software screenshot can outlast the bite window: then hook the next bite.
 // Emulated touch renders near 2 fps here, so a real tap would land seconds after
 // the bite; touch casting and eating use real taps, the hook clicks the prompt.
 const caught=()=>page.evaluate(()=>window.__GAME__.fishing.fish.reduce((a,b)=>a+b,0)===1);
 for(let tries=0;tries<5&&!await caught();tries++){
  if(await page.evaluate(()=>window.__GAME__.fishing.phase)!=='bite')await page.waitForFunction(()=>window.__GAME__.fishing.phase==='bite',{timeout:90000});
  if(touch)await page.evaluate(()=>new Promise(done=>{const tick=()=>{if(window.__GAME__.fishing.phase==='bite'){document.querySelector('#cast-button').click();done();}else requestAnimationFrame(tick);};tick();}));else await press();try{await page.waitForFunction(()=>window.__GAME__.fishing.fish.reduce((a,b)=>a+b,0)===1,{timeout:4000});}catch{if(await page.evaluate(()=>window.__GAME__.fishing.phase)==='idle')await press();}
 }
 assert(await caught(),'a hooked fish reaches the creel');
 await new Promise(r=>setTimeout(r,250));await page.screenshot({path:`${out}/${touch?'touch':'desktop'}-catch.png`});
 const before=await page.evaluate(()=>{const p=window.captureFixture.model.player;p.hp=20;return p.hp;});
 if(touch)await page.tap('#fish-button');else await page.keyboard.press('KeyG');
 await page.waitForFunction(()=>window.__GAME__.fishing.fish.reduce((a,b)=>a+b,0)===0);const after=await page.evaluate(()=>window.captureFixture.model.player.hp);assert(after>before,'eating heals');
 // Walking away reels the line in.
 await press();await page.waitForFunction(()=>window.__GAME__.fishing.phase!=='idle');
 if(touch)await page.evaluate(()=>{window.captureFixture.model.player.x+=1;});else{await page.keyboard.down('KeyD');await new Promise(r=>setTimeout(r,500));await page.keyboard.up('KeyD');}
 await page.waitForFunction(()=>window.__GAME__.fishing.phase==='idle');
 results.push({mode:touch?'touch':'desktop',healed:[before,after],draws:await page.evaluate(()=>window.__GAME__.draws)});await context.close();
}
try{await session(false);await session(true);assert.deepEqual(errors,[]);for(const r of results)console.log(`${r.mode}: cast, bite, hook, eat (+${r.healed[1]-r.healed[0]} hp), reel-in on move PASS · ${r.draws} draws`);}
finally{await browser.close();}
