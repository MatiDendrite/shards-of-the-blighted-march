// Shared world-space contract for scenery, combat, travel, UI and save migration.
export const WORLD_LIMIT=60;
export const TOWN={x:0,z:8,halfWidth:19,halfDepth:19};
export const ARRIVAL={x:0,z:11};
export const EXIT={x:0,z:-56};
export const inTown=(x,z)=>Math.abs(x-TOWN.x)<TOWN.halfWidth&&Math.abs(z-TOWN.z)<TOWN.halfDepth;
export const MAPS=[
 {town:'Hearthstead',west:'Wolfgrass Meadow',east:'Watchman’s Field',south:'South Orchards',shard:{x:0,z:-37}},
 {town:'Greenwatch',west:'Fern Hollow',east:'Hunter’s Glade',south:'Mossfall Grove',shard:{x:-32,z:-33}},
 {town:'Ashcross',west:'Dustwind Flats',east:'Broken Quarry',south:'Pilgrim’s Rest',shard:{x:32,z:-33}},
 {town:'Oathrest',west:'Forgotten Gardens',east:'Silent Cloister',south:'The Old Orchard',shard:{x:0,z:-38}},
];
export const NPCS=[
 {id:'elder',x:-5,z:2,name:'Alden',role:'Warden of the road',color:0x536b59},
 {id:'merchant',x:6,z:2,name:'Mara',role:'Supplies',color:0x775146},
 {id:'guide',x:5,z:16,name:'Rowan',role:'Trail guide',color:0x515e76},
];
export function landmarks(region){const m=MAPS[region];return [
 {name:m.town,x:0,z:8,r:21,kind:'town'},
 {name:m.west,x:-36,z:8,r:12,kind:'glade'},
 {name:m.east,x:36,z:8,r:12,kind:'glade'},
 {name:m.south,x:0,z:43,r:11,kind:'grove'},
 {name:region===3?'Warden’s Court':'Shard Sanctuary',...m.shard,r:12,kind:'shard'},
 {name:'Western Ruins',x:-34,z:-32,r:11,kind:'ruin'},
 {name:'Eastern Ruins',x:34,z:-32,r:11,kind:'ruin'},
 ];}
export function zoneName(region,x,z){const list=landmarks(region);const nearby=list.find(l=>Math.hypot(x-l.x,z-l.z)<l.r);return nearby?.name||'The wilds';}
export function roads(region){
 const bent=region===1?4:0;
 return [
 [[0,54],[0,43],[bent,29],[0,8],[0,-16],[-bent,-27],[0,-38],[0,-56]],
 [[-54,8],[-36,8],[-24,8],[0,8],[24,8],[36,8],[54,8]],
 [[-36,8],[-39,-11],[-34,-32],[0,-38],[34,-32],[39,-11],[36,8]],
 [[-36,8],[-32,31],[0,43],[32,31],[36,8]],
 ];
}
export function distanceToRoad(region,x,z){let nearest=Infinity;for(const path of roads(region))for(let i=1;i<path.length;i++){
 const [ax,az]=path[i-1],[bx,bz]=path[i],dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
 nearest=Math.min(nearest,Math.hypot(x-ax-t*dx,z-az-t*dz));
 }return nearest;}
