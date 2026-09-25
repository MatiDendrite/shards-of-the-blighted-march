// Spell effects are cosmetic: bounded pools, idle scenes cost nothing, and
// running every ability through them never changes the combat outcome.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Combat} from '../game/src/combat-model.js';
import {CLASSES} from '../game/src/class-data.js';
import {createSpellEffects} from '../game/src/spell-vfx.js';

const dt=1/60;
function arena(id){const m=new Combat(()=>true);m.enemies=[];m.events=[];m.shard.hp=0;m.shard.exploded=true;Object.assign(m.player,{classId:id,x:0,z:-35,angle:0,stamina:100});return m;}
function camera(){const c=new T.PerspectiveCamera(40,1,.1,100);c.position.set(0,9,-26);c.lookAt(0,0,-35);c.updateMatrixWorld(true);return c;}
const finite=scene=>{scene.traverse(o=>{for(const a of Object.values(o.geometry?.attributes||{}))assert(!a.array.some(Number.isNaN),`${o.name} has NaN`);if(o.isInstancedMesh)assert(!o.instanceMatrix.array.some(Number.isNaN),`${o.name} matrix NaN`);assert(o.position.toArray().every(Number.isFinite),`${o.name} position`);});};
const visibleDraws=scene=>{let n=0;scene.traverseVisible(o=>{if(o.isMesh)n++;});return n;};

function playAll(id,withFx){
 const m=arena(id),e=m.spawn('raider',0,-32);e.hp=e.maxHp=10000;const scene=new T.Scene(),fx=withFx?createSpellEffects(scene):null,cam=camera(),peak={draws:0,active:0};
 for(const kind of ['basic',...CLASSES[id].skills,'basic','basic']){
  m.player.stamina=100;for(const k in m.player.cooldowns)m.player.cooldowns[k]=0;assert(m.startAttack(kind,0,{x:0,z:-32}),`${id} ${kind} starts`);
  for(let i=0;i<90;i++){e.phase='recovery';e.timer=100;m.update(dt);const events=m.consume();if(fx){fx.process(events,m);fx.update(dt,m,cam);peak.draws=Math.max(peak.draws,visibleDraws(scene));peak.active=Math.max(peak.active,fx.active);if(i%15===0)finite(scene);}}
 }
 return{m,e,fx,scene,cam,peak};
}

for(const id of Object.keys(CLASSES))test(`${id}: every ability shows effects within the draw budget and changes no rules`,()=>{
 const run=playAll(id,true),plain=playAll(id,false);
 assert(run.peak.active>0,'abilities produce visible effects');
 assert(run.peak.draws<=12,`spell layer peak draw calls ${run.peak.draws}`);
 assert.equal(run.e.hp,plain.e.hp);assert.deepEqual([run.m.player.x,run.m.player.z,run.m.player.stamina],[plain.m.player.x,plain.m.player.z,plain.m.player.stamina]);
 for(let i=0;i<480;i++){run.e.phase='recovery';run.e.timer=100;run.m.update(dt);run.fx.process(run.m.consume(),run.m);run.fx.update(dt,run.m,run.cam);}
 assert.equal(run.fx.active,0,'effects expire');assert.equal(visibleDraws(run.scene),0,'idle layer is hidden');
});

test('particle pools stay bounded under spam and clear resets everything',()=>{
 const m=arena('mage'),scene=new T.Scene(),fx=createSpellEffects(scene),cam=camera();
 const events=[];for(let i=0;i<60;i++)events.push({type:'classImpact',kind:'firebolt',x:0,z:-33},{type:'classImpact',kind:'cinderbomb',x:1,z:-33,radius:2.6},{type:'swing',kind:'frostnova',x:0,z:-35,angle:0,range:3.8,arc:Math.PI*2});
 fx.process(events,m);fx.update(dt,m,cam);
 const glow=scene.getObjectByName('spell-glow'),smoke=scene.getObjectByName('spell-smoke');
 assert(glow.geometry.instanceCount<=640&&smoke.geometry.instanceCount<=200);
 assert(scene.getObjectByName('frost-spikes').count<=40&&scene.getObjectByName('spell-debris').count<=48);
 assert(scene.getObjectByName('spellEffects').children.filter(o=>o.name==='spell-wall').length<=4);
 fx.clear();assert.equal(fx.active,0);assert.equal(visibleDraws(scene),0);
});

test('projectiles, bombs, ward and status effects emit continuously while alive',()=>{
 const m=arena('dwarf'),scene=new T.Scene(),fx=createSpellEffects(scene),cam=camera(),e=m.spawn('raider',0,-32);
 Object.assign(m.player,{ward:50,wardTime:6,buff:3,smoke:2});Object.assign(e,{poison:3,slow:3});
 m.projectiles=[{id:1,kind:'firebolt',x:0,z:-34,angle:0},{id:2,kind:'venom',x:.5,z:-34,angle:0}];m.bombs=[{id:3,kind:'cinderbomb',x:1,z:-33,age:.4,fuse:1.1,radius:2.6}];
 for(let i=0;i<30;i++)fx.update(dt,m,cam);
 assert(scene.getObjectByName('iron-ward-shell').visible);assert(fx.active>40);
 m.projectiles=[];m.bombs=[];Object.assign(m.player,{ward:0,wardTime:0,buff:0,smoke:0});Object.assign(e,{poison:0,slow:0});
 for(let i=0;i<180;i++)fx.update(dt,m,cam);assert.equal(fx.active,0);assert(!scene.getObjectByName('iron-ward-shell').visible);
});
