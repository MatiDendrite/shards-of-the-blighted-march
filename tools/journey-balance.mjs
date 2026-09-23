// Deterministic full-journey rules simulation. Uses real damage, costs, scenery,
// pickups and save/reload; not a substitute for browser or human playtesting.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Combat,WEAPONS,basicAttack,enemyAttack,inArc} from '../game/src/combat-model.js';
import {clearPath} from '../game/src/class-combat.js';
import {Progression,validSave,itemPower,SMITH} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
import {EXIT} from '../game/src/world-map.js';
import {sceneryLayout,canStandIn} from '../game/src/region-layout.js';
import {route} from './navigation.mjs';
import {CLASS_IDS,SKILLS} from '../game/src/class-data.js';
let obstacles=sceneryLayout(0).colliders;
const weapon=process.argv.find(a=>a.startsWith('--weapon='))?.slice(9)||'spear';assert(WEAPONS[weapon]);const weaponId={sword:1,axe:2,spear:3}[weapon];
const classId=process.argv.find(a=>a.startsWith('--class='))?.slice(8)||'warrior';assert(CLASS_IDS.includes(classId));
const model=new Combat((x,z)=>canStandIn(obstacles,x,z)&&(model.shard.hp<=0||Math.hypot(x-model.shard.x,z-model.shard.z)>1.12),(x,z)=>canStandIn(obstacles,x,z));
const progress=new Progression(),campaign=new Campaign(progress,model);progress.restore(model);
if(classId!=='warrior')assert(progress.chooseClass(classId,model));
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
  // Following a moving patrol can leave the bot legally beside a tree, inside
  // the router's extra safety margin. Retry with .35 m (still above the game's
  // .30 m radius); actual simulated movement always uses the real collisions.
  try{waypoints=route([p.x,p.z],target,cols,tolerance,.6);}catch{
   try{waypoints=route([p.x,p.z],target,cols,tolerance,.35);}catch{
    // A ranged retreat may end in a legal narrow pocket whose rounded grid
    // cell is disconnected. Walk to a visible nearby grid entrance; never
    // teleport the player or relax production collisions to rescue the bot.
    waypoints=[];
    search:for(const radius of [.6,1.2,1.8])for(let i=0;i<12;i++){
     const next={x:p.x+Math.sin(i*Math.PI/6)*radius,z:p.z+Math.cos(i*Math.PI/6)*radius};
     if(!model.canStand(next.x,next.z)||!clearPath(model,p,next))continue;
     try{waypoints=[next,...route([next.x,next.z],target,cols,tolerance,.35)];break search;}catch{}
    }
    assert(waypoints.length,`No safe test route: ${JSON.stringify({from:[p.x,p.z],target,tolerance,region:model.region})}`);
   }
  }
  pathKey=key;lastRoute=frames/60;stuck=0;
 }
 while(waypoints.length>1&&Math.hypot(waypoints[0].x-p.x,waypoints[0].z-p.z)<.35)waypoints.shift();
 const next=waypoints[0]||target,dx=next.x-p.x,dz=next.z-p.z,d=Math.hypot(dx,dz)||1;return{x:dx/d,z:dz/d};
}
function walkUntil(target,radius){for(let n=0;n<60*180;n++){if(Math.hypot(model.player.x-target.x,model.player.z-target.z)<radius)return;const input=walk(target,Math.max(.3,radius-.4));simulate(input.x,input.z);}throw Error('walking deadline');}
function firingPoint(target,reach){
 // Distance alone is not a valid stopping condition when a tree lies between
 // two actors. Approach a clear firing position around the target instead.
 const options=[];
 for(const radius of [Math.min(2,reach-.4),Math.min(3,reach)])for(let i=0;i<24;i++){
  const point={x:target.x+Math.sin(i*Math.PI/12)*radius,z:target.z+Math.cos(i*Math.PI/12)*radius};
  if(model.canStand(point.x,point.z)&&clearPath(model,point,target))options.push(point);
 }
 options.sort((a,b)=>Math.hypot(a.x-model.player.x,a.z-model.player.z)-Math.hypot(b.x-model.player.x,b.z-model.player.z));
 return options[0]||target;
}
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
  if(target.kind==='boss'&&target.phase==='windup'&&inArc(target,{...p,radius:.28},enemyAttack(target).range,enemyAttack(target).arc,target.angle)){
   const v={x:-dx/(d||1),z:-dz/(d||1)};if(target.timer<.4)model.dodge(v.x,v.z);simulate(v.x,v.z,false,aim);continue;
  }
  const basic=basicAttack(p),reach=basic.range,visible=clearPath(model,p,target),desired=classId==='mage'?6.5:reach-.55;
  let move={x:0,z:0};
  if(!visible)move=walk(firingPoint(target,reach),.55);
  else if(d>desired){move=d>6||stuck>20?walk(target,Math.max(1.6,desired-.3)):{x:dx/(d||1),z:dz/(d||1)};}
  else if(classId==='mage'&&d<4.5)move={x:-dx/(d||1),z:-dz/(d||1)};
  if(!p.action&&!p.dodge&&visible){
   // One deliberate cast at a time; include every offensive class skill and
   // preserve stamina for escape. Mage uses range; bombs aim at the actual foe.
   const options={warrior:[['cry',d<3.5],['cleave',d<3.3],['slam',d<3.4]],mage:[['blink',d<2.8],['frostnova',d<3.8],['firebolt',d<10]],ninja:[['smoke',d<3&&p.hp<p.maxHp*.8],['venom',d<8],['shadowcut',d<3.7]],dwarf:[['ironward',d<3.5],['forgeblow',d<2.9],['cinderbomb',d<5.5]]}[classId];
   for(const [skill,usable] of options)if(usable&&p.cooldowns[skill]<=0&&p.stamina>=SKILLS[skill].cost+25){model.requestAttack(skill,skill==='blink'?aim+Math.PI:aim,target);break;}
  }
  simulate(move.x,move.z,visible&&d<reach+.25&&p.stamina>=basic.cost+25,aim);
 }
 assert(model.complete,`region ${region} timed out: ${JSON.stringify({pos:[model.player.x,model.player.z],kills:model.kills,hp:model.shard.hp,enemies:model.telemetry().enemies})}`);
 assert(campaign.data.cleared[region]);
 const combatSeconds=frames/60-start,damage=model.damageTaken,skillsUsed={...model.skillsUsed};
 while(progress.data.drops.length){const p=model.player,drop=[...progress.data.drops].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];walkUntil(drop,1.4);progress.collect(model.player);}
 for(let i=0;i<120&&(model.player.action||model.player.dodge>0);i++)simulate();
 for(const kind of ['armor',weapon]){const best=progress.data.items.filter(i=>i.kind===kind).sort((a,b)=>itemPower(b)-itemPower(a))[0];assert(progress.equip(best.id,model));}
 const snapshot=progress.snapshot(model);assert(validSave(snapshot));progress.data=structuredClone(snapshot);progress.restore(model);assert(model.complete);assert(campaign.data.cleared[region]);
 assert.equal(model.player.classId,classId);reports.push({classId,weapon,region,combatSeconds:Math.round(combatSeconds),withLootSeconds:Math.round(frames/60-start),level:progress.data.level,hpStart,damageTaken:damage,weaponPower:itemPower(progress.equipped(weapon)),armor:itemPower(progress.equipped('armor')),potions:progress.data.potions,skillsUsed});console.log(reports.at(-1));
 if(region<3){walkUntil(EXIT,2.4);assert(campaign.travel(region+1));obstacles=sceneryLayout(region+1).colliders;waypoints=[];pathKey='';}
}
assert(campaign.complete);await fs.mkdir('_artifacts/performance/balance',{recursive:true});await fs.writeFile(`_artifacts/performance/balance/${classId}-${weapon}.json`,JSON.stringify({result:'PASS',kind:'deterministic simulation, not browser input',seconds:Math.round(frames/60),reports},null,2));
