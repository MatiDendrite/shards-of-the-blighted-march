import test from 'node:test';
import assert from 'node:assert/strict';
import {Combat} from '../game/src/combat-model.js';
import {Progression,validSave,saveStore} from '../game/src/progression.js';
import {Campaign} from '../game/src/campaign.js';
import {CLASS_IDS} from '../game/src/class-data.js';
import {CameraOrbit,cameraRelative} from '../game/src/camera-orbit.js';

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
test('held forward movement follows the smoothed camera every tick without releasing',()=>{
 const c=new CameraOrbit(),m=new Combat();m.enemies=[];Object.assign(m.player,{x:0,z:-25});c.drag(-210,0);
 for(let i=0;i<90;i++){
  c.advance(1/60);const v=cameraRelative(0,-1,c.yaw),before={x:m.player.x,z:m.player.z};
  m.update(1/60,{...v,attack:false,aim:Math.atan2(v.x,v.z)});
  close(m.player.x-before.x,-Math.sin(c.yaw)*3.4/60);close(m.player.z-before.z,-Math.cos(c.yaw)*3.4/60);
 }
 assert(m.player.x<-4);close(c.yaw,1.26);
});
test('held joystick diagonals retain magnitude and screen direction throughout a full orbit',()=>{
 for(let yaw=-Math.PI;yaw<=Math.PI;yaw+=.1){
  const v=cameraRelative(.3,-.4,yaw);close(Math.hypot(v.x,v.z),.5);
  close(v.x*Math.cos(yaw)-v.z*Math.sin(yaw),.3);close(v.x*Math.sin(yaw)+v.z*Math.cos(yaw),-.4);
 }
});
test('camera reset updates held movement and directional dodge without a neutral input',()=>{
 const c=new CameraOrbit(),m=new Combat();c.yaw=c.targetYaw=1.8;c.reset();
 for(let i=0;i<90;i++){
  c.advance(1/60);const v=cameraRelative(0,-1,c.yaw);close(v.x,-Math.sin(c.yaw));close(v.z,-Math.cos(c.yaw));
  if(i===12){assert(m.dodge(v.x,v.z));close(m.player.dodgeX,v.x);close(m.player.dodgeZ,v.z);}
 }
 const final=cameraRelative(0,-1,c.yaw);close(final.x,0);close(final.z,-1);
});
