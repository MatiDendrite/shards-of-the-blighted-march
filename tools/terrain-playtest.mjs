// Isolated completed saves and placed encounters, then native keyboard/touch.
// This checks terrain integration, not an earned full campaign or user save.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Combat} from '../game/src/combat-model.js';
import {Progression,SAVE_KEY,validSave} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
import {sceneryLayout,canStandIn} from '../game/src/region-layout.js';
import {groundHeight} from '../game/src/terrain-height.js';
import {travelFixture} from './travel-fixture.mjs';
const out='_artifacts/terrain/play';await fs.mkdir(out,{recursive:true});
const model=new Combat(),progress=new Progression(),campaign=new Campaign(progress,model);progress.restore(model);
for(let r=0;r<4;r++){if(r)travelFixture(campaign,r);model.damageShard(999);for(let i=0;i<100;i++)model.update(1/60);for(const e of model.enemies)model.damageEnemy(e,999);progress.events(model.consume(),model);campaign.observe();progress.data.drops=[];}
travelFixture(campaign,0);const fixture=progress.snapshot(model);assert(validSave(fixture));
function slopeRoute(region){
 const {colliders}=sceneryLayout(region),options=[];
 for(let x=-42;x<=42;x+=3)for(let z=-45;z<=39;z+=3)for(const axis of [0,1]){
  const from=[x,z],to=[x+(axis===0?8:0),z+(axis===1?8:0)];
  if(!Array.from({length:41},(_,i)=>i/40).every(t=>canStandIn(colliders,from[0]+(to[0]-from[0])*t,from[1]+(to[1]-from[1])*t)))continue;
  const rise=Math.abs(groundHeight(region,...to)-groundHeight(region,...from));if(rise>1.5)options.push({from,to,axis,rise});
 }
 options.sort((a,b)=>b.rise-a.rise);assert(options.length,'a real open hillside route');return options[0];
}
const routes=[0,1,2,3].map(slopeRoute);
const source=(await fs.readFile('game/src/main.js','utf8')).replace('await rig.ready;',`window.terrainFixture={model,world,scene,hero,orbit,input,camera,progress,combatView,hold(value){paused=value;},go(region){model.player.x=0;model.player.z=region>campaign.region?-56:54;if(!campaign.travel(region))throw Error('fixture portal rejected');regionChanged();}};await rig.ready;`);
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const report={scope:'isolated completed-save and position/encounter fixtures; native movement, dodge and attack; full render',routes,runs:[],errors:[]};
try{for(const mobile of [false,true]){
 const context=await browser.createBrowserContext(),page=await context.newPage();page.setDefaultTimeout(120000);
 await page.setViewport(mobile?{width:390,height:844,isMobile:true,hasTouch:true}:{width:1100,height:760});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:source}):r.continue());
 await page.evaluateOnNewDocument((key,data)=>localStorage.setItem(key,JSON.stringify(data)),SAVE_KEY,fixture);
 await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__);if(mobile)await page.tap('#startb');else await page.click('#startb');
 const prefix=mobile?'phone':'desktop',captures=[];
 const place=async(point)=>{await page.evaluate(([x,z])=>{const f=window.terrainFixture;f.input.clear();f.hold(false);f.model.player.x=x;f.model.player.z=z;f.hero.position.set(x,f.world.heightAt(x,z)+.06,z);f.orbit.reset(true);},point);await page.waitForFunction(([x,z])=>Math.hypot(window.__GAME__.pos[0]-x,window.__GAME__.pos[1]-z)<.01,{},point);};
 const down=async(axis,dir)=>{if(mobile){const s=await page.$eval('#stick',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});await page.touchscreen.touchStart(s.x,s.y);await page.touchscreen.touchMove(s.x+(axis===0?34*dir:0),s.y+(axis===1?34*dir:0));}else await page.keyboard.down(axis===0?(dir>0?'KeyD':'KeyA'):(dir>0?'KeyS':'KeyW'));};
 const up=async(axis,dir)=>{if(mobile)await page.touchscreen.touchEnd();else await page.keyboard.up(axis===0?(dir>0?'KeyD':'KeyA'):(dir>0?'KeyS':'KeyW'));};
 const walk=async(axis,target)=>{
  const start=await page.evaluate(()=>window.__GAME__.pos),dir=Math.sign(target-start[axis]);
  await page.evaluate(()=>{window.terrainSamples=[];window.sampleTerrain=true;const tick=()=>{if(!window.sampleTerrain)return;const g=window.__GAME__;window.terrainSamples.push({pos:g.pos,y:g.elevation.ground,foot:g.elevation.hero-g.elevation.ground,draws:g.draws,tris:g.tris});requestAnimationFrame(tick);};requestAnimationFrame(tick);});
  await down(axis,dir);await page.waitForFunction(({axis,target,dir})=>dir*(window.__GAME__.pos[axis]-target)>=0,{}, {axis,target,dir});await up(axis,dir);
  const samples=await page.evaluate(()=>{window.sampleTerrain=false;return window.terrainSamples;});assert(samples.length>5);assert(samples.every(s=>Math.abs(s.foot-.06)<1e-6));assert(samples.every(s=>s.draws<500&&s.tris<600000));return samples;
 };
 for(let region=0;region<4;region++){
  if(region){await page.evaluate(r=>window.terrainFixture.go(r),region);await page.waitForFunction(r=>window.__GAME__.campaign.region===r,{},region);}
  if(mobile&&(region===1||region===3))continue;
  const route=routes[region];await place(route.from);await page.screenshot({path:`${out}/${prefix}-slope-${region}-start.png`});
  const middle=(route.from[route.axis]+route.to[route.axis])/2,first=await walk(route.axis,middle);await page.screenshot({path:`${out}/${prefix}-slope-${region}-moving.png`});const last=await walk(route.axis,route.to[route.axis]);await page.screenshot({path:`${out}/${prefix}-slope-${region}-end.png`});
  const samples=[...first,...last],change=Math.max(...samples.map(s=>s.y))-Math.min(...samples.map(s=>s.y));assert(change>1.4);
  // Both direction and the camera are controlled with real input on the slope.
  if(!mobile){await page.mouse.move(520,330);await page.mouse.down({button:'right'});await page.mouse.move(780,350,{steps:10});await page.mouse.up({button:'right'});await page.waitForFunction(()=>Math.abs(window.__GAME__.camera.yaw)>.3);}
  const safe=await page.evaluate(()=>{const f=window.terrainFixture,p=f.camera.position;return p.y>f.world.heightAt(p.x,p.z)+.2&&f.world.cameraObstacles.every(o=>(o.parts||[o]).every(b=>!(p.x>b.min.x+.02&&p.x<b.max.x-.02&&p.y>b.min.y+.02&&p.y<b.max.y-.02&&p.z>b.min.z+.02&&p.z<b.max.z-.02)));});assert(safe);
  if(mobile)await page.tap('#map-button');else await page.keyboard.press('KeyM');await page.waitForSelector('#atlas-dialog:not([hidden])');await page.screenshot({path:`${out}/${prefix}-relief-map-${region}.png`});await page.click('#atlas-close');
  captures.push({region,change,moved:8,samples:samples.length,peakDraws:Math.max(...samples.map(s=>s.draws)),peakTris:Math.max(...samples.map(s=>s.tris))});
  if(region===0){
   await place([-41.5,8]);const bridge=await walk(0,-55);assert(bridge.every(s=>Math.abs(s.y)<.015));await page.screenshot({path:`${out}/${prefix}-bridge.png`});
   // A fixed windup makes the actual warning mesh inspectable on a hillside.
   await place(route.from);const axis=route.axis;
   await page.evaluate(({axis})=>{const f=window.terrainFixture,p=f.model.player;f.model.spawn('raider',p.x+(axis===0?2:0),p.z+(axis===1?2:0));const e=f.model.enemies.at(-1);e.phase='windup';e.timer=.7;e.angle=axis===0?-Math.PI/2:Math.PI;f.hold(true);}, {axis});
   await page.waitForFunction(()=>{const f=window.terrainFixture;return f.scene.getObjectByName(`warning-${f.model.enemies.at(-1).id}`)?.visible;});
   const warning=await page.evaluate(async()=>{const T=await import('three'),f=window.terrainFixture,e=f.model.enemies.at(-1),mesh=f.scene.getObjectByName(`warning-${e.id}`),root=f.scene.getObjectByName(`enemy-${e.id}`),p=mesh.geometry.attributes.position,v=new T.Vector3();mesh.updateMatrixWorld(true);let error=0;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);error=Math.max(error,Math.abs(v.y-f.world.heightAt(v.x,v.z)-.11));}return{error,enemyFoot:root.position.y-f.world.heightAt(e.x,e.z)};});assert(warning.error<1e-5);assert(Math.abs(warning.enemyFoot-.06)<1e-6);await page.screenshot({path:`${out}/${prefix}-slope-warning.png`});
   await page.evaluate(()=>{const f=window.terrainFixture;f.hold(false);f.model.enemies.at(-1).phase='recovery';f.model.enemies.at(-1).timer=3;});
   if(!mobile){const target=await page.evaluate(()=>window.__GAME__.targets.at(-1));await page.mouse.move(target.sx,target.sy);await page.keyboard.press('Digit1');}else await page.tap('#cleave');
   await page.waitForFunction(()=>window.__GAME__.skillsUsed.cleave>0);await page.waitForFunction(()=>window.__GAME__.attackPhase==='idle');
   if(mobile)await page.tap('#dodge');else await page.keyboard.press('Space');await page.waitForFunction(()=>window.__GAME__.dodges>0);
   captures.at(-1).warning=warning;captures.at(-1).nativeCombat=true;
   await page.evaluate(()=>{const f=window.terrainFixture;f.model.enemies=[];f.combatView.reset();});
  }
  console.log(`${prefix} region ${region}: uphill/downhill footing, camera and map PASS`);
 }
 report.runs.push({device:prefix,captures});assert.deepEqual(report.errors,[]);await context.close();
}await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));}finally{await browser.close();}
