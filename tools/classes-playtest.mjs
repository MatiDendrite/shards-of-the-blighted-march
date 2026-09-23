// Isolated placement fixtures, followed by real keyboard / touch input and full
// rendering. These are class integration tests, not an earned campaign claim.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {CLASSES,SLOT_IDS} from '../game/src/class-data.js';
const out='_artifacts/classes/play';await fs.mkdir(out,{recursive:true});
const main=(await fs.readFile('game/src/main.js','utf8')).replace('await rig.ready;',`window.classFixture={model,hero,world,input,progress,combatView,orbit};await rig.ready;`);
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const report={scope:'native class selection, casts, movement, inventory and reload using isolated encounter placements; full render',runs:[],errors:[]};
try{for(const mobile of [false,true]){
 const context=await browser.createBrowserContext(),page=await context.newPage();page.setDefaultTimeout(90000);
 const label=mobile?'phone':'desktop';await page.setViewport(mobile?{width:390,height:844,isMobile:true,hasTouch:true}:{width:1280,height:800});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:main}):r.continue());
 await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__);
 const tap=selector=>mobile?page.tap(selector):page.click(selector);
 await tap('#welcome-class');await page.waitForSelector('#class-dialog:not([hidden])');await tap('[data-class="mage"]');await page.screenshot({path:`${out}/${label}-selection.png`});await tap('#class-confirm');await page.waitForFunction(()=>document.querySelector('#class-dialog').hidden&&window.__GAME__.classId==='mage');await tap('#startb');await page.waitForFunction(()=>window.__GAME__.started);
 const run={device:label,classes:[]};
 for(const id of ['mage','ninja','dwarf','warrior']){
  if(id!=='mage'){
   await page.evaluate(()=>{const f=window.classFixture,p=f.model.player;f.input.clear();p.x=0;p.z=11;p.action=null;p.dodge=0;p.queued=null;f.model.projectiles=[];f.model.bombs=[];f.model.enemies=[];});
   if(mobile)await tap('#class-button');else await page.keyboard.press('KeyK');await page.waitForSelector('#class-dialog:not([hidden])');await tap(`[data-class="${id}"]`);
   await page.evaluate(()=>{const p=window.classFixture.model.player;p.hp=54;p.stamina=47;});await tap('#class-confirm');await page.waitForFunction(id=>document.querySelector('#class-dialog').hidden&&window.__GAME__.classId===id,{},id);
   const resources=await page.evaluate(()=>({hp:window.classFixture.model.player.hp,stamina:window.classFixture.model.player.stamina}));assert(resources.hp<65&&resources.stamina<80,'class switching did not refill resources');
  }
  await page.waitForFunction(skills=>[...document.querySelectorAll('#skills button')].every((b,i)=>b.dataset.skill===skills[i]&&b.querySelector('img').complete&&b.querySelector('img').naturalWidth===128),{},CLASSES[id].skills);
  // A real movement input is required for every model, not just an idle portrait.
  const start=await page.evaluate(()=>window.__GAME__.pos);
  if(mobile){const s=await page.$eval('#stick',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});await page.touchscreen.touchStart(s.x,s.y);await page.touchscreen.touchMove(s.x,s.y-34);}else await page.keyboard.down('KeyW');
  await page.waitForFunction(start=>Math.hypot(window.__GAME__.pos[0]-start[0],window.__GAME__.pos[1]-start[1])>.7,{},start);if(mobile)await page.touchscreen.touchEnd();else await page.keyboard.up('KeyW');
  await tap('#bag-button');await page.waitForFunction(()=>!document.querySelector('#inventory').hidden&&document.querySelector('#character-preview').complete&&document.querySelector('#character-preview').naturalWidth>0);assert.match(await page.$eval('#character-preview',e=>e.alt),new RegExp(CLASSES[id].name));await page.screenshot({path:`${out}/${label}-${id}-inventory.png`});await tap('#bag-close');
  const casts=[];
  for(let index=0;index<3;index++){
   const skill=CLASSES[id].skills[index];
   const before=await page.evaluate(()=>{
    const f=window.classFixture,m=f.model,p=m.player;f.input.clear();f.combatView.reset();m.enemies=[];m.projectiles=[];m.bombs=[];m.events=[];p.x=0;p.z=-25;p.angle=Math.PI;p.action=null;p.queued=null;p.dodge=0;p.dodgeCD=0;p.stamina=100;p.hp=p.maxHp;p.buff=p.smoke=p.ward=p.wardTime=0;for(const k in p.cooldowns)p.cooldowns[k]=0;
    if(!f.world.canStand(p.x,p.z)||!f.world.canStand(0,-28))throw Error('fixture uses blocked terrain');
    const enemy=m.spawn('raider',0,-28,1);enemy.hp=enemy.maxHp=500;enemy.stagger=100;enemy.angle=Math.PI;f.hero.position.set(p.x,.06,p.z);f.orbit.reset(true);
    return{skills:{...m.skillsUsed},hp:enemy.hp};
   });
   if(mobile)await tap(`#${SLOT_IDS[index]}`);else await page.keyboard.press(`Digit${index+1}`);
   await page.waitForFunction(({skill,count})=>window.classFixture.model.skillsUsed[skill]>count,{}, {skill,count:before.skills[skill]});
   await page.waitForFunction(skill=>{const m=window.classFixture.model,p=m.player;return skill==='blink'?Math.hypot(p.x,p.z+25)>1:skill==='cry'?p.buff>0:skill==='smoke'?p.smoke>0:skill==='ironward'?p.ward>0:m.enemies[0].hp<500;}, {},skill);
   const state=await page.evaluate(()=>{const f=window.classFixture,m=f.model;f.hero.updateMatrixWorld(true);const transforms=[];f.hero.traverse(o=>{if(!o.matrixWorld.elements.every(Number.isFinite))transforms.push(o.name);});return{classId:m.player.classId,skills:{...m.skillsUsed},enemyHp:m.enemies[0].hp,pos:[m.player.x,m.player.z],ward:m.player.ward,smoke:m.player.smoke,buff:m.player.buff,headY:f.hero.userData.joints.head.getWorldPosition({setFromMatrixPosition(matrix){this.y=matrix.elements[13];return this;}}).y,transforms,draws:window.__GAME__.draws,tris:window.__GAME__.tris};});
   assert.equal(state.skills[skill],before.skills[skill]+1);assert.deepEqual(state.transforms,[]);assert(state.headY>.9);assert(state.draws<500);assert(state.tris<600000);casts.push({skill,...state});
   await page.screenshot({path:`${out}/${label}-${skill}.png`});
  }
  // Viewing abilities outside town is allowed, changing class there is not.
  if(mobile)await tap('#class-button');else await page.keyboard.press('KeyK');await page.waitForSelector('#class-dialog:not([hidden])');await tap(`[data-class="${id==='warrior'?'mage':'warrior'}"]`);assert(await page.$eval('#class-confirm',e=>e.disabled));assert.match(await page.$eval('#class-message',e=>e.textContent),/settlement/);await tap('#class-close');
  run.classes.push({id,casts});console.log(`${label} ${id}: selection, movement, gear portrait and all three native casts PASS`);
 }
 // Save from the class UI, then reload the same isolated context normally.
 await page.evaluate(()=>{const f=window.classFixture;f.model.player.x=0;f.model.player.z=11;f.model.player.action=null;f.model.player.dodge=0;f.model.projectiles=[];f.model.bombs=[];f.model.enemies=[];});await tap('#class-button');await tap('[data-class="dwarf"]');await tap('#class-confirm');await page.waitForFunction(()=>document.querySelector('#class-dialog').hidden);
 await page.reload();await page.waitForFunction(()=>window.__READY__);assert.equal(await page.$eval('#welcome-class-name',e=>e.textContent),'Dwarf');await tap('#startb');await page.waitForFunction(()=>window.__GAME__.started&&window.__GAME__.classId==='dwarf');
 if(mobile){await page.setViewport({width:844,height:390,isMobile:true,hasTouch:true});await page.screenshot({path:`${out}/phone-landscape.png`});}
 const bounds=await page.evaluate(()=>[...document.querySelectorAll('#skills button')].map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,visible:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};}));assert(bounds.every(b=>b.visible&&b.w>=44&&b.h>=44));run.bounds=bounds;run.reload='PASS';report.runs.push(run);await context.close();
}assert.deepEqual(report.errors,[]);await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));}finally{await browser.close();}
