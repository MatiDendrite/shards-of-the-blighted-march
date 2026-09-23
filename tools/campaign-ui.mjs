// Explicit save fixtures exercise migration/region restoration and mobile travel.
// This is not the real-input campaign completion test (see campaign-playtest.mjs).
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Combat} from '../game/src/combat-model.js';
import {Progression,validSave,SAVE_KEY} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
const out='_artifacts/campaign';await fs.mkdir(out,{recursive:true});
const m=new Combat(),p=new Progression(),c=new Campaign(p,m),fixtures=[p.snapshot(m)];
for(let i=0;i<3;i++){m.damageShard(999);for(let n=0;n<100;n++)m.update(1/60);for(const e of m.enemies)m.damageEnemy(e,999);p.events(m.consume(),m);c.observe();c.travel(i+1);fixtures.push(p.snapshot(m));}
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});const report=[];
try{for(let region=0;region<4;region++){
 assert(validSave(fixtures[region]));const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});
 await page.evaluateOnNewDocument((key,data)=>{if(!localStorage.getItem(key))localStorage.setItem(key,data);},SAVE_KEY,JSON.stringify(fixtures[region]));
 await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__,{timeout:90000});await page.tap('#startb');await page.waitForFunction(()=>window.__GAME__.started);
 assert.equal(await page.evaluate(()=>window.__GAME__.campaign.region),region);await page.screenshot({path:`${out}/fixture-region-${region}.png`});
 await page.tap('#journal-button');assert(await page.evaluate(()=>window.__GAME__.paused));assert.equal(await page.$$eval('.quest-card',es=>es.length),4);assert(await page.$eval('#journal',e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:`${out}/fixture-journal-${region}.png`});
 if(region>0){const gold=await page.evaluate(()=>window.__GAME__.rpg.gold);await page.tap('[data-travel="0"]');await page.waitForFunction(()=>window.__GAME__.campaign.region===0);await page.tap('#journal-button');await page.tap(`[data-travel="${region}"]`);await page.waitForFunction(i=>window.__GAME__.campaign.region===i,{},region);assert.equal(await page.evaluate(()=>window.__GAME__.rpg.gold),gold);await page.reload();await page.waitForFunction(()=>window.__READY__,{timeout:90000});await page.tap('#startb');assert.equal(await page.evaluate(()=>window.__GAME__.campaign.region),region);}
 else await page.tap('#journal-close');
 if(region===3){assert.equal(await page.$eval('#boss-bar',e=>e.hidden),true);const b=await page.$eval('#stick',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});await page.touchscreen.touchStart(b.x,b.y);await page.touchscreen.touchMove(b.x,b.y-35);await page.waitForFunction(()=>window.__GAME__.pos[1]<-31,{timeout:180000});await page.touchscreen.touchEnd();await page.waitForFunction(()=>window.__GAME__.enemies[0].phase==='windup',{timeout:60000});assert.equal(await page.$eval('#boss-bar',e=>e.hidden),false);await page.screenshot({path:`${out}/fixture-boss-warning.png`});}
 assert.deepEqual(errors,[]);report.push({region,result:'PASS',fixture:true,errors});console.log(report.at(-1));await context.close();
}await fs.writeFile(`${out}/ui-fixtures.json`,JSON.stringify(report,null,2));}finally{await browser.close();}
