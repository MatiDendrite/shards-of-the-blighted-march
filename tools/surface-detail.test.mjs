import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {waterGeometry,createGeographyView} from '../game/src/geography-view.js';
import {meadowGeometry,meadowPlacements,createMeadowView} from '../game/src/meadow-view.js';
import {LANDSCAPES,sceneryLayout,canStandIn} from '../game/src/region-layout.js';
import {groundHeight} from '../game/src/terrain-height.js';
import {waterDistance,WATER_Y,onCrossing,beachWeight} from '../game/src/geography.js';
import {distanceToRoad} from '../game/src/world-map.js';

for(let region=0;region<4;region++)test(`water ${region}: finite tessellation, upward faces, fixed datum and shader lifecycle`,()=>{
 const geo=waterGeometry(region),p=geo.attributes.position,n=geo.attributes.normal;
 assert(geo.index.count/3<26000);assert(p.count>1000);
 for(let i=0;i<p.count;i++){assert(Number.isFinite(p.getX(i))&&Number.isFinite(p.getZ(i)));assert.equal(p.getY(i),0);assert(n.getY(i)>.99);assert(waterDistance(region,p.getX(i),p.getZ(i))<=1.401);}
 const scene=new T.Group(),view=createGeographyView(scene,region),shader={uniforms:{},vertexShader:T.ShaderLib.physical.vertexShader,fragmentShader:T.ShaderLib.physical.fragmentShader};
 assert.equal(scene.children.length,1);assert.equal(view.mesh.position.y,WATER_Y);view.mesh.material.onBeforeCompile(shader);
 assert(shader.fragmentShader.includes('mat3(viewMatrix)'));assert(shader.fragmentShader.includes('fwidth'));assert(shader.vertexShader.includes('waterWaves(position.xz)'));
 view.update(10);assert.equal(shader.uniforms.uWaterTime.value,.1);view.update(0);assert.equal(shader.uniforms.uWaterTime.value,.1);
 assert.equal(view.mesh.castShadow,false);assert(view.mesh.receiveShadow);assert.equal(view.mesh.material.transmission,0);
});

test('meadow: curved tapered ribbons use 40 triangles per full tuft and no alpha overdraw',()=>{
 const near=meadowGeometry(3,5),base=meadowGeometry();assert.equal((near.index.count+base.index.count)/3,40);
 for(const geo of [near,base]){const p=geo.attributes.position;assert([...p.array].every(Number.isFinite));for(let blade=0;blade<p.count/7;blade++){assert.equal(p.getY(blade*7),0);assert(p.getY(blade*7+6)>.5);}assert(geo.attributes.color);assert(geo.attributes.normal);}
});

for(let region=0;region<4;region++)test(`meadow ${region}: deterministic dense placements follow hills and leave travel routes clear`,()=>{
 const style=LANDSCAPES[region],{colliders}=sceneryLayout(region),a=meadowPlacements(region,style,colliders),b=meadowPlacements(region,style,colliders),plants=[...a.values()].flat();
 assert.deepEqual(a,b);assert(plants.length>style.cover*.65);assert(plants.length<style.cover*2.1);
 for(const p of plants){assert(Math.abs(p.y-groundHeight(region,p.x,p.z)+.025)<1e-8);assert(canStandIn(colliders,p.x,p.z));assert(distanceToRoad(region,p.x,p.z)>=1.65);assert(Math.hypot(p.x,p.z-8)>=10);assert(!onCrossing(region,p.x,p.z,1));assert(beachWeight(region,p.x,p.z)<=.2);}
 const scene=new T.Group(),view=createMeadowView(scene,region,style,colliders),geos=new Set(),mats=new Set(),matrix=new T.Matrix4(),center=new T.Vector3();let instances=0,bytes=0;
 for(const c of view.chunks)for(const mesh of c.root.children){assert(mesh.isInstancedMesh);instances+=mesh.count;bytes+=mesh.instanceMatrix.array.byteLength+mesh.instanceColor.array.byteLength;geos.add(mesh.geometry);mats.add(mesh.material);assert(!mesh.material.transparent);assert(!mesh.castShadow&&mesh.receiveShadow);assert(mesh.boundingBox&&mesh.boundingSphere);mesh.getMatrixAt(0,matrix);center.setFromMatrixPosition(matrix);assert(mesh.boundingSphere.containsPoint(center));}
 assert.equal(geos.size,2);assert.equal(mats.size,2);assert.equal(instances,plants.length*2);assert(bytes<5_000_000);
 const identities=scene.children.slice();view.update(.1,{x:58,z:-58});view.update(.1,{x:0,z:11});assert.deepEqual(scene.children,identities);
 for(const c of view.chunks){const d=Math.hypot(c.x,c.z-11);assert.equal(c.root.visible,d<52);assert.equal(c.root.children[1].visible,d<33);}
});
