import {travelFixture,loadRegionFixture} from './travel-fixture.mjs';
// Isolated completed-quest fixture for visual review, not earned combat evidence.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import {Combat} from '../game/src/combat-model.js';
import {Progression,SAVE_KEY} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
const out=`_artifacts/visual-${process.argv[2]||'detail'}`;await fs.mkdir(out,{recursive:true});
const m=new Combat(),p=new Progression(),c=new Campaign(p,m);p.restore(m);
for(let r=0;r<4;r++){if(r)travelFixture(c,r);m.damageShard(999);for(let i=0;i<100;i++)m.update(1/60);for(const e of m.enemies)m.damageEnemy(e,e.maxHp);p.events(m.consume(),m);c.observe();}travelFixture(c,0);
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.setViewport({width:960,height:640,deviceScaleFactor:1});await page.evaluateOnNewDocument((key,data)=>{if(!localStorage.getItem(key))localStorage.setItem(key,data);},SAVE_KEY,JSON.stringify(p.snapshot(m)));
 await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__,{timeout:90000});await page.click('#startb');await page.mouse.wheel({deltaY:750});console.log('Visual fixture ready');
 for(let r=0;r<4;r++){if(r)await loadRegionFixture(page,p.snapshot(m),r);await page.evaluate(()=>new Promise(resolve=>{let n=12;function tick(){if(--n)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);}));await page.screenshot({path:`${out}/region-${r}.png`});const g=await page.evaluate(()=>window.__GAME__);assert(g.draws<=500);assert(g.tris<=600000);results.push({region:r,draws:g.draws,tris:g.tris});console.log(results.at(-1));}
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/review.json`,JSON.stringify({fixture:true,results,errors},null,2));
}finally{await browser.close();}
