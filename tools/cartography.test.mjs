import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapView,project,unproject,mapLayout,mapLocations} from '../game/src/cartography.js';
import {sceneryLayout} from '../game/src/region-layout.js';
import {MAPS,EXIT,NPCS} from '../game/src/world-map.js';
test('map coordinates round-trip and north stays up at every zoom',()=>{
 for(const zoom of [1,1.4,2,3,4])for(const size of [168,390,700,1200]){
  const view=mapView(zoom,20,-18);
  for(const [x,z] of [[0,0],[-60,60],[60,-60],[3,7]]){const p=unproject(...project(x,z,size,view),size,view);assert(Math.abs(x-p.x)<1e-9);assert(Math.abs(z-p.z)<1e-9);}
  assert(project(0,-20,size,view)[1]<project(0,20,size,view)[1]);
 }
});
test('zoom and pan are bounded to the actual map',()=>{
 assert.deepEqual(mapView(.1,999,-999),{zoom:1,x:0,z:0});
 assert.deepEqual(mapView(10,999,-999),{zoom:4,x:48,z:-48});
 for(const zoom of [1,2,3,4]){const v=mapView(zoom,-999,999);assert(v.x-64/zoom>=-64);assert(v.z+64/zoom<=64);}
});
for(let region=0;region<4;region++)test(`region ${region}: actual scenery, correct services and quest coordinates`,()=>{
 const layout=mapLayout(region),locations=mapLocations(region);
 assert.deepEqual(layout.props,sceneryLayout(region).props);assert(layout.props.some(p=>p.kind==='house'));assert(layout.roads.length>=4);
 for(const n of NPCS){const p=locations.find(p=>p.id===n.id);assert.equal(p.x,n.x);assert.equal(p.z,n.z);}
 assert.equal(locations.some(p=>p.id==='smith'),region===0);
 const objective=locations.find(p=>p.id==='objective');assert.equal(objective.x,MAPS[region].shard.x);assert.equal(objective.z,MAPS[region].shard.z);
 const exit=locations.find(p=>p.id==='exit');assert.equal(!!exit,region<3);if(exit){assert.equal(exit.x,EXIT.x);assert.equal(exit.z,EXIT.z);}
});
