// Paired isolated rendering fixtures, not an earned campaign or hardware FPS claim.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const tag=process.argv[2]||'current',out=`_artifacts/performance/${tag}`,phone=process.argv.includes('--phone'),loadOnly=process.argv.includes('--load-only');await fs.mkdir(out,{recursive:true});
const source=await fs.readFile('game/src/main.js','utf8');
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setViewport(phone?{width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true}:{width:800,height:600,deviceScaleFactor:1});await page.setCacheEnabled(false);await page.setRequestInterception(true);
 if(process.argv.includes('--throttle')){const cdp=await page.createCDPSession();await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:60,downloadThroughput:4*1024*1024/8,uploadThroughput:1024*1024/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:2});}
 let instrumented=source.replace('async function boot(){',`window.profile={marks:[],frames:[],draws:[]};const mark=name=>window.profile.marks.push({name,ms:performance.now()});async function boot(){mark('boot');`)
 .replace('const input=createInput',`mark('world and hero');const input=createInput`)
 .replace('const store=saveStore',`mark('combat assets');const store=saveStore`)
 .replace('const campaignView=createCampaignView',`mark('portraits and RPG');const campaignView=createCampaignView`)
 .replace('await rig.ready;',`mark('town and atlas');window.fixture={world,hero,scene,camera,renderer,rig,model,progress,campaign,combatView,rpgView,regionChanged,setPaused(v){paused=v;}};await rig.ready;`)
 .replace('await renderer.compileAsync(scene,camera);',`mark('compile start');await renderer.compileAsync(scene,camera);mark('compile end');`)
 .replace('rig.render(camera,0);renderDirty=',`mark('first draw start');rig.render(camera,0);mark('first draw end');renderDirty=`)
 // Force rendering of the frozen benchmark scene, even after the UI idle cache
 // would normally stop it. Both measurements must include the actual draw pass.
 .replace('if(renderDirty||started&&inventoryStill<1.2)',loadOnly?'if(renderDirty||started&&inventoryStill<1.2)':'if(true)')
 .replace('function frame(now){',`function frame(now){const sampleStart=performance.now();`)
 .replace('requestAnimationFrame(frame);\n  }',`window.profile.frames.push(performance.now()-sampleStart);window.profile.draws.push({draws:renderer.info.render.calls,tris:renderer.info.render.triangles});requestAnimationFrame(frame);\n  }`)
 .replace('window.__READY__=true;',`mark('ready');window.__READY__=true;`);
 page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:instrumented}):r.continue());
 const nav=Date.now();await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__);const observedReadyMs=Date.now()-nav;if(!loadOnly)await page.click('#startb');
 const boot=await page.evaluate(()=>({marks:window.profile.marks,firstFrameCPU:window.profile.frames.slice(0,5),resources:performance.getEntriesByType('resource').map(r=>({name:r.name.split('/').at(-1),bytes:r.encodedBodySize,start:r.startTime,end:r.responseEnd,duration:r.duration}))}));console.log(tag,'boot',boot.marks,'first frames',boot.firstFrameCPU);
 const scenarios=[];
 for(const [name,region,x,z,stress] of (loadOnly?[]:[['town',0,0,11,false],['meadow-fight',0,0,-31,true],['forest-fight',1,0,-31,true],['causeway-fight',2,0,-31,true],['warden',3,0,-32,true]])){
  await page.evaluate(({region,x,z,stress})=>{const f=window.fixture;f.progress.data.campaign.region=region;f.model.reset(region);f.regionChanged();f.setPaused(true);f.model.player.x=x;f.model.player.z=z;f.hero.position.set(x,.06,z);f.camera.position.set(x,9.55,z+9.68);f.camera.lookAt(x,.75,z);
   if(stress){if(region<3){f.model.enemies=[];for(let i=0;i<8;i++){f.model.spawn(i%2?'raider':'wolf',x+Math.sin(i*Math.PI/4)*3,z+Math.cos(i*Math.PI/4)*3);const e=f.model.enemies.at(-1);e.phase='windup';e.timer=.4;}}else{const e=f.model.enemies[0];e.phase='windup';e.attackKind='slam';e.timer=.6;}
    f.progress.data.drops=Array.from({length:9},(_,i)=>({id:`stress-${i}`,x:x+(i%3-1)*2,z:z-5-Math.floor(i/3)*1.5,gold:12,ore:1,item:f.progress.makeItem(['sword','axe','spear','armor'][i%4],'rare')}));}
   f.world.update(0,f.model.player);window.profile.frames=[];window.profile.draws=[];
  },{region,x,z,stress});
  await page.waitForFunction(()=>window.profile.frames.length>=16);await page.screenshot({path:`${out}/${name}.png`});
  const data=await page.evaluate(()=>{const f=window.fixture,frames=window.profile.frames.slice(4).sort((a,b)=>a-b),draws=window.profile.draws.slice(4);return{medianFrameCPU:frames[Math.floor(frames.length/2)],p95FrameCPU:frames[Math.floor(frames.length*.95)],draws:Math.max(...draws.map(d=>d.draws)),tris:Math.max(...draws.map(d=>d.tris)),memory:{...f.renderer.info.memory},programs:f.renderer.info.programs.length,sceneChildren:f.scene.children.length};});
  scenarios.push({name,...data});console.log(tag,scenarios.at(-1));assert(data.draws<500&&data.tris<600000);
 }
 const report={tag,scope:'software-rendered fixed-camera fixtures; CPU times are comparative, not physical-device FPS',observedReadyMs,boot,scenarios,errors};await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log('observed ready',observedReadyMs);assert.deepEqual(errors,[]);
}finally{await browser.close();}
