import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {route} from './navigation.mjs';

const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'_artifacts/expanded-campaign';await fs.mkdir(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const software=process.argv.includes('--software');
try{
 const page=await browser.newPage(),errors=[],runs=[];let maxDraws=0,maxTris=0;
 page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setViewport({width:640,height:480,deviceScaleFactor:1});
 // CI-only native-input/DOM integration check: render one initial frame, then
 // skip world draws. Input, clocks, camera projection, simulation, collisions,
 // rewards, saves and UI are unchanged. Separate full-quality browser tests
 // cover rendering and 404 budgets; this mode must never claim to do so.
 if(software){const main=await fs.readFile('game/src/main.js','utf8');await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/src/main.js')?r.respond({status:200,contentType:'text/javascript',body:main.replace('const artReady=','renderer.setPixelRatio(.4);const artReady=').replace('shadowMap:1024,','shadows:false,shadowMap:1024,').replace('rig.render(camera,dt);','/* World drawing covered by separate full-quality tests. */')}):r.continue());console.log('Native input / DOM integration: world drawing skipped after the initial frame; not a visual/performance verdict.');}
 if(process.argv.includes('--resume')){const raw=await fs.readFile(`${out}/earned-checkpoint.json`,'utf8');await page.evaluateOnNewDocument(raw=>{if(!localStorage.getItem('shards.journey.v1'))localStorage.setItem('shards.journey.v1',raw);},raw);}
 await page.goto('http://localhost:4173/');
 const wait=fn=>page.waitForFunction(fn,{timeout:90000,polling:100}),state=()=>page.evaluate(()=>window.__GAME__);
 await wait(()=>window.__READY__);await page.click('#startb');
 await page.keyboard.press('KeyJ');await page.waitForSelector('#journal:not([hidden])');assert.equal(await page.$$eval('.quest-card',e=>e.length),4);assert.equal(await page.$$eval('[data-travel]',e=>e.length),0);if(!process.argv.includes('--resume'))assert.match(await page.$eval('[data-region="3"]',e=>e.textContent),/SEALED/);await page.screenshot({path:`${out}/journal-start.png`});await page.click('#journal-close');
 // Upgrade and select the real starter spear, paying starter resources.
 if(!process.argv.includes('--resume')){await page.keyboard.down('KeyA');await wait(()=>window.__GAME__.rpg.nearSmith);await page.keyboard.up('KeyA');await page.keyboard.press('KeyE');await page.click('#item-list [data-select-item="3"]');await page.click('[data-item-action="upgrade"][data-id="3"]');await page.click('#bag-close');await page.keyboard.press('KeyR');await wait(()=>window.__GAME__.weapon==='axe');await page.keyboard.press('KeyR');await wait(()=>window.__GAME__.weapon==='spear');}
 const held=new Set();async function keys(want){for(const k of held)if(!want.includes(k)){await page.keyboard.up(k);held.delete(k);}for(const k of want)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}}
 async function checkpoint(){await page.keyboard.press('KeyJ');await fs.writeFile(`${out}/earned-checkpoint.json`,await page.evaluate(()=>localStorage.getItem('shards.journey.v1')));await page.click('#journal-close');}
 async function walkTo(x,z,threshold=1,dropId=null){
  const initial=await state(),path=route(initial.pos,{x,z},initial.obstacles,Math.max(.2,threshold-.35));
  const reached=g=>dropId?!g.rpg.drops.some(d=>d.id===dropId):z===-56?g.campaign.nearGate:Math.hypot(x-g.pos[0],z-g.pos[1])<threshold;
  try{for(const point of path){for(const axis of [0,1]){const g=await state();if(reached(g)){await keys([]);return;}const target=axis===0?point.x:point.z,delta=target-g.pos[axis];if(Math.abs(delta)<.25)continue;const dir=Math.sign(delta),key=axis===0?dir>0?'KeyD':'KeyA':dir>0?'KeyS':'KeyW';await keys([key]);
    await page.waitForFunction(({axis,target,dir,dropId,gate})=>{const g=window.__GAME__;return dir*(g.pos[axis]-target)>=-.3||(dropId&&!g.rpg.drops.some(d=>d.id===dropId))||(gate&&g.campaign.nearGate);},{timeout:120000,polling:'raf'},{axis,target,dir,dropId,gate:z===-56});await keys([]);
  }}await sleep(150);if(!reached(await state()))throw Error('Route ended before pickup');}
  catch(error){await keys([]);await fs.writeFile(`${out}/route-failure.json`,JSON.stringify({x,z,path,state:await state(),error:error.message},null,2));await checkpoint();throw error;}
 }
 for(let region=(await state()).campaign.region;region<4;region++){
  assert.equal((await state()).campaign.region,region);let retreating=false,report=0,shot=false,bossPhase2=false;const deadline=Date.now()+1800000;
  console.log('Starting region',region);
  while(Date.now()<deadline){const g=await state();maxDraws=Math.max(maxDraws,g.draws);maxTris=Math.max(maxTris,g.tris);if(g.over||g.complete)break;
   if(Date.now()-report>30000){report=Date.now();console.log('Progress',JSON.stringify({region,hp:g.hp,kills:g.kills,shard:g.shardHp,boss:g.enemies.find(e=>e.kind==='boss')?.hp,pos:g.pos}));await fs.writeFile(`${out}/progress.json`,JSON.stringify(g,null,2));}
   if(g.hp<g.maxHp*.4&&g.rpg.potions>0)await page.keyboard.press('KeyQ');
   if(g.hp<38)retreating=true;
   if(retreating){if(g.hp>g.maxHp*.92)retreating=false;else{await keys([]);if(!g.inTown)await walkTo(0,11,3);await sleep(100);continue;}}
   if(g.shard.blast>0&&Math.hypot(g.pos[0]-g.shard.x,g.pos[1]-g.shard.z)<4.8){await keys([g.pos[1]>=g.shard.z?'KeyS':'KeyW']);if(g.stamina>30)await page.keyboard.press('Space');await sleep(100);continue;}
   const boss=g.enemies.find(e=>e.kind==='boss');
   if(boss?.enraged)bossPhase2=true;
   if(boss?.phase==='windup'&&boss.attackKind==='slam'){
    const dx=g.pos[0]-boss.x,dz=g.pos[1]-boss.z,d=Math.hypot(dx,dz),want=[];
    if(d<5.3){want.push(dz>=0?'KeyS':'KeyW');if(Math.abs(dx)>1)want.push(dx>=0?'KeyD':'KeyA');}await keys(want);if(g.stamina>30&&d<4.4)await page.keyboard.press('Space');await sleep(100);continue;
   }
   const target=[...g.targets,...(g.shardHp>0?[g.shard]:[])].sort((a,b)=>Math.hypot(a.x-g.pos[0],a.z-g.pos[1])-Math.hypot(b.x-g.pos[0],b.z-g.pos[1]))[0]||g.shard;
   if(!target)break;if(Math.hypot(target.x-g.pos[0],target.z-g.pos[1])>8){await keys([]);await walkTo(target.x,target.z,6.5);continue;}
   const dx=target.x-g.pos[0],dz=target.z-g.pos[1],d=Math.hypot(dx,dz),want=[];
   if(d>2.6){if(Math.abs(dx)>.3)want.push(dx>0?'KeyD':'KeyA');if(Math.abs(dz)>.3)want.push(dz>0?'KeyS':'KeyW');}
   if(target.sx>0&&target.sx<640&&target.sy>0&&target.sy<480)await page.mouse.move(target.sx,target.sy);
   if(d<3.5)want.push('KeyF');await keys(want);
   if(g.stamina>45&&g.cooldowns.slam<=0&&d<3)await page.keyboard.press('Digit2');
   if(g.stamina>65&&g.cooldowns.cry<=0&&d<4)await page.keyboard.press('Digit3');
   if(!software&&!shot&&g.hits>3){await page.screenshot({path:`${out}/region-${region}-fight.png`});shot=true;}
   await sleep(100);
  }
  await keys([]);if(!(await state()).complete){await checkpoint();throw Error(`Region ${region} did not finish within the wall-clock limit; actual earned progress was saved for --resume.`);}await page.waitForFunction(i=>window.__GAME__.campaign.cleared[i],{timeout:10000},region);let g=await state();assert(!g.over);assert(g.complete);assert.equal(g.kills,g.requiredKills);if(region===3)assert(bossPhase2,'boss must enter second phase');
  runs.push({region,result:'PASS',level:g.rpg.level,kills:g.kills,bossPhase2});console.log('Cleared',runs.at(-1));if(!software)await page.screenshot({path:`${out}/region-${region}-cleared.png`});
  if(region===3)await page.click('#explore');await checkpoint();
  // Collect rewards by walking, then persist and reload each completed region.
  while((g=await state()).rpg.drops.length){const drop=g.rpg.drops.sort((a,b)=>Math.hypot(a.x-g.pos[0],a.z-g.pos[1])-Math.hypot(b.x-g.pos[0],b.z-g.pos[1]))[0];await walkTo(drop.x,drop.z,1.3,drop.id);await sleep(100);assert(g.rpg.items.length<24);}
  // Finish the last strike before pausing the simulation in the inventory.
  await wait(()=>window.__GAME__.attackPhase==='idle');
  // Compare the earned gear and equip upgrades through the real inventory UI.
  await page.keyboard.press('KeyI');for(const kind of ['spear','armor']){const s=await state(),power=i=>i.power+i.upgrade*(kind==='armor'?2:3),best=s.rpg.items.filter(i=>i.kind===kind).sort((a,b)=>power(b)-power(a))[0];if(s.rpg.loadout[kind]===best.id)continue;const slot=await page.$(`#item-list [data-select-item="${best.id}"]`);await slot.evaluate(e=>e.scrollIntoView({block:'center'}));await slot.click();const equip=await page.$(`[data-item-action="equip"][data-id="${best.id}"]`);await equip.evaluate(e=>e.scrollIntoView({block:'center'}));await equip.click();await page.waitForFunction(({kind,id})=>window.__GAME__.rpg.loadout[kind]===id,{}, {kind,id:best.id});}await page.click('#bag-close');await checkpoint();
  const before=await state();await page.reload();await wait(()=>window.__READY__);await page.click('#startb');await wait(()=>window.__GAME__.started);g=await state();assert.equal(g.campaign.region,region);for(const field of ['gold','level','xp','ore','potions'])assert.equal(g.rpg[field],before.rpg[field]);assert.deepEqual(g.rpg.items,before.rpg.items);assert.deepEqual(g.rpg.loadout,before.rpg.loadout);assert.deepEqual(g.campaign.cleared,before.campaign.cleared);assert.equal(g.rpg.drops.length,0);assert(g.complete);
  // A completed save shows its ending on entry. Dismiss it through the real
  // Stay button before opening the journal; modal guards correctly reject J.
  if(region===3){assert(g.campaign.complete);await page.waitForSelector('#victory:not([hidden])');await page.screenshot({path:`${out}/ending.png`});await page.click('#explore');await page.keyboard.press('KeyJ');await page.waitForSelector('#journal:not([hidden])');assert.equal(await page.$$eval('.quest-card.done',cards=>cards.length),4);break;}
  // Every crossing requires the actual north portal; journal travel is removed.
  await walkTo(0,-56,1.5);await page.click('#gate-button');
  await page.waitForFunction(i=>window.__GAME__.campaign.region===i,{timeout:90000},region+1);if(process.argv.includes('--first-region'))break;
 }
 assert.deepEqual(errors,[]);if(!software){assert(maxDraws<=500);assert(maxTris<=600000);}await fs.writeFile(`${out}/real-input.json`,JSON.stringify({result:'PASS',scope:process.argv.includes('--first-region')?'first region and gate':'four quests',resumed:process.argv.includes('--resume'),rendering:software?'native-input/DOM integration only; world drawing skipped after initial frame, separately validated at full quality':'unmodified',runs,...(!software?{maxDraws,maxTris}:{}),errors},null,2));console.log(process.argv.includes('--first-region')?'Expanded first region through real input: PASS':'Full expanded campaign through real input: PASS');
}finally{await browser.close();}
