// One set piece per region, placed on surveyed level ground: a windmill with
// wheat fields, an ancient oak, a beached wreck with a lighthouse offshore and
// a ruined cathedral. Pure layout data; world.js builds and animates them.
import {distanceToRoad} from './world-map.js';
import {waterDistance} from './geography.js';

export const LANDMARK_FILES={windmill:'windmill',field:'wheat_field',oak:'ancient_tree',lighthouse:'lighthouse',wreck:'shipwreck',cathedral:'cathedral_ruin'};
// Named groups that keep moving after the rest of the landmark is baked.
export const LANDMARK_MOTION={windmill:'windmill-sails',oak:'mushroom-ring',lighthouse:'lighthouse-beam'};
export const LANDMARK_NAMES={windmill:'Old Hearth Mill',oak:'The Elder Oak',lighthouse:'Saltwind Light',wreck:'Wreck of the Gull',cathedral:'Fallen Cathedral'};
// Local solid shapes (front +Z). Circles {x,z,r}; boxes {x,z,w,d}.
const SOLIDS={
 windmill:[{x:0,z:0,r:2.8}],oak:[{x:0,z:0,r:2.3}],wreck:[{x:0,z:0,w:3.4,d:8.6}],
 cathedral:[{x:-2.6,z:4.82,w:3,d:.8},{x:2.6,z:4.82,w:3,d:.8},{x:-4.8,z:4.72,w:1.6,d:1.8},{x:4.8,z:4.72,w:1.6,d:1.8},{x:-4.45,z:-.2,w:.7,d:8.8},{x:4.45,z:-.2,w:.7,d:8.8},{x:-2.4,z:6.1,w:.9,d:.9},{x:2.4,z:6.1,w:.9,d:.9}],
 field:[],lighthouse:[],
};
const FLOORS={cathedral:{x:0,z:-.2,w:8.2,d:9.2},field:{x:0,z:0,w:6.4,d:4.4},wreck:{x:0,z:0,w:5,d:10},oak:{x:0,z:0,w:7,d:7}};
export const LANDMARK_SIZE={windmill:[4.5,3.9],field:[3.2,2.2],oak:[3.5,3.5],lighthouse:[4,4],wreck:[2,4.5],cathedral:[5.6,6.6]};
const SITES=[
 [{kind:'windmill',x:22,z:18,rotation:-Math.PI/2},{kind:'field',x:29,z:22,rotation:Math.PI/2},{kind:'field',x:29.5,z:14,rotation:0},{kind:'field',x:22.5,z:27.5,rotation:Math.PI/2}],
 [{kind:'oak',x:-12,z:-46,rotation:.3}],
 [{kind:'wreck',x:48.8,z:35.5,rotation:0},{kind:'lighthouse',x:58.5,z:-24,rotation:0,sea:true}],
 [{kind:'cathedral',x:-24,z:20,rotation:Math.PI/2}],
];
function toWorld(site,s){const c=Math.cos(site.rotation),n=Math.sin(site.rotation),x=site.x+s.x*c+s.z*n,z=site.z-s.x*n+s.z*c;if(s.r)return{x,z,r:s.r,landmark:true};const ac=Math.abs(c),an=Math.abs(n);return{x,z,w:s.w*ac+s.d*an,d:s.w*an+s.d*ac,landmark:true};}
export function landmarkLayout(region,{colliders,floors,canStandIn}){
 const props=[];
 for(const site of SITES[region]){
  // Land sites must stay clear of roads, water and earlier solids; the lighthouse stands in the sea.
  if(!site.sea){const [hw,hd]=LANDMARK_SIZE[site.kind],c=Math.cos(site.rotation),n=Math.sin(site.rotation);let clear=true;
   for(const [lx,lz] of [[0,0],[-1,-1],[1,-1],[-1,1],[1,1],[0,1],[0,-1],[1,0],[-1,0]]){const x=site.x+lx*hw*c+lz*hd*n,z=site.z-lx*hw*n+lz*hd*c;if(distanceToRoad(region,x,z)<1.5||waterDistance(region,x,z)<1.2||!canStandIn(colliders,x,z)){clear=false;break;}}
   if(!clear)continue;}
  props.push({kind:site.kind,x:site.x,z:site.z,sx:1,sy:1,sz:1,rotation:site.rotation,landmark:true});
  for(const s of SOLIDS[site.kind])colliders.push(toWorld(site,s));
  if(FLOORS[site.kind])floors.push(toWorld(site,FLOORS[site.kind]));
 }
 return props;
}
export const landmarkSites=region=>SITES[region];
