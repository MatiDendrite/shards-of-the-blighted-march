import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createHeroMotion} from '../game/src/combat-motion.js';
import {createLocomotionSampler,motionStyle,footfall} from '../game/src/hero-locomotion.js';
import {heroActionPose} from '../game/src/hero-actions.js';
import {equipHeroWeapon,HERO_GRIP,WEAPON_GRIPS} from '../game/src/hero-equipment.js';
import {Combat,WEAPONS} from '../game/src/combat-model.js';
import {CLASSES,ARCANE_BOLT,SKILLS} from '../game/src/class-data.js';
import {bakeStatic} from '../game/lib/assetlib.js';
const generators={};for(const [id,file]of [['warrior','wanderer'],['mage','mage'],['ninja','ninja'],['dwarf','dwarf']])generators[id]=(await import(`../game/assets/${file}.js`)).default;
const snap=root=>Object.values(root.userData.joints).map(n=>[...n.position.toArray(),...n.quaternion.toArray()]);
const assets={};for(const [id,file]of [['sword','iron_sword'],['axe','bearded_axe'],['spear','ash_spear']]){const mesh=bakeStatic((await import(`../game/assets/${file}.js`)).default(T)),b=new T.Box3().setFromObject(mesh,true),c=b.getCenter(new T.Vector3());mesh.position.set(-c.x,-b.min.y,-c.z);const root=new T.Group();root.add(mesh);assets[id]=root;}

for(const id of Object.keys(CLASSES)){
 test(`${id}: movement follows real distance, stops at a wall, and cannot advance during pause`,()=>{
  const sample=createLocomotionSampler(motionStyle(id)),p={x:0,z:0,angle:0,gait:1,moving:true,region:0};sample(p,0);
  for(let n=1;n<=90;n++){p.z+=3.4/60;sample(p,n/60);}const moving={...sample(p,1.5)};assert(moving.gait>.99);assert(moving.speed>3);const phase=moving.phase;
  for(let n=0;n<100;n++)assert.deepEqual(sample(p,1.5),moving);
  for(let n=91;n<=150;n++)sample(p,n/60);assert.equal(sample(p,2.5).phase,phase);assert(sample(p,2.5).gait<.001);
  p.z+=4.5;assert.equal(sample(p,2.52).gait,0,'teleport clears visual momentum');assert.equal(sample(p,0).gait,0,'time reset clears visual momentum');
 });
 test(`${id}: planted stride feet stay level, moving forward, backward and sideways never buries soles`,()=>{
  for(const [dx,dz]of [[0,1],[0,-1],[1,0]]){
   const root=generators[id](T),animate=createHeroMotion(root,{classId:id}),p={classId:id,x:0,z:0,angle:0,gait:1,walk:0,dodge:0};root.updateMatrixWorld(true);const scale=root.userData.joints.leftLeg.parent.getWorldScale(new T.Vector3()),sample=createLocomotionSampler(motionStyle(id),scale.z),last={};let contacts=0,maxSlip=0;
   animate(p,0);sample(p,0);
   for(let n=1;n<=180;n++){
    const t=n/60;p.x+=dx*3.4/60;p.z+=dz*3.4/60;root.position.set(p.x,0,p.z);animate(p,t);const motion=sample(p,t);root.updateMatrixWorld(true);
    for(const [side,offset]of [['left',0],['right',.5]]){
     const foot=root.userData.joints[side+'Foot'],world=foot.getWorldPosition(new T.Vector3()),planted=footfall(motion.phase+offset).planted,bounds=new T.Box3().setFromObject(foot,true);
     assert(bounds.min.y>-.002,`${id} buried ${side}: ${bounds.min.y}`);const q=foot.getWorldQuaternion(new T.Quaternion());assert(Math.abs(q.x)<1e-6&&Math.abs(q.z)<1e-6);
     if(n>90&&planted&&last[side]?.planted){contacts++;maxSlip=Math.max(maxSlip,Math.hypot(world.x-last[side].world.x,world.z-last[side].world.z));}last[side]={planted,world};
    }
   }
   assert(contacts>20);assert(maxSlip<.004,`${id} contact slip ${maxSlip}`);
  }
 });
 test(`${id}: all skills and weapon combos keep hands attached, preserve state and settle fully`,()=>{
  const root=generators[id](T),animate=createHeroMotion(root,{classId:id}),j=root.userData.joints,mount=new T.Group();mount.name='heroWeaponMount';j.rightForearm.add(mount);
  const p={classId:id,angle:0,walk:0,gait:0,dodge:0};animate(p,0);const neutral=snap(root),actions=[...Object.entries(WEAPONS).flatMap(([weapon,d])=>[1,2,3].map(combo=>({...d,kind:'basic',weapon,combo}))),...CLASSES[id].skills.map(kind=>({...SKILLS[kind],kind,weapon:'sword'}))];
  if(id==='mage')actions.push({...ARCANE_BOLT,kind:'basic',weapon:'sword',combo:1});
  for(const base of actions){const weapon=equipHeroWeapon(mount,assets[base.weapon],base.weapon),duration=base.windup+base.active+base.recovery;
   for(let i=0;i<=16;i++){
    p.action={...base,age:duration*i/16};const before=structuredClone(p);animate(p,0);root.updateMatrixWorld(true);const grip=weapon.children[0].localToWorld(new T.Vector3(...WEAPON_GRIPS[base.weapon])),palm=j.rightForearm.localToWorld(new T.Vector3(HERO_GRIP.x,HERO_GRIP.y,HERO_GRIP.z));assert(grip.distanceTo(palm)<1e-6);
    for(const side of ['left','right'])assert(new T.Box3().setFromObject(j[side+'Foot'],true).min.y>-.002);
    assert(Math.abs(j.head.position.distanceTo(j.torso.position)-.53)<1e-5);root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));const paused=snap(root);animate(p,0);assert.deepEqual(snap(root),paused);assert.deepEqual(p,before);
   }
   assert.deepEqual(snap(root),neutral,`${id} ${base.kind} did not recover`);
  }
 });
 test(`${id}: directional dodges are bounded and interrupted actions cannot leak a pose`,()=>{
  const root=generators[id](T),animate=createHeroMotion(root,{classId:id}),p={classId:id,angle:0,gait:0,walk:0,dodge:0};animate(p,0);const neutral=snap(root);
  for(const [x,z]of [[1,0],[-1,0],[0,1],[0,-1]])for(const age of [0,.05,.12,.2,.29,.339]){
   Object.assign(p,{dodge:.34-age,dodgeAge:age,dodgeX:x,dodgeZ:z,action:{...SKILLS[CLASSES[id].skills[0]],kind:CLASSES[id].skills[0],age:.12}});animate(p,0);root.updateMatrixWorld(true);
   for(const side of ['left','right'])assert(new T.Box3().setFromObject(root.userData.joints[side+'Foot'],true).min.y>-.002);const pose=snap(root);p.action=null;animate(p,0);assert.deepEqual(snap(root),pose,'cancelled attack must not affect dodge');
  }
  p.dodge=0;p.action=null;animate.reset();animate(p,0);assert.deepEqual(snap(root),neutral);
 });
}

test('spell, throw and buff releases coincide with the actual activation boundary',()=>{
 for(const [id,info]of Object.entries(CLASSES))for(const kind of info.skills){const a={...SKILLS[kind],kind};if(!['projectile','bomb','frost','blink','lunge','ward','smoke'].includes(a.effect)&&kind!=='cry')continue;
  const release=heroActionPose(id,{...a,age:a.windup}),active=heroActionPose(id,{...a,age:a.windup+a.active*.8});assert.equal(release.weight,1);for(const key of ['rightArm','leftArm','rightForearm','leftForearm','body'])assert.deepEqual(release[key],active[key]);
 }
});

test('visual sampling cannot change combat outcomes, timing, cooldowns or resource costs',()=>{
 for(const id of Object.keys(CLASSES)){
  const a=new Combat(),b=new Combat(),motion=createHeroMotion(generators[id](T),{classId:id});a.player.classId=b.player.classId=id;
  for(let i=0;i<240;i++){
   if(i%50===0)for(const m of [a,b]){m.player.stamina=100;m.startAttack(CLASSES[id].skills[Math.floor(i/50)%3],0);}
   const input={x:i<120?.35:0,z:0,aim:0};a.update(1/60,input);b.update(1/60,input);motion(b.player,b.time);motion(b.player,b.time);assert.deepEqual(b.player,a.player);assert.deepEqual(b.telemetry(),a.telemetry());assert.deepEqual(b.events,a.events);
  }
 }
});
