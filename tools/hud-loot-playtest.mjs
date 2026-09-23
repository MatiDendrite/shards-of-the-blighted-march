// Explicit, isolated render/save fixtures, not an earned campaign playthrough.
// Interception exposes test-only references; no debug mutation API ships in the game.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='_artifacts/hud-loot';await fs.mkdir(out,{recursive:true});
const source=await fs.readFile('game/src/main.js','utf8');
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[],report={};page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setViewport({width:1100,height:700});await page.setRequestInterception(true);
 page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:source.replace('await rig.ready;',`window.fixture={scene,hero,model,progress,combatView,rpgView,camera,rig,setPaused(value){paused=value;}};await rig.ready;`)}):r.continue());
 await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__);await page.click('#startb');
 await page.evaluate(()=>{const {hero,model}=window.fixture;model.player.x=0;model.player.z=-29;hero.position.set(0,.06,-29);model.player.invulnerable=10000;model.enemies.filter(e=>e.kind==='raider').forEach((e,i)=>{e.x=i?1.2:-1.2;e.z=-30.2;});});
 await page.waitForFunction(()=>window.__GAME__.pos[1]===-29);await page.waitForFunction(()=>window.__GAME__.enemies.some(e=>e.kind==='raider'&&e.phase==='windup'));
 await page.waitForFunction(()=>window.fixture.camera.position.z<-19.2);
 report.raiders=await page.evaluate(async()=>{const T=await import('three'),{scene,hero}=window.fixture;scene.updateMatrixWorld(true);return scene.children.filter(r=>r!==hero&&r.position.z<-20&&r.getObjectByName('leftLeg')).map(r=>({headHeight:r.getObjectByName('head').getWorldPosition(new T.Vector3()).y,pitch:r.rotation.x}));});
 assert(report.raiders.length===2&&report.raiders.every(r=>r.headHeight>1.4&&r.pitch===0));await page.screenshot({path:`${out}/raiders-fixed.png`});console.log('Actual scene: both raiders upright');
 // Make a drop via the existing combat/progression event path.
 await page.evaluate(()=>{const f=window.fixture;f.model.damageEnemy(f.model.enemies.find(e=>e.kind==='raider'),999);const events=f.model.consume();f.progress.events(events,f.model);f.combatView.process(events);});
 await page.waitForFunction(()=>window.fixture.scene.children.some(r=>r.name==='ground-loot'&&r.userData.itemKind!=='currency'));
 report.eventDropModel=await page.evaluate(()=>window.fixture.scene.children.find(r=>r.name==='ground-loot').userData.itemKind);
 // Flat showcase fixture for each supported item. Values remain valid saves.
 await page.evaluate(()=>{const f=window.fixture;f.setPaused(true);f.combatView.reset();f.model.enemies=[];f.model.player.x=0;f.model.player.z=21;f.hero.position.set(0,.06,21);f.hero.rotation.set(0,Math.PI,0);f.rpgView.clearDrops();f.progress.data.drops=['sword','axe','spear','armor',null].map((kind,i)=>({id:`review-${i}`,x:(i-2)*1.7,z:17,gold:12,ore:0,item:kind?f.progress.makeItem(kind,i%2?'uncommon':'rare'):null}));});
 await page.waitForFunction(()=>window.fixture.scene.children.filter(r=>r.name==='ground-loot').length===5);
 await page.waitForFunction(()=>Math.abs(window.fixture.camera.position.z-30.68)<.05);
 report.loot=await page.evaluate(async()=>{const T=await import('three');return window.fixture.scene.children.filter(r=>r.name==='ground-loot').map(r=>{const b=new T.Box3().setFromObject(r.getObjectByName('ground-item'));return{kind:r.userData.itemKind,bottom:b.min.y,height:b.max.y-b.min.y,rotation:r.rotation.y};});});
 assert(report.loot.every(d=>d.bottom>=.089&&d.height<.6));
 const lootLabels=await page.$$eval('.loot-label:not([hidden])',els=>els.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
 for(let i=0;i<lootLabels.length;i++)for(let j=i+1;j<lootLabels.length;j++){const a=lootLabels[i],b=lootLabels[j];assert(!(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y),'nearby loot names must not overlap');}
 await page.screenshot({path:`${out}/desktop-loot.png`});console.log('Actual ground models: sword, axe, spear, armour, coins');
 report.layouts=[];
 for(const [name,width,height,touch] of [['desktop',1100,700,false],['phone',390,844,true],['landscape',844,390,true],['small-landscape',667,375,true]]){
  // Resize only: changing emulated touch here reloads the page and loses the fixture.
  // Native touch input itself is covered by the separate mobile smoke test.
  await page.setViewport({width,height});await page.evaluate(t=>document.body.classList.toggle('touch',t),touch);
  const layout=await page.evaluate(()=>{const ids=['character-hud','vitals','combat-controls'],box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};},dock=box(document.querySelector('#action-bar')),panels=ids.map(id=>({id,...box(document.getElementById(id))})),buttons=[...document.querySelectorAll('#combat-controls button')].map(e=>({id:e.id,...box(e),hit:document.elementFromPoint(e.getBoundingClientRect().x+e.clientWidth/2,e.getBoundingClientRect().y+e.clientHeight/2)?.closest('button')===e}));return{dock,panels,buttons,level:document.querySelector('#character-level').textContent,xp:document.querySelector('#xp-text').textContent,overflow:document.documentElement.scrollWidth>innerWidth};});
  assert(!layout.overflow,name);assert(layout.panels.every(p=>p.y>=layout.dock.y&&p.bottom<=height&&p.width>0),`${name}: identity, vitals, skills inside bottom dock`);
  for(let i=0;i<layout.panels.length;i++)for(let j=i+1;j<layout.panels.length;j++){const a=layout.panels[i],b=layout.panels[j];assert(!(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y),`${name}: panels ${a.id}/${b.id} overlap`);}
  assert(layout.buttons.every(b=>b.hit&&b.right<=width&&b.bottom<=height),`${name}: all combat controls reachable`);assert.equal(layout.level,'1');assert.match(layout.xp,/XP/);
  report.layouts.push({name,...layout});await page.screenshot({path:`${out}/${name}-hud.png`});console.log(`${name}: bottom HUD and buttons PASS`);
 }
 await page.setViewport({width:1100,height:700});await page.evaluate(async()=>{document.body.classList.remove('touch');const {SAVE_KEY}=await import('./src/progression.js'),f=window.fixture;localStorage.setItem(SAVE_KEY,JSON.stringify(f.progress.snapshot(f.model)));});
 await page.reload();await page.waitForFunction(()=>window.__READY__);await page.click('#startb');await page.waitForFunction(()=>window.fixture.scene.children.filter(r=>r.name==='ground-loot').length===5);
 const restored=await page.evaluate(()=>window.fixture.scene.children.filter(r=>r.name==='ground-loot').map(r=>({kind:r.userData.itemKind,rotation:r.rotation.y})));assert.deepEqual(restored,report.loot.map(({kind,rotation})=>({kind,rotation})));
 // Walk into the restored sword drop through native movement; ensure model goes away.
 await page.evaluate(()=>{const f=window.fixture;f.model.player.x=-3.4;f.model.player.z=14.8;f.hero.position.set(-3.4,.06,14.8);});await page.keyboard.down('KeyS');try{await page.waitForFunction(()=>!window.__GAME__.rpg.drops.some(d=>d.id==='review-0'));}finally{await page.keyboard.up('KeyS');}
 assert.equal(await page.evaluate(()=>window.fixture.scene.children.filter(r=>r.name==='ground-loot').length),4);assert(await page.evaluate(()=>window.__GAME__.rpg.items.some(i=>i.kind==='sword'&&i.rarity==='rare')));
 report.saveReloadAndPickup='PASS';assert.deepEqual(errors,[]);await fs.writeFile(`${out}/report.json`,JSON.stringify({...report,errors},null,2));console.log('Save reload, stable grounded pose and native movement pickup: PASS');
}finally{await browser.close();}
