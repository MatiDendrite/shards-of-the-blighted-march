// Real UI quality changes; read-only renderer instrumentation stays in this test.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
const out='_artifacts/visual-review/gameplay';await fs.mkdir(out,{recursive:true});
const source=await fs.readFile('game/src/main.js','utf8');
assert(source.includes('await rig.ready;'));
const instrumented=source.replace('await rig.ready;',`await rig.ready;
 window.visualSnapshot=()=>({ratio:renderer.getPixelRatio(),shadows:(rig.csm?.lights||[rig.sun]).filter(l=>l.castShadow).map(l=>({requested:l.shadow.mapSize.x,actual:l.shadow.map?.width})),textures:renderer.info.memory.textures,children:scene.children.length,draws:renderer.info.render.calls,tris:renderer.info.render.triangles});`);
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[];page.setDefaultTimeout(90000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.setViewport({width:1280,height:800,deviceScaleFactor:1.5});
 await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:instrumented}):r.continue());
 await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__);await page.click('#startb');
 await page.click('#menu-button');const initial=await page.evaluate(()=>window.visualSnapshot()),results=[];
 for(const quality of ['high','low','high','low','high']){
  await page.select('#quality',quality);const size=quality==='high'?2048:1024;
  await page.waitForFunction(size=>window.visualSnapshot().shadows.every(s=>s.requested===size&&s.actual===size),{},size);
  const snapshot=await page.evaluate(()=>window.visualSnapshot());results.push({quality,...snapshot});
  assert.equal(snapshot.children,initial.children);assert.equal(snapshot.ratio,quality==='high'?1.5:1);
  assert(snapshot.shadows.length>0);assert(snapshot.textures<=initial.textures+1,'quality changes must not leak shadow targets');
  assert(snapshot.draws<=500);assert(snapshot.tris<=600000);
 }
 await page.click('#resume');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.screenshot({path:`${out}/desktop-high.png`});
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/quality.json`,JSON.stringify({results,errors},null,2));console.log(results);
}finally{await browser.close();}
