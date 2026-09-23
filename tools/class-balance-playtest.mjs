// Isolated placement fixtures with native input and full rendering. They do not
// represent earned progression and run in fresh, disposable browser contexts.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='_artifacts/class-balance/play';await fs.mkdir(out,{recursive:true});
const main=(await fs.readFile('game/src/main.js','utf8')).replace('await rig.ready;',`window.balanceFixture={model,hero,world,input,progress,combatView,orbit,scene};await rig.ready;`);
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const report={scope:'Native desktop/touch inputs with full rendering in isolated class fixtures, not earned campaign play.',runs:[],errors:[]};
try{for(const mobile of [false,true]){
 const context=await browser.createBrowserContext(),page=await context.newPage(),label=mobile?'phone':'desktop';page.setDefaultTimeout(90000);
 await page.setViewport(mobile?{width:390,height:844,isMobile:true,hasTouch:true}:{width:960,height:720});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:main}):r.continue());
 await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__);console.log(`${label}: loaded`);
 const tap=selector=>mobile?page.tap(selector):page.click(selector);
 await tap('#welcome-class');await tap('[data-class="mage"]');await tap('#class-confirm');await page.waitForFunction(()=>document.querySelector('#class-dialog').hidden&&window.__GAME__.classId==='mage');await tap('#startb');await page.waitForFunction(()=>window.__GAME__.started);
 async function place(distance){
  await page.evaluate(distance=>{
   const f=window.balanceFixture,m=f.model,p=m.player;f.input.clear();f.combatView.reset();m.enemies=[];m.events=[];m.projectiles=[];m.bombs=[];
   Object.assign(p,{x:0,z:-25,angle:Math.PI,action:null,queued:null,dodge:0,dodgeCD:0,stamina:100,hp:p.maxHp,buff:0,smoke:0,ward:0,wardTime:0});for(const k in p.cooldowns)p.cooldowns[k]=0;
   if(!f.world.canStand(0,-25)||!f.world.canStand(0,-25-distance))throw Error('blocked placement fixture');
   const e=m.spawn('raider',0,-25-distance,1);e.hp=e.maxHp=1000;e.stagger=100;e.angle=Math.PI;f.hero.position.set(p.x,f.world.heightAt(p.x,p.z)+.06,p.z);f.orbit.reset(true);
  },distance);
  await page.waitForFunction(distance=>{const s=window.__GAME__;return s.targets.length===1&&Math.abs(s.targets[0].z+25+distance)<.01&&s.targets[0].visible;},{},distance);
  if(!mobile){const target=await page.evaluate(()=>window.__GAME__.targets[0]);await page.mouse.move(target.sx,target.sy);await page.waitForFunction(()=>!!window.balanceFixture.model.player.aimPoint);}
 }
 async function changeClass(id){
  await page.evaluate(()=>{const f=window.balanceFixture,m=f.model;f.input.clear();Object.assign(m.player,{x:0,z:11,action:null,queued:null,dodge:0});m.enemies=[];m.projectiles=[];m.bombs=[];});
  await tap('#class-button');await tap(`[data-class="${id}"]`);await tap('#class-confirm');await page.waitForFunction(id=>document.querySelector('#class-dialog').hidden&&window.__GAME__.classId===id,{},id);
 }
 await place(7);assert.equal(await page.$eval('#attack span',e=>e.textContent),'Bolt');
 const attacks=await page.evaluate(()=>window.__GAME__.attacks);
 if(mobile){const r=await page.$eval('#attack',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});await page.touchscreen.touchStart(r.x,r.y);}else await page.keyboard.down('KeyF');
 await page.waitForFunction(()=>window.balanceFixture.model.projectiles.some(s=>s.kind==='arcane'));
 await page.screenshot({path:`${out}/${label}-arcane.png`});
 await page.waitForFunction(()=>window.balanceFixture.model.enemies[0].hp<1000);
 if(mobile)await page.touchscreen.touchEnd();else await page.keyboard.up('KeyF');
 assert((await page.evaluate(()=>window.__GAME__.attacks))>attacks);console.log(`${label}: ranged basic hits at 7 m`);
 await tap('#bag-button');await page.waitForFunction(()=>!document.querySelector('#inventory').hidden);assert.match(await page.$eval('#character-stats',e=>e.textContent),/Arcane Bolt/);await tap('#bag-close');
 await changeClass('dwarf');await place(1.8);assert.equal(await page.$eval('#attack span',e=>e.textContent),'Attack');
 if(!mobile){
  await page.waitForFunction(()=>{const f=window.balanceFixture,r=f.scene.getObjectByName('cinder-bomb-aim'),e=f.model.enemies[0];return r?.visible&&Math.hypot(r.position.x-e.x,r.position.z-e.z)<.15;});
  await page.screenshot({path:`${out}/${label}-bomb-aim.png`});
 }
 if(mobile)await tap('#slam');else await page.keyboard.press('Digit2');
 await page.waitForFunction(()=>window.balanceFixture.model.bombs.length===1);
 const bomb=await page.evaluate(()=>{const m=window.balanceFixture.model;return{bomb:{...m.bombs[0]},enemy:{x:m.enemies[0].x,z:m.enemies[0].z},skills:{...m.skillsUsed}};});
 assert(Math.hypot(bomb.bomb.x-bomb.enemy.x,bomb.bomb.z-bomb.enemy.z)<.15);assert.equal(bomb.skills.cinderbomb,1);
 await page.screenshot({path:`${out}/${label}-bomb-fuse.png`});await page.waitForFunction(()=>window.balanceFixture.model.enemies[0].hp<1000);console.log(`${label}: close aimed bomb hits after fuse`);
 await changeClass('ninja');await place(1.8);await page.evaluate(()=>{const f=window.balanceFixture;f.progress.equipped(f.model.player.weapon).power=21;f.progress.sync(f.model);});
 if(mobile)await tap('#slam');else await page.keyboard.press('Digit2');
 await page.waitForFunction(()=>window.balanceFixture.model.skillsUsed.venom===1&&window.balanceFixture.model.projectiles.length===0&&window.balanceFixture.model.enemies[0].poison>0);
 const venom=await page.evaluate(()=>{const m=window.balanceFixture.model;return{hp:m.enemies[0].hp,poison:m.enemies[0].poison};});
 assert(venom.hp<=937&&venom.hp>=913,`equipment applied once: ${venom.hp}`);console.log(`${label}: native Venom volley verified`);
 const state=await page.evaluate(()=>({draws:window.__GAME__.draws,tris:window.__GAME__.tris,icons:[...document.querySelectorAll('#skills img')].every(e=>e.complete&&e.naturalWidth===128)}));assert(state.icons);assert(state.draws<500);assert(state.tris<600000);
 report.runs.push({device:label,bomb,venom,...state});await context.close();
}assert.deepEqual(report.errors,[]);report.result='PASS';}finally{await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
