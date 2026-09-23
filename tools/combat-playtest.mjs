import puppeteer from 'puppeteer';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));await fs.mkdir('_artifacts/combat',{recursive:true});
try{
 const errors=[];
 if(!process.argv.includes('--mobile-only')){await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['tools/campaign-playtest.mjs','--first-region'],{stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`Expanded encounter test exited ${code}`)));});}
 if(!process.argv.includes('--desktop-only')){
 const mobileContext=await browser.createBrowserContext(),mobile=await mobileContext.newPage();mobile.on('pageerror',e=>errors.push(e.message));mobile.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await mobile.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});await mobile.goto('http://localhost:4173/',{waitUntil:'domcontentloaded'});await mobile.waitForFunction(()=>window.__READY__,{timeout:60000});
 async function center(selector){return mobile.$eval(selector,e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});}
 let b=await center('#startb');await mobile.touchscreen.tap(b.x,b.y);
 const stick=await center('#stick'),attack=await center('#attack');const cdp=await mobile.createCDPSession();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stick.x,y:stick.y,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:stick.x,y:stick.y-32,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stick.x,y:stick.y-32,id:1},{x:attack.x,y:attack.y,id:2}]});
 await mobile.waitForFunction(()=>window.__GAME__.attacks>=2&&window.__GAME__.pos[1]<10,{timeout:60000});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await mobile.waitForFunction(()=>window.__GAME__.attackPhase==='idle');
 b=await center('#weapon-button');await mobile.touchscreen.tap(b.x,b.y);await mobile.waitForFunction(()=>window.__GAME__.weapon==='axe');
 b=await center('#dodge');await mobile.touchscreen.tap(b.x,b.y);await mobile.waitForFunction(()=>window.__GAME__.dodges>=1);
 await mobile.screenshot({path:'_artifacts/combat/mobile-controls.png'});
 assert.deepEqual(errors,[]);console.log('Mobile simultaneous joystick + attack, weapon switch and dodge: PASS');
 await fs.writeFile('_artifacts/combat/mobile.json',JSON.stringify(await mobile.evaluate(()=>window.__GAME__),null,2));
 }
}finally{await browser.close();}
