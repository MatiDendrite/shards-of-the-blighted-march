import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import house from '../game/assets/village_house.js';
import stall from '../game/assets/market_stall.js';
import well from '../game/assets/village_well.js';
for(const [name,generate,budget,width] of [['house',house,6000,6.4],['stall',stall,3000,3.5],['well',well,3000,2.6]])test(`${name}: detailed constructor stays grounded and inside its art budget`,()=>{
 const root=generate(T),bounds=new T.Box3(),v=new T.Vector3();let triangles=0;assert(root.isGroup);root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh)return;assert(o.material.isMeshStandardMaterial);assert(!o.material.map,'textures must be attached by the surface layer');const p=o.geometry.attributes.position;triangles+=(o.geometry.index?.count||p.count)/3;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);assert(v.toArray().every(Number.isFinite));bounds.expandByPoint(v);}});
 assert(triangles<budget);assert(Math.abs(bounds.min.y)<.001);assert(Math.abs(bounds.getSize(new T.Vector3()).x-width)<.15);const center=bounds.getCenter(new T.Vector3());assert(Math.abs(center.x)<.04&&Math.abs(center.z)<.04);
});
