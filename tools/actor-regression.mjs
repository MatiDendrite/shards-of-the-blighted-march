// Isolated rendering of the actual runtime enemy assembly; no player save access.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
await fs.mkdir('_artifacts/hud-loot',{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1100,height:700});await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:''}):r.continue());await page.goto('http://localhost:4173/preview/');
 const report=await page.evaluate(async()=>{
  const T=await import('three'),{ASSET}=await import('./lib/assetlib.js'),{Combat}=await import('./src/combat-model.js'),{createCombatView,mergeJoints}=await import('./src/combat-view.js');
  const scene=new T.Scene(),hero=await ASSET(new URL('./assets/wanderer.js',location.href).href,{keepHierarchy:true,height:1.85,surfaces:true});mergeJoints(hero);scene.add(hero);hero.position.set(2.5,.06,0);hero.rotation.y=Math.PI;
  const model=new Combat();model.enemies=[];model.shard.hp=0;model.shard.exploded=true;model.spawn('raider',0,0);model.spawn('boss',-2.7,0);
  const view=await createCombatView(scene,hero,model,{play(){}}),renderer=new T.WebGLRenderer({canvas:document.querySelector('#world'),antialias:true});renderer.setSize(1100,700);renderer.setClearColor(0x303936);renderer.toneMapping=T.ACESFilmicToneMapping;
  scene.add(new T.HemisphereLight(0xddeaff,0x504936,3));const sun=new T.DirectionalLight(0xffe8cb,3);sun.position.set(3,5,4);scene.add(sun);
  const camera=new T.PerspectiveCamera(36,1100/700,.1,50);camera.position.set(3,3.4,9);camera.lookAt(0,1,0);document.querySelector('#loading').hidden=true;document.querySelector('#brand').hidden=true;
  // A reinforcement spawned while the hero is pitching/attacking must stay upright.
  hero.rotation.x=-.35;hero.userData.joints.rightArm.rotation.set(-2,.7,0);model.spawn('raider',0,-3);
  const result=[];for(const phase of ['idle','windup','recovery']){for(const e of model.enemies){e.phase=phase;e.timer=.5;}view.update(1/60,camera);scene.updateMatrixWorld(true);const invalid=[];scene.traverse(o=>{if(o.isMesh&&!o.matrixWorld.elements.every(Number.isFinite))invalid.push({name:o.name,parent:o.parent?.name});});const heads=scene.children.filter(r=>r!==hero&&r.getObjectByName('leftLeg')).map(r=>r.getObjectByName('head').getWorldPosition(new T.Vector3()).y);result.push({phase,invalid,heads});}
  model.enemies.forEach(e=>e.phase='idle');view.update(0,camera);renderer.render(scene,camera);return result;
 });await page.screenshot({path:'_artifacts/hud-loot/actors.png'});console.log(JSON.stringify(report,null,2));assert.deepEqual(errors,[]);assert(report.every(r=>r.invalid.length===0),'all enemy body parts must have finite world transforms in every phase');assert(report.every(r=>r.heads.length===3&&r.heads.every(y=>y>1.4)),'all raider/boss heads, including a late reinforcement, must remain above ground');
}finally{await browser.close();}
