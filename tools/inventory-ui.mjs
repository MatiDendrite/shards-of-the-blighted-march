import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const out='_artifacts/inventory-review';await fs.mkdir(out,{recursive:true});
const reports=[];
try {
 for(const mobile of process.argv.includes('--mobile-only')?[true]:[false,true]){
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewport(mobile?{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1}:{width:1280,height:900,deviceScaleFactor:1});
  const wait=fn=>page.waitForFunction(fn,{timeout:90000});
  const click=async selector=>{await page.$eval(selector,e=>e.scrollIntoView({block:'center'}));if(mobile)await page.tap(selector);else await page.click(selector);};
  await page.goto('http://localhost:4173/preview/');await wait(()=>window.__READY__);await click('#startb');await click('#bag-button');
  await wait(()=>window.__GAME__.paused);
  assert.equal(await page.$$eval('#item-list > *',els=>els.length),24);
  assert.equal(await page.$$eval('#loadout-slots button',els=>els.length),4);
  const images=await page.$$eval('#item-list img',els=>els.map(e=>({src:e.src,loaded:e.complete&&e.naturalWidth===256})));
  assert(images.every(i=>i.loaded));assert.equal(new Set(images.map(i=>i.src)).size,4);
  // Transparent previews must contain an actual visible silhouette, not a blank canvas.
  const pixels=await page.$$eval('#item-list img',els=>els.map(img=>{const c=document.createElement('canvas');c.width=256;c.height=320;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const d=ctx.getImageData(0,0,256,320).data;let opaque=0;for(let i=3;i<d.length;i+=4)if(d[i]>128)opaque++;return opaque;}));
  assert(pixels.every(n=>n>500&&n<256*320*.8));
  await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-inventory.png`});
  await click('#item-list [data-select-item="2"]');assert.match(await page.$eval('#item-detail h3',e=>e.textContent),/Bearded Axe/);
  await click('[data-item-action="equip"][data-id="2"]');await wait(()=>window.__GAME__.weapon==='axe');
  await click('[data-filter="armor"]');assert.equal(await page.$$eval('#item-list button',els=>els.length),1);
  await click('[data-filter="weapons"]');assert.equal(await page.$$eval('#item-list button',els=>els.length),3);
  await click('#loadout-slots [data-select-item="3"]');await click('[data-item-action="equip"][data-id="3"]');await wait(()=>window.__GAME__.weapon==='spear');
  await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-inspect.png`});
  assert(await page.$eval('#inventory',e=>e.scrollWidth<=e.clientWidth+1),'no horizontal overflow');
  // Keyboard focus remains in the dialog and Escape resumes the game.
  if(!mobile){await click('#bag-close');await page.keyboard.press('KeyI');await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');assert(await page.evaluate(()=>document.activeElement.closest('#inventory')!==null));await page.keyboard.press('Escape');}else await click('#bag-close');
  await wait(()=>!window.__GAME__.paused);
  await page.reload();await wait(()=>window.__READY__);await click('#startb');await wait(()=>window.__GAME__.weapon==='spear');
  if(!mobile){
   await page.keyboard.down('KeyA');await wait(()=>window.__GAME__.rpg.nearSmith);await page.keyboard.up('KeyA');await page.keyboard.press('KeyE');
   await click('#item-list [data-select-item="1"]');await click('[data-item-action="upgrade"][data-id="1"]');await wait(()=>window.__GAME__.rpg.items[0].upgrade===1);
   assert.equal(await page.evaluate(()=>window.__GAME__.rpg.gold),20);assert.match(await page.$eval('#item-detail h3',e=>e.textContent),/\+1/);
   assert(await page.$eval('[data-item-action="salvage"]',e=>e.disabled));
   await page.screenshot({path:`${out}/desktop-forge.png`});
  }else{
   await click('#bag-button');await page.setViewport({width:320,height:740,isMobile:true,hasTouch:true,deviceScaleFactor:1});
   assert(await page.$eval('#inventory',e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:`${out}/mobile-narrow.png`});
   await page.setViewport({width:844,height:390,isMobile:true,hasTouch:true,deviceScaleFactor:1});
   assert(await page.$eval('#inventory',e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:`${out}/mobile-landscape.png`});
  }
  assert.deepEqual(errors,[]);reports.push({device:mobile?'mobile':'desktop',result:'PASS',previewPixels:pixels,errors});console.log(reports.at(-1));await context.close();
 }
 await fs.writeFile(`${out}/${process.argv.includes('--mobile-only')?'report-mobile':'report'}.json`,JSON.stringify(reports,null,2));
}finally{await browser.close();}
