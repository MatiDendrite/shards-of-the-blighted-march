// Pose strips use the actual class/weapon assembly at explicit simulation ages.
// They are animation fixtures, not an earned playthrough or input latency test.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const tag=process.argv[2]||'motion';assert(/^[a-z0-9-]+$/.test(tag));const out=`_artifacts/motion/${tag}`;await fs.mkdir(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});await page.setViewport({width:1440,height:700});await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:''}):r.continue());await page.goto('http://localhost:4173/preview/');
 await page.evaluate(async()=>{
  const T=await import('three'),{loadActorAsset}=await import('./src/actor-surfaces.js'),{createCombatView,mergeJoints}=await import('./src/combat-view.js'),{Combat,WEAPONS}=await import('./src/combat-model.js'),{CLASSES,SKILLS,ARCANE_BOLT}=await import('./src/class-data.js'),{createRig}=await import('./lib/rig.js');
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1440,700);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.domElement.style.cssText='position:fixed;inset:0;z-index:10000';document.body.append(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(33,240/700,.1,80),rig=createRig(T,renderer,scene,{tier:'phone',hour:16.5,azimuth:220,post:false,cascades:1,shadowMap:1024,shadowDist:12,exposure:1.08,sunIntensity:2.65,fill:1.08,envIntensity:.65,bounce:.48,camera});await rig.ready;scene.fog=null;
  const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:0x4c5352,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);const grid=new T.GridHelper(12,48,0x59625d,0x505957);grid.position.y=.001;scene.add(grid);
  const hero=await loadActorAsset(new URL('./assets/wanderer.js',location.href).href,{keepHierarchy:true,height:1.85});mergeJoints(hero);scene.add(hero);hero.position.set(0,.005,0);
  const model=new Combat();model.enemies=[];model.shard.hp=0;model.shard.exploded=true;model.player.angle=0;const view=await createCombatView(scene,hero,model,{play(){}});for(const id of Object.keys(CLASSES))await view.loadClass(id);
  window.motionStrip=async(id,kind)=>{
   document.querySelectorAll('.motion-caption').forEach(e=>e.remove());view.setClass(id);view.reset();const p=model.player;Object.assign(p,{classId:id,x:0,z:0,angle:0,walk:0,gait:0,moving:false,dodge:0,action:null,weapon:kind==='axe'?'axe':kind==='spear'?'spear':'sword'});model.time=0;view.update(0,camera);
   const frames=[],skill=kind==='movement'?null:kind==='basic'||kind==='axe'||kind==='spear'?(id==='mage'?ARCANE_BOLT:WEAPONS[p.weapon]):SKILLS[kind],ages=skill?[0,skill.windup*.65,skill.windup,skill.windup+skill.active*.55,skill.windup+skill.active+skill.recovery*.45,skill.windup+skill.active+skill.recovery]:[];
   camera.position.set(2.8,id==='dwarf'?2.2:2.6,6.5);camera.lookAt(0,id==='dwarf'?1:1.25,0);rig.refresh(scene);await renderer.compileAsync(scene,camera);renderer.setScissorTest(true);
   for(let i=0;i<6;i++){
    let caption;
    if(skill){model.time=1+ages[i];p.action={...skill,kind:['axe','spear'].includes(kind)?'basic':kind,weapon:p.weapon,combo:1,age:ages[i]};caption=['REST','PREPARE','RELEASE','CONTACT','RECOVER','REST'][i];}
    else if(i<4){const ticks=[1,9,24,20][i];for(let n=0;n<ticks;n++){model.time+=1/60;p.moving=i===1||i===2;p.gait+=((p.moving?1:0)-p.gait)*.25;if(p.moving){p.z+=3.4/60;p.walk+=9/60;}view.update(1/60,camera);}caption=['REST','START','RUN','STOP'][i];}
    else{p.gait=0;p.dodge=.34-(i===4?.13:.29);p.dodgeAge=i===4?.13:.29;p.dodgeX=1;p.dodgeZ=0;model.time+=.16;caption=i===4?'SIDE DODGE':'RECOVER';}
    view.update(0,camera);hero.updateMatrixWorld(true);const feet=['leftFoot','rightFoot'].map(name=>new T.Box3().setFromObject(hero.userData.joints[name],true).min.y),hand=hero.userData.joints.rightForearm.getWorldPosition(new T.Vector3()).toArray(),weaponMinY=new T.Box3().setFromObject(hero.getObjectByName('heroWeaponMount'),true).min.y;
    renderer.setViewport(i*240,0,240,700);renderer.setScissor(i*240,0,240,700);rig.render(camera,0);frames.push({caption,feet,hand,weaponMinY,draws:renderer.info.render.calls,tris:renderer.info.render.triangles});
    const label=document.createElement('div');label.className='motion-caption';label.textContent=caption;label.style.cssText=`position:fixed;left:${i*240}px;top:25px;width:240px;padding:8px 0;background:#243039de;text-align:center;color:#ece7d7;font:14px sans-serif;letter-spacing:1px;z-index:10001`;document.body.append(label);
   }
   renderer.setScissorTest(false);const title=document.createElement('div');title.className='motion-caption';title.textContent=`${CLASSES[id].name.toUpperCase()} · ${kind.toUpperCase()}`;title.style.cssText='position:fixed;bottom:30px;width:100%;text-align:center;color:#ece7d7;font:18px sans-serif;letter-spacing:2px;z-index:10001';document.body.append(title);return{classId:id,kind,frames};
  };
 });
 const {CLASSES}=await import('../game/src/class-data.js'),results=[];for(const id of Object.keys(CLASSES))for(const kind of ['movement','basic',...CLASSES[id].skills,...(id==='mage'?[]:['axe','spear'])]){results.push(await page.evaluate(({id,kind})=>window.motionStrip(id,kind),{id,kind}));await page.screenshot({path:`${out}/${id}-${kind}.png`});}
 await fs.writeFile(`${out}/report.json`,JSON.stringify({scope:'runtime assembly at explicit animation ages',results,errors},null,2));assert.deepEqual(errors,[]);for(const strip of results)for(const f of strip.frames){assert(f.draws<500&&f.tris<600000);assert(f.feet.every(y=>Number.isFinite(y)&&y>=-.002),`${strip.classId} ${strip.kind}: soles above the floor`);assert(Number.isFinite(f.weaponMinY)&&f.weaponMinY>=0,`${strip.classId} ${strip.kind}: weapon above the floor`);}console.log(`${results.length} pose strips; no browser errors`);
}finally{await browser.close();}
