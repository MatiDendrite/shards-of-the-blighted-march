import {travelFixture} from './travel-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Combat,DODGE_DURATION} from '../game/src/combat-model.js';
import {Progression,validSave} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
import {FIELD_PATROLS,emptyEncounter} from '../game/src/campaign-data.js';
import {dodgePose,createHeroMotion} from '../game/src/combat-motion.js';
import {journeyGuide,questSteps} from '../game/src/journey-guide.js';
import wanderer from '../game/assets/wanderer.js';

const setup=()=>{const m=new Combat(),p=new Progression(),c=new Campaign(p,m);p.restore(m);return{m,p,c};};
const flush=s=>{s.p.events(s.m.consume(),s.m);s.c.observe();};
const explode=s=>{s.m.damageShard(999);s.m.player.x=0;s.m.player.z=11;for(const e of s.m.guardians)e.stagger=100;for(let i=0;i<90;i++)s.m.update(1/60);flush(s);};
const legacy=()=>{const s=setup(),save=s.p.snapshot(s.m);delete save.encounterVersion;return save;};
const completed=()=>({...emptyEncounter(),claimed:[1,2,3,4,5,6,7,8],shardReward:true,world:{shardHp:0,exploded:true}});

for(let region=0;region<3;region++)test(`region ${region}: twenty initial enemies plus four stable wave IDs; every kill gates travel`,()=>{
 const s=setup();s.p.data.campaign={region,cleared:[region>0,region>1,false,false],regions:[null,null,null,null]};s.m.reset(region);
 assert.equal(s.m.guardians.length,20);assert.equal(s.m.requiredKills,24);assert.equal(s.m.guardians.filter(e=>e.patrol).length,16);
 s.m.damageShard(999);assert.equal(s.m.guardians.length,24);assert.deepEqual(s.m.guardians.map(e=>e.id).sort((a,b)=>a-b),Array.from({length:24},(_,i)=>i+1));
 for(const e of s.m.guardians)e.stagger=100;for(let i=0;i<90;i++)s.m.update(1/60);flush(s);
 for(const e of s.m.guardians.filter(e=>e.id<=8))s.m.damageEnemy(e,999);flush(s);
 assert.equal(s.m.kills,8);assert(!s.m.complete);assert(!s.c.data.cleared[region]);assert(!s.c.travel(region+1));
 assert.match(journeyGuide(s.c).tip,/16 guardians remain/);assert.match(questSteps(s.c)[2].text,/8 \/ 24/);assert(!questSteps(s.c)[0].done);
 for(const e of s.m.guardians.filter(e=>e.id>8&&e.id!==24))s.m.damageEnemy(e,999);flush(s);
 assert.equal(s.m.kills,23);assert(!s.c.data.cleared[region]);assert(!s.c.travel(region+1));
 s.m.damageEnemy(s.m.guardians.find(e=>e.id===24),999);flush(s);
 assert(s.m.complete);assert(s.c.data.cleared[region]);assert(travelFixture(s.c,region+1));
});
test('missing reinforcements cannot produce a false completion; boss remains one enemy',()=>{
 const m=new Combat();m.shard.exploded=true;m.guardians.forEach(e=>e.hp=0);assert(!m.complete);
 m.reset(3);assert.equal(m.guardians.length,1);assert.equal(m.requiredKills,1);m.damageEnemy(m.guardians[0],m.guardians[0].maxHp);assert(m.complete);
});
test('last patrol and all twenty-five drops survive reload; no duplicated rewards',()=>{
 const s=setup();explode(s);for(const e of s.m.guardians)if(e.id!==24)s.m.damageEnemy(e,999);flush(s);
 const saved=s.p.snapshot(s.m);assert(validSave(saved));const p=new Progression(saved),m=new Combat(),c=new Campaign(p,m);p.restore(m);
 assert.equal(m.kills,23);assert(!m.complete);assert.deepEqual(m.telemetry().enemies.map(e=>e.id),[24]);
 m.damageEnemy(m.guardians.find(e=>e.id===24),999);const events=m.consume();p.events(events,m);p.events(events,m);assert(c.observe());assert(!c.observe());
 assert.equal(p.data.drops.length,25);assert.equal(p.data.claimed.length,24);assert(validSave(p.snapshot(m)));
});
test('old partial save keeps original guard/wave kills and loot, and adds living patrols',()=>{
 const old=legacy();Object.assign(old,{claimed:[1,5],world:{shardHp:150,exploded:false},drops:[{id:'1-0-5',x:2,z:-43,gold:12,ore:0,item:null}]});
 assert(validSave(old));const original=structuredClone(old),p=new Progression(old),m=new Combat();p.restore(m);
 assert.deepEqual(old,original);assert.equal(m.guardians.length,22);assert.equal(m.kills,2);assert.equal(m.guardians.find(e=>e.id===5).hp,0);
 assert(m.guardians.filter(e=>e.patrol).every(e=>e.hp>0));assert.deepEqual(p.data.drops,old.drops);assert(validSave(p.snapshot(m)));
});
test('completed legacy current and archived regions keep roads open without free rewards',()=>{
 const old=legacy();old.campaign={region:2,cleared:[true,true,true,false],regions:[completed(),completed(),null,null]};Object.assign(old,completed());assert(validSave(old));
 const p=new Progression(old),m=new Combat(),c=new Campaign(p,m);p.restore(m);
 assert(m.complete);assert.deepEqual(p.data.claimed,Array.from({length:24},(_,i)=>i+1));
 for(const state of p.data.campaign.regions.filter(Boolean))assert.equal(state.claimed.length,24);
 for(const field of ['gold','ore','xp','level','serial','items','drops'])assert.deepEqual(p.data[field],old[field]);
 const upgraded=p.snapshot(m);assert(validSave(upgraded));assert.deepEqual(new Progression(upgraded).data,upgraded);
 assert(travelFixture(c,0));assert(m.complete);assert(travelFixture(c,3));assert.equal(m.guardians.length,1);assert(validSave(p.snapshot(m)));
});
test('legacy saves without campaign and completed boss saves migrate too',()=>{
 const old=legacy();delete old.campaign;Object.assign(old,completed());assert(validSave(old));let p=new Progression(old),m=new Combat();new Campaign(p,m);p.restore(m);assert(m.complete);assert(validSave(p.snapshot(m)));
 const boss=legacy();boss.campaign={region:3,cleared:[true,true,true,true],regions:[completed(),completed(),completed(),null]};Object.assign(boss,emptyEncounter(3),{claimed:[1]});assert(validSave(boss));p=new Progression(boss);m=new Combat();const c=new Campaign(p,m);p.restore(m);assert(c.complete);assert.deepEqual(p.data.claimed,[1]);assert(validSave(p.snapshot(m)));
});
test('eight kills before the legacy blast finishes do not bypass new patrols',()=>{
 const old=legacy();Object.assign(old,completed());old.world.exploded=false;const p=new Progression(old),m=new Combat();p.restore(m);assert.equal(m.kills,8);assert(!m.complete);assert(m.guardians.filter(e=>e.patrol).every(e=>e.hp>0));
});
test('schema bounds expanded IDs/drop count and rejects unknown encounter versions',()=>{
 const s=setup();explode(s);for(const e of s.m.guardians)s.m.damageEnemy(e,999);flush(s);const save=s.p.snapshot(s.m);assert(validSave(save));
 for(const mutate of [d=>d.encounterVersion=99,d=>d.encounterVersion=null,d=>d.encounterVersion='2',d=>delete d.encounterVersion,d=>d.claimed.push(25),d=>d.drops.push({...d.drops[0],id:'extra'})]){const bad=structuredClone(save);mutate(bad);assert(!validSave(bad));}
});
test('patrol rewards are once-only resources; all expedition equipment fits the satchel',()=>{
 const s=setup();for(let region=0;region<4;region++){
  if(region<3)explode(s);for(const e of s.m.guardians)s.m.damageEnemy(e,e.maxHp);flush(s);
  for(const id of FIELD_PATROLS.map(e=>e.id)){const drop=s.p.data.drops.find(d=>d.id===`1-${region}-${id}`);if(region<3){assert(drop.gold>0);assert.equal(drop.item,null);}}
  for(const drop of [...s.p.data.drops]){Object.assign(s.m.player,{x:drop.x,z:drop.z});s.p.collect(s.m.player);}
  assert.equal(s.p.data.drops.length,0);assert(s.p.data.items.length<=24);assert(validSave(s.p.snapshot(s.m)));if(region<3)assert(travelFixture(s.c,region+1));
 }
 assert.equal(s.p.data.items.length,23);assert(s.c.complete);
});

test('directional dodge pose has a smooth takeoff/recovery and turns with facing',()=>{
 const p={angle:0,dodge:1,dodgeAge:0,dodgeX:0,dodgeZ:1};assert.equal(dodgePose(p).weight,0);
 p.dodgeAge=.12;assert(dodgePose(p).pitch>.4);assert(Math.abs(dodgePose(p).roll)<1e-8);
 p.dodgeZ=-1;assert(dodgePose(p).pitch<-.4);p.dodgeZ=0;p.dodgeX=1;assert(dodgePose(p).roll<-.3);
 p.angle=Math.PI/2;assert(dodgePose(p).pitch>.4);assert(Math.abs(dodgePose(p).side)<1e-8);
 p.dodgeAge=DODGE_DURATION;assert.equal(dodgePose(p).weight,0);p.dodgeAge=.12;p.dodge=0;assert.equal(dodgePose(p).weight,0);
});
test('articulated dodge keeps feet above ground and helmet attached in every direction',()=>{
 const hero=wanderer(T),animate=createHeroMotion(hero),j=hero.userData.joints,box=new T.Box3();
 for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1],[Math.SQRT1_2,Math.SQRT1_2]])for(const age of [.01,.06,.12,.20,.28,.339])for(const walk of [0,1.5,3,4.5]){
  animate({angle:0,dodge:1,dodgeAge:age,dodgeX:x,dodgeZ:z,walk,gait:walk?1:0},0);hero.updateMatrixWorld(true);
  for(const foot of [j.leftFoot,j.rightFoot]){box.setFromObject(foot,true);assert(box.min.y>=-.006,`buried foot: ${x},${z},${age}: ${box.min.y}`);assert(Math.abs(foot.getWorldQuaternion(new T.Quaternion()).x)<1e-7);}
  assert(j.head.position.distanceTo(j.torso.position)<.56);assert.equal(hero.rotation.x,0);assert.equal(hero.rotation.z,0);
 }
});
test('paused dodge poses are repeatable and finish/death/reset leaves no stale lean',()=>{
 const hero=wanderer(T),animate=createHeroMotion(hero),m=new Combat(),j=hero.userData.joints;
 const snapshot=()=>Object.values(j).map(n=>[...n.position.toArray(),...n.rotation.toArray()]);
 animate(m.player,0);const neutral=snapshot();assert(m.dodge(1,0));m.update(.12);animate(m.player,m.time);const dodge=snapshot();assert.notDeepEqual(dodge,neutral);
 for(let n=0;n<50;n++)animate(m.player,m.time);assert.deepEqual(snapshot(),dodge);
 m.update(.3);animate(m.player,0);assert.deepEqual(snapshot(),neutral);
 m.reset();animate(m.player,0);assert.deepEqual(snapshot(),neutral);
 m.dodge(-1,0);m.update(.12);animate(m.player,m.time);m.player.invulnerable=0;m.hurtPlayer(999);animate(m.player,0);assert.deepEqual(snapshot(),neutral);
});
test('dodge distance, stamina and immunity remain bounded, including a long frame',()=>{
 for(const dt of [1/60,.1,.5]){const m=new Combat();m.enemies=[];m.player.angle=0;const z=m.player.z;assert(m.dodge(0,1));assert.equal(m.player.stamina,75);assert.equal(m.player.invulnerable,.24);assert(!m.dodge(1,0));while(m.player.dodge>0)m.update(dt);assert(Math.abs(m.player.z-z-7.8*DODGE_DURATION)<1e-8);assert.equal(m.player.dodgeAge,DODGE_DURATION);}
 const m=new Combat((x)=>x<=1);assert(m.dodge(1,0));for(let n=0;n<30;n++)m.update(1/60);assert(m.player.x<=1);
});
