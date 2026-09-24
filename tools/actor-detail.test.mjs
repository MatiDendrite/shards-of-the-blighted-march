import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {actorSurfaceSample,actorSurfaceMaps,applyActorSurfaces,styleRaiderMaterial} from '../game/src/actor-surfaces.js';
import {createActorSecondaryMotion} from '../game/src/actor-motion.js';
import {createHeroMotion} from '../game/src/combat-motion.js';
import {mergeJoints,cloneActor} from '../game/src/combat-view.js';

for(const kind of ['metal','fabric','leather','fur'])test(`${kind}: periodic bounded detail uses one cached set of small mipmapped maps`,()=>{
 for(const [u,v] of [[0,0],[.37,.19],[.98,.82]]){
  const a=actorSurfaceSample(kind,u,v),b=actorSurfaceSample(kind,u+1,v-1);
  for(const key of ['height','tint','roughness']){assert(a[key]>=0&&a[key]<=1);assert(Math.abs(a[key]-b[key])<1e-10);}
 }
 const maps=actorSurfaceMaps(kind);assert.equal(maps,actorSurfaceMaps(kind));
 for(const [name,t] of Object.entries(maps)){
  assert.equal(t.image.width,128);assert.equal(t.image.height,128);assert.equal(t.wrapS,T.RepeatWrapping);assert.equal(t.wrapT,T.RepeatWrapping);assert(t.generateMipmaps);assert.equal(t.minFilter,T.LinearMipmapLinearFilter);assert.equal(t.colorSpace,name==='map'?T.SRGBColorSpace:T.NoColorSpace);
  assert([...t.image.data].every(Number.isFinite));
 }
 const normal=maps.normalMap.image.data;for(let i=0;i<normal.length;i+=4){const length=Math.hypot(normal[i]/255*2-1,normal[i+1]/255*2-1,normal[i+2]/255*2-1);assert(Math.abs(length-1)<.014);}
});

test('surface application preserves prototypes, joints, geometry, colour and emissive semantics',()=>{
 const root=new T.Group(),joint=new T.Group();joint.name='head';root.add(joint);root.userData.joints={head:joint};
 const geo=new T.BoxGeometry(.2,.3,.1),mat=new T.MeshStandardMaterial({color:0x896753,emissive:0x123456});mat.name='leather';
 const a=new T.Mesh(geo,mat),b=new T.Mesh(geo,mat);joint.add(a,b);const originalUV=geo.attributes.uv.array.slice(),originalPosition=geo.attributes.position.array.slice();
 applyActorSurfaces(root);assert.equal(root.userData.joints.head,joint);assert.equal(a.material,b.material);assert.notEqual(a.material,mat);assert.notEqual(a.geometry,geo);assert.equal(mat.map,null);assert.equal(a.material.emissive.getHex(),mat.emissive.getHex());assert.equal(a.material.color.getHex(),mat.color.getHex());assert.deepEqual(geo.attributes.uv.array,originalUV);assert.deepEqual(a.geometry.attributes.position.array,originalPosition);assert(a.material.vertexColors);
 mergeJoints(root);const copy=cloneActor(root);assert.notEqual(copy.getObjectByName('head'),joint);const meshes=[];copy.traverse(o=>{if(o.isMesh)meshes.push(o);});assert.equal(meshes.length,1);assert(meshes[0].geometry.attributes.color);
});

test('skin, eyes and luminous insets never acquire cloth or wood grain',()=>{
 const root=new T.Group();for(const name of ['skin','eyes','rune','gem','bone']){const m=new T.MeshStandardMaterial({color:0x999999,emissive:0x123456});m.name=name;root.add(new T.Mesh(new T.BoxGeometry(),m));}
 applyActorSurfaces(root);for(const mesh of root.children){assert.equal(mesh.material.map,null);assert.equal(mesh.material.normalMap,null);assert.equal(mesh.material.emissive.getHex(),0x123456);}
});

test('raider lining, cloth and embroidery stay distinct without changing shared player materials',()=>{
 const colors=[];for(const color of [0x222a2b,0x793e36,0xb2a078]){
  const m=new T.MeshStandardMaterial({color});m.name='fabric';m.map=actorSurfaceMaps('fabric').map;
  const copy=styleRaiderMaterial(m.clone());colors.push(copy.color.getHex());assert.equal(m.color.getHex(),color);assert.equal(copy.map,m.map);
 }assert.equal(new Set(colors).size,3);
});

for(const id of ['wanderer','mage','ninja','dwarf','blighted_wolf','fallen_warden'])test(`${id}: detailed materials survive joint batching and cloned actors remain independent`,async()=>{
 const root=(await import(`../game/assets/${id}.js`)).default(T),joints=root.userData.joints,original=[];root.traverse(o=>{if(o.isMesh)original.push(o.geometry.attributes.position.array.slice());});
 applyActorSurfaces(root);let n=0;root.traverse(o=>{if(o.isMesh)assert.deepEqual(o.geometry.attributes.position.array,original[n++]);});mergeJoints(root);assert.equal(root.userData.joints,joints);
 const copy=cloneActor(root),secondary=createActorSecondaryMotion(copy);secondary(2,{gait:1,windup:.8,recovery:.4});copy.updateMatrixWorld(true);copy.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
 const sample=()=>{const a=[];copy.traverse(o=>{if(o.isGroup)a.push([...o.position.toArray(),...o.rotation.toArray()]);});return a;};const first=sample();for(let n=0;n<100;n++)secondary(2,{gait:1,windup:.8,recovery:.4});assert.deepEqual(sample(),first);
 for(const name of ['mantle','scarfLeft','scarfRight','jaw','tail']){const a=root.getObjectByName(name),b=copy.getObjectByName(name);if(a){assert(b);assert.notEqual(a,b);assert.notEqual(a.rotation.x+a.rotation.z,b.rotation.x+b.rotation.z);}}
});

test('class cloth follows authored pivots through run, dodge, pause and recovery without changing player state',async()=>{
 for(const id of ['wanderer','mage','ninja','dwarf']){
  const root=(await import(`../game/assets/${id}.js`)).default(T),animate=createHeroMotion(root),p={angle:0,walk:1.3,gait:1,dodge:0};
  for(const age of [0,.05,.12,.24,.34]){
   Object.assign(p,{dodge:age<.34?.34-age:0,dodgeAge:age,dodgeX:1,dodgeZ:0});const before=structuredClone(p);animate(p,3);const snapshot=Object.values(root.userData.joints).map(n=>[...n.position.toArray(),...n.rotation.toArray()]);animate(p,3);assert.deepEqual(Object.values(root.userData.joints).map(n=>[...n.position.toArray(),...n.rotation.toArray()]),snapshot);assert.deepEqual(p,before);
   root.updateMatrixWorld(true);for(const name of ['leftFoot','rightFoot'])assert(new T.Box3().setFromObject(root.userData.joints[name],true).min.y>-.018);
  }
 }
});
