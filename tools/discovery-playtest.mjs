// Real runtime discovery: E opens a chest (lid swings, reward saved) and a
// sword swing smashes a barrel. Only the hero's position is placed by fixture.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sceneryLayout,canStandIn} from '../game/src/region-layout.js';
const out='_artifacts/discovery';await fs.mkdir(out,{recursive:true});
const layout=sceneryLayout(0),spot=prop=>{for(const r of [1.4,1.8,2.2])for(let a=0;a<16;a++){const x=prop.x+Math.cos(a/16*6.283)*r,z=prop.z+Math.sin(a/16*6.283)*r;if(canStandIn(layout.colliders,x,z))return{x,z,angle:Math.atan2(prop.x-x,prop.z-z)};}throw Error('no stand spot');};
const chest=layout.props.find(p=>p.kind==='chest'),barrel=layout.props.find(p=>p.kind==='barrel');
const source=(await fs.readFile('game/src/main.js','utf8')).replace('await rig.ready;','window.captureFixture={model,world,hero,orbit,input};await rig.ready;');
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});const errors=[];
try{
 const page=await browser.newPage();page.setDefaultTimeout(120000);await page.setViewport({width:1280,height:800});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:source}):r.continue());
 await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__);await page.click('#startb');await page.waitForFunction(()=>window.__GAME__.decor,{timeout:180000});
 const place=s=>page.evaluate(s=>{const f=window.captureFixture;f.input.clear();f.model.enemies=f.model.enemies.filter(e=>Math.hypot(e.x-s.x,e.z-s.z)>16);Object.assign(f.model.player,{x:s.x,z:s.z,angle:s.angle});f.orbit.zoom=f.orbit.targetZoom=1.1;},s);
 await place(spot(chest));await new Promise(r=>setTimeout(r,1500));console.log(JSON.stringify(await page.evaluate(id=>{const w=window.captureFixture.world,p=window.captureFixture.model.player;return{near:window.__GAME__.near,direct:w.nearestDiscoverable(p)?.id,keys:Object.keys(window.__GAME__).slice(0,4),count:w.discoverables.length,p:[p.x,p.z],chest:w.discoverables.find(d=>d.prop.id===id)?.prop,found:window.__GAME__.found};},chest.id)),chest.id);await page.waitForFunction(id=>window.__GAME__.near===id,{timeout:20000},chest.id);
 await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.__GAME__.found===1);await new Promise(r=>setTimeout(r,1500));await page.screenshot({path:`${out}/chest-open.png`});
 const b=spot(barrel);await place(b);await new Promise(r=>setTimeout(r,500));
 for(let i=0;i<4&&await page.evaluate(()=>window.__GAME__.found)<2;i++){await page.keyboard.down('KeyF');await new Promise(r=>setTimeout(r,700));await page.keyboard.up('KeyF');await place(b);}
 assert.equal(await page.evaluate(()=>window.__GAME__.found),2,'barrel smashed');
 assert.deepEqual(errors,[]);console.log('discovery: chest opened with E, barrel smashed by a swing PASS');
}finally{await browser.close();}
