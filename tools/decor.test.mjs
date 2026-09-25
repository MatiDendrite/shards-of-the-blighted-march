// MMO dressing: deterministic, dense, and never on roads, water, doorways,
// portals, townsfolk or the clearings where guardians wait.
import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneryLayout,canStandIn} from '../game/src/region-layout.js';
import {DECOR} from '../game/src/decor.js';
import {FIELD_PATROLS} from '../game/src/campaign-data.js';
import {portalsFor,NPCS,MAPS,distanceToRoad} from '../game/src/world-map.js';
import {waterDistance} from '../game/src/geography.js';
import {buildingSites} from '../game/src/settlement-layout.js';
import {hallDoor} from '../game/src/interiors.js';

for(const region of [0,1,2,3])test(`region ${region}: dense, deterministic dressing that keeps the game open`,()=>{
 const {props,colliders}=sceneryLayout(region),decor=props.filter(p=>p.decor);
 assert.deepEqual(sceneryLayout(region).props.filter(p=>p.decor),decor,'same layout every build');
 assert(decor.length>=80,`only ${decor.length} props`);for(const kind of ['stack','woodpile','cart','tent','colonnade','log','bush','sign'])assert(decor.some(p=>p.kind===kind),`${kind} missing`);
 for(const p of decor){assert(DECOR[p.kind]);assert(waterDistance(region,p.x,p.z)>2);if(p.kind!=='sign')assert(distanceToRoad(region,p.x,p.z)>1.3,`${p.kind} on a road`);}
 for(const e of FIELD_PATROLS)assert(canStandIn(colliders,e.x,e.z),`patrol ${e.id} home blocked`);
 for(const g of portalsFor(region))assert(canStandIn(colliders,g.x,g.z));
 for(const n of NPCS)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])assert(canStandIn(colliders,n.x+dx,n.z+dz)||canStandIn(colliders,n.x-dx,n.z-dz));
 for(const s of buildingSites(region))if(s.hall){const d=hallDoor(s);assert(canStandIn(colliders,d.x,d.z),'doorstep blocked');}
 const shard=MAPS[region].shard;for(const a of [0,1,2,3,4,5])assert(canStandIn(colliders,shard.x+Math.cos(a)*6,shard.z+Math.sin(a)*6)||region===3,'shard arena ring');
});
