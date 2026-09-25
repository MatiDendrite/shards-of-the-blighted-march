// Spell effect strips: each ability runs through the real combat model and
// combat view, then three moments are rendered (release, peak, fade).
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const tag=process.argv[2]||'current';assert(/^[a-z0-9-]+$/.test(tag));const out=`_artifacts/spell-review/${tag}`;await fs.mkdir(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[];page.setDefaultTimeout(180000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.setViewport({width:1440,height:540});await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:''}):r.continue());await page.goto('http://localhost:4173/preview/');
 await page.evaluate(async()=>{
  const T=await import('three'),{loadActorAsset}=await import('./src/actor-surfaces.js'),{createCombatView,mergeJoints}=await import('./src/combat-view.js'),{Combat}=await import('./src/combat-model.js'),{CLASSES,SKILLS,ARCANE_BOLT}=await import('./src/class-data.js'),{createRig}=await import('./lib/rig.js');
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1440,540);renderer.shadowMap.enabled=true;renderer.domElement.style.cssText='position:fixed;inset:0;z-index:10000';document.body.append(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,480/540,.1,80),rig=createRig(T,renderer,scene,{tier:'phone',hour:17.4,azimuth:220,post:false,cascades:1,shadowMap:1024,shadowDist:14,exposure:1.02,sunIntensity:2.3,fill:1,envIntensity:.6,bounce:.45,camera});await rig.ready;scene.fog=null;
  const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:0x3f4638,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const hero=await loadActorAsset(new URL('./assets/wanderer.js',location.href).href,{keepHierarchy:true,height:1.85});mergeJoints(hero);scene.add(hero);
  const model=new Combat(()=>true);model.enemies=[];model.shard.hp=0;model.shard.exploded=true;model.region=0;const view=await createCombatView(scene,hero,model,{play(){}});for(const id of Object.keys(CLASSES))await view.loadClass(id);
  window.spellStrip=async(id,kind)=>{
   view.setClass(id);view.reset();model.enemies=[];model.projectiles.length=model.bombs.length=0;model.consume();
   const p=model.player;Object.assign(p,{classId:id,x:0,z:0,angle:0,stamina:100,hp:p.maxHp,action:null,dodge:0,buff:0,smoke:0,ward:0,wardTime:0,weapon:'sword',combo:0});for(const k in p.cooldowns)p.cooldowns[k]=0;
   const far=['firebolt','venom','cinderbomb'].includes(kind)||(kind==='basic'&&id==='mage'),e=model.spawn('raider',0,far?5.5:2.4);e.hp=e.maxHp=100000;
   const skill=kind==='basic'?(id==='mage'?ARCANE_BOLT:{windup:.2,active:.12}):SKILLS[kind],release=skill.windup,moments=kind==='cinderbomb'?[release+.08,release+1.18,release+1.5]:far?[release+.12,release+.36,release+.7]:[release+.05,release+.16,release+.55];
   const target={x:e.x,z:e.z};let time=0;const dt=1/60;
   camera.position.set(4.6,5.2,-4.4);camera.lookAt(0,.6,far?2.6:1.1);rig.refresh(scene);
   const hold=()=>{e.phase='recovery';e.timer=100;};
   model.startAttack(kind,0,target);renderer.setScissorTest(true);const frames=[];
   for(let i=0;i<3;i++){while(time<moments[i]){hold();model.update(dt);view.process(model.consume());view.update(dt,camera);rig.update?.(camera,dt);time+=dt;}
    renderer.setViewport(i*480,0,480,540);renderer.setScissor(i*480,0,480,540);rig.render(camera,0);frames.push({draws:renderer.info.render.calls,tris:renderer.info.render.triangles});}
   renderer.setScissorTest(false);document.querySelectorAll('.spell-caption').forEach(x=>x.remove());
   const name=kind==='basic'?(id==='mage'?'Arcane Bolt':'Basic attack'):SKILLS[kind].name,label=document.createElement('div');label.className='spell-caption';label.textContent=`${CLASSES[id].name.toUpperCase()} · ${name.toUpperCase()}`;label.style.cssText='position:fixed;top:14px;width:100%;text-align:center;color:#ece7d7;font:18px sans-serif;letter-spacing:2px;z-index:10001;text-shadow:0 1px 3px #000';document.body.append(label);
   return{classId:id,kind,frames};
  };
 });
 const {CLASSES}=await import('../game/src/class-data.js'),results=[];
 for(const id of Object.keys(CLASSES))for(const kind of ['basic',...CLASSES[id].skills]){results.push(await page.evaluate(({id,kind})=>window.spellStrip(id,kind),{id,kind}));await page.screenshot({path:`${out}/${id}-${kind}.png`});}
 await fs.writeFile(`${out}/report.json`,JSON.stringify({scope:'combat model + combat view at fixed moments after release',results,errors},null,2));
 assert.deepEqual(errors,[]);for(const r of results)for(const f of r.frames)assert(f.draws<500&&f.tris<600000,`${r.classId} ${r.kind} budget`);
 console.log(`spell review: ${results.length} strips in ${out}`);
}finally{await browser.close();}
