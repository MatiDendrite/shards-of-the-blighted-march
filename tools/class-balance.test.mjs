// Focused regression fixtures. Frozen dummies isolate damage from enemy AI.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Combat,basicAttack,WEAPONS,enemyAttack} from '../game/src/combat-model.js';
import {ARCANE_BOLT,SKILLS} from '../game/src/class-data.js';
import {bombLanding} from '../game/src/class-combat.js';
import {touchAim} from '../game/src/combat-targeting.js';
import {createClassEffects} from '../game/src/class-effects.js';

const dt=1/60,close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function arena(id='warrior',canPass=()=>true){const m=new Combat(canPass);m.enemies=[];m.events=[];m.shard.hp=0;m.shard.exploded=true;Object.assign(m.player,{classId:id,x:0,z:-35,angle:0});return m;}
function dummy(m,x=0,z=-33){const e=m.spawn('raider',x,z);e.hp=e.maxHp=10000;return e;}
function step(m,seconds,input){for(let i=0;i<Math.round(seconds*60);i++){for(const e of m.enemies){e.phase='recovery';e.timer=100;}m.update(dt,input);}}
const wall=(x,z)=>z< -34.2||z> -33.8;

for(const skill of ['basic','cleave','slam','cry'])test(`${skill}: solid walls block hits and stagger; open paths still work`,()=>{
 for(const blocked of [true,false]){
  const m=arena('warrior',blocked?wall:()=>true),e=dummy(m);Object.assign(m.shard,{hp:1000,maxHp:1000,x:0,z:-32.9});
  assert(m.startAttack(skill,0));step(m,(SKILLS[skill]||WEAPONS.sword).windup+dt);
  if(blocked){assert.equal(e.hp,e.maxHp);assert.equal(e.stagger,0);assert.equal(m.shard.hp,1000);}
  else if(skill==='cry'){assert(m.player.buff>0);assert(e.stagger>0);}
  else {assert(e.hp<e.maxHp);assert(m.shard.hp<1000);}
 }
});
for(const kind of ['wolf','raider','boss'])test(`${kind}: enemy strikes cannot cross a wall`,()=>{
 for(const blocked of [true,false]){
  const m=arena('warrior',blocked?wall:()=>true),e=m.spawn(kind,0,-33.7);
  Object.assign(e,{phase:'windup',timer:dt,angle:Math.PI,attackKind:'sweep'});m.update(dt);
  assert.equal(m.damageTaken,blocked?0:enemyAttack(e).damage);
 }
});

test('Venom shares one equipment bonus per target, including level scaling and four poison ticks',()=>{
 const m=arena('ninja'),e=dummy(m);Object.assign(m.player,{damageBonus:21,damageMultiplier:1.56});
 assert(m.startAttack('venom'));step(m,.8);assert.equal(m.projectiles.length,0);
 close(e.maxHp-e.hp,(3*SKILLS.venom.damage+21)*1.56);
 step(m,4.2);close(e.maxHp-e.hp,(3*SKILLS.venom.damage+21+24)*1.56);
 // A new volley has its own target set, never a permanent per-enemy penalty.
 m.player.cooldowns.venom=0;m.player.stamina=100;const hp=e.hp;
 assert(m.startAttack('venom'));step(m,.8);close(hp-e.hp,(3*SKILLS.venom.damage+21)*1.56);
});
test('Venom gives separate victims the full bonus, snapshotted at cast time',()=>{
 const m=arena('ninja');m.player.damageBonus=21;
 const foes=[-.16,0,.16].map(a=>dummy(m,Math.sin(a)*7,-35+Math.cos(a)*7));
 assert(m.startAttack('venom'));step(m,.3);m.player.damageBonus=0;step(m,.5);
 for(const e of foes)close(e.maxHp-e.hp,SKILLS.venom.damage+21);
});
test('Venom also counts equipment once per volley against a shard',()=>{
 const m=arena('ninja');m.player.damageBonus=21;Object.assign(m.shard,{hp:1000,maxHp:1000,x:0,z:-33});
 m.startAttack('venom');step(m,.8);close(1000-m.shard.hp,SKILLS.venom.damage*3+21);
});

test('Mage basic has travel time, one hit, equipment scaling and no hidden melee damage',()=>{
 const m=arena('mage'),e=dummy(m,0,-28);m.player.damageBonus=10;m.player.damageMultiplier=1.56;
 assert.equal(basicAttack(m.player),ARCANE_BOLT);assert(m.startAttack());assert.equal(m.player.stamina,91);
 step(m,.25);assert.equal(e.hp,e.maxHp);assert.equal(m.projectiles[0].kind,'arcane');
 step(m,.6);close(e.maxHp-e.hp,28*1.56);assert.equal(m.hits,1);assert.equal(m.projectiles.length,0);
 for(const id of ['warrior','ninja','dwarf']){m.player.classId=id;assert.equal(basicAttack(m.player),WEAPONS.sword);}
});
test('Arcane Bolt keeps the three-hit combo and cannot pass through solid scenery',()=>{
 const m=arena('mage'),e=dummy(m,0,-28);
 for(let i=0;i<3;i++){assert(m.startAttack());step(m,.85);}
 close(e.maxHp-e.hp,18*3.5);assert.equal(m.attacks,3);
 const blocked=arena('mage',wall),behind=dummy(blocked);blocked.startAttack();step(blocked,1);assert.equal(behind.hp,behind.maxHp);assert.equal(blocked.projectiles.length,0);
});
test('Mage basic requires stamina and cancels safely on dodge, death or reset',()=>{
 const m=arena('mage');m.player.stamina=8;assert(!m.startAttack());m.player.stamina=100;
 assert(m.startAttack());assert(m.dodge(1,0));step(m,.8);assert.equal(m.projectiles.length,0);
 assert(m.startAttack());step(m,.25);assert.equal(m.projectiles.length,1);m.player.invulnerable=0;m.hurtPlayer(1000);assert.equal(m.projectiles.length,0);
 m.reset();assert.equal(m.player.action,null);assert.equal(m.projectiles.length,0);
});

test('Bomb landing accepts nearby and zero-distance aims, clamps range, and has a facing fallback',()=>{
 const m=arena('dwarf'),p=m.player;
 assert.deepEqual(bombLanding(m,p,0,{x:0,z:-33}),{x:0,z:-33});
 assert.deepEqual(bombLanding(m,p,0,p),{x:0,z:-35});
 assert.deepEqual(bombLanding(m,p,0,{x:0,z:100}),{x:0,z:-29.5});
 assert.deepEqual(bombLanding(m,p,0,{x:NaN,z:0}),{x:0,z:-29.5});
 const blocked=arena('dwarf',wall),end=bombLanding(blocked,blocked.player,0,{x:0,z:-30});assert(end.z< -34.2&&end.z> -34.4);
});
test('Aimed bomb retains its world point during windup and damages a nearby target after the fuse',()=>{
 const m=arena('dwarf'),e=dummy(m,0,-33.2),point={x:0,z:-33.2};assert(m.startAttack('cinderbomb',0,point));point.z=30;
 step(m,.4,{x:1,z:0,aim:0});assert.equal(m.bombs.length,1);close(m.bombs[0].x,0);close(m.bombs[0].z,-33.2);assert.equal(e.hp,e.maxHp);
 step(m,.8);assert.equal(e.hp,e.maxHp);step(m,.3);close(e.maxHp-e.hp,52);assert.equal(m.bombs.length,0);
});
test('Buffered bomb copies its aim point rather than following a mutable cursor',()=>{
 const m=arena('dwarf');m.startAttack();step(m,.4);const point={x:1,z:-33};
 assert(m.requestAttack('cinderbomb',0,point));point.x=20;step(m,.5);
 assert.equal(m.bombs.length,1);close(m.bombs[0].x,1);close(m.bombs[0].z,-33);
});
test('Touch acquires ranged basic and nearby bomb targets without redirecting movement or Blink',()=>{
 const m=arena('mage'),far=dummy(m,1,-28);let aim=touchAim(m,[],true,Math.PI);assert.deepEqual(aim.point,{x:far.x,z:far.z});
 assert.deepEqual(touchAim(m,[],false,Math.PI),{angle:Math.PI,point:null});assert.deepEqual(touchAim(m,['cry'],false,Math.PI),{angle:Math.PI,point:null});
 m.player.classId='dwarf';const closeFoe=dummy(m,.5,-33);aim=touchAim(m,['slam'],false,0);assert.deepEqual(aim.point,{x:closeFoe.x,z:closeFoe.z});
 const blocked=arena('mage',wall);dummy(blocked);assert.equal(touchAim(blocked,['attack'],false,0).point,null);
 const visible=dummy(blocked,3,-35);assert.deepEqual(touchAim(blocked,['attack'],false,0).point,{x:visible.x,z:visible.z});
});
test('Arcane visuals and bomb preview are finite, bounded and disappear on cleanup',()=>{
 const scene=new T.Scene(),effects=createClassEffects(scene),m=arena('mage');m.startAttack();step(m,.25);effects.update(m);scene.updateMatrixWorld(true);
 scene.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
 const root=scene.getObjectByName('classEffects');assert(root.children.some(o=>o.isMesh&&o.material.color.getHex()===ARCANE_BOLT.color));
 m.player.classId='dwarf';m.player.action=null;m.player.aimPoint={x:1,z:-33};effects.update(m);
 const ring=scene.getObjectByName('cinder-bomb-aim');assert(ring.visible);close(ring.position.x,1);close(ring.position.z,-33);assert.equal(ring.scale.x,2.6);
 for(const [key,value] of [['stamina',0],['hp',0],['classId','mage']]){const old=m.player[key];m.player[key]=value;effects.update(m);assert(!ring.visible);m.player[key]=old;}
 m.player.cooldowns.cinderbomb=1;effects.update(m);assert(!ring.visible);effects.clear();assert(!ring.visible);assert.equal(root.children.length,3);
});
test('Warden toughness does not shorten readable attack warnings',()=>{
 const m=arena(),e=m.spawn('boss',0,-30);assert.equal(e.maxHp,1080);
 e.attackKind='sweep';assert.equal(enemyAttack(e).damage,42);assert.equal(enemyAttack(e).windup,1.05);
 e.attackKind='slam';assert.equal(enemyAttack(e).damage,60);assert.equal(enemyAttack(e).windup,1.6);assert.equal(enemyAttack(e).range,4.5);
});
