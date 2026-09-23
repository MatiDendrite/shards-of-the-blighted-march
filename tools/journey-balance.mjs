// Deterministic full-journey rules simulation. Uses real damage, costs, scenery,
// pickups and save/reload; not a substitute for browser or human playtesting.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Combat,WEAPONS} from '../game/src/combat-model.js';
import {Progression,validSave,itemPower,SMITH} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
import {EXIT} from '../game/src/world-map.js';
import {sceneryLayout,canStandIn} from '../game/src/region-layout.js';
import {route} from './navigation.mjs';
let obstacles=sceneryLayout(0).colliders;
const weapon=process.argv.find(a=>a.startsWith('--weapon='))?.slice(9)||'spear';assert(WEAPONS[weapon]);const reach=WEAPONS[weapon].range,weaponId={sword:1,axe:2,spear:3}[weapon];
const model=new Combat((x,z)=>canStandIn(obstacles,x,z)&&(model.shard.hp<=0||Math.hypot(x-model.shard.x,z-model.shard.z)>1.12));
const progress=new Progression(),campaign=new Campaign(progress,model);progress.restore(model);
const reports=[];let frames=0,waypoints=[],pathKey='',lastRoute=-10,stuck=0;
function simulate(x=0,z=0,attack=false,aim=model.player.angle){
 const p=model.player,before=[p.x,p.z];model.update(1/60,{x,z,attack,aim});const events=model.consume();progress.events(events,model);progress.tick(1/60);progress.collect(p);campaign.observe();frames++;
 stuck=Math.hypot(x,z)>.1&&Math.hypot(p.x-before[0],p.z-before[1])<.008?stuck+1:0;
 assert(!model.dead,`died in ${campaign.region}, ${JSON.stringify({pos:[p.x,p.z],kills:model.kills,hp:p.hp})}`);
}
function walk(target,tolerance=1.15){
 const p=model.player,key=`${target.id??'point'}:${Math.round(target.x)}:${Math.round(target.z)}`;
 if(key!==pathKey||!waypoints.length||stuck>20||(frames/60-lastRoute>5)){
  const cols=model.shard.hp>0?[...obstacles,{x:model.shard.x,z:model.shard.z,r:.86}]:obstacles;
  waypoints=route([p.x,p.z],target,cols,tolerance,.6);pathKey=key;lastRoute=frames/60;stuck=0;
 }
 while(waypoints.length>1&&Math.hypot(waypoints[0].x-p.x,waypoints[0].z-p.z)<.35)waypoints.shift();
 const next=waypoints[0]||target,dx=next.x-p.x,dz=next.z-p.z,d=Math.hypot(dx,dz)||1;return{x:dx/d,z:dz/d};
}
function walkUntil(target,radius){for(let n=0;n<60*180;n++){if(Math.hypot(model.player.x-target.x,model.player.z-target.z)<radius)return;const input=walk(target,Math.max(.3,radius-.4));simulate(input.x,input.z);}throw Error('walking deadline');}
// Pay the starter forge cost through the regular progression API.
walkUntil(SMITH,2.5);assert(progress.upgrade(weaponId,model.player));assert(progress.equip(weaponId,model));
for(let region=0;region<4;region++){
 const start=frames/60,hpStart=model.player.hp;let retreat=false;
 for(let n=0;n<60*1200&&!model.complete;n++){
  const p=model.player;
  if(p.hp<p.maxHp*.45)progress.potion(model);
  if(p.hp<38)retreat=true;if(retreat&&p.hp>p.maxHp*.94)retreat=false;
  if(retreat){if(Math.hypot(p.x,p.z-11)>2){const v=walk({x:0,z:11});simulate(v.x,v.z);}else simulate();continue;}
  const targets=[...model.enemies.filter(e=>e.hp>0),...(model.shard.hp>0?[model.shard]:[])].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
  const target=targets[0];if(!target){simulate();continue;}
  const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz),aim=Math.atan2(dx,dz);
  if(target.kind==='boss'&&target.phase==='windup'&&target.attackKind==='slam'){
   const v=d<5.2?{x:-dx/(d||1),z:-dz/(d||1)}:{x:0,z:0};if(d<4.2)model.dodge(v.x,v.z);simulate(v.x,v.z,false,aim);continue;
  }
  let move={x:0,z:0};if(d>reach-.55){move=d>6||stuck>20?walk(target,Math.max(1.6,reach-.9)):{x:dx/(d||1),z:dz/(d||1)};}
  if(d<3&&p.stamina>65&&p.cooldowns.cry<=0)model.requestAttack('cry',aim);
  if(d<3&&p.stamina>50&&p.cooldowns.slam<=0)model.requestAttack('slam',aim);
  simulate(move.x,move.z,d<reach+.25,aim);
 }
 assert(model.complete,`region ${region} timed out: ${JSON.stringify({pos:[model.player.x,model.player.z],kills:model.kills,hp:model.shard.hp,enemies:model.telemetry().enemies})}`);
 assert(campaign.data.cleared[region]);
 const combatSeconds=frames/60-start,damage=model.damageTaken;
 while(progress.data.drops.length){const p=model.player,drop=[...progress.data.drops].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];walkUntil(drop,1.4);progress.collect(model.player);}
 for(let i=0;i<120&&(model.player.action||model.player.dodge>0);i++)simulate();
 for(const kind of ['armor',weapon]){const best=progress.data.items.filter(i=>i.kind===kind).sort((a,b)=>itemPower(b)-itemPower(a))[0];assert(progress.equip(best.id,model));}
 const snapshot=progress.snapshot(model);assert(validSave(snapshot));progress.data=structuredClone(snapshot);progress.restore(model);assert(model.complete);assert(campaign.data.cleared[region]);
 reports.push({weapon,region,combatSeconds:Math.round(combatSeconds),withLootSeconds:Math.round(frames/60-start),level:progress.data.level,hpStart,damageTaken:damage,weaponPower:itemPower(progress.equipped(weapon)),armor:itemPower(progress.equipped('armor')),potions:progress.data.potions});console.log(reports.at(-1));
 if(region<3){walkUntil(EXIT,2.4);assert(campaign.travel(region+1));obstacles=sceneryLayout(region+1).colliders;waypoints=[];pathKey='';}
}
assert(campaign.complete);await fs.mkdir('_artifacts/performance/balance',{recursive:true});await fs.writeFile(`_artifacts/performance/balance/${weapon}.json`,JSON.stringify({result:'PASS',kind:'deterministic simulation, not browser input',seconds:Math.round(frames/60),reports},null,2));
