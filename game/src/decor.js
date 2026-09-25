// Deterministic settlement and wilderness dressing. Placement is pure data so
// navigation, colliders and tests see the same world the renderer builds.
// Encounter clearings, roads, water, portals, doorways and townsfolk stay open.
import {WORLD_LIMIT,NPCS,ARRIVAL,portalsFor,landmarks,MAPS,distanceToRoad} from './world-map.js';
import {waterDistance,onCrossing} from './geography.js';
import {FIELD_PATROLS} from './campaign-data.js';
import {buildingSites} from './settlement-layout.js';
import {hallDoor} from './interiors.js';
import {groundHeight} from './terrain-height.js';

// Footprints in metres (local x width, z depth) and whether the prop blocks.
export const DECOR={
 cart:{file:'supply_cart',w:1.9,d:3.5,solid:true},stack:{file:'supply_stack',w:2.1,d:2,solid:true},woodpile:{file:'woodpile',w:2.4,d:1.7,solid:true},
 hay:{file:'hay_bales',w:2.7,d:2.4,solid:true},tent:{file:'camp_tent',w:2.6,d:3,solid:true,clear:[3.6,5.2]},colonnade:{file:'ruined_colonnade',w:5.4,d:2.2,solid:true},
 bush:{file:'berry_bush',w:1.6,d:1.6,solid:false},log:{file:'fallen_log',w:3.6,d:1,solid:true},sign:{file:'waymarker',w:.5,d:.5,solid:true},fence:{file:'rail_fence',w:4.3,d:.3,solid:true},
};
function keepouts(region){
 const k=[{x:0,z:8,r:10.5},{...ARRIVAL,r:3},{...MAPS[region].shard,r:region===3?17:10}];
 for(const p of portalsFor(region))k.push({x:p.x,z:p.z,r:6});
 for(const n of NPCS)k.push({x:n.x,z:n.z,r:2.6});
 if(region===0)k.push({x:-3.8,z:13,r:2.6});
 for(const e of FIELD_PATROLS)k.push({x:e.x,z:e.z,r:4.5});
 for(const [x,z] of [[-35,7],[35,9]])k.push({x,z,r:5});
 for(const s of buildingSites(region))if(s.hall){const d=hallDoor(s);k.push({x:d.x,z:d.z,r:2.4});}
 return k;
}
const corners=(x,z,w,d,rotation,pad=0)=>{const c=Math.cos(rotation),s=Math.sin(rotation),out=[[x,z]];for(const [lx,lz] of [[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[0,1],[-1,0],[1,0]]){const px=lx*(w/2+pad),pz=lz*(d/2+pad);out.push([x+px*c+pz*s,z-px*s+pz*c]);}return out;};
const boxCollider=(x,z,w,d,rotation)=>{const c=Math.abs(Math.cos(rotation)),s=Math.abs(Math.sin(rotation));return{x,z,w:w*c+d*s,d:w*s+d*c,decor:true};};

export function decorLayout(region,{colliders,floors,canStandIn,rand}){
 const props=[],blocked=keepouts(region),placed=[];
 const free=(x,z)=>canStandIn(colliders,x,z)&&canStandIn(floors,x,z);
 function put(kind,x,z,rotation=0,{road=2.4,roadMax=Infinity,scale=1}={}){
  const def=DECOR[kind],[cw,cd]=def.clear||[def.w,def.d],w=cw*scale,d=cd*scale,reach=Math.hypot(w,d)/2;
  if(Math.abs(x)>WORLD_LIMIT-3-reach||Math.abs(z)>WORLD_LIMIT-3-reach)return false;
  if(blocked.some(k=>Math.hypot(x-k.x,z-k.z)<k.r+reach*.6))return false;
  // Settlement lanes stay clear even where a road bends away from them.
  if(kind!=='sign'&&(Math.abs(x)<3.4+reach&&z>-18&&z<34||Math.abs(z-8.5)<3.4+reach&&Math.abs(x)<26))return false;
  if(placed.some(p=>Math.hypot(x-p.x,z-p.z)<p.reach+reach+.4))return false;
  const pts=corners(x,z,w,d,rotation,.35);
  for(const [px,pz] of pts){const r=distanceToRoad(region,px,pz);if(r<road||waterDistance(region,px,pz)<2.2||onCrossing(region,px,pz,2)||!free(px,pz))return false;}
  if(distanceToRoad(region,x,z)>roadMax)return false;
  // Only fairly level ground: the prop is later sunk to its lowest corner, so
  // a steep site would either float one side or bury the other.
  const heights=pts.map(([px,pz])=>groundHeight(region,px,pz));if(Math.max(...heights)-Math.min(...heights)>({bush:.5,tent:.6,colonnade:.8}[kind]??.4))return false;
  props.push({kind,x,z,sx:scale,sy:scale,sz:scale,rotation,decor:true});placed.push({x,z,reach});
  if(def.solid){if(kind==='tent'){colliders.push(boxCollider(x,z-.4*scale,def.w*scale,def.d*scale*.85,rotation),{x:x+Math.sin(rotation)*1.2,z:z+Math.cos(rotation)*1.6,r:.55,decor:true});}else colliders.push(boxCollider(x,z,def.w*scale,def.d*scale,rotation));}
  return true;
 }
 // Try candidates around a centre until `count` land; deterministic via rand.
 function scatter(kind,count,cx,cz,radius,options={},tries=count*14){let n=0;for(let i=0;i<tries&&n<count;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*radius;if(put(kind,cx+Math.cos(a)*r,cz+Math.sin(a)*r,options.face?options.face(cx+Math.cos(a)*r,cz+Math.sin(a)*r):rand()*Math.PI*2,{...options,scale:(options.scale||1)*(.9+rand()*.2)}))n++;}return n;}
 const rustic=region<2,marks=landmarks(region);
 // Market town: stock beside houses and stalls, carts on the side streets,
 // firewood at the outer houses, waymarkers at every town exit.
 // Offsets are in each house's own frame (front +Z): beside the gables and behind.
 const around=[[5.3,-1.2],[-5.3,-1.2],[5.3,1.6],[-5.3,1.6],[0,-5.4],[2.4,-5.4],[-2.4,-5.4]];
 for(const s of buildingSites(region))if(s.kind==='house'&&!s.hall){let landed=0;for(const [i,[lx,lz]] of around.entries()){if(landed>=2)break;const c=Math.cos(s.rotation),sn=Math.sin(s.rotation),k=s.scale,x=s.x+(lx*c+lz*sn)*k,z=s.z+(-lx*sn+lz*c)*k,kind=['woodpile','stack','hay'][(i+landed)%(region<2?3:2)];if(put(kind,x,z,s.rotation+(Math.abs(lx)>3?Math.PI/2:0),{road:1.4}))landed++;}}
 scatter('stack',4,0,8,17,{road:1.8});scatter('cart',region===3?1:3,0,8,20,{road:1.5,face:(x,z)=>Math.atan2(-x,8-z)},160);
 if(rustic)scatter('hay',2,0,8,18,{road:1.8});
 for(const [x,z,rot] of [[-21,10.6,Math.PI/2],[21,5.4,-Math.PI/2],[2.4,-13,0],[-2.4,30,Math.PI]])put('sign',x,z,rot,{road:1.2,roadMax:3.2});
 // Wilderness: camps in the meadows, ruins, farm fences, felled trunks, bushes.
 for(const m of marks){
  if(m.kind==='glade'&&scatter('tent',1,m.x,m.z,m.r+5,{face:(x,z)=>Math.atan2(m.x-x,m.z-z)},120)){scatter('stack',1,m.x,m.z,m.r+5);scatter('cart',1,m.x,m.z,m.r+6,{road:1.6});}
  if(m.kind==='ruin')scatter('colonnade',region>=2?2:1,m.x,m.z,m.r+4,{},120);
  if(m.kind==='grove'&&rustic)scatter('hay',2,m.x,m.z,m.r+4);
 }
 for(const [x,z] of [[-10,43],[10,43],[-44,-4],[44,-4]])put('sign',x,z,rand()*Math.PI*2,{road:1.2,roadMax:3.5});
 if(rustic)for(const [cx,cz] of [[-24,24],[24,24],[-26,-8],[26,-8]])scatter('fence',3,cx,cz,8,{road:2,face:()=>Math.round(rand())*Math.PI/2});
 scatter('log',10,0,0,56,{road:2.2});scatter('colonnade',region>=2?3:1,0,-8,52,{road:3});
 scatter('bush',region<2?70:50,0,4,57,{road:1.6});
 return props;
}
