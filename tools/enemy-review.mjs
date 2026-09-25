// New enemy strips through the real combat model and view: rest, telegraphed
// windup and strike. The hero stands inside the warning to show its reach.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='_artifacts/enemy-review';await fs.mkdir(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[];page.setDefaultTimeout(180000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.setViewport({width:1440,height:540});await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:''}):r.continue());await page.goto('http://localhost:4173/preview/');
 await page.evaluate(async()=>{
  const T=await import('three'),{loadActorAsset}=await import('./src/actor-surfaces.js'),{createCombatView,mergeJoints}=await import('./src/combat-view.js'),{Combat,enemyAttack}=await import('./src/combat-model.js'),{createRig}=await import('./lib/rig.js'),{LANDSCAPE_RENDER_OPTIONS}=await import('./src/landscape-lighting.js');
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1440,540);renderer.shadowMap.enabled=true;renderer.domElement.style.cssText='position:fixed;inset:0;z-index:10000';document.body.append(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,480/540,.1,80),rig=createRig(T,renderer,scene,{...LANDSCAPE_RENDER_OPTIONS,hour:15,shadowDist:14,camera});await rig.ready;scene.fog=null;
  const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:0x6d7b4a,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const hero=await loadActorAsset(new URL('./assets/wanderer.js',location.href).href,{keepHierarchy:true,height:1.85});mergeJoints(hero);scene.add(hero);
  const model=new Combat(()=>true);model.enemies=[];model.shard.hp=0;model.shard.exploded=true;model.region=1;const view=await createCombatView(scene,hero,model,{play(){}});await view.loadClass('warrior');view.setClass('warrior');
  window.enemyStrip=async kind=>{
   view.reset();model.enemies=[];model.consume();const p=model.player;Object.assign(p,{x:0,z:0,angle:0,hp:5000,maxHp:5000,invulnerable:0});
   const far=kind==='archer',e=model.spawn(kind,0,far?6.5:kind==='brute'?2.2:2.6,50);e.angle=Math.PI;
   for(let i=0;i<600&&!scene.getObjectByName('enemy-50');i++){view.update(1/60,camera);await new Promise(r=>setTimeout(r,20));}
   if(!scene.getObjectByName('enemy-50'))throw Error(`${kind} never appeared`);
   hero.position.set(0,0,0);camera.position.set(5.2,4.6,far?-3:-3.4);camera.lookAt(0,.9,far?3.2:1.3);rig.refresh(scene);
   const d=enemyAttack(e),frames=[];renderer.setScissorTest(true);
   const moments=[['REST',()=>{e.phase='idle';}],['WARNING',()=>{e.phase='windup';e.timer=d.windup*.35;}],['STRIKE',()=>{e.phase='windup';e.timer=.001;}]];
   for(let i=0;i<3;i++){moments[i][1]();model.update(i===2?1/60:0);const events=model.consume();view.process(events);for(let n=0;n<(i===2?8:1);n++){if(i===2){e.phase=e.phase==='windup'?'recovery':e.phase;}view.update(1/60,camera);}
    renderer.setViewport(i*480,0,480,540);renderer.setScissor(i*480,0,480,540);rig.render(camera,0);frames.push({caption:moments[i][0],draws:renderer.info.render.calls,tris:renderer.info.render.triangles,struck:events.some(x=>x.type==='enemyStrike')});}
   renderer.setScissorTest(false);document.querySelectorAll('.enemy-caption').forEach(x=>x.remove());const label=document.createElement('div');label.className='enemy-caption';label.textContent=`${kind.toUpperCase()} · ${d.name.toUpperCase()}`;label.style.cssText='position:fixed;top:12px;width:100%;text-align:center;color:#fff6dc;font:18px sans-serif;letter-spacing:2px;z-index:10001;text-shadow:0 1px 3px #000';document.body.append(label);
   return{kind,frames};
  };
 });
 const results=[];for(const kind of ['boar','brute','archer']){results.push(await page.evaluate(k=>window.enemyStrip(k),kind));await page.screenshot({path:`${out}/${kind}.png`});}
 await fs.writeFile(`${out}/report.json`,JSON.stringify({results,errors},null,2));assert.deepEqual(errors,[]);
 for(const r of results){assert(r.frames[2].struck,`${r.kind} strikes`);for(const f of r.frames)assert(f.draws<500,`${r.kind} budget`);}
 console.log(`enemy review: ${results.map(r=>r.kind).join(', ')} rendered and struck`);
}finally{await browser.close();}
