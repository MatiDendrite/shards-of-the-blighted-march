// Completed-region fixtures and explicit placements, followed by real keyboard,
// pointer and touch input at full render quality. Not an earned quest journey.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Combat} from '../game/src/combat-model.js';
import {Progression,SAVE_KEY,validSave} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
import {travelFixture} from './travel-fixture.mjs';
const out='_artifacts/geography/play';await fs.mkdir(out,{recursive:true});
const m=new Combat(),p=new Progression(),c=new Campaign(p,m);p.restore(m);
for(let region=0;region<4;region++){if(region)assert(travelFixture(c,region));m.damageShard(999);for(let i=0;i<100;i++)m.update(1/60);for(const e of m.enemies)m.damageEnemy(e,e.maxHp);p.events(m.consume(),m);c.observe();p.data.drops=[];}
assert(travelFixture(c,0));const fixture=p.snapshot(m);assert(validSave(fixture));
const main=(await fs.readFile('game/src/main.js','utf8')).replace('await rig.ready;',`window.geographyFixture={model,world,hero,orbit,input,camera,go(region){model.player.x=0;model.player.z=region>campaign.region?-56:54;if(!campaign.travel(region))throw Error('fixture portal rejected');regionChanged();}};await rig.ready;`);
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const report={scope:'completed saves and placement fixtures; native crossing, collision, orbit and map input; full rendering',runs:[],errors:[]};
try{for(const mobile of [false,true]){
 const context=await browser.createBrowserContext(),page=await context.newPage();page.setDefaultTimeout(120000);
 await page.setViewport(mobile?{width:390,height:844,isMobile:true,hasTouch:true}:{width:1100,height:760});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:main}):r.continue());
 await page.evaluateOnNewDocument((key,saved)=>localStorage.setItem(key,JSON.stringify(saved)),SAVE_KEY,fixture);
 await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__);if(mobile)await page.tap('#startb');else await page.click('#startb');await page.waitForFunction(()=>window.__GAME__.started);
 const state=()=>page.evaluate(()=>window.__GAME__);
 const place=async(x,z)=>{await page.evaluate(({x,z})=>{const f=window.geographyFixture;f.input.clear();f.model.player.x=x;f.model.player.z=z;f.hero.position.set(x,.06,z);f.orbit.reset(true);},{x,z});await page.waitForFunction(({x,z})=>Math.hypot(window.__GAME__.pos[0]-x,window.__GAME__.pos[1]-z)<.01,{}, {x,z});};
 const stick=()=>page.$eval('#stick',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
 const keyFor=(axis,dir)=>axis===0?(dir>0?'KeyD':'KeyA'):(dir>0?'KeyS':'KeyW');
 const down=async(axis,dir)=>{if(mobile){const s=await stick();await page.touchscreen.touchStart(s.x,s.y);await page.touchscreen.touchMove(s.x+(axis===0?dir*34:0),s.y+(axis===1?dir*34:0));}else await page.keyboard.down(keyFor(axis,dir));};
 const up=async(axis,dir)=>{if(mobile)await page.touchscreen.touchEnd();else await page.keyboard.up(keyFor(axis,dir));};
 const walk=async(axis,target)=>{const start=(await state()).pos[axis],dir=Math.sign(target-start);await down(axis,dir);await page.waitForFunction(({axis,target,dir})=>dir*(window.__GAME__.pos[axis]-target)>=0,{}, {axis,target,dir});await up(axis,dir);};
 const blocked=async(axis,dir)=>{const start=(await state()).pos;await down(axis,dir);await page.evaluate(()=>{window.blockedSamples=[];let frames=0;const tick=()=>{window.blockedSamples.push([...window.__GAME__.pos]);if(++frames<65)requestAnimationFrame(tick);else window.blockedDone=true;};window.blockedDone=false;requestAnimationFrame(tick);});await page.waitForFunction(()=>window.blockedDone);await up(axis,dir);const samples=await page.evaluate(()=>window.blockedSamples);const last=samples.slice(-10);assert(Math.abs(last.at(-1)[axis]-last[0][axis])<.025,'solid water edge or rail');return{start,end:last.at(-1)};};
 const captures=[];
 for(let region=0;region<4;region++){
  if(region){await page.evaluate(r=>window.geographyFixture.go(r),region);await page.waitForFunction(r=>window.__GAME__.campaign.region===r,{},region);}
  if(mobile&&(region===1||region===3))continue;
  if(region===0){await place(-41.5,8);await walk(0,-48);await page.screenshot({path:`${out}/${mobile?'phone':'desktop'}-bridge.png`});await walk(0,-55);await place(-40,30);const edge=await blocked(0,-1);assert(edge.end[0]>-44);captures.push({region,riverEdge:edge});}
  if(region===1){await place(42,8);await walk(0,49);await page.screenshot({path:`${out}/desktop-forest-bridge.png`});await walk(0,56);captures.push({region,crossed:true});}
  if(region===2){await place(48,8);await walk(0,56);await page.screenshot({path:`${out}/${mobile?'phone':'desktop'}-jetty.png`});const rail=await blocked(1,1);assert(rail.end[1]<9.7);await place(46,24);const shore=await blocked(0,1);assert(shore.end[0]<54);captures.push({region,rail,shore});}
  if(region===3){await place(36,38);const lake=await blocked(0,1);assert(lake.end[0]<39);await page.screenshot({path:`${out}/desktop-tarn.png`});captures.push({region,lake});}
  if(mobile)await page.tap('#map-button');else await page.keyboard.press('KeyM');await page.waitForSelector('#atlas-dialog:not([hidden])');await page.screenshot({path:`${out}/${mobile?'phone':'desktop'}-map-${region}.png`});if(mobile)await page.tap('#atlas-close');else await page.click('#atlas-close');
  // Endpoint collision is inspected after native orbit input, not a teleported camera.
  if(!mobile){await page.mouse.move(520,350);await page.mouse.down({button:'right'});await page.mouse.move(850,390,{steps:12});await page.mouse.up({button:'right'});await page.waitForFunction(()=>Math.abs(window.__GAME__.camera.yaw)>.3);}
  const s=await state();assert(s.draws<500);assert(s.tris<600000);assert.equal(s.rpg.drops.length,0);
  const cameraSafe=await page.evaluate(()=>{const f=window.geographyFixture,p=f.camera.position;return f.world.cameraObstacles.every(o=>(o.parts||[o]).every(b=>!(p.x>b.min.x+.02&&p.x<b.max.x-.02&&p.y>b.min.y+.02&&p.y<b.max.y-.02&&p.z>b.min.z+.02&&p.z<b.max.z-.02)));});assert(cameraSafe);
 }
 report.runs.push({device:mobile?'phone':'desktop',captures});console.log(`${mobile?'Phone':'Desktop'} geography crossings, banks, rails and map PASS`);await context.close();
}assert.deepEqual(report.errors,[]);await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));}finally{await browser.close();}
