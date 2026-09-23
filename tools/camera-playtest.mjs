// Isolated browser profiles; real input/rendering plus labelled collision fixtures.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='_artifacts/camera';await fs.mkdir(out,{recursive:true});
const main=(await fs.readFile('game/src/main.js','utf8')).replace('await rig.ready;',`window.cameraFixture={orbit,model,world,hero,camera,progress,scene,renderer,rig,input,combatView};await rig.ready;`);
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const report={scope:'native mouse, keyboard and multitouch; full-quality frames; synthetic scenery collision probes',errors:[],desktop:{},mobile:{}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function open(mobile){
 const context=await browser.createBrowserContext(),page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.setViewport(mobile?{width:390,height:844,isMobile:true,hasTouch:true}:{width:1100,height:760});await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:main}):r.continue());
 await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__);if(mobile)await page.tap('#startb');else await page.click('#startb');await page.waitForFunction(()=>window.__GAME__.started);return{context,page};
}
const state=page=>page.evaluate(()=>window.__GAME__);
const settled=page=>page.waitForFunction(()=>{const o=window.cameraFixture.orbit;return Math.abs(Math.atan2(Math.sin(o.targetYaw-o.yaw),Math.cos(o.targetYaw-o.yaw)))<.002&&Math.abs(o.targetZoom-o.zoom)<.002;});
async function rightDrag(page,x,y,dx,dy=0){await page.mouse.move(x,y);await page.mouse.down({button:'right'});await page.mouse.move(x+dx,y+dy,{steps:10});await page.mouse.up({button:'right'});await settled(page);}
try{
 const {page,context}=await open(false);await page.screenshot({path:`${out}/default.png`});const initial=await state(page);
 await rightDrag(page,700,340,-240,25);const rotated=await state(page);assert(Math.abs(rotated.camera.yaw)>1);assert.equal(rotated.attacks,initial.attacks);assert.equal(rotated.dodges,initial.dodges);assert.deepEqual(rotated.pos,initial.pos);
 await page.screenshot({path:`${out}/rotated.png`});report.desktop.rotation=rotated.camera;
 // Movement and dodge are measured in world coordinates against the camera basis.
 const before=await state(page);await page.keyboard.down('KeyW');await page.waitForFunction(p=>Math.hypot(window.__GAME__.pos[0]-p[0],window.__GAME__.pos[1]-p[1])>1.1,{},before.pos);await page.keyboard.up('KeyW');const walked=await state(page),dx=walked.pos[0]-before.pos[0],dz=walked.pos[1]-before.pos[1],length=Math.hypot(dx,dz);assert((dx*-Math.sin(before.camera.yaw)+dz*-Math.cos(before.camera.yaw))/length>.98);report.desktop.walk={dx,dz};
 await page.keyboard.down('KeyA');await page.keyboard.press('Space');await page.waitForFunction(()=>window.__GAME__.dodges===1);await page.keyboard.up('KeyA');const dodge=await page.evaluate(()=>{const f=window.cameraFixture,p=f.model.player;return{x:p.dodgeX,z:p.dodgeZ,yaw:f.orbit.yaw};});assert(dodge.x*-Math.cos(dodge.yaw)+dodge.z*Math.sin(dodge.yaw)>.98);await page.waitForFunction(()=>window.__GAME__.dodgeRemaining===0);report.desktop.dodge=dodge;
 await page.mouse.move(710,330);await page.mouse.wheel({deltaY:-1000});await settled(page);assert((await state(page)).camera.zoom<.705);
 const journey=await page.evaluate(()=>JSON.stringify(window.cameraFixture.progress.data));await page.keyboard.press('KeyC');await settled(page);assert(Math.abs((await state(page)).camera.yaw)<.003);assert(Math.abs((await state(page)).camera.zoom-.88)<.003);assert.equal(await page.evaluate(()=>JSON.stringify(window.cameraFixture.progress.data)),journey,'C must not restart or change the journey');
 await page.keyboard.down('KeyW');await page.keyboard.press('KeyC');assert.equal(await page.evaluate(()=>window.cameraFixture.input.read().z),-1,'resetting the camera must not release held movement');await page.keyboard.up('KeyW');
 // Native left-click must still aim at the actual ground after rotation.
 await rightDrag(page,700,340,170);const aim=await page.evaluate(async()=>{
  const f=window.cameraFixture,p=f.model.player,T=await import('three');f.model.enemies=[];f.combatView.reset();const yaw=f.orbit.yaw,x=p.x+Math.cos(yaw)*1.7-Math.sin(yaw)*.4,z=p.z-Math.sin(yaw)*1.7-Math.cos(yaw)*.4;
  const enemy=f.model.spawn('wolf',x,z);enemy.stagger=100;const point=new T.Vector3(x,0,z).project(f.camera);return{x:(point.x*.5+.5)*innerWidth,y:(-.5*point.y+.5)*innerHeight,hits:f.model.hits};
 });await page.mouse.move(aim.x,aim.y);await page.mouse.down();await page.waitForFunction(hits=>window.__GAME__.hits>hits,{},aim.hits);await page.mouse.up();report.desktop.rotatedAim='actual click damaged the intended enemy';
 // Pause cancels a captured drag, including its queued smoothing and wheel input.
 await page.mouse.move(730,330);await page.mouse.down({button:'right'});await page.mouse.move(800,350,{steps:5});await page.keyboard.press('Escape');await page.waitForFunction(()=>window.__GAME__.paused);const paused=(await state(page)).camera;
 await page.mouse.move(900,400,{steps:5});await page.mouse.wheel({deltaY:700});await page.mouse.up({button:'right'});await sleep(250);assert.equal((await state(page)).camera.yaw,paused.yaw);assert.equal((await state(page)).camera.zoom,paused.zoom);
 const saved=await page.evaluate(()=>JSON.stringify(window.cameraFixture.progress.data));await page.click('#camera-defaults');await page.waitForFunction(()=>window.__GAME__.camera.yaw===0);assert.equal(await page.evaluate(()=>JSON.stringify(window.cameraFixture.progress.data)),saved);await page.click('#resume');report.desktop.pauseAndReset='PASS';
 // Real regional bounds, sampled without changing combat state or the save.
 report.collisions=await page.evaluate(()=>{
  const f=window.cameraFixture,results=[],original={yaw:f.orbit.yaw,tilt:f.orbit.tilt,zoom:f.orbit.zoom,distance:f.orbit.distance};
  for(const [x,z] of [[8,17],[-8,-3],[0,-15],[0,31],[35,7],[-35,-30]]){
   let blocked=0;for(let n=0;n<36;n++){
    f.orbit.yaw=n*Math.PI/18;f.orbit.tilt=-.25;f.orbit.zoom=1.35;const eye=f.orbit.position({x,z},1/60,false,f.world.cameraObstacles);blocked+=Number(f.orbit.blocked);
    if(!Object.values(eye).every(Number.isFinite))throw Error('Non-finite camera');
    for(const obstacle of f.world.cameraObstacles)for(const b of obstacle.parts||[obstacle])if(['x','y','z'].every(axis=>eye[axis]>b.min[axis]-.08&&eye[axis]<b.max[axis]+.08))throw Error(`Camera intersects scenery at ${x},${z},${n}`);
   }results.push({x,z,blocked});
  }Object.assign(f.orbit,original);return results;
 });assert(report.collisions.some(r=>r.blocked>0));
 await page.evaluate(()=>{const f=window.cameraFixture;f.model.enemies=[];f.combatView.reset();f.model.player.x=8;f.model.player.z=17;f.orbit.yaw=f.orbit.targetYaw=Math.PI/2;f.orbit.tilt=f.orbit.targetTilt=-.25;});await page.waitForFunction(()=>window.__GAME__.pos[0]===8);await page.screenshot({path:`${out}/building-clearance.png`});
 await context.close();console.log('Desktop orbit, aim, dodge, reset, pause and 216 collision probes PASS');

 const mobile=await open(true),phone=mobile.page,cdp=await phone.createCDPSession();
 const center=sel=>phone.$eval(sel,e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
 const stick=await center('#stick'),start=await state(phone),first={x:225,y:380,id:2};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...first,x:first.x+i*13,y:first.y-i*2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settled(phone);
 const turned=await state(phone);assert(Math.abs(turned.camera.yaw)>.8);assert.equal(turned.attacks,0);assert.deepEqual(turned.pos,start.pos);
 await phone.screenshot({path:`${out}/touch-rotated.png`});
 // Separate captured pointers let the joystick and camera operate together.
 const move={x:stick.x,y:stick.y-32,id:1},camera={x:215,y:380,id:2};const at=await state(phone);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[move,camera]});for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[move,{...camera,x:camera.x+i*8}]});
 await phone.waitForFunction(p=>Math.hypot(window.__GAME__.pos[0]-p[0],window.__GAME__.pos[1]-p[1])>.6,{},at.pos);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settled(phone);const both=await state(phone);assert(Math.abs(both.camera.yaw-at.camera.yaw)>.3);assert.equal(both.attacks,0);report.mobile.multitouch={moved:Math.hypot(both.pos[0]-at.pos[0],both.pos[1]-at.pos[1]),yawDelta:both.camera.yaw-at.camera.yaw};
 // A native touch-cancel releases both controls; no stuck walking/rotation.
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[move,camera]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await phone.waitForFunction(()=>window.__GAME__.speed===0);await settled(phone);const cancelled=await state(phone);await sleep(300);assert.deepEqual((await state(phone)).pos,cancelled.pos);assert(Math.abs((await state(phone)).camera.yaw-cancelled.camera.yaw)<.003);
 const data=await phone.evaluate(()=>JSON.stringify(window.cameraFixture.progress.data));await phone.tap('#camera-reset');await settled(phone);assert(Math.abs((await state(phone)).camera.yaw)<.003);assert.equal(await phone.evaluate(()=>JSON.stringify(window.cameraFixture.progress.data)),data);
 await phone.tap('#map-button');await phone.waitForSelector('#atlas-dialog:not([hidden])');const fixed=(await state(phone)).camera.yaw;const map=await center('#atlas-canvas');await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...map,id:3}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:map.x+30,y:map.y+20,id:3}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal((await state(phone)).camera.yaw,fixed);await phone.tap('#atlas-close');
 await phone.setViewport({width:844,height:390,isMobile:true,hasTouch:true});await sleep(300);assert(await phone.$eval('#camera-reset',e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.bottom<innerHeight&&r.left>=0;}));await phone.screenshot({path:`${out}/touch-landscape.png`});report.mobile.resetAndAtlas='PASS';await mobile.context.close();
 assert.deepEqual(report.errors,[]);await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
