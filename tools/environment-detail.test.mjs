import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {bankPlantGeometry} from '../game/assets/bank_plants.js';
import {bankPlacements,createBankDressing} from '../game/src/bank-dressing.js';
import {groundMoisture,patchGroundSurface} from '../game/src/landscape-ground.js';
import {sceneryLayout,canStandIn} from '../game/src/region-layout.js';
import {groundHeight} from '../game/src/terrain-height.js';
import {inTown,distanceToRoad} from '../game/src/world-map.js';
import {onCrossing} from '../game/src/geography.js';

for(const [kind,budget] of [['fern',160],['reeds',80],['dune',20],['pebbles',24]])test(`${kind}: finite constructor geometry stays within its small cover budget`,()=>{
 const geo=bankPlantGeometry(T,kind),p=geo.attributes.position,n=geo.attributes.normal,c=geo.attributes.color;
 assert((geo.index?.count||p.count)/3<=budget);assert(p.count>0);assert.equal(n.count,p.count);assert.equal(c.count,p.count);
 for(let i=0;i<p.count;i++){
  assert(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)));assert(p.getY(i)>-.05&&p.getY(i)<1.1);
  assert(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-5);
 }
 assert([...c.array].every(v=>v>=0&&v<=1));assert.deepEqual(p.array,bankPlantGeometry(T,kind).attributes.position.array);
});

test('moisture is bounded, follows low banks and never wets an elevated cliff or distant town',()=>{
 assert(groundMoisture(.7,-.4)>.99);assert.equal(groundMoisture(5,0),0);assert.equal(groundMoisture(.7,3),0);
 let previous=1;for(let d=0;d<5;d+=.05){const wet=groundMoisture(d,0);assert(wet>=0&&wet<=1&&wet<=previous+1e-10);previous=wet;}
});

test('ground surface patches share existing images and filter tiny sand detail',()=>{
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader},grass={},rock={};patchGroundSurface(shader,grass,rock);
 assert.equal(shader.uniforms.uMeadow.value,grass);assert.equal(shader.uniforms.uRock.value,rock);
 assert(shader.vertexShader.includes('attribute float wetWeight'));assert(shader.fragmentShader.includes('landscapeBlend'));assert(shader.fragmentShader.includes('fwidth(land)'));assert(shader.fragmentShader.includes('roughnessFactor=mix'));
 assert(shader.fragmentShader.includes('#include <normal_fragment_maps>'));assert(shader.vertexShader.includes('#include <begin_vertex>'));
});

for(let region=0;region<4;region++)test(`region ${region}: cosmetic dressing stays off roads and bridges, shares buffers and culls by distance`,()=>{
 const {colliders}=sceneryLayout(region),original=structuredClone(colliders),placements=bankPlacements(region,colliders);
 assert.deepEqual(placements,bankPlacements(region,colliders));assert(placements.length>60&&placements.length<400);assert.deepEqual(colliders,original);
 for(const p of placements){
  assert(!inTown(p.x,p.z));assert(canStandIn(colliders,p.x,p.z));assert(!onCrossing(region,p.x,p.z,1));assert(distanceToRoad(region,p.x,p.z)>=1.9);assert.equal(p.y,groundHeight(region,p.x,p.z));
  if(region===2)assert(['dune','pebbles'].includes(p.kind));
 }
 const scene=new T.Group(),view=createBankDressing(scene,region,colliders),geometries=new Set(),materials=new Set(),matrix=new T.Matrix4(),position=new T.Vector3();let instances=0;
 for(const {mesh} of view.chunks){
  assert(mesh.isInstancedMesh);assert(!mesh.castShadow&&mesh.receiveShadow);assert(!mesh.material.transparent);assert.equal(mesh.material.map,null);
  geometries.add(mesh.geometry);materials.add(mesh.material);instances+=mesh.count;
  for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);assert(mesh.boundingSphere.containsPoint(position));}
 }
 assert.equal(instances,placements.length);assert(geometries.size<=3&&materials.size<=3);
 const plant=view.chunks.find(c=>c.mesh.name!=='bank-pebbles').mesh,shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader};plant.material.onBeforeCompile(shader);
 assert(shader.vertexShader.includes('smoothstep(1.8,3.8'));view.update(100);assert.equal(shader.uniforms.uBankTime.value,.1);view.update(NaN);view.update(-10);assert.equal(shader.uniforms.uBankTime.value,.1);
 const children=view.root.children.slice();view.update(0,{x:58,z:-58});assert.deepEqual(view.root.children,children);assert.deepEqual(colliders,original);
 for(const c of view.chunks)assert.equal(c.mesh.visible,Math.hypot(c.x-58,c.z+58)<38);
});
