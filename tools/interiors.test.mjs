// Enterable market houses: a real doorway, solid walls and furniture, and a
// floor kept clear of meadow and scenery.
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingSites} from '../game/src/settlement-layout.js';
import {sceneryLayout,canStandIn} from '../game/src/region-layout.js';
import {hallToWorld,worldToHall,insideHall,hallDoor,HALL_SIZE} from '../game/src/interiors.js';
import {meadowPlacements} from '../game/src/meadow-view.js';
import {LANDSCAPES} from '../game/src/region-layout.js';

for(const region of [0,1,2,3])test(`region ${region}: two market houses open onto walkable rooms`,()=>{
 const halls=buildingSites(region).filter(s=>s.hall);assert.deepEqual(halls.map(h=>h.hall),['inn','home']);
 const {colliders,floors,props}=sceneryLayout(region);assert.equal(floors.length,2);assert.equal(props.filter(p=>p.hall).length,2);
 for(const site of halls){
  const round=worldToHall(site,...Object.values(hallToWorld(site,1.2,-.7)));assert(Math.abs(round.x-1.2)<1e-9&&Math.abs(round.z+.7)<1e-9);
  // Walk from the doorstep through the doorway to the rug.
  const path=Array.from({length:21},(_,i)=>hallToWorld(site,0,HALL_SIZE.halfDepth+1-i*.1));
  const door=hallDoor(site);assert(canStandIn(colliders,door.x,door.z),'doorstep is open');
  for(const p of path)assert(canStandIn(colliders,p.x,p.z),`doorway blocked at ${p.x.toFixed(2)},${p.z.toFixed(2)}`);
  const centre=hallToWorld(site,0,.3);assert(insideHall(site,centre.x,centre.z));assert(canStandIn(colliders,centre.x,centre.z));
  // Side walls and the back wall remain solid.
  for(const [x,z] of [[HALL_SIZE.halfWidth,0],[-HALL_SIZE.halfWidth,0],[0,-HALL_SIZE.halfDepth],[-1.6,HALL_SIZE.halfDepth],[1.6,HALL_SIZE.halfDepth]]){const p=hallToWorld(site,x,z);assert(!canStandIn(colliders,p.x,p.z),`wall open at ${x},${z}`);}
  const outside=hallToWorld(site,0,HALL_SIZE.halfDepth+2);assert(!insideHall(site,outside.x,outside.z));
 }
 const scenery=[...colliders,...floors],grass=[...meadowPlacements(region,LANDSCAPES[region],scenery).values()].flat();
 for(const g of grass)for(const site of halls)assert(!insideHall(site,g.x,g.z),'no grass on the floorboards');
});
