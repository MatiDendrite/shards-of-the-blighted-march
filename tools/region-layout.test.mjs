import test from 'node:test';
import assert from 'node:assert/strict';
import {Combat} from '../game/src/combat-model.js';
import {sceneryLayout,pavingLayout,canStandIn} from '../game/src/region-layout.js';
import {WORLD_LIMIT,inTown,MAPS,EXIT,NPCS,landmarks} from '../game/src/world-map.js';
import {route} from './navigation.mjs';
for(let region=0;region<4;region++){
 test(`region ${region}: deterministic settlement and solid obstacles`,()=>{
  const a=sceneryLayout(region);assert.deepEqual(a,sceneryLayout(region));assert(a.props.filter(p=>p.kind==='house').length>=6);assert(a.props.some(p=>p.kind==='well'));assert(a.props.some(p=>p.kind==='stall'));
  for(const c of a.colliders)assert(!canStandIn(a.colliders,c.x,c.z));
  for(const p of a.props)assert([p.x,p.z,p.sx,p.sy,p.sz,p.rotation].every(Number.isFinite));
  assert(!canStandIn(a.colliders,61,0));assert(!canStandIn(a.colliders,0,-61));
 });
 test(`region ${region}: town, fields, wave spawns and exit are reachable`,()=>{
  const {colliders}=sceneryLayout(region),m=new Combat();m.reset(region);m.damageShard(999);
  const points=[{x:0,z:11},EXIT,...m.enemies,...landmarks(region).filter(l=>l.kind!=='town')];
  for(const p of points){assert(canStandIn(colliders,p.x,p.z),`blocked ${p.x},${p.z}`);assert(route([0,11],p,colliders,1.1));}
  for(const n of NPCS)assert(route([0,11],n,colliders,2.5));
 });
}
test('each world is over eight times the original playable area',()=>{assert.equal(WORLD_LIMIT*2,120);assert((WORLD_LIMIT*2)**2/(38*45)>8);});
test('paving reaches all four directions and retains distinct regional forms',()=>{
 const layouts=[0,1,2,3].map(r=>pavingLayout(r));
 for(const tiles of layouts){for(const key of ['x','z']){assert(Math.min(...tiles.map(t=>t[key]))<-50);assert(Math.max(...tiles.map(t=>t[key]))>50);}for(const p of tiles)assert([p.x,p.z,p.sx,p.sz,p.rotation].every(Number.isFinite));}
 assert(layouts[1].length<layouts[0].length);assert(layouts[3].length>layouts[0].length);
});
test('town safety is bounded on all sides, not the old southern half-plane',()=>{assert(inTown(0,11));assert(inTown(-5,2));for(const [x,z] of [[35,11],[-35,11],[0,43],[0,-25]])assert(!inTown(x,z));});
test('boss court leaves a clear dodge disc around its relocated centre',()=>{const {colliders}=sceneryLayout(3),b=MAPS[3].shard;for(let x=-7;x<=7;x+=.5)for(let z=-7;z<=7;z+=.5)assert(canStandIn(colliders,b.x+x,b.z+z));});
