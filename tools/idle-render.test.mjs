// Count real render calls; never replace the world or alter simulation state.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const source=(await fs.readFile('game/src/main.js','utf8')).replace('async function boot(){','window.renderCount=0;async function boot(){').replaceAll('rig.render(camera,','window.renderCount++;rig.render(camera,').replace('window.__GAME__={','window.idleAge=inventoryStill;window.__GAME__={');
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:800,height:600});await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:source}):r.continue());await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__);
 const count=()=>page.evaluate(()=>window.renderCount),delay=()=>new Promise(r=>setTimeout(r,400));
 const welcome=await count();await delay();assert.equal(await count(),welcome,'welcome must retain its complete establishing shot');
 assert(await page.$eval('#mini-map',c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((value,i)=>i%4===3&&value>0)),'minimap must already be painted at readiness');
 await page.setViewport({width:840,height:600});await page.waitForFunction(before=>window.renderCount>before,{},welcome);const resized=await count();await delay();assert.equal(await count(),resized);
 await page.click('#startb');await page.waitForFunction(before=>window.renderCount>before+2,{},resized);
 await page.click('#menu-button');await page.waitForFunction(()=>window.idleAge>1.3);const paused=await count();await delay();assert.equal(await count(),paused,'settled pause must not keep rendering');
 await page.setViewport({width:800,height:640});await page.waitForFunction(before=>window.renderCount>before,{},paused);await page.waitForFunction(()=>window.idleAge>1.3);const pausedResized=await count();await delay();assert.equal(await count(),pausedResized);
 await page.click('#resume');await page.waitForFunction(before=>window.renderCount>before+2,{},pausedResized);assert.deepEqual(errors,[]);console.log('Initial minimap, static welcome, active play, cached pause, resize and resume: PASS');
}finally{await browser.close();}
