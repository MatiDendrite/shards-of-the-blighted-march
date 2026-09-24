// Disposable profiles, real UI/input/rendering; labelled placement and progress
// fixtures isolate restart/free-look behaviour without touching a player's save.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const deviceFilter=process.argv.find(a=>a.startsWith('--device='))?.slice(9);
assert([undefined,'desktop','phone'].includes(deviceFilter),'--device must be desktop or phone');
const out=`_artifacts/journey-camera${deviceFilter?`/${deviceFilter}`:''}`;await fs.mkdir(out,{recursive:true});
const main=(await fs.readFile('game/src/main.js','utf8')).replace('await rig.ready;',`window.journeyFixture={model,progress,campaign,world,hero,orbit,input,combatView};await rig.ready;`);
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const report={scope:'Native desktop/touch UI and camera input in isolated profiles, with explicit progress/position fixtures and one injected load failure.',runs:[],errors:[]};
const delta=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function followsView(before,after){
 const dx=after.x-before.x,dz=after.z-before.z;
 assert((dx*-Math.sin(before.yaw)+dz*-Math.cos(before.yaw))/Math.hypot(dx,dz)>.98,'held movement must follow the current view without returning to neutral');
 assert(delta(after.angle,after.yaw+Math.PI)<.02,'running character must face the movement direction');
}
try{for(const mobile of deviceFilter?[deviceFilter==='phone']:[false,true]){
 const context=await browser.createBrowserContext(),page=await context.newPage(),device=mobile?'phone':'desktop';page.setDefaultTimeout(90000);
 await page.setViewport(mobile?{width:390,height:844,isMobile:true,hasTouch:true}:{width:960,height:720});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:main}):r.continue());
 await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__);
 const tap=selector=>mobile?page.tap(selector):page.click(selector),saved=()=>page.evaluate(()=>localStorage.getItem('shards.journey.v1'));
 const settle=()=>page.waitForFunction(()=>{const o=window.journeyFixture.orbit;return Math.abs(Math.atan2(Math.sin(o.targetYaw-o.yaw),Math.cos(o.targetYaw-o.yaw)))<.002;});
 const state=()=>page.evaluate(()=>{const f=window.journeyFixture,p=f.model.player;return{x:p.x,z:p.z,angle:p.angle,heroAngle:f.hero.rotation.y,yaw:f.orbit.yaw,eye:f.orbit.eye,attacks:f.model.attacks,classId:p.classId};});
 const heldSegment=async()=>{const before=await state();await page.waitForFunction(p=>Math.hypot(window.__GAME__.pos[0]-p.x,window.__GAME__.pos[1]-p.z)>.4,{},before);const after=await state();followsView(before,after);return after;};
 await tap('#startb');await page.waitForFunction(()=>window.__GAME__.started);
 const seed=()=>page.evaluate(()=>{const f=window.journeyFixture;Object.assign(f.progress.data,{level:4,xp:12,gold:321,ore:9,potions:7});f.progress.data.items[1].upgrade=2;f.model.player.weapon='axe';f.progress.sync(f.model,true);});
 await seed();await tap('#menu-button');const original=await saved();await tap('#new-journey');await page.waitForSelector('#class-dialog:not([hidden])');
 assert.match(await page.$eval('#class-title',e=>e.textContent),/New journey/);assert.equal(await saved(),original);
 const firstClass=mobile?'ninja':'mage';await tap(`[data-class="${firstClass}"]`);await page.screenshot({path:`${out}/${device}-new-journey.png`});
 for(const key of ['KeyI','KeyJ','KeyM'])await page.keyboard.press(key);assert.equal(await page.$eval('#class-dialog',e=>e.hidden),false);assert.equal(await saved(),original);
 await tap('#class-close');await page.waitForSelector('#pause:not([hidden])');assert.equal(await saved(),original);assert((await page.evaluate(()=>window.__GAME__)).paused);
 await tap('#new-journey');await tap(`[data-class="${firstClass}"]`);page.once('dialog',d=>d.dismiss());await tap('#class-confirm');await page.waitForFunction(()=>!document.querySelector('#class-confirm').disabled);assert.equal(await saved(),original);
 if(!mobile){
  await page.evaluate(()=>{const f=window.journeyFixture;f.realLoad=f.combatView.loadClass;f.combatView.loadClass=async()=>{throw Error('Injected character load failure');};});
  page.once('dialog',d=>d.accept());await tap('#class-confirm');await page.waitForFunction(()=>document.querySelector('#class-message').textContent.includes('could not load'));assert.equal(await saved(),original);assert.equal((await state()).classId,'warrior');
  await page.evaluate(()=>{const f=window.journeyFixture;f.combatView.loadClass=f.realLoad;});
 }
 page.once('dialog',d=>d.accept());await tap('#class-confirm');await page.waitForFunction(id=>document.querySelector('#class-dialog').hidden&&window.__GAME__.classId===id,{},firstClass);
 const fresh=await page.evaluate(()=>window.__GAME__);assert.equal(fresh.rpg.level,1);assert.equal(fresh.rpg.gold,60);assert.equal(fresh.weapon,'sword');assert(!fresh.paused);assert.equal(JSON.parse(await saved()).classId,firstClass);
 console.log(`${device}: class selection, cancel and confirmed new journey PASS`);
 await seed();await tap('#menu-button');const retained=JSON.parse(await saved());await tap('#reset-view');const secondClass=mobile?'warrior':'dwarf';await tap(`[data-class="${secondClass}"]`);page.once('dialog',d=>d.accept());await tap('#class-confirm');
 await page.waitForFunction(id=>document.querySelector('#class-dialog').hidden&&window.__GAME__.classId===id,{},secondClass);
 let data=JSON.parse(await saved());for(const key of ['level','xp','gold','ore','potions','items','loadout'])assert.deepEqual(data[key],retained[key]);assert.equal(data.run,retained.run+1);
 // Keeping the currently selected class must also be a valid restart choice.
 await tap('#menu-button');await tap('#reset-view');assert.equal(await page.$eval('#class-confirm',e=>e.disabled),false);page.once('dialog',d=>d.accept());await tap('#class-confirm');await page.waitForFunction(()=>document.querySelector('#class-dialog').hidden);assert.equal(JSON.parse(await saved()).classId,secondClass);
 await page.reload();await page.waitForFunction(()=>window.__READY__);assert.equal(await page.$eval('#welcome-class-name',e=>e.textContent),mobile?'Warrior':'Dwarf');await tap('#startb');await page.waitForFunction(()=>window.__GAME__.started);
 console.log(`${device}: equipment-preserving restart, same class and reload PASS`);
 // Empty, walkable placement isolates orientation from combat and collisions.
 await page.evaluate(()=>{const f=window.journeyFixture;f.input.clear();f.model.enemies=[];f.combatView.reset();Object.assign(f.model.player,{x:0,z:-25,angle:Math.PI,action:null,dodge:0});f.hero.position.set(0,f.world.heightAt(0,-25)+.06,-25);f.hero.rotation.y=Math.PI;f.orbit.reset(true);});
 await page.waitForFunction(()=>window.__GAME__.pos[1]===-25);const initial=await state();
 if(!mobile){
  // More than a complete revolution with the mouse, without character turns.
  for(let i=0;i<3;i++){await page.mouse.move(780,340);await page.mouse.down({button:'right'});await page.mouse.move(350,345,{steps:8});await page.mouse.up({button:'right'});await settle();const s=await state();assert(delta(s.angle,initial.angle)<1e-6);assert(delta(s.heroAngle,initial.heroAngle)<1e-6);assert.equal(s.x,initial.x);assert.equal(s.z,initial.z);assert.equal(s.attacks,initial.attacks);}
  await page.mouse.move(540,300);await settle();assert(delta((await state()).angle,initial.angle)<1e-6);await page.screenshot({path:`${out}/${device}-free-look.png`});
  await page.keyboard.press('KeyC');await settle();await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__GAME__.pos[1]<-25.3);
  const start=await state();await page.mouse.move(710,350);await page.mouse.down({button:'right'});await page.mouse.move(500,350,{steps:8});await settle();const during=await heldSegment();assert(delta(during.yaw,start.yaw)>1);assert(during.x<start.x-.3);
  await page.mouse.up({button:'right'});await heldSegment();
  // Reset also steers continuously while W remains down; no second key press.
  await page.keyboard.press('KeyC');await settle();await heldSegment();
  await page.keyboard.up('KeyW');await page.waitForFunction(()=>window.__GAME__.speed===0);
 }else{
  const cdp=await page.createCDPSession(),center=await page.$eval('#stick',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
  const cam={id:2,x:220,y:360};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[cam]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...cam,x:cam.x+i*12}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle();assert(delta((await state()).angle,initial.angle)<1e-6);assert(delta((await state()).yaw,initial.yaw)>.8);
  await page.screenshot({path:`${out}/${device}-free-look.png`});await tap('#camera-reset');await settle();
  const move={id:1,x:center.x,y:center.y-30};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[move]});await page.waitForFunction(()=>window.__GAME__.pos[1]<-25.3);const start=await state();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[move,cam]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[move,{...cam,x:cam.x+i*12}]});await settle();const during=await heldSegment();assert(delta(during.yaw,start.yaw)>.8);assert(during.x>start.x+.3);
  // CDP touchEnd lists the fingers being lifted, not the remaining fingers.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{...cam,x:cam.x+96}]});await heldSegment();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForFunction(()=>window.__GAME__.speed===0);await settle();
 }
 console.log(`${device}: independent idle camera, continuous view-relative movement and clean release PASS`);
 const end=await page.evaluate(()=>({draws:window.__GAME__.draws,tris:window.__GAME__.tris}));assert(end.draws<500&&end.tris<600000);report.runs.push({device,newClass:firstClass,restartClass:secondClass,...end});await context.close();
}assert.deepEqual(report.errors,[]);report.result='PASS';}finally{await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
