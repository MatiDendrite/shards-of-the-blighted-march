// Fast isolated atlas fixture: exercise native touch gestures without the 3D scene.
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
 await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:''}):r.continue());
 await page.goto('http://localhost:4173/preview/');
 await page.evaluate(async()=>{const {createAtlasView}=await import('./src/atlas-view.js');createAtlasView({player:{x:0,z:11,angle:0},enemies:[],shard:{hp:0}},{data:{drops:[]}},{region:0},{open:()=>true,close(){}}).open();});
 const cdp=await page.createCDPSession();
 async function tap(selector){const point=await page.$eval(selector,e=>{e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,id:1};});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 await tap('#atlas-town');assert.equal(await page.$eval('#atlas-canvas',e=>e.dataset.zoom),'3');
 const center=await page.$eval('#atlas-canvas',e=>e.dataset.center),point=await page.$eval('#atlas-canvas',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,id:1};});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...point,x:point.x+45,y:point.y+25}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.notEqual(await page.$eval('#atlas-canvas',e=>e.dataset.center),center);
 await tap('#atlas-in');assert.equal(await page.$eval('#atlas-canvas',e=>e.dataset.zoom),'4','First tap after dragging must activate the button');
 await tap('#atlas-full');assert.equal(await page.$eval('#atlas-canvas',e=>e.dataset.zoom),'1');
 assert(await page.$eval('.atlas-frame',e=>e.scrollWidth<=e.clientWidth+1));
 await page.focus('#atlas-close');await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');assert.equal(await page.evaluate(()=>document.activeElement.dataset.location),'exit');
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'atlas-close');
 await page.setViewport({width:844,height:390,isMobile:true,hasTouch:true,deviceScaleFactor:2});assert(await page.$eval('.atlas-frame',e=>e.scrollWidth<=e.clientWidth+1));
 await tap('#atlas-close');assert(await page.$eval('#atlas-dialog',e=>e.hidden));
 console.log('Touch drag → immediate button, retina, landscape and focus trap: PASS');
}finally{await browser.close();}
