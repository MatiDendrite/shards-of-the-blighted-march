import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {Combat} from '../game/src/combat-model.js';
import {Progression,validSave} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
import {CLASS_IDS,CLASSES,SKILLS,SLOT_IDS,skillForSlot} from '../game/src/class-data.js';
import {tracePath} from '../game/src/class-combat.js';
import {createHeroMotion} from '../game/src/combat-motion.js';
import {sceneryLayout,canStandIn} from '../game/src/region-layout.js';
import {EXIT} from '../game/src/world-map.js';

const step=(m,seconds)=>{for(let n=0;n<Math.round(seconds*60);n++)m.update(1/60);};
function arena(id,canStand=()=>true){const m=new Combat(canStand);if(id!=='warrior')assert(m.changeClass(id));m.enemies=[];m.consume();m.player.z=-30;m.player.angle=0;m.shard.x=40;m.shard.z=40;return m;}
const foe=(m,x=0,z=-28,kind='raider')=>{const e=m.spawn(kind,x,z);e.stagger=100;return e;};

test('four explicit classes own exactly twelve distinct, illustrated skills',async()=>{
 assert.deepEqual(CLASS_IDS,['warrior','mage','ninja','dwarf']);const ids=CLASS_IDS.flatMap(id=>CLASSES[id].skills);assert.equal(new Set(ids).size,12);assert.equal(Object.keys(SKILLS).length,12);
 for(const id of ids){const s=SKILLS[id];assert(s.name&&s.description&&s.cost>0&&s.cooldown>0);assert((await fs.stat(`game/icons/${id}.webp`)).size>1000);}
 for(const id of CLASS_IDS)assert.deepEqual(SLOT_IDS.map(slot=>skillForSlot(id,slot)),CLASSES[id].skills);
});
for(const id of CLASS_IDS){
 test(`${id}: class-gated skills pay once; unavailable casts cannot queue or spend`,()=>{
  for(const skill of CLASSES[id].skills){const m=arena(id),s=SKILLS[skill];assert(m.requestAttack(skill));assert.equal(m.player.stamina,100-s.cost);assert.equal(m.skillsUsed[skill],1);assert.equal(m.player.cooldowns[skill],s.cooldown);step(m,s.windup+s.active+s.recovery+.1);const stamina=m.player.stamina;assert(!m.requestAttack(skill));assert.equal(m.player.stamina,stamina);}
  const m=arena(id),foreign=CLASS_IDS.flatMap(other=>other===id?[]:CLASSES[other].skills);for(const skill of foreign){assert(!m.startAttack(skill));assert(!m.requestAttack(skill));}assert.equal(m.player.stamina,100);
  m.startAttack();step(m,.38);for(const skill of foreign)assert(!m.requestAttack(skill));assert.equal(m.player.queued,null);
  m.player.action=null;m.player.stamina=0;for(const skill of CLASSES[id].skills)assert(!m.requestAttack(skill));
 });
 test(`${id}: save, restore, death retry and next expedition preserve class and gear`,()=>{
  const m=new Combat(),p=new Progression(),c=new Campaign(p,m);if(id!=='warrior')assert(p.chooseClass(id,m));p.data.items[0].upgrade=2;p.sync(m);const saved=p.snapshot(m);assert(validSave(saved));const restored=new Progression(saved),other=new Combat();restored.restore(other);assert.equal(other.player.classId,id);assert.equal(restored.data.items[0].upgrade,2);assert.equal(other.player.damageBonus,6);
  m.hurtPlayer(1000);c.retry();assert.equal(m.player.classId,id);p.nextRun(m);assert.equal(m.player.classId,id);assert.equal(p.data.items[0].upgrade,2);
 });
}
test('legacy saves migrate to Warrior without changing inventory, campaign or money',()=>{
 const m=new Combat(),p=new Progression();new Campaign(p,m);const old=p.snapshot(m);delete old.classId;assert(validSave(old));const p2=new Progression(old);assert.equal(p2.data.classId,'warrior');const {classId,...rest}=p2.data;assert.deepEqual(rest,old);for(const bad of ['goblin','__proto__',null,4,{}])assert(!validSave({...old,classId:bad}));
});
test('class switching is sanctuary-only and cannot heal, recharge or stack effects',()=>{
 const m=new Combat(),p=new Progression();m.player.hp=39;m.player.stamina=41;m.player.cooldowns.cleave=5;m.player.buff=6;const gear=structuredClone(p.data.items),money=p.data.gold;
 assert(p.chooseClass('mage',m));assert.equal(m.player.hp,39);assert.equal(m.player.stamina,41);assert.equal(m.player.buff,0);assert(Object.values(m.player.cooldowns).every(n=>n>=5));assert.deepEqual(p.data.items,gear);assert.equal(p.data.gold,money);
 m.player.z=-30;assert(!p.chooseClass('ninja',m));m.player.z=11;m.player.hp=0;assert(!p.chooseClass('ninja',m));m.player.hp=39;m.player.action={kind:'basic'};assert(!p.chooseClass('ninja',m));m.player.action=null;m.player.dodge=.2;assert(!p.chooseClass('ninja',m));
 m.player.dodge=0;m.projectiles.push({});assert(!p.chooseClass('ninja',m));m.projectiles=[];m.bombs.push({});assert(!p.chooseClass('ninja',m));m.bombs=[];m.enemies[0].poison=2;assert(!p.chooseClass('ninja',m));
});
test('fireball travels, bursts once and damages a nearby group, not the whole ray',()=>{
 const m=arena('mage'),target=foe(m,0,-24),near=foe(m,.65,-24),far=foe(m,0,-20);m.startAttack('firebolt');step(m,.35);assert.equal(m.projectiles.length,1);assert.equal(target.hp,100);step(m,.65);assert.equal(target.hp,62);assert.equal(near.hp,62);assert.equal(far.hp,100);assert.equal(m.projectiles.length,0);
});
test('projectiles and blast damage cannot cross a solid obstacle',()=>{
 const m=arena('mage',(x,z)=>z< -27),e=foe(m,0,-26.4);m.startAttack('firebolt');step(m,1);assert.equal(e.hp,100);assert.equal(m.projectiles.length,0);
 const n=arena('ninja',(x,z)=>z< -27),r=foe(n,0,-26);n.startAttack('venom');step(n,1);assert.equal(r.hp,100);assert(!r.poison);
});
test('Frost Nova hits behind the caster and slows movement, with boss resistance',()=>{
 const m=arena('mage'),e=foe(m,0,-32),boss=foe(m,2,-30,'boss');m.startAttack('frostnova');step(m,.4);assert.equal(e.hp,76);assert(e.slow>3.8);assert.equal(e.slowFactor,.45);assert.equal(boss.slowFactor,.725);assert.equal(boss.hp,boss.maxHp-24);step(m,4.5);assert.equal(e.slow,0);
});
test('Blink stops before obstacles, preserves facing and grants only brief immunity',()=>{
 const m=arena('mage',(x,z)=>z< -28.5);m.startAttack('blink');step(m,.2);assert(m.player.z< -28.5&&m.player.z> -28.7);assert(m.player.invulnerable>0);const hp=m.player.hp;m.hurtPlayer(20);assert.equal(m.player.hp,hp);step(m,.6);assert.equal(m.player.invulnerable,0);
 const open=arena('mage');open.startAttack('blink');step(open,.2);assert(Math.abs(open.player.z+25.5)<.01);
});
test('actual bridges, water and houses block Blink and Shadow Cut sweep paths',()=>{
 for(let region=0;region<4;region++){const {colliders}=sceneryLayout(region),canStand=(x,z)=>canStandIn(colliders,x,z);for(const [x,z,angle] of [[0,11,0],[-44,0,-Math.PI/2],[48,8,Math.PI/2],[20,20,-Math.PI/2]]){if(!canStand(x,z))continue;const end=tracePath(canStand,{x,z},angle,4.5);assert(canStand(end.x,end.z));assert(Math.hypot(end.x-x,end.z-z)<=4.501);}}
});
test('Shadow Cut closes distance and earns a back strike bonus only from behind',()=>{
 for(const [angle,damage] of [[0,60],[Math.PI,40]]){const m=arena('ninja'),e=foe(m,0,-27);e.angle=angle;m.startAttack('shadowcut');step(m,.17);assert.equal(e.hp,100-damage);assert(Math.abs(m.player.z+28.5)<.01);}
});
test('Venom applies four timed poison ticks, does not stack and cannot double-reward',()=>{
 const m=arena('ninja'),p=new Progression(),e=foe(m,0,-27);e.hp=e.maxHp=200;m.startAttack('venom');step(m,.6);const hp=e.hp;assert(e.poison>0);assert(m.projectiles.length===0);e.stagger=100;step(m,4.2);assert.equal(hp-e.hp,24);assert.equal(e.poison,0);
 e.hp=5;e.poison=2;e.poisonTick=.1;e.poisonDamage=6;step(m,.2);const events=m.consume();p.events(events,m);const gold=p.data.gold,xp=p.data.xp,dropCount=p.data.drops.length;p.events(events,m);assert.equal(p.data.gold,gold);assert.equal(p.data.xp,xp);assert.equal(p.data.drops.length,dropCount);assert.equal(events.filter(e=>e.type==='kill').length,1);
});
test('Smoke Veil reduces incoming damage and increases speed but is not invulnerability',()=>{
 const m=arena('ninja');m.startAttack('smoke');step(m,.5);assert(m.player.smoke>3.6);const hp=m.player.hp;m.hurtPlayer(20);assert.equal(m.player.hp,hp-10);const z=m.player.z;for(let i=0;i<60;i++)m.update(1/60,{x:0,z:1,aim:0});assert(Math.abs(m.player.z-z-3.4*1.35)<.01);step(m,4);assert.equal(m.player.smoke,0);
});
test('Forge Blow is a heavy interrupt, but cannot cancel a Warden windup',()=>{
 const m=arena('dwarf'),e=foe(m,0,-28);m.startAttack('forgeblow');step(m,.52);assert.equal(e.hp,40);assert(e.stagger>1.3);
 const n=arena('dwarf'),boss=foe(n,0,-28,'boss');boss.phase='windup';boss.timer=1.5;boss.attackKind='slam';n.startAttack('forgeblow');step(n,.52);assert.equal(boss.phase,'windup');assert.equal(boss.hp,boss.maxHp-60);
});
test('Cinder Bomb has a visible fuse, fixed landing point, area damage and one explosion',()=>{
 const m=arena('dwarf'),e=foe(m,0,-24.5),far=foe(m,4,-24.5);m.startAttack('cinderbomb');step(m,.4);assert.equal(m.bombs.length,1);assert.equal(m.bombs[0].radius,2.6);assert.equal(e.hp,100);step(m,.7);assert.equal(e.hp,100);step(m,.4);assert.equal(e.hp,48);assert.equal(far.hp,100);assert.equal(m.bombs.length,0);assert.equal(m.consume().filter(e=>e.type==='classImpact').length,1);
});
test('Iron Ward absorbs only 50 damage and expires without healing or stacking',()=>{
 const m=arena('dwarf');m.startAttack('ironward');step(m,.4);assert.equal(m.player.ward,50);const hp=m.player.hp;m.hurtPlayer(30);assert.equal(m.player.hp,hp);assert.equal(m.player.ward,20);step(m,.3);m.hurtPlayer(40);assert.equal(m.player.hp,hp-20);assert.equal(m.player.ward,0);
 const n=arena('dwarf');n.startAttack('ironward');step(n,6.6);assert.equal(n.player.ward,0);
});
test('dodge during a windup cancels the spell; death/reset clear transient hazards',()=>{
 for(const [id,skill] of [['mage','firebolt'],['dwarf','cinderbomb']]){const m=arena(id);m.startAttack(skill);assert(m.dodge(1,0));step(m,.7);assert.equal(m.projectiles.length+m.bombs.length,0);m.player.dodgeCD=0;m.player.cooldowns[skill]=0;m.player.stamina=100;m.startAttack(skill);step(m,.4);assert(m.projectiles.length+m.bombs.length>0);m.player.invulnerable=0;m.hurtPlayer(1000);assert.equal(m.projectiles.length+m.bombs.length,0);m.reset();assert.equal(m.player.ward,0);assert.equal(m.player.smoke,0);}
});
test('class follows an earned portal transition, and retry never restores old class',()=>{
 const m=new Combat(),p=new Progression(),c=new Campaign(p,m);assert(p.chooseClass('ninja',m));m.damageShard(251);step(m,1.5);for(const e of m.enemies)m.damageEnemy(e,10000);p.events(m.consume(),m);assert(c.observe());Object.assign(m.player,EXIT);assert(c.travel(1));assert.equal(m.player.classId,'ninja');assert.equal(p.data.classId,'ninja');c.retry();assert.equal(m.player.classId,'ninja');assert(validSave(p.snapshot(m)));
});
for(const [id,height] of [['mage',1.85],['ninja',1.78],['dwarf',1.4]])test(`${id}: import-free model has grounded, finite animated joints and bounded geometry`,async()=>{
 const source=await fs.readFile(`game/assets/${id}.js`,'utf8');assert(!/^\s*import\b/m.test(source));const {default:generate}=await import(`../game/assets/${id}.js`),root=generate(T),box=new T.Box3(),v=new T.Vector3();let tris=0;
 root.updateMatrixWorld(true);root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;tris+=(o.geometry.index?.count||p.count)/3;for(let i=0;i<p.count;i++)box.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));});assert(Math.abs(box.min.y)<1e-6);assert(Math.abs(box.getCenter(v).x)<1e-6);assert(Math.abs(box.getCenter(v).z)<1e-6);assert(Math.abs(box.getSize(v).y-height)<1e-6);assert(tris<20000);
 const m=new Combat(),animate=createHeroMotion(root);for(const age of [0,.07,.16,.25,.34]){Object.assign(m.player,{dodge:Math.max(0,.34-age),dodgeAge:age,dodgeX:1,dodgeZ:0,angle:0});animate(m.player,1);root.updateMatrixWorld(true);root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));for(const name of ['leftFoot','rightFoot']){const foot=root.userData.joints[name];const bounds=new T.Box3().setFromObject(foot);assert(bounds.min.y>-.018,`${id} ${name} grounded through dodge: ${bounds.min.y}`);}}
});
