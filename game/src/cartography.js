import {MAPS,NPCS,TOWN,WORLD_LIMIT,roads,landmarks,portalsFor} from './world-map.js';
import {sceneryLayout} from './region-layout.js';
import {SMITH} from './progression.js';

export const MAP_EXTENT=WORLD_LIMIT+4;
export function mapView(zoom=1,x=0,z=0){
 const level=Math.max(1,Math.min(4,zoom)),limit=MAP_EXTENT-MAP_EXTENT/level;
 return {zoom:level,x:Math.max(-limit,Math.min(limit,x))||0,z:Math.max(-limit,Math.min(limit,z))||0};
}
export function project(x,z,size,view=mapView()){
 const scale=size*view.zoom/(MAP_EXTENT*2);
 return [(x-view.x)*scale+size/2,(z-view.z)*scale+size/2];
}
export function unproject(x,y,size,view=mapView()){
 const scale=size*view.zoom/(MAP_EXTENT*2);
 return {x:(x-size/2)/scale+view.x,z:(y-size/2)/scale+view.z};
}
export function mapLocations(region){
 return [
  {id:'town',name:MAPS[region].town,detail:'Protected settlement',x:TOWN.x,z:TOWN.z},
  ...NPCS.map(n=>({...n,detail:n.role,symbol:n.name[0]})),
  ...(region===0?[{id:'smith',name:'Borin',detail:'Forge & salvage',symbol:'S',...SMITH}]:[]),
  {id:'objective',name:region===3?'Warden’s Court':'Shard Sanctuary',detail:'Quest location',...MAPS[region].shard},
  ...portalsFor(region).map(p=>({...p,name:p.id==='exit'?'Northern portal':'Southern return portal',detail:p.id==='exit'?'Next region · finish quest first':'Previous region · reach the portal'}))
 ];
}
export function mapLayout(region){
 return {props:sceneryLayout(region).props,roads:roads(region),landmarks:landmarks(region),locations:mapLocations(region)};
}
