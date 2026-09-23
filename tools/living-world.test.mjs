import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import hornbeam from '../game/assets/hornbeam.js';
import garden from '../game/assets/garden_wall.js';
import standard from '../game/assets/village_standard.js';
import terrain from '../game/assets/terrain.js';
import {createLandscapeEffects} from '../game/src/landscape-effects.js';
import {sceneryLayout,canStandIn} from '../game/src/region-layout.js';
for(const [name,generate,budget] of [['hornbeam',hornbeam,6000],['garden',garden,3500],['standard',standard,2000]])test(`${name}: finite, centred, grounded, texture-free 404 constructor`,()=>{
 const root=generate(T),bounds=new T.Box3(),v=new T.Vector3();let tris=0;assert(root.isGroup);root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh)return;assert(o.material.isMeshStandardMaterial);assert(!o.material.map);const p=o.geometry.attributes.position;tris+=(o.geometry.index?.count||p.count)/3;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);assert(v.toArray().every(Number.isFinite));bounds.expandByPoint(v);}});
 assert(tris<budget,`${tris} triangles`);assert(Math.abs(bounds.min.y)<.001,`base ${bounds.min.y}`);const c=bounds.getCenter(new T.Vector3());assert(Math.abs(c.x)<.04&&Math.abs(c.z)<.04,`centre ${c.toArray()}`);
});
test('generic terrain constructor stays neutral; regional relief is applied by the world',()=>{
 const g=terrain(T);let peak=0;g.traverse(o=>{if(o.isMesh&&o.material.name==='ground'){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){assert(p.getY(i)>=0,'negative border vertices would lift the playable floor during asset normalization');if(Math.abs(p.getX(i))<=60&&Math.abs(p.getZ(i))<=60)assert(Math.abs(p.getY(i))<1e-6);peak=Math.max(peak,p.getY(i));}}});assert(peak>5);
});
test('chimney particles are bounded and remain still when the world is paused',()=>{
 const root=new T.Group(),effects=createLandscapeEffects(root,[{kind:'house',x:10,z:10,sx:1,sy:1,sz:1,rotation:0}],0),p=root.children[0].geometry.attributes.position;
 assert(Math.abs(p.getX(0)-11.6)<.001);assert(Math.abs(p.getY(0)-6.55)<.001);const before=[...p.array];effects.update(0);assert.deepEqual([...p.array],before);
 for(let i=0;i<200;i++)effects.update(.1);assert([...p.array].every(Number.isFinite));for(let i=0;i<p.count;i++)assert(p.getY(i)>=6.55&&p.getY(i)<9);
});
for(let r=0;r<4;r++)test(`region ${r}: new scenery collides, settlement routes stay open`,()=>{
 const {props,colliders}=sceneryLayout(r);for(const kind of ['hornbeam','garden','standard']){const placed=props.filter(p=>p.kind===kind);assert(placed.length>0);for(const p of placed.filter(p=>Math.abs(p.x)<60&&Math.abs(p.z)<60))assert(!canStandIn(colliders,p.x,p.z));}
 for(let z=-12;z<=28;z+=.5)assert(canStandIn(colliders,0,z));
 // The original well occupies (3,7); the horizontal lane passes just south of it.
 for(let x=-20;x<=20;x+=.5)assert(canStandIn(colliders,x,9.5));
});
