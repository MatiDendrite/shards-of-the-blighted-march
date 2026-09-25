import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {TERRAIN_SIZE,TERRAIN_SEGMENTS,TERRAIN_STEP,TOWN_HEIGHT,terrainField,terrainHeight,groundHeight,groundGradient,intersectGroundRay} from '../game/src/terrain-height.js';
import {sceneryLayout,canStandIn} from '../game/src/region-layout.js';
import {waterDistance,crossings} from '../game/src/geography.js';
import {drapeGround,alignToGround} from '../game/src/ground-projection.js';
import {CameraOrbit} from '../game/src/camera-orbit.js';
import {createCombatRings} from '../game/src/combat-rings.js';
import {createClassEffects} from '../game/src/class-effects.js';
import {Combat} from '../game/src/combat-model.js';
const close=(a,b,e=1e-5)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);

for(let region=0;region<4;region++){
 test(`relief ${region}: finite cached heights, real hills and level services`,()=>{
  const field=terrainField(region);assert.equal(field,terrainField(region));assert.equal(field.length,(TERRAIN_SEGMENTS+1)**2);assert([...field].every(Number.isFinite));
  const {colliders}=sceneryLayout(region);let low=99,high=-99,maxGrade=0;
  for(let x=-59;x<60;x++)for(let z=-59;z<60;z++)if(canStandIn(colliders,x,z)){
   const y=groundHeight(region,x,z),g=groundGradient(region,x,z);low=Math.min(low,y);high=Math.max(high,y);if(waterDistance(region,x,z)>2.2)maxGrade=Math.max(maxGrade,Math.hypot(g.x,g.z));
  }
  assert(high-low>4.5,'walkable relief must not regress to a flat plane');assert(maxGrade<.6,'walkable dry-land ramps stay below 31 degrees');
  for(const [x,z] of [[0,8],[0,11],[-5,2],[6,2],[5,16]])close(groundHeight(region,x,z),TOWN_HEIGHT[region],.002);
 });
 test(`relief ${region}: field sampler exactly matches rendered triangle diagonals`,()=>{
  const geo=new T.PlaneGeometry(TERRAIN_SIZE,TERRAIN_SIZE,TERRAIN_SEGMENTS,TERRAIN_SEGMENTS);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,terrainHeight(region,p.getX(i),p.getZ(i)));
  const mesh=new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide})),ray=new T.Raycaster();mesh.updateMatrixWorld(true);
  for(let i=0;i<36;i++){const x=-57+(i*17.713)%114,z=-57+(i*29.237)%114;ray.set(new T.Vector3(x,30,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(mesh)[0];assert(hit);close(hit.point.y,terrainHeight(region,x,z),2e-5);}
  geo.dispose();mesh.material.dispose();
 });
 test(`relief ${region}: bridges keep level decks and seamless dry approaches`,()=>{
  for(const b of crossings(region)){
   for(let x=b.x-4.4*b.sz;x<b.x+4.4*b.sz;x+=.13)close(groundHeight(region,x,b.z),0,.003);
   close(groundHeight(region,b.x-4.4*b.sz-.2,b.z),0,.003);
   if(region<2)close(groundHeight(region,b.x+4.4*b.sz+.2,b.z),0,.003);
  }
 });
 test(`relief ${region}: pointer rays hit the visible hill instead of a level plane`,()=>{
  for(const [x,z] of [[-35,3],[33,-14],[0,-38],[0,11]]){
   const target=new T.Vector3(x,groundHeight(region,x,z),z),origin=target.clone().add(new T.Vector3(4,12,11)),direction=target.clone().sub(origin).normalize(),hit=intersectGroundRay(region,origin,direction);assert(hit);close(hit.x,x,.003);close(hit.z,z,.003);close(hit.y,target.y,.003);
  }
 });
 test(`relief ${region}: camera follows hills without touching the landscape`,()=>{
  const {colliders}=sceneryLayout(region),heightAt=(x,z)=>groundHeight(region,x,z);
  for(let x=-50;x<=50;x+=10)for(let z=-50;z<=50;z+=10){if(!canStandIn(colliders,x,z))continue;for(let yaw=0;yaw<6.28;yaw+=Math.PI/4){const camera=new CameraOrbit();camera.yaw=yaw;camera.tilt=-.25;const eye=camera.position({x,z},1/60,false,[],heightAt);assert(Object.values(eye).every(Number.isFinite));assert(eye.y>heightAt(eye.x,eye.z)+.2);close(camera.focus.y,heightAt(x,z)+.75);}}
 });
 test(`relief ${region}: rigid settlement footings meet the sampled ground`,()=>{
  const {props}=sceneryLayout(region);
  for(const p of props.filter(p=>['house','well','lantern'].includes(p.kind)))close(p.y,groundHeight(region,p.x,p.z));
  // Stalls and gates settle to their lowest footing so no leg or pillar hangs.
  for(const p of props.filter(p=>['stall','gate'].includes(p.kind))){const [hw,hd]=p.kind==='gate'?[5,.6]:[1.7,1.1],c=Math.cos(p.rotation),s=Math.sin(p.rotation);for(const [lx,lz] of [[-1,-1],[1,-1],[-1,1],[1,1],[0,0]]){const x=lx*hw*p.sx,z=lz*hd*p.sz;assert(p.y<=groundHeight(region,p.x+x*c+z*s,p.z-x*s+z*c)+1e-6,`${p.kind} at ${p.x},${p.z} hangs`);}assert(groundHeight(region,p.x,p.z)-p.y<1,`${p.kind} sunk too deep`);}
  for(const p of props.filter(p=>p.kind==='house'))for(const x of [-2.7,2.7])for(const z of [-2.7,2.7]){const c=Math.cos(p.rotation),s=Math.sin(p.rotation),y=groundHeight(region,p.x+x*p.sx*c+z*p.sz*s,p.z-x*p.sx*s+z*p.sz*c);assert(Math.abs(y-p.y)<.13,`house at ${p.x},${p.z}: footing gap ${y-p.y}`);}
 });
}
test('ground projection remains accurate after rotation, resizing and repeated reuse',()=>{
 const geometry=new T.RingGeometry(.2,4,40,5),mesh=new T.Mesh(geometry,new T.MeshBasicMaterial());mesh.rotation.set(-Math.PI/2,0,.7);const heightAt=(x,z)=>groundHeight(0,x,z);
 for(let i=0;i<30;i++){mesh.position.set(30+i*.1,.11,-20);mesh.scale.setScalar(.4+i/30);drapeGround(mesh,heightAt,.11);const p=geometry.attributes.position,v=new T.Vector3();mesh.updateMatrixWorld(true);for(let n=0;n<p.count;n++){v.fromBufferAttribute(p,n).applyMatrix4(mesh.matrixWorld);close(v.y,heightAt(v.x,v.z)+.11,1e-5);}}
 geometry.dispose();mesh.material.dispose();
});
test('slope alignment preserves the horizontal heading and follows the ground normal',()=>{
 const root=new T.Group(),g={x:.3,z:-.2};alignToGround(root,g,1.2);const up=new T.Vector3(0,1,0).applyQuaternion(root.quaternion),normal=new T.Vector3(-g.x,1,-g.z).normalize();assert(up.distanceTo(normal)<1e-6);
});
test('pooled effects deform private geometry without corrupting other pulses',()=>{
 const scene=new T.Scene(),heightAt=(x,z)=>groundHeight(1,x,z),fx=createCombatRings(scene,()=>{},heightAt);fx.pulse(-32,-10,0xffffff,2);fx.pulse(32,20,0xffffff,3);fx.update(.1);
 assert.notEqual(scene.children[0].geometry,scene.children[1].geometry);const geo=scene.children[0].geometry;fx.clear();for(let i=0;i<100;i++){fx.pulse(-32,-10,0xffffff,2);fx.update(.5);}assert.equal(scene.children[0].geometry,geo);assert.equal(fx.allocated,2);assert.equal(fx.geometryCount,1);fx.dispose();assert.equal(scene.children.length,0);
});
test('class projectiles, bomb warnings and shields stay above elevated ground',()=>{
 const scene=new T.Scene(),model=new Combat(),fx=createClassEffects(scene);model.player.x=32;model.player.z=-16;model.player.ward=50;model.projectiles=[{id:1,x:32,z:-15,kind:'firebolt',angle:0}];model.bombs=[{id:2,x:33,z:-16,age:.5,fuse:1.1,radius:2.6}];fx.update(model);
 const root=scene.getObjectByName('classEffects'),projectile=root.children.find(m=>m.material?.color.getHex()===0xffae64);close(projectile.position.y,groundHeight(0,32,-15)+.85);
 const bomb=root.children.find(m=>m.isGroup),warning=bomb.children[1],p=warning.geometry.attributes.position,v=new T.Vector3();root.updateMatrixWorld(true);for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(warning.matrixWorld);close(v.y,groundHeight(0,v.x,v.z)+.11,1e-5);}
 fx.clear();assert.equal(root.children.length,3);assert(root.children.every(o=>!o.visible));
});
test('height query rejects invalid regions and upward pointer rays miss cleanly',()=>{
 assert.throws(()=>terrainField(-1),RangeError);assert.throws(()=>terrainField(4),RangeError);assert.equal(intersectGroundRay(0,{x:0,y:20,z:0},{x:0,y:1,z:0}),null);assert.equal(TERRAIN_STEP,TERRAIN_SIZE/TERRAIN_SEGMENTS);
});
