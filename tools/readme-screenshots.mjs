// Real runtime captures in disposable profiles. Progress/position fixtures select
// scenic locations; they are not evidence of an earned campaign playthrough.
// No scene objects, materials, lighting, HUD or renderer settings are replaced.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Combat} from '../game/src/combat-model.js';
import {Progression,SAVE_KEY,validSave} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
import {travelFixture} from './travel-fixture.mjs';

const base=process.env.SCREENSHOT_BASE_URL||'http://localhost:4173/preview/';
const out=process.env.SCREENSHOT_OUT||'screenshots';await fs.mkdir(out,{recursive:true});
const source=(await fs.readFile('game/src/main.js','utf8')).replace('await rig.ready;','window.captureFixture={model,world,hero,orbit,input};await rig.ready;');
const shots=process.env.SCREENSHOT_SHOTS?JSON.parse(process.env.SCREENSHOT_SHOTS):[
 {name:'hearthstead',region:0,classId:'warrior',x:0,z:13,yaw:.35,tilt:0,zoom:1.06},
 {name:'willow-run',region:0,classId:'mage',x:-47,z:8,yaw:1.1,tilt:-.08,zoom:1.08},
 {name:'saltwind-coast',region:2,classId:'ninja',x:49,z:8,yaw:-1.3,tilt:-.13,zoom:1.13},
 ...(process.env.SCREENSHOT_ALL?[{name:'thornwood',region:1,classId:'dwarf',x:0,z:13,yaw:.35,tilt:0,zoom:1.06},{name:'court',region:3,classId:'warrior',x:0,z:13,yaw:.35,tilt:0,zoom:1.06}]:[]),
];
function saveFor(shot){
 const m=new Combat(),p=new Progression(),c=new Campaign(p,m);p.restore(m);
 for(let r=0;r<shot.region;r++){
  m.damageShard(999);for(let i=0;i<100;i++)m.update(1/60);
  for(const e of m.enemies)m.damageEnemy(e,e.maxHp);
  p.events(m.consume(),m);c.observe();p.data.drops=[];assert(travelFixture(c,r+1));
 }
 p.data.classId=shot.classId;p.sync(m,true);const save=p.snapshot(m);assert(validSave(save));return save;
}
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const errors=[];
try{
 for(const shot of shots){
  const context=await browser.createBrowserContext(),page=await context.newPage();page.setDefaultTimeout(120000);
  await page.setViewport({width:1280,height:800,deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:source}):r.continue());
  await page.evaluateOnNewDocument((key,save)=>localStorage.setItem(key,JSON.stringify(save)),SAVE_KEY,saveFor(shot));
  await page.goto(base);await page.waitForFunction(()=>window.__READY__);await page.click('#startb');
  await page.waitForFunction(()=>window.__GAME__.started);
  await page.evaluate(s=>{
   const f=window.captureFixture;f.input.clear();if(!f.world.canStand(s.x,s.z))throw Error('Capture position is not walkable');
   Object.assign(f.model.player,{x:s.x,z:s.z,angle:Math.PI});f.hero.position.set(s.x,f.world.heightAt(s.x,s.z)+.06,s.z);f.hero.rotation.y=Math.PI;
   f.orbit.yaw=f.orbit.targetYaw=s.yaw;f.orbit.tilt=f.orbit.targetTilt=s.tilt;f.orbit.zoom=f.orbit.targetZoom=s.zoom;f.orbit.distance=0;
  },shot);
  await page.waitForFunction(s=>Math.abs(window.__GAME__.pos[0]-s.x)<.01&&Math.abs(window.__GAME__.camera.yaw-s.yaw)<.001,{},shot);
  await page.waitForFunction(()=>window.__GAME__.decor,{timeout:120000});
  if(shot.waitEnemy)await page.waitForFunction(n=>!!document.querySelector('canvas')&&window.captureFixture.world&&[...window.captureFixture.hero.parent.children].some(o=>o.name===n),{},shot.waitEnemy);
  await page.evaluate(()=>new Promise(resolve=>{let frames=0;const next=()=>++frames===5?resolve():requestAnimationFrame(next);requestAnimationFrame(next);}));
  await page.screenshot({path:`${out}/${shot.name}.webp`,type:'webp',quality:86});
  console.log(`${shot.name}: ${JSON.stringify(await page.evaluate(()=>({region:window.__GAME__.campaign.name,classId:window.__GAME__.classId,draws:window.__GAME__.draws,tris:window.__GAME__.tris})))}`);
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Runtime screenshots captured without browser errors.');
}finally{await browser.close();}
