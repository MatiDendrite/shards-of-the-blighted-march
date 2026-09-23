// Real renderer / native controls plus explicitly synthetic quest-gate fixtures.
// Browser contexts are isolated: this never reads or changes the player's save.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='_artifacts/dodge-encounters';await fs.mkdir(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const report={scope:'actual actor render and native dodge input; synthetic quest fixtures, not an earned campaign',errors:[],controls:[]};
const monitor=page=>{page.setDefaultTimeout(90000);page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});};
try{
 const study=await browser.newPage();monitor(study);await study.setViewport({width:1440,height:600});await study.setRequestInterception(true);study.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:''}):r.continue());await study.goto('http://localhost:4173/preview/');
 report.poses=await study.evaluate(async()=>{
  const T=await import('three'),{ASSET}=await import('./lib/assetlib.js'),{Combat}=await import('./src/combat-model.js'),{createCombatView,mergeJoints}=await import('./src/combat-view.js');
  const scene=new T.Scene(),hero=await ASSET(new URL('./assets/wanderer.js',location.href).href,{keepHierarchy:true,height:1.85,surfaces:true});mergeJoints(hero);scene.add(hero);hero.position.set(0,.06,0);
  const model=new Combat();model.enemies=[];model.shard.hp=0;model.shard.exploded=true;Object.assign(model.player,{x:0,z:0,angle:0});
  const view=await createCombatView(scene,hero,model,{play(){}}),renderer=new T.WebGLRenderer({canvas:document.querySelector('#world'),antialias:true});renderer.setSize(1440,600);renderer.setClearColor(0x303936);renderer.toneMapping=T.ACESFilmicToneMapping;
  scene.add(new T.HemisphereLight(0xddeaff,0x504936,3));const sun=new T.DirectionalLight(0xffe8cb,3);sun.position.set(3,5,4);scene.add(sun);
  const ground=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:0x48534d,roughness:1}));ground.rotation.x=-Math.PI/2;scene.add(ground);
  const grid=new T.GridHelper(10,40,0x768178,0x535f58);grid.position.y=.005;scene.add(grid);
  const camera=new T.PerspectiveCamera(36,240/600,.1,50);camera.position.set(2.7,2.1,5);camera.lookAt(0,.88,0);
  for(const e of document.body.children)if(e.id!=='world')e.hidden=true;
  const names=['REST','PUSH · 0.05s','FORWARD · 0.12s','BACK · 0.12s','SIDE · 0.12s','RECOVER · 0.28s'],states=[[0,0,0],[1,0,.05],[1,0,.12],[-1,0,.12],[0,1,.12],[1,0,.28]],results=[];
  renderer.setScissorTest(true);
  for(let i=0;i<states.length;i++){
   const [z,x,age]=states[i];Object.assign(model.player,{dodge:i?.34-age:0,dodgeAge:age,dodgeX:x,dodgeZ:z});view.update(0,camera);scene.updateMatrixWorld(true);
   const j=hero.userData.joints,feet=[j.leftFoot,j.rightFoot].map(n=>new T.Box3().setFromObject(n,true).min.y),weapon=new T.Box3().setFromObject(hero.getObjectByName('heroWeaponMount'),true);
   results.push({name:names[i],feet,weaponMinY:weapon.min.y,headY:j.head.getWorldPosition(new T.Vector3()).y,knee:j.leftShin.rotation.x});
   renderer.setViewport(i*240,0,240,600);renderer.setScissor(i*240,0,240,600);renderer.render(scene,camera);
   const label=document.createElement('div');label.textContent=names[i];label.style.cssText=`position:fixed;top:28px;left:${i*240}px;width:240px;text-align:center;color:#e6dec5;font:13px system-ui;letter-spacing:1px`;document.body.append(label);
  }
  return results;
 });await study.screenshot({path:`${out}/dodge-poses.png`});assert(report.poses.every(p=>p.feet.every(y=>y>=.05)&&p.weaponMinY>=0&&p.headY>1));await study.close();console.log('Actor pose study PASS');
 const main=await fs.readFile('game/src/main.js','utf8');
 const instrumented=main.replace('await rig.ready;',`window.fixture={model,progress,campaign,hero,combatView,setPaused(v){paused=v;},sample(){return Object.values(hero.userData.joints).map(n=>[...n.position.toArray(),...n.rotation.toArray()]);}};await rig.ready;`)
  .replace('actualSpeed=Math.hypot(p.x-oldX,p.z-oldZ)/dt;',`actualSpeed=Math.hypot(p.x-oldX,p.z-oldZ)/dt;if(window.captureDodge&&p.dodge>0&&p.dodgeAge>=.1){paused=true;window.captureDodge=false;}`);
 for(const mobile of [false,true]){
  const context=await browser.createBrowserContext(),page=await context.newPage();monitor(page);await page.setViewport(mobile?{width:390,height:844,isMobile:true,hasTouch:true}:{width:1280,height:800});
  await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:instrumented}):r.continue());
  await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__);if(mobile)await page.tap('#startb');else await page.click('#startb');await page.waitForFunction(()=>window.__GAME__.started);
 assert.equal(await page.evaluate(()=>window.__GAME__.alive),12);assert.match(await page.$eval('#objective-detail',e=>e.textContent),/0 \/ 16 guardians/);
 if(mobile)assert(await page.$eval('#objective-detail',e=>{const r=e.getBoundingClientRect(),map=document.querySelector('#navigation-map').getBoundingClientRect();return r.height>0&&r.bottom<map.top;}),'touch kill counter must stay visible above the minimap');
  const before=await page.evaluate(()=>{window.captureDodge=true;return window.__GAME__.pos;});if(mobile)await page.tap('#dodge');else await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.__GAME__.paused&&window.__GAME__.dodgeAge>=.1);
  const mid=await page.evaluate(()=>({state:window.__GAME__,pose:window.fixture.sample(),shin:window.fixture.hero.userData.joints.leftShin.rotation.x,torso:window.fixture.hero.userData.joints.torso.rotation.x}));assert.equal(mid.state.dodges,1);assert(mid.shin>1);assert(Math.abs(mid.torso)>.3);
  await page.screenshot({path:`${out}/${mobile?'touch':'keyboard'}-dodge.png`});assert.deepEqual(await page.evaluate(()=>window.fixture.sample()),mid.pose,'frozen simulation must not drift the pose');
  await page.evaluate(()=>window.fixture.setPaused(false));await page.waitForFunction(()=>!window.__GAME__.dodgeRemaining);
  const after=await page.evaluate(()=>({state:window.__GAME__,shin:window.fixture.hero.userData.joints.leftShin.rotation.x,torso:window.fixture.hero.userData.joints.torso.rotation.x}));
  assert.equal(after.shin,0);assert.equal(after.torso,0);const moved=Math.hypot(after.state.pos[0]-before[0],after.state.pos[1]-before[1]);assert(Math.abs(moved-7.8*.34)<.02);
  report.controls.push({mobile,moved,kneeAtPush:mid.shin,leanAtPush:mid.torso,draws:after.state.draws,tris:after.state.tris});console.log(mobile?'Touch dodge PASS':'Keyboard dodge PASS');
  if(!mobile){
   // Gate progression is synthetic and explicitly separate from native input.
   await page.evaluate(()=>{const f=window.fixture;f.setPaused(true);f.model.damageShard(999);for(const e of f.model.enemies)e.stagger=100;for(let i=0;i<90;i++)f.model.update(1/60);for(const e of f.model.enemies)if(e.id<=8)f.model.damageEnemy(e,999);f.progress.events(f.model.consume(),f.model);f.campaign.observe();});
   await page.waitForFunction(()=>window.__GAME__.kills===8);await page.keyboard.press('KeyJ');await page.waitForSelector('#journal:not([hidden])');assert(await page.$eval('[data-travel="1"]',e=>e.disabled));assert.match(await page.$eval('.quest-card.current',e=>e.textContent),/Guardians 8 \/ 16/);await page.screenshot({path:`${out}/sealed-journal.png`});
   await page.evaluate(()=>{const f=window.fixture;for(const e of f.model.enemies)if(e.id!==16)f.model.damageEnemy(e,999);f.progress.events(f.model.consume(),f.model);f.campaign.observe();localStorage.setItem('shards.journey.v1',JSON.stringify(f.progress.snapshot(f.model)));});
   await page.reload();await page.waitForFunction(()=>window.__READY__);await page.click('#startb');await page.waitForFunction(()=>window.__GAME__.kills===15);const restored=await page.evaluate(()=>window.__GAME__);assert(!restored.complete);assert.deepEqual(restored.enemies.map(e=>e.id),[16]);
   await page.evaluate(()=>{const f=window.fixture;f.setPaused(true);f.model.damageEnemy(f.model.enemies.find(e=>e.id===16),999);f.progress.events(f.model.consume(),f.model);f.campaign.observe();});await page.waitForFunction(()=>window.__GAME__.campaign.cleared[0]);await page.keyboard.press('KeyJ');await page.waitForSelector('#journal:not([hidden])');assert(!(await page.$eval('[data-travel="1"]',e=>e.disabled)));await page.click('[data-travel="1"]');await page.waitForFunction(()=>window.__GAME__.campaign.region===1);assert.equal(await page.evaluate(()=>window.__GAME__.alive),12);report.gates='8/16 locked; 15/16 locked after reload; 16/16 opens actual travel button';console.log('Gate and last-guardian reload PASS');
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
