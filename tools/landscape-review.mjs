// Isolated completed-campaign fixture for scenery review, not a campaign-win test.
// Travel and movement use real UI/keyboard events; no live game state is modified.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Combat} from '../game/src/combat-model.js';
import {Progression,SAVE_KEY,validSave} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';

const out='_artifacts/landscapes';await fs.mkdir(out,{recursive:true});
const m=new Combat(),p=new Progression(),c=new Campaign(p,m);
for(let r=0;r<4;r++){
  if(r)c.travel(r);m.damageShard(999);for(let n=0;n<100;n++)m.update(1/60);
  for(const e of m.enemies)m.damageEnemy(e,999);p.events(m.consume(),m);c.observe();
}
c.travel(0);const fixture=p.snapshot(m);assert(validSave(fixture));
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage(),errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.setViewport({width:1100,height:760,deviceScaleFactor:1});
  await page.evaluateOnNewDocument((key,data)=>{if(!localStorage.getItem(key))localStorage.setItem(key,data);},SAVE_KEY,JSON.stringify(fixture));
  await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__,{timeout:90000});await page.click('#startb');
  await page.mouse.wheel({deltaY:500});
  for(let region=0;region<4;region++){
    if(region){await page.keyboard.press('KeyJ');await page.click(`[data-travel="${region}"]`);await page.waitForFunction(r=>window.__GAME__.campaign.region===r,{},region);}
    const start=await page.evaluate(()=>window.__GAME__.pos);
    await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__GAME__.pos[1]<-1,{timeout:120000,polling:'raf'});await page.keyboard.up('KeyW');
    // Let the camera settle in simulation frames, even with software rendering.
    await page.evaluate(()=>new Promise(resolve=>{let frames=12;const tick=()=>--frames?requestAnimationFrame(tick):resolve();requestAnimationFrame(tick);}));
    await page.screenshot({path:`${out}/region-${region}.png`});
    const g=await page.evaluate(()=>window.__GAME__);assert(start[1]-g.pos[1]>11);assert(g.draws<500);assert(g.tris<600000);
    await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__GAME__.campaign.nearGate,{timeout:300000,polling:'raf'});await page.keyboard.up('KeyW');
    assert.deepEqual(errors,[]);results.push({region,fixture:true,moved:start[1]-g.pos[1],draws:g.draws,tris:g.tris,gateReachable:true,result:'PASS'});console.log(results.at(-1));
  }
  // Revisit uses the cached scene and must restore its original materials/lighting.
  await page.keyboard.press('KeyJ');await page.click('[data-travel="1"]');await page.waitForFunction(()=>window.__GAME__.campaign.region===1);
  await page.reload();await page.waitForFunction(()=>window.__READY__,{timeout:90000});await page.click('#startb');assert.equal(await page.evaluate(()=>window.__GAME__.campaign.region),1);
  assert.deepEqual(errors,[]);await fs.writeFile(`${out}/review.json`,JSON.stringify({results,reload:true,errors},null,2));
}finally{await browser.close();}
