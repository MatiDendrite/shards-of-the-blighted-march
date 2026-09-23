// Real browser input for a fresh wolf encounter. The boss portion explicitly uses
// a saved-journey fixture to review tells; it is not an earned full campaign run.
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Combat} from '../game/src/combat-model.js';
import {Progression,SAVE_KEY} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
import {route} from './navigation.mjs';

const out='_artifacts/combat-polish';await fs.mkdir(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const report=[],errors=[];
try{
 for(const bossFixture of [false,true]){
  const context=await browser.createBrowserContext(),page=await context.newPage();page.setDefaultTimeout(90000);
  page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewport({width:960,height:640,deviceScaleFactor:1});
  if(bossFixture){const m=new Combat(),p=new Progression(),c=new Campaign(p,m);p.restore(m);for(let r=0;r<3;r++){m.damageShard(999);for(let i=0;i<100;i++)m.update(1/60);for(const e of m.enemies)m.damageEnemy(e,999);p.events(m.consume(),m);c.observe();c.travel(r+1);}
   await page.evaluateOnNewDocument((key,data)=>{if(!localStorage.getItem(key))localStorage.setItem(key,data);},SAVE_KEY,JSON.stringify(p.snapshot(m)));
  }
  await page.goto('http://localhost:4173/preview/');await page.waitForFunction(()=>window.__READY__);await page.click('#startb');console.log(bossFixture?'Boss fixture ready':'Fresh journey ready');
  await page.keyboard.press('KeyJ');assert.equal(await page.$$eval('.quest-card.current .quest-steps li',e=>e.length),bossFixture?2:4);await page.screenshot({path:`${out}/${bossFixture?'boss':'fresh'}-journal.png`});await page.click('#journal-close');
  const state=()=>page.evaluate(()=>{const g=window.__GAME__;return {pos:g.pos,hp:g.hp,maxHp:g.maxHp,kills:g.kills,hits:g.hits,attacks:g.attacks,stamina:g.stamina,over:g.over,enemies:g.enemies,targets:g.targets,draws:g.draws,tris:g.tris,rpg:g.rpg};});
  async function walkTo(target,tolerance=1.2){
   const map=await page.evaluate(()=>({pos:window.__GAME__.pos,obstacles:window.__GAME__.obstacles})),path=route(map.pos,target,map.obstacles,tolerance,1.3);
   for(const point of path)for(const axis of [0,1]){const g=await state(),value=axis===0?point.x:point.z,delta=value-g.pos[axis];if(Math.abs(delta)<.25)continue;const sign=Math.sign(delta),key=axis===0?sign>0?'KeyD':'KeyA':sign>0?'KeyS':'KeyW';await page.keyboard.down(key);
    try{await page.waitForFunction(({axis,value,sign})=>sign*(window.__GAME__.pos[axis]-value)>=-.25,{timeout:90000,polling:'raf'},{axis,value,sign});}finally{await page.keyboard.up(key);}
   }
  }
  if(!bossFixture){
   await walkTo({x:-28,z:8});
   await page.keyboard.press('KeyR');await page.waitForFunction(()=>window.__GAME__.weapon==='axe');await page.keyboard.press('KeyR');await page.waitForFunction(()=>window.__GAME__.weapon==='spear');
   let tookShot=false,maxDraws=0,maxTris=0;
   for(let n=0;n<180;n++){
    const g=await state();maxDraws=Math.max(maxDraws,g.draws);maxTris=Math.max(maxTris,g.tris);assert(!g.over);if(g.kills)break;
    const e=g.targets.filter(e=>e.kind==='wolf').sort((a,b)=>Math.hypot(a.x-g.pos[0],a.z-g.pos[1])-Math.hypot(b.x-g.pos[0],b.z-g.pos[1]))[0];assert(e);
    if(e.sx>0&&e.sx<960&&e.sy>0&&e.sy<640)await page.mouse.move(e.sx,e.sy);
    await page.keyboard.down('KeyF');
    if(!tookShot&&g.hits>0){await page.screenshot({path:`${out}/wolf-fight.png`});tookShot=true;}
    await new Promise(r=>setTimeout(r,180));
   }
   await page.keyboard.up('KeyF');const after=await state();assert(after.kills>=1,'fresh wolf encounter must be won through input');assert(after.hits>=2);assert(maxDraws<=500);assert(maxTris<=600000);
   await page.keyboard.press('KeyJ');await page.screenshot({path:`${out}/earned-progress.png`});await page.click('#journal-close');await page.reload();await page.waitForFunction(()=>window.__READY__);await page.click('#startb');await page.waitForFunction(()=>window.__GAME__.started);assert.equal((await state()).kills,after.kills);
   report.push({scope:'fresh wolf encounter, journal and save reload',fixture:false,kills:after.kills,hits:after.hits,maxDraws,maxTris});
  }else{
   await walkTo({x:0,z:-31});
   await page.waitForFunction(()=>window.__GAME__.enemies[0].phase==='windup');assert.match(await page.$eval('#boss-intent',e=>e.textContent),/Sweep/);await page.screenshot({path:`${out}/boss-sweep.png`});
   await page.waitForFunction(()=>{const b=window.__GAME__.enemies[0];return b.phase==='windup'&&b.attackKind==='slam';});
   assert.match(await page.$eval('#boss-intent',e=>e.textContent),/Ground Slam/);assert.equal(await page.$eval('#boss-cast',e=>e.hidden),false);await page.screenshot({path:`${out}/boss-slam.png`});
   const before=await state();await page.keyboard.down('KeyS');await page.keyboard.press('Space');await page.waitForFunction(()=>{const g=window.__GAME__,b=g.enemies[0];return Math.hypot(g.pos[0]-b.x,g.pos[1]-b.z)>5.1;});await page.keyboard.up('KeyS');
   await page.waitForFunction(()=>window.__GAME__.enemies[0].phase==='recovery');const after=await state();assert.equal(after.hp,before.hp,'leaving the slam must prevent damage');await page.screenshot({path:`${out}/boss-recovery.png`});
   assert(after.draws<=500&&after.tris<=600000);report.push({scope:'boss sweep/slam warnings, native dodge and recovery',fixture:true,hp:after.hp,draws:after.draws,tris:after.tris});
  }
  console.log(report.at(-1));await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/playtest.json`,JSON.stringify({result:'PASS',report,errors},null,2));
}finally{await browser.close();}
