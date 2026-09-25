import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import generate from '../game/assets/marchfolk.js';
import warden from '../game/assets/fallen_warden.js';
import axeModel from '../game/assets/bearded_axe.js';
import {applyActorSurfaces} from '../game/src/actor-surfaces.js';
import {prepareMarchfolk,createNpcMotion} from '../game/src/npc-actors.js';
import {createEnemyMotion,attachEnemyAxe} from '../game/src/enemy-motion.js';
import {mergeJoints} from '../game/src/actor-batching.js';
import {bakeStatic} from '../game/lib/assetlib.js';
const meshes=root=>{const list=[];root.traverse(o=>{if(o.isMesh)list.push(o);});return list;};
const triangles=root=>meshes(root).reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0);
const snapshot=root=>{const list=[];root.traverse(o=>{if(o.isGroup)list.push([o.name,...o.position.toArray(),...o.rotation.toArray(),...o.scale.toArray()]);});return list;};
const cast=()=>prepareMarchfolk(applyActorSurfaces(generate(T)));

test('constructor-built cast is grounded, bounded and has role-specific volumetric equipment',()=>{
 const bundle=generate(T);assert(triangles(bundle)<36000);const bounds=new T.Box3().setFromObject(bundle,true);assert(Math.abs(bounds.min.y)<.001);assert(Math.abs(bounds.getCenter(new T.Vector3()).x)<.001);
 for(const [role,prop] of [['smith','apron'],['merchant','skirt'],['elder','robe'],['guide','vest'],['raider','jerkin']]){
  const actor=bundle.getObjectByName(role),garment=actor.getObjectByName(`${role}-${prop}`);assert(garment?.isMesh);assert(triangles(actor)<8000);const size=new T.Box3().setFromObject(garment,true).getSize(new T.Vector3());assert(size.z>.15,'garments wrap the body');
  for(const mesh of meshes(actor)){assert(mesh.material.isMeshStandardMaterial);assert(!mesh.material.map);const p=mesh.geometry.attributes.position;assert([...p.array].every(Number.isFinite));if(mesh.material.vertexColors)assert.equal(mesh.geometry.attributes.color.count,p.count);}
 }
 assert(Math.abs(new T.Box3().setFromObject(bundle.getObjectByName('raider'),true).getSize(new T.Vector3()).y-1.85)<.001);
});

test('cast batching retains only useful pivots and all copies have independent poses',()=>{
 const actors=cast();for(const [role,root]of Object.entries(actors)){
  assert(meshes(root).length<=(role==='raider'?24:18),role);assert.equal(root.position.length(),0);const before=snapshot(root),copy=root.clone(true);
  if(role!=='raider'){const animate=createNpcMotion(copy,role);animate(1.55);assert.notDeepEqual(snapshot(copy),before);const paused=snapshot(copy);for(let i=0;i<100;i++)animate(1.55);assert.deepEqual(snapshot(copy),paused);animate(90);animate(1.55);assert.deepEqual(snapshot(copy),paused);}
  else for(const name of ['head','torso','leftArm','rightArm','rightForearm','leftLeg','rightLeg','leftShin','rightShin','mantle'])assert(copy.getObjectByName(name));
  assert.deepEqual(snapshot(root),before);copy.updateMatrixWorld(true);copy.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
 }
});

test('Borin strikes the workpiece, lifts the hammer and never moves the anvil',()=>{
 const smith=generate(T).getObjectByName('smith');smith.position.set(0,0,0);const animate=createNpcMotion(smith,'smith'),hammer=smith.getObjectByName('smith-hammer'),work=smith.getObjectByName('smith-workpiece'),anvil=smith.getObjectByName('smith-anvil');
 animate(0);smith.updateMatrixWorld(true);const hit=new T.Box3().setFromObject(hammer,true),target=new T.Box3().setFromObject(work,true),fixed=new T.Box3().setFromObject(anvil,true);assert(hit.min.y>=target.max.y-.015&&hit.min.y<target.max.y+.04);assert(hit.min.x<target.max.x&&hit.max.x>target.min.x);assert(hit.min.z<target.max.z&&hit.max.z>target.min.z);
 animate(1.55);smith.updateMatrixWorld(true);const raised=new T.Box3().setFromObject(hammer,true);assert(raised.min.y>hit.min.y+.45);assert.deepEqual(new T.Box3().setFromObject(anvil,true),fixed);animate(3.2);smith.updateMatrixWorld(true);assert.deepEqual(new T.Box3().setFromObject(hammer,true),hit);
});

test('new cast fabric palette baking preserves authored linear surface colours',()=>{
 const compact=generate(T),reference=generate(T);delete reference.userData.compactActorFabric;applyActorSurfaces(reference);applyActorSurfaces(compact);
 const a=meshes(reference),b=meshes(compact);assert.equal(a.length,b.length);
 for(let n=0;n<a.length;n++)if(a[n].material.name==='fabric'){
  const ca=a[n].geometry.attributes.color,cb=b[n].geometry.attributes.color;assert.equal(ca.count,cb.count);
  for(let i=0;i<ca.count;i++)for(const [channel,get]of [['r','getX'],['g','getY'],['b','getZ']])assert(Math.abs(a[n].material.color[channel]*ca[get](i)-b[n].material.color[channel]*cb[get](i))<1e-6);
 }
});

test('Warden keeps his original native height and budget with curved armour and thick cloth',()=>{
 const root=warden(T);assert(triangles(root)<12000);assert(Math.abs(new T.Box3().setFromObject(root,true).getSize(new T.Vector3()).y-2.615812932)<1e-5);
 for(const name of ['warden-cuirass','warden-tornMantle','warden-greave','warden-vambrace'])assert(root.getObjectByName(name)?.isMesh);
 const mantle=root.getObjectByName('warden-tornMantle');assert.equal(mantle.geometry.attributes.position.count,6*31*2);mergeJoints(applyActorSurfaces(root));assert(meshes(root).length<=30);
});

test('enemy axes remain in the palm through windups, recovery and paused frames',()=>{
 // Match ASSET's centred, grounded wrapper without browser-only module fetching.
 const baked=bakeStatic(axeModel(T)),bounds=new T.Box3().setFromObject(baked),center=bounds.getCenter(new T.Vector3());baked.position.set(-center.x,-bounds.min.y,-center.z);const prototype=new T.Group();prototype.add(baked);
 for(const [kind,actor]of [['raider',cast().raider],['boss',warden(T)]]){
  const axe=attachEnemyAxe(actor,prototype,kind),animate=createEnemyMotion(actor,kind),fore=actor.getObjectByName('rightForearm'),grip=new T.Vector3(-.15,.26,0),expected=new T.Vector3(0,kind==='boss'?-.414:-.316,.043);
  assert.equal(axe.parent,fore);
  for(const phase of ['idle','windup','recovery','idle'])for(const attackKind of ['sweep','slam']){
   const state={phase,attackKind,swing:phase==='idle'?.3:0,charge:.8,follow:.5},before=structuredClone(state);animate(2,state);actor.updateMatrixWorld(true);
   assert(axe.children[0].localToWorld(grip.clone()).distanceTo(fore.localToWorld(expected.clone()))<1e-6);const paused=snapshot(actor);animate(2,state);assert.deepEqual(snapshot(actor),paused);assert.deepEqual(state,before);actor.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
  }
 }
});
