// Native class selection, walking, stopping and dodging in isolated saves.
// Sanctuary placement/resource resets keep these fixtures independent of combat;
// a mid-dodge pause is instrumented so a pose can be inspected repeatably.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='_artifacts/motion/controls';await fs.mkdir(out,{recursive:true});
const source=await fs.readFile('game/src/main.js','utf8'),main=source.replace('await rig.ready;','window.motionFixture={model,hero,input,setPaused(v){paused=v;}};await rig.ready;').replace('actualSpeed=Math.hypot(p.x-oldX,p.z-oldZ)/dt;','actualSpeed=Math.hypot(p.x-oldX,p.z-oldZ)/dt;if(window.freezeDodge&&p.dodge>0&&p.dodgeAge>=.10){paused=true;window.freezeDodge=false;}');
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});const report={scope:'native controls in each class; sanctuary/reset fixtures and frozen mid-dodge instrumentation; isolated saves',runs:[],errors:[]};
try{for(const mobile of [false,true]){
 const context=await browser.createBrowserContext(),page=await context.newPage();page.setDefaultTimeout(120000);await page.setViewport(mobile?{width:390,height:844,isMobile:true,hasTouch:true}:{width:1000,height:700});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:main}):r.continue());await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__);
 const press=s=>mobile?page.tap(s):page.click(s);await press('#startb');await page.waitForFunction(()=>window.__GAME__.started);
 for(const id of ['warrior','mage','ninja','dwarf']){
  // Keep all checks inside the sanctuary, independent of combat balance.
  await page.evaluate(()=>{const f=window.motionFixture;f.input.clear();Object.assign(f.model.player,{x:0,z:11,hp:f.model.player.maxHp,stamina:100,action:null,dodge:0,dodgeCD:0});});
  if(id!=='warrior'){await press('#class-button');await page.waitForSelector('#class-dialog:not([hidden])');await press(`[data-class="${id}"]`);await press('#class-confirm');await page.waitForFunction(id=>window.__GAME__.classId===id&&document.querySelector('#class-dialog').hidden,{},id);}
  const origin=await page.evaluate(()=>({x:window.motionFixture.model.player.x,z:window.motionFixture.model.player.z}));
  if(mobile){const p=await page.$eval('#stick',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});await page.touchscreen.touchStart(p.x,p.y);await page.touchscreen.touchMove(p.x,p.y-34);}else await page.keyboard.down('KeyW');
  await page.waitForFunction(o=>Math.hypot(window.__GAME__.pos[0]-o.x,window.__GAME__.pos[1]-o.z)>.8,{},origin);if(mobile)await page.touchscreen.touchEnd();else await page.keyboard.up('KeyW');await page.waitForFunction(()=>!window.motionFixture.model.player.moving&&window.motionFixture.model.player.gait<.002);
  const before=await page.evaluate(()=>{window.freezeDodge=true;const f=window.motionFixture;return{pos:[f.model.player.x,f.model.player.z],dodges:f.model.dodges};});if(mobile)await press('#dodge');else await page.keyboard.press('Space');await page.waitForFunction(()=>window.__GAME__.paused&&window.__GAME__.dodgeAge>=.1);
  const pose=()=>page.evaluate(()=>{const f=window.motionFixture,j=f.hero.userData.joints;return{parts:Object.values(j).map(n=>[...n.position.toArray(),...n.quaternion.toArray()]),knee:j.leftShin.rotation.x,lean:j.torso.rotation.x,grip:f.hero.getObjectByName('heroWeaponMount').parent.name,dodges:f.model.dodges};});
  const mid=await pose();assert.equal(mid.dodges,before.dodges+1);assert(mid.knee>1);assert(Math.abs(mid.lean)>.25);assert.equal(mid.grip,'rightForearm');await page.screenshot({path:`${out}/${mobile?'phone':'desktop'}-${id}-dodge.png`});assert.deepEqual(await pose(),mid,'paused pose remains unchanged');
  await page.evaluate(()=>window.motionFixture.setPaused(false));await page.waitForFunction(()=>!window.__GAME__.dodgeRemaining);const after=await page.evaluate(()=>({pos:window.__GAME__.pos,draws:window.__GAME__.draws,tris:window.__GAME__.tris}));const moved=Math.hypot(after.pos[0]-before.pos[0],after.pos[1]-before.pos[1]);assert(Math.abs(moved-7.8*.34)<.02);assert(after.draws<500&&after.tris<600000);report.runs.push({device:mobile?'phone':'desktop',classId:id,moved,knee:mid.knee,lean:mid.lean,paused:'stable',grip:mid.grip});console.log(`${mobile?'phone':'desktop'} ${id}: native walk, stop, dodge and frozen grip PASS`);
 }
 await context.close();
}assert.deepEqual(report.errors,[]);await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));}finally{await browser.close();}
