// Browser construction/collision checks without a renderer; GPU fixtures are separate.
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:''}):r.continue());
 await page.goto('http://localhost:4173/preview/');
 const result=await page.evaluate(async()=>{const T=await import('three'),{createWorld}=await import('./src/world.js'),{loadArt}=await import('./src/art.js'),{sceneryLayout,canStandIn}=await import('./src/region-layout.js'),scene=new T.Scene(),world=await createWorld(scene,loadArt({capabilities:{getMaxAnisotropy:()=>8}})),roots=new Map(),reports=[];
  for(const region of [0,1,2,3,0,2,1,3,0]){const created=world.setRegion(region),active=scene.children.filter(c=>c.name.startsWith('region-')),root=active[0],original=roots.get(region);roots.set(region,root);const failures=[];
   for(const p of [{x:0,z:11},{x:0,z:-30},...sceneryLayout(region).props.filter(p=>p.kind==='house')])if(world.canStand(p.x,p.z)!==canStandIn(world.colliders,p.x,p.z))failures.push(p);
   reports.push({region,created,active:active.length,reused:!original||original===root,collisionFailures:failures.length,props:world.colliders.length});
  }return reports;
 });assert.deepEqual(errors,[]);assert(result.every(r=>r.active===1&&r.reused&&r.collisionFailures===0));assert(result.slice(4).every(r=>!r.created));console.log('Four region builds and five revisits: one active root, identical cached objects and matching collisions — PASS');
}finally{await browser.close();}
