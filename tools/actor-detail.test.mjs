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

test('authored cloth depth shading survives actor surfacing without mutating its source colours',()=>{
 const root=new T.Group(),geo=new T.BoxGeometry(.2,.3,.1),m=new T.MeshStandardMaterial({vertexColors:true});m.name='fabric';
 const colors=new Float32Array(geo.attributes.position.count*3);for(let i=0;i<colors.length;i+=3)colors.set([.6,.4,.2],i);geo.setAttribute('color',new T.BufferAttribute(colors,3));
 const before=colors.slice(),mesh=new T.Mesh(geo,m);root.add(mesh);applyActorSurfaces(root);const after=mesh.geometry.attributes.color;
 assert.equal(geo.attributes.color.array,colors);assert.deepEqual(colors,before);assert(Math.abs(after.getX(0)/after.getY(0)-1.5)<1e-6);assert(Math.abs(after.getY(0)/after.getZ(0)-2)<1e-6);assert(after.getX(0)<.6);
});

test('mage volume study has a projecting face, wrapping cloth, complete colours and smooth closed seams',async()=>{
 const root=(await import('../game/assets/mage.js')).default(T),bounds=name=>new T.Box3().setFromBufferAttribute(root.getObjectByName(name).geometry.attributes.position);
 const face=bounds('sculptedFace'),nose=bounds('nose');assert(nose.max.z>face.max.z+.025);
 for(const name of ['leftRobe','rightRobe','openHood','foldedMantle']){const mesh=root.getObjectByName(name),b=bounds(name);assert(b.max.z-b.min.z>.14,`${name} must wrap around a volume`);assert(mesh.geometry.index.count>400);assert(mesh.geometry.attributes.color.count===mesh.geometry.attributes.position.count);}
 root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry;assert([...g.attributes.position.array,...g.attributes.normal.array].every(Number.isFinite));if(o.material.vertexColors)assert.equal(g.attributes.color?.count,g.attributes.position.count);});
 const normal=root.getObjectByName('sculptedFace').geometry.attributes.normal;for(let row=0;row<9;row++){const first=row*37,last=first+36;for(const get of ['getX','getY','getZ'])assert(Math.abs(normal[get](first)-normal[get](last))<1e-6);}
});

for(const [id,height,budget,volumes] of [
 ['wanderer',1.85,18000,['forgedCuirass','foldedMantle','leftTabard','rightTabard','openHelmet']],
 ['ninja',1.78,20000,['lamellarVest0','shapedMask','leftTunicSkirt','rightTunicSkirt','leftFoldedScarf','rightFoldedScarf']],
 ['dwarf',1.4,20000,['forgedCuirass','smithApron','openHelmet','beardMass']]
])test(`${id}: rebuilt anatomy has volumetric clothing, articulated grips and the original size/budget`,async()=>{
 const root=(await import(`../game/assets/${id}.js`)).default(T),bounds=new T.Box3().setFromObject(root,true);let triangles=0;
 assert(Math.abs(bounds.min.y)<1e-6);assert(Math.abs(bounds.getSize(new T.Vector3()).y-height)<1e-6);
 for(const name of volumes){
  const mesh=root.getObjectByName(name);assert(mesh?.isMesh,name);assert(mesh.geometry.index.count>200,name);
  const b=new T.Box3().setFromBufferAttribute(mesh.geometry.attributes.position);assert(b.max.z-b.min.z>.04,`${name} must have depth`);
 }
 for(const side of ['left','right']){
  const fore=root.userData.joints[side+'Forearm'];assert(root.getObjectByName(side+'Palm').parent===fore);
  for(let i=0;i<4;i++)assert.equal(root.getObjectByName(side+'Finger'+i).parent,fore);
  assert.equal(root.getObjectByName(side+'Thumb').parent,fore);
 }
 const face=root.getObjectByName('sculptedFace'),nose=root.getObjectByName('nose');
 assert(new T.Box3().setFromBufferAttribute(nose.geometry.attributes.position).max.z>new T.Box3().setFromBufferAttribute(face.geometry.attributes.position).max.z+.02);
 const normal=face.geometry.attributes.normal;
 for(let row=0;row<9;row++)for(const get of ['getX','getY','getZ'])assert(Math.abs(normal[get](row*29)-normal[get](row*29+28))<1e-6);
 root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry;triangles+=(g.index?.count||g.attributes.position.count)/3;assert.notEqual(g.type,'PlaneGeometry');assert([...g.attributes.position.array,...g.attributes.normal.array].every(Number.isFinite));if(o.material.vertexColors)assert.equal(g.attributes.color?.count,g.attributes.position.count);});
 assert(triangles<budget,`${triangles} triangles exceeds ${budget}`);
});

test('raider lining, cloth and embroidery stay distinct without changing shared player materials',()=>{
 const colors=[];for(const color of [0x222a2b,0x793e36,0xb2a078]){
  const m=new T.MeshStandardMaterial({color});m.name='fabric';m.map=actorSurfaceMaps('fabric').map;
  const copy=styleRaiderMaterial(m.clone());colors.push(copy.color.getHex());assert.equal(m.color.getHex(),color);assert.equal(copy.map,m.map);
 }assert.equal(new Set(colors).size,3);
});

for(const [id,ceiling] of [['wanderer',31],['ninja',42],['dwarf',34]])test(`${id}: compact palettes preserve linear colours and raider tint while bounding joint batches`,async()=>{
 const make=(await import(`../game/assets/${id}.js`)).default,plain=make(T),compact=make(T);
 plain.userData.compactActorPalette=false;
 const meshes=root=>{const out=[];root.traverse(o=>{if(o.isMesh)out.push(o);});return out;};
 const originals=meshes(compact).map(o=>({geometry:o.geometry,colors:o.geometry.attributes.color?.array.slice()}));
 applyActorSurfaces(plain);applyActorSurfaces(compact);const before=meshes(plain),after=meshes(compact);assert.equal(before.length,after.length);
 for(let n=0;n<before.length;n++){
  const a=before[n],b=after[n];assert.deepEqual(originals[n].geometry.attributes.color?.array,originals[n].colors);
  assert.deepEqual(a.geometry.attributes.position.array,b.geometry.attributes.position.array);
  for(const prop of ['roughness','metalness','map','normalMap','roughnessMap'])assert.equal(a.material[prop],b.material[prop]);
  for(const raider of [false,true]){
   const ma=raider?styleRaiderMaterial(a.material.clone()):a.material,mb=raider?styleRaiderMaterial(b.material.clone()):b.material;
   const ca=ma.vertexColors?a.geometry.attributes.color:null,cb=mb.vertexColors?b.geometry.attributes.color:null;
   for(let i=0;i<a.geometry.attributes.position.count;i++)for(const [channel,get] of [['r','getX'],['g','getY'],['b','getZ']])assert(Math.abs(ma.color[channel]*(ca?ca[get](i):1)-mb.color[channel]*(cb?cb[get](i):1))<1e-6);
  }
 }
 mergeJoints(compact);assert(meshes(compact).length<=ceiling);
 for(const key of ['head','torso','leftArm','rightArm','leftForearm','rightForearm','leftLeg','rightLeg','leftShin','rightShin','leftFoot','rightFoot'])assert(compact.userData.joints[key]?.isGroup);
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
