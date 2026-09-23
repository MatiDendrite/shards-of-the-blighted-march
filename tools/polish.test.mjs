import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Combat,enemyAttack,windupProgress} from '../game/src/combat-model.js';
import {attackPose} from '../game/src/combat-motion.js';
import {createCombatEffects} from '../game/src/combat-effects.js';
import {Progression,validSave,itemPower} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
import {journeyGuide,questSteps,directionTo} from '../game/src/journey-guide.js';
import hero from '../game/assets/wanderer.js';
import wolf from '../game/assets/blighted_wolf.js';
import warden from '../game/assets/fallen_warden.js';

const step=(m,t,input={x:0,z:0,attack:false,aim:0})=>{for(let i=0;i<Math.ceil(t*60);i++)m.update(1/60,input);};
const setup=()=>{const m=new Combat(),p=new Progression(),c=new Campaign(p,m);p.restore(m);return{m,p,c};};
test('one late skill input buffers through recovery, paying only when it starts',()=>{
 const m=new Combat();m.startAttack();assert(!m.requestAttack('slam'));step(m,.38);const stamina=m.player.stamina;assert(m.requestAttack('cleave',.7));assert.equal(m.player.stamina,stamina);step(m,.18);assert.equal(m.player.action.kind,'cleave');assert.equal(m.player.action.angle,.7);assert.equal(m.skillsUsed.cleave,1);assert.equal(m.player.queued,null);
});
test('buffer does not survive dodge, death, reset, or explicit pause/input clear',()=>{
 for(const clear of [m=>m.dodge(1,0),m=>m.hurtPlayer(999),m=>m.reset(),m=>m.clearBufferedInput()]){const m=new Combat();m.startAttack();step(m,.38);assert(m.requestAttack('cleave'));clear(m);assert.equal(m.player.queued,null);}
});
test('buffer rechecks stamina and cooldown and cannot bypass skill cost',()=>{
 const m=new Combat();m.startAttack();step(m,.38);m.requestAttack('slam');m.player.stamina=0;step(m,.2);assert.equal(m.skillsUsed.slam,0);assert.equal(m.player.action,null);assert.equal(m.player.queued,null);
 m.player.stamina=100;m.startAttack();step(m,.38);m.player.cooldowns.cleave=3;m.requestAttack('cleave');step(m,.2);assert.equal(m.skillsUsed.cleave,0);
});
test('hit feedback identifies finishers and interruption without changing damage rules',()=>{
 const m=new Combat();m.player.x=0;m.player.z=-30;m.shard.z=-50;m.enemies=[];m.spawn('raider',0,-28.5);const e=m.enemies[0];e.phase='windup';e.timer=.9;
 m.damageEnemy(e,22,.2,{heavy:true,finisher:true});const event=m.consume().find(e=>e.type==='hit');assert.equal(event.amount,22);assert(event.interrupted&&event.heavy&&event.finisher);assert.equal(event.target,'raider');assert.equal(e.hp,78);
});
test('boss and wolf telegraph descriptors expose exact damage reach, angle and duration',()=>{
 const wolf=enemyAttack({kind:'wolf'}),sweep=enemyAttack({kind:'boss',attackKind:'sweep'}),slam=enemyAttack({kind:'boss',attackKind:'slam'});
 assert.equal(wolf.arc,1);assert.equal(wolf.range,1.4);assert.equal(sweep.arc,2.3);assert.equal(slam.arc,Math.PI*2);assert.equal(slam.range,4.5);
 assert.equal(windupProgress({kind:'boss',attackKind:'slam',timer:1.6}),0);assert.equal(windupProgress({kind:'boss',attackKind:'slam',timer:.8}),.5);assert.equal(windupProgress({kind:'boss',attackKind:'slam',timer:-.1}),1);
});
test('strike pose cuts during the actual active window and settles completely',()=>{
 const a={windup:.2,active:.1,recovery:.3,combo:1};assert.equal(attackPose({...a,age:.1}).cut,0);assert(Math.abs(attackPose({...a,age:.25}).cut-.5)<1e-6);const end=attackPose({...a,age:.61});assert.equal(end.lift,0);assert.equal(end.twist,0);assert.equal(end.thrust,0);
});
test('impact particles stay bounded and do not advance while paused',()=>{
 const fx=createCombatEffects(new T.Scene());for(let n=0;n<30;n++)fx.burst({x:n,z:0,heavy:true,target:'boss'});assert.equal(fx.active,96);fx.update(0);assert.equal(fx.active,96);fx.update(1);assert.equal(fx.active,0);fx.burst({x:0,z:0});fx.clear();assert.equal(fx.active,0);
});
test('guidance follows actual field guards, then shard, then surviving reinforcements',()=>{
 const {m,c}=setup();assert.equal(journeyGuide(c).kind,'guardian');m.enemies.slice(0,2).forEach(e=>e.hp=0);m.enemies.slice(2).forEach(e=>{e.x=30;e.z=-55;});assert.equal(journeyGuide(c).kind,'shard');
 m.damageShard(999);step(m,1.5);m.enemies.forEach(e=>e.hp=0);const last=m.enemies.at(-1);last.hp=10;last.x=37;last.z=42;const guide=journeyGuide(c);assert.equal(guide.kind,'guardian');assert.deepEqual(guide.target,{x:37,z:42});
});
test('explosion and low health take priority over normal journey directions',()=>{
 const {m,c}=setup();m.player.hp=10;assert.equal(journeyGuide(c).kind,'recover');m.shard.blast=.5;assert.equal(journeyGuide(c).kind,'danger');m.player.hp=0;assert.equal(journeyGuide(c).kind,'retry');
});
test('completed quest guidance orders loot, stronger equipment, then the next road',()=>{
 const {m,p,c}=setup();c.data.cleared[0]=true;p.data.drops.push({id:'review',x:3,z:4,gold:1});assert.equal(journeyGuide(c).kind,'loot');p.data.drops=[];const item=p.makeItem('sword','rare');p.data.items.push(item);assert.equal(journeyGuide(c).kind,'gear');p.equip(item.id,m);assert.equal(journeyGuide(c).kind,'travel');assert(questSteps(c).at(-1).done);
});
test('compass directions follow north-up world coordinates',()=>{
 const p={x:0,z:0};for(const [x,z,dir] of [[0,-1,'N'],[1,-1,'NE'],[1,0,'E'],[1,1,'SE'],[0,1,'S'],[-1,1,'SW'],[-1,0,'W'],[-1,-1,'NW']])assert.equal(directionTo(p,{x,z}),dir);
});
test('later region loot is stronger; old items are not rewritten and saves remain valid',()=>{
 const {m,p}=setup(),before=structuredClone(p.data.items);assert.equal(itemPower(p.makeItem('sword','rare',2)),10);assert.equal(itemPower(p.makeItem('armor','rare',3)),14);assert.deepEqual(p.data.items,before);assert(validSave(p.snapshot(m)));
});
test('shard guarantees current weapon style and never duplicates its reward',()=>{
 const {m,p}=setup();m.equip('spear');m.damageShard(999);step(m,1.5);const events=m.consume();p.events(events,m);const loot=p.data.drops.find(d=>d.id.endsWith('shard'));assert.equal(loot.item.kind,'spear');assert.equal(loot.item.rarity,'rare');p.events(events,m);assert.equal(p.data.drops.filter(d=>d.id.endsWith('shard')).length,1);assert(validSave(p.snapshot(m)));
});
for(const [name,generate,maxTris,required] of [['wanderer',hero,18000,['torso','head','leftLeg','rightLeg','leftShin','rightShin','leftArm','rightArm']],['wolf',wolf,8000,['head','leftFront','rightFront','leftRear','rightRear','tail']],['warden',warden,12000,['torso','head','leftLeg','rightLeg','leftShin','rightShin','leftArm','rightArm']]])test(`${name}: detailed import-free articulated model stays grounded and in budget`,()=>{
 const root=generate(T),bounds=new T.Box3(),v=new T.Vector3();let triangles=0;assert(root.isGroup);root.updateMatrixWorld(true);
 root.traverse(n=>{if(!n.isMesh)return;assert(n.material.isMeshStandardMaterial);assert(!n.material.map);const p=n.geometry.attributes.position;triangles+=(n.geometry.index?.count||p.count)/3;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(n.matrixWorld);assert(v.toArray().every(Number.isFinite));bounds.expandByPoint(v);}});
 assert(triangles<maxTris,`${triangles} triangles`);assert(Math.abs(bounds.min.y)<.001);const center=bounds.getCenter(new T.Vector3());assert(Math.abs(center.x)<.001&&Math.abs(center.z)<.001);for(const key of required)assert(root.userData.joints[key]?.isGroup,key);
});
