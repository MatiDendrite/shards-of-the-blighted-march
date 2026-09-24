// Fixed-camera art fixtures, not evidence of an earned combat journey.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const label=process.argv[2]||'after',baseline=process.argv.includes('--baseline'),mageStudy=process.argv.includes('--mage-study'),classStudy=process.argv.includes('--class-study');
if(!/^[a-z0-9-]+$/.test(label))throw Error('Use a simple artifact label.');
const out=`_artifacts/character-review/${label}`;await fs.mkdir(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[];page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.setViewport({width:1280,height:800});await page.setRequestInterception(true);
 page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:''}):r.continue());
 await page.goto('http://localhost:4173/preview/');
 await page.evaluate(async baseline=>{
  const T=await import('three'),{ASSET}=await import('./lib/assetlib.js'),{mergeJoints}=await import('./src/combat-view.js'),{createHeroMotion}=await import('./src/combat-motion.js'),{createRig}=await import('./lib/rig.js');
  const surfaces=baseline?null:await import('./src/actor-surfaces.js'),load=baseline?(url,opts)=>ASSET(url,{...opts,surfaces:true}):surfaces.loadActorAsset;
  document.body.innerHTML='';document.body.style.margin='0';const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,800);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;document.body.append(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1.6,.1,80),rig=createRig(T,renderer,scene,{tier:'phone',hour:16.5,azimuth:220,post:false,cascades:1,shadowMap:2048,shadowDist:16,exposure:1.08,sunIntensity:2.65,fill:1.08,envIntensity:.65,bounce:.48,camera});await rig.ready;
  scene.background=new T.Color(0x293336);scene.fog=null;const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:0x4c5352,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const actors=[];for(const id of ['wanderer','mage','ninja','dwarf','blighted_wolf','fallen_warden']){const root=await load(new URL(`./assets/${id}.js`,location.href).href,{keepHierarchy:true,...(id==='wanderer'?{height:1.85}:{})});mergeJoints(root);actors.push(root);}
  const motions=actors.slice(0,4).map(createHeroMotion);
  const raider=await load(new URL('./assets/wanderer.js',location.href).href,{keepHierarchy:true,height:1.85});mergeJoints(raider);const tinted=new Map();raider.traverse(o=>{if(!o.isMesh)return;if(!tinted.has(o.material)){const m=o.material.clone();if(surfaces)surfaces.styleRaiderMaterial(m);else{m.color.multiplyScalar(.76);if(m.name==='fabric')m.color.setHex(0x39463a);}tinted.set(o.material,m);}o.material=tinted.get(o.material);});actors.push(raider);
  window.captureActors=async view=>{
   for(const root of actors)scene.remove(root);
   const detail=['warrior','mage','ninja','dwarf','wolf','warden'].indexOf(view.split('-')[0]),enemy=view==='enemies',list=detail>=0?[actors[detail]]:enemy?[actors[4],actors[6],actors[5]]:actors.slice(0,4),names=detail>=0?[['Warrior','Mage','Ninja','Dwarf','Blighted Wolf','Fallen Warden'][detail]]:enemy?['Blighted Wolf','Hollow Raider','Fallen Warden']:['Warrior','Mage','Ninja','Dwarf'];
   list.forEach((root,i)=>{root.position.set((i-(list.length-1)/2)*(enemy?2.6:1.85),.005,0);root.rotation.set(0,view.endsWith('back')?Math.PI:view.endsWith('side')?Math.PI/2:0,0);scene.add(root);});
   motions.forEach((animate,i)=>animate({angle:0,gait:i===detail&&view.endsWith('-walk')?1:0,walk:Math.PI*.45,dodge:i===detail&&view.endsWith('-dodge')?.20:0,dodgeAge:.14,dodgeX:1,dodgeZ:0},.4));
   if(view.endsWith('-face')){actors[detail].updateMatrixWorld(true);const target=actors[detail].userData.joints.head.getWorldPosition(new T.Vector3());camera.position.copy(target).add(new T.Vector3(.36,.11,1.08));camera.lookAt(target.add(new T.Vector3(0,-.01,.035)));}
   else if(detail>=0){const tall=detail===5;camera.position.set(2.1,tall?2.9:2.3,tall?6.3:4.7);camera.lookAt(0,tall?1.25:.87,0);}
   else{camera.position.set(.65,3.5,enemy?12.9:12.1);camera.lookAt(0,enemy?1.15:.95,0);}rig.refresh(scene);await renderer.compileAsync(scene,camera);rig.render(camera,0);
   document.querySelector('#captions')?.remove();const captions=document.createElement('div');captions.id='captions';captions.style.cssText='position:fixed;left:6%;right:6%;bottom:42px;display:flex;justify-content:space-around;color:#e2e4d8;font:18px sans-serif;letter-spacing:2px';for(const name of names){const span=document.createElement('span');span.textContent=name;captions.append(span);}document.body.append(captions);
   return{view,draws:renderer.info.render.calls,tris:renderer.info.render.triangles,textures:renderer.info.memory.textures};
  };
 },baseline);
 const views=classStudy?['front','back','enemies',...['warrior','ninja','dwarf'].flatMap(id=>['','-side','-back','-face','-walk','-dodge'].map(suffix=>id+suffix))]:mageStudy?['mage','mage-side','mage-back','mage-face','mage-walk','mage-dodge']:['front','back','enemies','warrior','mage','ninja','dwarf','wolf','warden'];
 const results=[];for(const view of views){results.push(await page.evaluate(view=>window.captureActors(view),view));await page.screenshot({path:`${out}/${view}.png`});}
 await fs.writeFile(`${out}/report.json`,JSON.stringify({scope:'fixed-camera actor fixtures',results,errors},null,2));console.log({results,errors});assert.deepEqual(errors,[]);for(const r of results){assert(r.draws<500);assert(r.tris<600000);}
}finally{await browser.close();}
