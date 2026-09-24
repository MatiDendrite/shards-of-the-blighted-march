// Fixed-camera art fixtures using runtime loaders, batching and enemy assembly.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const label=process.argv[2]||'cast';assert(/^[a-z0-9-]+$/.test(label));
const out=`_artifacts/character-review/${label}`;await fs.mkdir(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.setViewport({width:1280,height:800});await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:''}):r.continue());await page.goto('http://localhost:4173/preview/');
 await page.evaluate(async()=>{
  const T=await import('three'),{loadNpcActor,createNpcMotion}=await import('./src/npc-actors.js'),{loadActorAsset}=await import('./src/actor-surfaces.js'),{createCombatView,mergeJoints}=await import('./src/combat-view.js'),{Combat,enemyAttack}=await import('./src/combat-model.js'),{createRig}=await import('./lib/rig.js');
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,800);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.domElement.style.cssText='position:fixed;inset:0;z-index:10000';document.body.append(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1.6,.1,80),rig=createRig(T,renderer,scene,{tier:'phone',hour:16.5,azimuth:220,post:false,cascades:1,shadowMap:2048,shadowDist:16,exposure:1.08,sunIntensity:2.65,fill:1.08,envIntensity:.65,bounce:.48,camera});await rig.ready;
  scene.background=new T.Color(0x293336);scene.fog=null;const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:0x4c5352,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const cast={};for(const role of ['smith','merchant','elder','guide']){const root=await loadNpcActor(role);cast[role]={root,animate:createNpcMotion(root,role)};scene.add(root);}
  const hero=await loadActorAsset(new URL('./assets/wanderer.js',location.href).href,{keepHierarchy:true,height:1.85});mergeJoints(hero);
  const model=new Combat();model.enemies=[];model.shard.hp=0;model.shard.exploded=true;model.spawn('raider',0,0);model.spawn('boss',0,0);const combat=await createCombatView(scene,hero,model,{play(){}});combat.update(0,camera);
  window.captureCast=async view=>{
   const role=view.split('-')[0],enemy=role==='warden'||role==='raider',group=view==='townsfolk'||view==='townsfolk-back',side=view.endsWith('-side'),back=view.endsWith('-back'),raised=view.endsWith('-raised');model.time=raised?1.55:0;
   for(const [id,{root,animate}]of Object.entries(cast)){root.visible=group||id===role;root.position.set(group?(['smith','merchant','elder','guide'].indexOf(id)-1.5)*1.7:0,.005,0);root.rotation.set(0,back?Math.PI:side?Math.PI/2:0,0);animate(model.time);}
   for(const e of model.enemies){e.phase=view.includes('sweep')||view.includes('slam')?'windup':view.endsWith('recovery')?'recovery':'idle';e.attackKind=view.includes('slam')?'slam':'sweep';e.timer=e.phase==='windup'?enemyAttack(e).windup*.15:enemyAttack(e).recovery-.08;e.angle=back?Math.PI:side?Math.PI/2:0;}
   combat.update(0,camera);for(const e of model.enemies){const root=scene.getObjectByName(`enemy-${e.id}`);root.visible=enemy&&e.kind===(role==='warden'?'boss':'raider');root.position.y=.005;scene.getObjectByName(`warning-${e.id}`).visible=false;}
   // Hide all combat overlays in art fixtures, but preserve the assembled weapons.
   for(const child of scene.children)if(child.isMesh&&child.material?.transparent)child.visible=false;
   const bossAction=role==='warden'&&model.enemies[1].phase!=='idle';camera.position.set(group?.5:2.1,group?3.3:role==='warden'?3.2:2.3,group?11.6:role==='warden'?bossAction?8.6:7:4.9);camera.lookAt(0,role==='warden'?bossAction?1.65:1.25:.92,0);rig.refresh(scene);await renderer.compileAsync(scene,camera);rig.render(camera,0);
   document.querySelector('#cast-caption')?.remove();const caption=document.createElement('div');caption.id='cast-caption';caption.textContent=group?'BORIN · BLACKSMITH        MARA · MERCHANT        ALDEN · ELDER        ROWAN · GUIDE':view.toUpperCase().replaceAll('-',' · ');caption.style.cssText='position:fixed;bottom:35px;left:0;right:0;text-align:center;color:#e2e4d8;font:18px sans-serif;letter-spacing:2px;z-index:10001';document.body.append(caption);
   return {view,draws:renderer.info.render.calls,tris:renderer.info.render.triangles};
  };
 });
 const results=[];for(const view of ['townsfolk','townsfolk-back','smith','smith-raised','smith-side','merchant','elder','guide','raider','raider-side','raider-back','warden','warden-side','warden-back','warden-sweep','warden-slam','warden-recovery']){results.push(await page.evaluate(view=>window.captureCast(view),view));await page.screenshot({path:`${out}/${view}.png`});}
 await fs.writeFile(`${out}/report.json`,JSON.stringify({scope:'fixed-camera cast and runtime enemy fixtures',results,errors},null,2));console.log({results,errors});assert.deepEqual(errors,[]);for(const r of results){assert(r.draws<500);assert(r.tris<600000);}
}finally{await browser.close();}
