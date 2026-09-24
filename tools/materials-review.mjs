// Fixed-camera material fixtures. These are not traversal or hardware FPS claims.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const label=process.argv[2]||'after';
if(!/^[a-z0-9-]+$/.test(label))throw Error('Use a simple artifact label.');
const environment=process.argv.includes('--environment'),out=`_artifacts/${environment?'environment-review':'visual-review'}/${label}`;
await fs.mkdir(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[];
 page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.setViewport({width:1280,height:800});
 await page.setRequestInterception(true);
 page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:''}):r.continue());
 await page.goto('http://localhost:4173/preview/');
 await page.evaluate(async()=>{
  const T=await import('three'),{createRig}=await import('./lib/rig.js'),{loadArt}=await import('./src/art.js'),{createWorld}=await import('./src/world.js'),lighting=await import('./src/landscape-lighting.js');
  document.body.innerHTML='';document.body.style.margin='0';
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,800);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;document.body.append(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(44,1.6,.1,140);
  const options=lighting.LANDSCAPE_RENDER_OPTIONS||{tier:'phone',hour:16.5,azimuth:245,post:false,cascades:1,shadowMap:1024,shadowDist:36,exposure:1.15,sunColor:0xffe6bd,sunIntensity:2.25,fill:1.3,envIntensity:.5,bounce:.4,fogStart:19,fogDensity:.022};
  const rig=createRig(T,renderer,scene,{...options,camera}),world=await createWorld(scene,loadArt(renderer));await rig.ready;
  window.captureVisual=async({region,view})=>{
   world.setRegion(region);lighting.setLandscapeLighting(rig,world.atmosphere);
   const views={town:[[10,12,24],[0,1,8]],house:[[-1,8,8],[-12,2.8,-3]],field:[[-36,12,23],[-36,.5,8]],coast:[[34,10,30],[53,0,15]],river:[[-35,10,21],[-48,0,7]],grove:[[38,8,20],[49,0,8]],tarn:[[31,11,52],[47,0,38]]};
   const [eye,at]=views[view];camera.position.fromArray(eye);camera.lookAt(...at);rig.refresh(scene);world.update(0,{x:at[0],z:at[2]});
   await renderer.compileAsync(scene,camera);for(let i=0;i<3;i++)rig.render(camera,0);
   return {draws:renderer.info.render.calls,tris:renderer.info.render.triangles,textures:renderer.info.memory.textures};
  };
 });
 const results=[];
 const views=environment?[[0,'field'],[0,'river'],[1,'grove'],[2,'coast'],[3,'tarn']]:[[0,'town'],[0,'house'],[0,'field'],[1,'town'],[2,'coast'],[3,'town']];
 for(const [region,view] of views){
  const stats=await page.evaluate(o=>window.captureVisual(o),{region,view});
  await page.screenshot({path:`${out}/${region}-${view}.png`});results.push({region,view,...stats});console.log(results.at(-1));
 }
 await fs.writeFile(`${out}/report.json`,JSON.stringify({scope:'fixed-camera art fixtures',results,errors},null,2));
 assert.deepEqual(errors,[]);for(const r of results){assert(r.draws<=500,`draw budget: ${JSON.stringify(r)}`);assert(r.tris<=600000,`triangle budget: ${JSON.stringify(r)}`);}
}finally{await browser.close();}
