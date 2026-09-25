// Regional set pieces: every landmark lands, blocks where it is solid and
// stays open where the player should walk (the cathedral portal and nave).
import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneryLayout,canStandIn} from '../game/src/region-layout.js';
import {landmarkSites} from '../game/src/landmarks.js';
import {waterDistance} from '../game/src/geography.js';

for(const region of [0,1,2,3])test(`region ${region}: landmarks are placed, solid and reachable`,()=>{
 const {props,colliders,floors}=sceneryLayout(region),placed=props.filter(p=>p.landmark);
 assert.deepEqual(placed.map(p=>p.kind),landmarkSites(region).map(s=>s.kind),'every surveyed site is used');
 for(const p of props.filter(p=>p.decor))for(const l of placed.filter(l=>l.kind!=='lighthouse'))assert(Math.hypot(p.x-l.x,p.z-l.z)>2.5,`${p.kind} inside ${l.kind}`);
 for(const l of placed){
  const local=(x,z)=>({x:l.x+x*Math.cos(l.rotation)+z*Math.sin(l.rotation),z:l.z-x*Math.sin(l.rotation)+z*Math.cos(l.rotation)});
  if(l.kind==='windmill'||l.kind==='oak')assert(!canStandIn(colliders,l.x,l.z));
  if(l.kind==='lighthouse')assert(waterDistance(region,l.x,l.z)<0,'lighthouse stands in the sea');
  if(l.kind==='cathedral'){for(const [x,z] of [[0,7.5],[0,5],[0,2],[0,-3],[1.5,-4]]){const p=local(x,z);assert(canStandIn(colliders,p.x,p.z),`nave blocked at ${x},${z}`);}
   for(const [x,z] of [[-2.6,4.8],[2.6,4.8],[4.45,0],[-4.45,0]]){const p=local(x,z);assert(!canStandIn(colliders,p.x,p.z),`wall open at ${x},${z}`);}
   const inside=local(0,0);assert(!canStandIn(floors,inside.x,inside.z),'nave floor keeps scenery out');}
 }
});
