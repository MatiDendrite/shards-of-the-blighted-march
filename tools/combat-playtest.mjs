import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));await fs.mkdir('_artifacts/combat',{recursive:true});
try{
 const errors=[];
 if(!process.argv.includes('--mobile-only')){
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setViewport({width:640,height:480,deviceScaleFactor:1});await page.goto('http://localhost:4173/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__READY__,{timeout:60000});await page.click('#startb');
 const state=()=>page.evaluate(()=>window.__GAME__);
 async function until(predicate,ms=20000){await page.waitForFunction(predicate,{timeout:ms,polling:50});}
 // Walk to the smith and spend actual starter resources through the public UI.
 await page.keyboard.down('KeyA');await until(()=>window.__GAME__.rpg.nearSmith);await page.keyboard.up('KeyA');await page.keyboard.press('KeyE');await page.waitForSelector('#inventory:not([hidden])');
 await page.click('[data-item-action="upgrade"][data-id="1"]');await until(()=>window.__GAME__.rpg.items[0].upgrade===1);assert.equal((await state()).rpg.gold,20);
 await page.click('#bag-close');await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__READY__,{timeout:60000});await page.click('#startb');assert.equal((await state()).rpg.items[0].upgrade,1);
 console.log('Smith upgrade and reload persistence: PASS');
 await page.keyboard.down('KeyF');await until(()=>window.__GAME__.combo===3);await page.keyboard.up('KeyF');await until(()=>window.__GAME__.attackPhase==='idle');
 await page.keyboard.press('KeyR');await until(()=>window.__GAME__.weapon==='axe');await page.keyboard.down('KeyF');await until(()=>window.__GAME__.weaponsUsed.axe>=1);await page.keyboard.up('KeyF');await until(()=>window.__GAME__.attackPhase==='idle');
 await page.keyboard.press('KeyR');await until(()=>window.__GAME__.weapon==='spear');await page.keyboard.down('KeyF');await until(()=>window.__GAME__.weaponsUsed.spear>=1);await page.keyboard.up('KeyF');await until(()=>window.__GAME__.attackPhase==='idle');
 await until(()=>window.__GAME__.stamina>=90);
 for(const [key,name] of [['Digit1','cleave'],['Digit2','slam'],['Digit3','cry']]){await page.keyboard.press(key);await page.waitForFunction(name=>window.__GAME__.skillsUsed[name]>=1,{timeout:10000},name);await until(()=>window.__GAME__.attackPhase==='idle');}
 await until(()=>window.__GAME__.stamina>=30);await page.keyboard.press('Space');await until(()=>window.__GAME__.dodges>=1);
 console.log('All weapons, combo, skills and dodge driven with real keyboard input.');
 // Seek opponents using read-only telemetry. Inputs remain real keys and mouse movement.
 const held=new Set();async function keys(want){for(const k of held)if(!want.includes(k)){await page.keyboard.up(k);held.delete(k);}for(const k of want)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}}
 let n=0,maxDraws=0,maxTris=0,retreating=false,lastReport=0;const deadline=Date.now()+480000;
 while(Date.now()<deadline){const g=await state();maxDraws=Math.max(maxDraws,g.draws);maxTris=Math.max(maxTris,g.tris);if(g.over||g.complete)break;
  if(Date.now()-lastReport>30000){lastReport=Date.now();console.log('Encounter progress',JSON.stringify({hp:g.hp,kills:g.kills,shardHp:g.shardHp,pos:g.pos}));await fs.writeFile('_artifacts/combat/progress.json',JSON.stringify(g,null,2));}
  if(g.hp<38)retreating=true;
  if(retreating){if(g.hp>=105)retreating=false;else{const want=g.pos[1]<7.4?['KeyS']:[];if(g.pos[1]<7.4&&Math.abs(g.pos[0])>.4)want.push(g.pos[0]>0?'KeyA':'KeyD');await keys(want);await sleep(100);continue;}}
  const close=g.targets.filter(t=>t.visible).sort((a,b)=>Math.hypot(a.x-g.pos[0],a.z-g.pos[1])-Math.hypot(b.x-g.pos[0],b.z-g.pos[1]));
  const target=close[0]||g.shard;
  const dx=target.x-g.pos[0],dz=target.z-g.pos[1],d=Math.hypot(dx,dz);const want=[];
  if(d>2.65){if(Math.abs(dx)>.3)want.push(dx>0?'KeyD':'KeyA');if(Math.abs(dz)>.3)want.push(dz>0?'KeyS':'KeyW');}
  if(target.sx>0&&target.sx<640&&target.sy>0&&target.sy<480)await page.mouse.move(target.sx,target.sy);
  if(d<3.5)want.push('KeyF');await keys(want);
  if(g.stamina>40&&g.cooldowns.slam<=0&&d<3)await page.keyboard.press('Digit2');
  if(n++===15||n===65){await page.screenshot({path:`_artifacts/combat/fight-${n}.png`});}
  await sleep(90);
 }
 await keys([]);let g=await state();console.log('Fight result',JSON.stringify({hp:g.hp,kills:g.kills,hits:g.hits,shardHp:g.shardHp,complete:g.complete,over:g.over,maxDraws,maxTris}));
 await fs.writeFile('_artifacts/combat/desktop.json',JSON.stringify({result:g.complete?'PASS':'INCOMPLETE',state:g,maxDraws,maxTris,errors},null,2));
 assert(g.complete,'must complete the encounter through real input');assert(g.kills===8,'must defeat all eight guardians');assert(g.hits>=1);assert(maxDraws<=500);assert(maxTris<=600000);assert.deepEqual(errors,[]);
 await page.screenshot({path:'_artifacts/combat/desktop-end.png'});
 // Explore and collect the real drops before starting the next hunt.
 await page.click('#explore');const lootDeadline=Date.now()+180000;
 while(Date.now()<lootDeadline){const s=await state();if(s.rpg.drops.length===0)break;const target=[...s.rpg.drops].sort((a,b)=>Math.hypot(a.x-s.pos[0],a.z-s.pos[1])-Math.hypot(b.x-s.pos[0],b.z-s.pos[1]))[0],dx=target.x-s.pos[0],dz=target.z-s.pos[1],want=[];if(Math.abs(dx)>.35)want.push(dx>0?'KeyD':'KeyA');if(Math.abs(dz)>.35)want.push(dz>0?'KeyS':'KeyW');await keys(want);await sleep(100);}
 await keys([]);let loot=await state();assert(loot.rpg.items.length>4);assert(loot.rpg.level>=2);assert.equal(loot.rpg.drops.length,0);assert(loot.rpg.gold>20);
 await page.keyboard.press('KeyI');await page.waitForSelector('#inventory:not([hidden])');const item=loot.rpg.items.find(i=>i.id>4&&i.kind!=='armor');assert(item);await page.click(`[data-item-action="equip"][data-id="${item.id}"]`);await page.screenshot({path:'_artifacts/combat/inventory.png'});await page.click('#bag-close');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__READY__,{timeout:60000});await page.click('#startb');await until(()=>window.__GAME__.complete);let restored=await state();assert.equal(restored.rpg.loadout[item.kind],item.id);assert.equal(restored.rpg.level,loot.rpg.level);assert.equal(restored.rpg.gold,loot.rpg.gold);assert.equal(restored.rpg.drops.length,0);
 console.log('Loot pickup, level, equipment and completed-world reload: PASS');
 await fs.writeFile('_artifacts/combat/progression.json',JSON.stringify({result:'PASS',beforeReload:loot.rpg,restored:restored.rpg},null,2));
 // Restart must reset progress; the same public control is used after defeat or in pause.
 if(g.over)await page.click('#retry');else if(g.complete)await page.click('#replay');else{await page.click('#menu-button');await page.click('#reset-view');}
 await until(()=>window.__GAME__.hp===window.__GAME__.maxHp&&window.__GAME__.kills===0&&window.__GAME__.shardHp===250);
 await fs.writeFile('_artifacts/combat/desktop.json',JSON.stringify({result:'PASS',state:g,maxDraws,maxTris,errors},null,2));
 await page.close();
 console.log('Desktop combat and progression: PASS');
 }
 if(!process.argv.includes('--desktop-only')){
 const mobileContext=await browser.createBrowserContext(),mobile=await mobileContext.newPage();mobile.on('pageerror',e=>errors.push(e.message));mobile.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await mobile.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});await mobile.goto('http://localhost:4173/',{waitUntil:'domcontentloaded'});await mobile.waitForFunction(()=>window.__READY__,{timeout:60000});
 async function center(selector){return mobile.$eval(selector,e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});}
 let b=await center('#startb');await mobile.touchscreen.tap(b.x,b.y);
 const stick=await center('#stick'),attack=await center('#attack');const cdp=await mobile.createCDPSession();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stick.x,y:stick.y,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:stick.x,y:stick.y-32,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stick.x,y:stick.y-32,id:1},{x:attack.x,y:attack.y,id:2}]});
 await mobile.waitForFunction(()=>window.__GAME__.attacks>=2&&window.__GAME__.pos[1]<10,{timeout:20000});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await mobile.waitForFunction(()=>window.__GAME__.attackPhase==='idle');
 b=await center('#weapon-button');await mobile.touchscreen.tap(b.x,b.y);await mobile.waitForFunction(()=>window.__GAME__.weapon==='axe');
 b=await center('#dodge');await mobile.touchscreen.tap(b.x,b.y);await mobile.waitForFunction(()=>window.__GAME__.dodges>=1);
 await mobile.screenshot({path:'_artifacts/combat/mobile-controls.png'});
 assert.deepEqual(errors,[]);console.log('Mobile simultaneous joystick + attack, weapon switch and dodge: PASS');
 await fs.writeFile('_artifacts/combat/mobile.json',JSON.stringify(await mobile.evaluate(()=>window.__GAME__),null,2));
 }
}finally{await browser.close();}
