import test from 'node:test';
import assert from 'node:assert/strict';
import {Progression,validSave} from '../game/src/progression.js';
import {Combat} from '../game/src/combat-model.js';
import {Campaign} from '../game/src/campaign.js';
import {emptyEncounter} from '../game/src/campaign-data.js';
import {sceneryLayout,canStandIn} from '../game/src/region-layout.js';
import {crossings,riverX,coastX,geographyHeight,waterDistance,waterOutline,scenicLocations} from '../game/src/geography.js';
import {mapLayout} from '../game/src/cartography.js';
import {route} from './navigation.mjs';
import * as T from 'three';
import bridge from '../game/assets/timber_bridge.js';
import cliff from '../game/assets/limestone_cliff.js';

for(const version of [1,2])for(const complete of [false,true])test(`encounter v${version}, ${complete?'completed':'partial'} current and archived saves migrate once`,()=>{
 const p=new Progression(),m=new Combat();new Campaign(p,m);p.restore(m);
 const old=p.snapshot(m),count=version===1?8:16;
 const state=done=>({...emptyEncounter(),claimed:Array.from({length:done?count:3},(_,i)=>i+1),world:{shardHp:done?0:190,exploded:done},shardReward:done});
 old.encounterVersion=version;old.campaign={region:1,cleared:[true,complete,false,false],regions:[state(true),null,null,null]};Object.assign(old,state(complete));
 old.drops=[{id:'retained-drop',x:3,z:18,gold:17,ore:2,item:null}];
 assert(validSave(old));const original=structuredClone(old),restored=new Progression(old),model=new Combat();new Campaign(restored,model);restored.restore(model);
 assert.deepEqual(old,original);assert.equal(restored.data.encounterVersion,3);assert.equal(model.kills,complete?24:3);assert.equal(model.complete,complete);
 assert.equal(restored.data.campaign.regions[0].claimed.length,24);
 for(const key of ['items','loadout','serial','gold','ore','xp','level','drops'])assert.deepEqual(restored.data[key],old[key]);
 const saved=restored.snapshot(model);assert(validSave(saved));assert.deepEqual(new Progression(saved).data,saved);
});

for(let region=0;region<4;region++)test(`region ${region}: river/sea/lake, bridge openings and bank heights agree`,()=>{
 const {colliders}=sceneryLayout(region);
 const wet=region<2?{x:riverX(region,20),z:20}:region===2?{x:coastX(20)+3,z:20}:{x:47,z:38};
 assert(!canStandIn(colliders,wet.x,wet.z));assert(geographyHeight(region,wet.x,wet.z)<-.46);
 for(const p of crossings(region)){
  for(let x=p.x-4*p.sz;x<=Math.min(59,p.x+4*p.sz);x+=.3){assert(canStandIn(colliders,x,p.z),`blocked deck ${x},${p.z}`);assert(!canStandIn(colliders,x,p.z+2.02),'solid rail');}
  assert(route([0,11],p,colliders,.8));
 }
 assert.deepEqual(mapLayout(region).water,waterOutline(region));
 for(const l of scenicLocations(region))assert(mapLayout(region).landmarks.some(p=>p.name===l.name));
 // Newly sculpted terrain never lowers a walkable, off-bridge bank.
 for(let x=-59;x<60;x++)for(let z=-59;z<60;z++)if(canStandIn(colliders,x,z)&&waterDistance(region,x,z)>1.3)assert.equal(geographyHeight(region,x,z),0);
});
test('water-side loot migration preserves good drops and recovers blocked active/archived rewards once',()=>{
 const p=new Progression(),m=new Combat();new Campaign(p,m);p.restore(m);const old=p.snapshot(m);delete old.geographyVersion;
 old.claimed=[1,2];old.drops=[{id:'banked',x:3,z:18,gold:10,ore:0,item:null},{id:'river',x:riverX(0,20),z:20,gold:20,ore:2,item:null}];
 // Keep a completed archived region containing a second inaccessible drop.
 old.campaign.cleared=[true,false,false,false];old.campaign.region=1;
 old.campaign.regions=[{...emptyEncounter(),claimed:Array.from({length:24},(_,i)=>i+1),world:{shardHp:0,exploded:true},shardReward:true,drops:[{id:'old-bank',x:riverX(0,-20),z:-20,gold:9,ore:1,item:null}]},null,null,null];
 old.drops[1].x=riverX(1,20);
 assert(validSave(old));const before=structuredClone(old),fresh=new Progression(old);fresh.restore(new Combat());assert.deepEqual(old,before);assert.deepEqual(fresh.data.drops[0],old.drops[0]);
 assert.equal(fresh.data.drops[1].id,'river');assert.equal(fresh.data.drops[1].gold,20);assert.equal(fresh.data.drops[1].ore,2);assert(canStandIn(sceneryLayout(1).colliders,fresh.data.drops[1].x,fresh.data.drops[1].z));
 const archived=fresh.data.campaign.regions[0].drops[0];assert.equal(archived.gold,9);assert.equal(archived.id,'old-bank');assert(canStandIn(sceneryLayout(0).colliders,archived.x,archived.z));
 const saved=fresh.snapshot(m),again=new Progression(saved);again.restore(new Combat());assert.deepEqual(again.data.drops,saved.drops);assert(validSave(saved));
 for(const value of [null,2,'1'])assert(!validSave({...saved,geographyVersion:value}));
});
for(const [name,generate,expected] of [['bridge',bridge,[4.392,2.315,8.8]],['cliff',cliff,[9,7,6]]])test(`${name}: actual vertex bounds, closed surfaces and triangle budget`,()=>{
 const root=generate(T),bounds=new T.Box3(),v=new T.Vector3();let tris=0;root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;tris+=(o.geometry.index?.count||p.count)/3;assert(o.geometry.attributes.uv);for(let i=0;i<p.count;i++)bounds.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));});
 const size=bounds.getSize(new T.Vector3()).toArray(),center=bounds.getCenter(v);assert(Math.abs(bounds.min.y)<.001);assert(Math.abs(center.x)<.01);assert(Math.abs(center.z)<.01);size.forEach((s,i)=>assert(Math.abs(s-expected[i])<.01));assert(tris>=150&&tris<=12000);
});
test('idle patrols actually move without crossing terrain collisions or entering town',()=>{
 for(let region=0;region<3;region++){
  const {colliders}=sceneryLayout(region),m=new Combat((x,z)=>canStandIn(colliders,x,z));m.reset(region);
  for(let i=0;i<600;i++)m.update(1/60);
  assert(m.enemies.filter(e=>e.patrol&&Math.hypot(e.x-e.homeX,e.z-e.homeZ)>.3).length>=12);
  for(const e of m.enemies){assert(canStandIn(colliders,e.x,e.z));assert(Math.abs(e.x)>19||Math.abs(e.z-8)>=19);}
 }
});
