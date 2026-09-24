import test from 'node:test';
import assert from 'node:assert/strict';
import {Combat} from '../game/src/combat-model.js';
import {Progression,validSave,saveStore} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
import {CLASS_IDS} from '../game/src/class-data.js';
import {CameraOrbit,CameraMovement,cameraRelative} from '../game/src/camera-orbit.js';

const close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function fixture(){
 const m=new Combat(),p=new Progression(),c=new Campaign(p,m);p.restore(m);
 Object.assign(p.data,{classId:'ninja',level:4,xp:12,gold:321,ore:9,potions:7,deaths:2});p.data.items[1].upgrade=3;m.player.weapon='axe';p.sync(m,true);
 m.damageEnemy(m.enemies[0],m.enemies[0].maxHp);p.events(m.consume(),m);
 return{m,p,c};
}
for(const classId of CLASS_IDS)for(const fresh of [false,true])test(`${fresh?'new journey':'expedition'} starts as ${classId} with the correct progress policy`,()=>{
 const {m,p,c}=fixture(),before=structuredClone(p.data);assert(p.beginJourney(m,{fresh,classId}));
 assert.equal(p.data.classId,classId);assert.equal(m.player.classId,classId);assert.equal(c.region,0);assert.deepEqual(c.data.cleared,[false,false,false,false]);assert.deepEqual(c.data.regions,[null,null,null,null]);
 assert.equal(m.kills,0);assert.equal(m.shard.hp,250);assert.equal(m.player.hp,m.player.maxHp);assert.equal(m.player.stamina,100);assert.equal(p.data.drops.length,0);assert.deepEqual(p.data.claimed,[]);
 if(fresh){const starter=new Progression().data;for(const key of ['items','level','xp','gold','ore','potions','deaths','run','weapon','loadout'])assert.deepEqual(p.data[key],starter[key]);}
 else{for(const key of ['items','level','xp','gold','ore','potions','deaths','weapon','loadout'])assert.deepEqual(p.data[key],before[key]);assert.equal(p.data.run,before.run+1);}
 const saved=p.snapshot(m);assert(validSave(saved));const restored=new Progression(saved),other=new Combat();restored.restore(other);assert.equal(other.player.classId,classId);assert.equal(other.player.weapon,fresh?'sword':'axe');assert.deepEqual(restored.data.items,p.data.items);
});
test('invalid class choices cannot reset or partially modify progress',()=>{
 for(const fresh of [false,true])for(const classId of ['goblin','',null,'__proto__']){
  const {m,p}=fixture(),save=p.snapshot(m),state=m.telemetry(),revision=p.revision;
  assert(!p.beginJourney(m,{fresh,classId}));assert.deepEqual(p.snapshot(m),save);assert.deepEqual(m.telemetry(),state);assert.equal(p.revision,revision);
 }
});
test('restarting clears transient effects, while nextRun retains the selected class',()=>{
 const {m,p}=fixture();Object.assign(m.player,{action:{},queued:{},dodge:.2,buff:6,smoke:4,ward:50,wardTime:6});m.projectiles.push({});m.bombs.push({});p.potionCD=5;p.fullDrop='old';p.messages.push('old');
 assert(p.nextRun(m));assert.equal(p.data.classId,'ninja');assert.equal(m.player.classId,'ninja');assert.equal(p.potionCD,0);assert.equal(p.fullDrop,null);
 assert.equal(m.player.action,null);assert.equal(m.player.queued,null);assert.equal(m.player.dodge+m.player.buff+m.player.smoke+m.player.ward,0);assert.equal(m.projectiles.length+m.bombs.length,0);assert(!p.messages.includes('old'));
});
test('unreadable saves stay protected until a deliberate new journey is allowed',()=>{
 let raw='unreadable';const store=saveStore({getItem:()=>raw,setItem:(k,value)=>raw=value});assert.equal(store.load(),null);
 const {m,p}=fixture();assert(!store.write(p.snapshot(m)));assert.equal(raw,'unreadable');p.beginJourney(m,{fresh:true,classId:'mage'});store.allowNew();assert(store.write(p.snapshot(m)));assert(validSave(JSON.parse(raw)));assert.equal(JSON.parse(raw).classId,'mage');
});
test('full orbit never depends on or modifies character facing',()=>{
 for(const facing of [-2,0,1.4,Math.PI]){
  const p={x:4,z:-25,angle:facing},c=new CameraOrbit();
  for(let i=0;i<=36;i++){c.yaw=i*Math.PI/18;const eye=c.position(p,1/60,false);close(p.angle,facing);close(Math.atan2(Math.sin(Math.atan2(eye.x-p.x,eye.z-p.z)-c.yaw),Math.cos(Math.atan2(eye.x-p.x,eye.z-p.z)-c.yaw)),0);}
 }
});
test('free look preserves held world movement, including after releasing the camera',()=>{
 const control=new CameraMovement();control.look(.3,true);const initial=cameraRelative(0,-1,.3);
 for(const yaw of [.3,1,2,3,-2,-1]){const v=control.move(0,-1,yaw);close(v.x,initial.x);close(v.z,initial.z);}
 control.look(-1,false);assert.deepEqual(control.move(0,-1,-1),initial);
 control.move(0,0,-1);assert.deepEqual(control.move(0,-1,-1),cameraRelative(0,-1,-1));
});
test('joystick diagonals retain their magnitude and adopt the new view after neutral',()=>{
 const c=new CameraMovement();c.look(1,true);const first=c.move(.3,-.4,1);const second=c.move(.3,-.4,2);assert.deepEqual(first,second);close(Math.hypot(first.x,first.z),.5);
 c.look(2,false);c.move(0,0,2);assert.deepEqual(c.move(.3,-.4,2),cameraRelative(.3,-.4,2));
});
test('paused, cancelled or reset controls cannot retain a stale movement lock',()=>{
 const c=new CameraMovement();c.look(1,true);c.move(0,-1,1);c.clear();assert(!c.looking);assert.equal(c.moveYaw,null);assert.deepEqual(c.move(0,-1,2),cameraRelative(0,-1,2));
 c.look(2,true);c.move(0,0,2);assert.deepEqual(c.move(0,-1,3),cameraRelative(0,-1,2));
});
