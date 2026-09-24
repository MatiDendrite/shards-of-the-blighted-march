import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const wait=fn=>page.waitForFunction(fn,{timeout:90000,polling:100});
 const tap=async selector=>{const p=await page.$eval(selector,e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});await page.touchscreen.tap(p.x,p.y);};
 await page.goto('http://localhost:4173/preview/',{waitUntil:'domcontentloaded'});await wait(()=>window.__READY__);await tap('#startb');
 const p=await page.$eval('#stick',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});await page.touchscreen.touchStart(p.x,p.y);await page.touchscreen.touchMove(p.x,p.y-35);await wait(()=>window.__GAME__.pos[1]<-27);await page.touchscreen.touchEnd();
 await wait(()=>window.__GAME__.hp<110);const beforeHeal=await page.evaluate(()=>({hp:window.__GAME__.hp,damage:window.__GAME__.damageTaken}));await tap('#potion-button');await wait(()=>window.__GAME__.rpg.potions===2);const afterHeal=await page.evaluate(()=>({hp:window.__GAME__.hp,damage:window.__GAME__.damageTaken}));assert(afterHeal.hp-beforeHeal.hp+afterHeal.damage-beforeHeal.damage>0,'potion must heal even if a later enemy hit lands');
 await tap('#bag-button');await page.waitForSelector('#inventory:not([hidden])');assert.equal(await page.evaluate(()=>window.__GAME__.paused),true);await page.screenshot({path:'_artifacts/combat/mobile-inventory.png'});
 await tap('#item-list [data-select-item="2"]');await page.$eval('[data-item-action="equip"][data-id="2"]',e=>e.scrollIntoView({block:'center'}));await tap('[data-item-action="equip"][data-id="2"]');await wait(()=>window.__GAME__.weapon==='axe');await tap('#bag-close');
 await page.reload({waitUntil:'domcontentloaded'});await wait(()=>window.__READY__);await tap('#startb');await wait(()=>window.__GAME__.started);assert.equal(await page.evaluate(()=>window.__GAME__.rpg.potions),2);assert.equal(await page.evaluate(()=>window.__GAME__.weapon),'axe');
 // Cancelling an explicit reset must preserve the saved journey.
 await tap('#menu-button');await tap('#new-journey');page.once('dialog',d=>d.dismiss());await tap('#class-confirm');assert.equal(await page.evaluate(()=>window.__GAME__.rpg.potions),2);
 page.once('dialog',d=>d.accept());await tap('#class-confirm');await wait(()=>document.querySelector('#class-dialog').hidden&&window.__GAME__.rpg.potions===3&&window.__GAME__.weapon==='sword');
 assert.deepEqual(errors,[]);await fs.writeFile('_artifacts/combat/mobile-rpg.json',JSON.stringify({result:'PASS',errors,state:await page.evaluate(()=>window.__GAME__)},null,2));console.log('Mobile damage, potion, inventory/equip, reload, cancel/reset journey: PASS');
}finally{await browser.close();}
