// Deterministic regional settlement + wilderness compositions of 404 assets.
import {WORLD_LIMIT,TOWN,EXIT,NPCS,MAPS,inTown,landmarks,roads,distanceToRoad} from './world-map.js';
import {geographyColliders,geographyProps,waterDistance,onCrossing,riverX} from './geography.js';
export {WORLD_LIMIT};
export const LANDSCAPES = [
 {ground:0xffffff,stone:0xfff5e3,needles:0xffffff,leaves:0xffffff,grass:0x6c794b,light:0xffac52,dust:0xc1c5a0,hour:16.5,azimuth:245,cover:16000},
 {ground:0xb5c4a5,stone:0xbac4ad,needles:0xa1bc95,leaves:0xafc99c,grass:0x617744,light:0xcce49c,dust:0xc7e58f,hour:16,azimuth:205,cover:12000},
 {ground:0xb4a18a,stone:0xc4aa92,needles:0x7b6552,grass:0xaca077,light:0xffb474,dust:0xc7aa8f,hour:17.6,azimuth:285,cover:2300},
 {ground:0x83848d,stone:0xbab7cb,needles:0x9096b3,grass:0x737a6c,light:0xb2baff,dust:0xbeb7e4,hour:17.9,azimuth:225,cover:3600},
];
export function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function sceneryLayout(region){
 const props=[],colliders=geographyColliders(region),lanterns=[],rand=seeded(8404+region*771);
 for(const p of geographyProps(region)){
  props.push(p);
  if(p.kind==='cliff'){
   const c=Math.abs(Math.cos(p.rotation)),s=Math.abs(Math.sin(p.rotation));
   colliders.push({x:p.x,z:p.z,w:9*p.sx*c+6*p.sz*s,d:9*p.sx*s+6*p.sz*c,terrain:true});
  }
 }
 const add=(kind,x,z,sx=1,sy=sx,sz=sx,rotation=0)=>props.push({kind,x,z,sx,sy,sz,rotation});
 const rock=(x,z,sx=1,sy=sx,sz=sx)=>{if(waterDistance(region,x,z)<1.8||onCrossing(region,x,z,1))return;add('stone',x,z,sx,sy,sz,rand()*6);colliders.push({x,z,r:.75*Math.max(sx,sz)});};
 const building=(kind,x,z,scale=1,rotation=0)=>{
  add(kind,x,z,scale,scale,scale,rotation);
  const [w,d]=kind==='house'?[5.8,6.4]:kind==='stall'?[3.4,2.2]:[2.6,2.2];
  const c=Math.abs(Math.cos(rotation)),s=Math.abs(Math.sin(rotation));
  colliders.push({x,z,w:(w*c+d*s)*scale,d:(w*s+d*c)*scale});
 };
 const gate=(x,z,rotation=0)=>{
  add('gate',x,z,1,1,1,rotation);
  for(const [local,w,d] of [[-2.4,1.2,1.2],[2.4,1.2,1.2],[-4.5,3.3,.6],[4.5,3.3,.6]]){
   const c=Math.cos(rotation),s=Math.sin(rotation);colliders.push({x:x+local*c,z:z-local*s,w:Math.abs(w*c)+Math.abs(d*s),d:Math.abs(w*s)+Math.abs(d*c)});
  }
 };
 // A real central settlement, with open cardinal streets and exterior-only houses.
 const houses=region===0?[[-12,-3,1],[12,-3,1],[-12,17,1.05],[12,20,.9],[-7,-7,.78],[7,25,.85],[-9,29,.8],[14,30,.72]]:
  region===1?[[-12,-3,.83],[12,-3,.8],[-12,19,.9],[12,22,.8],[-8,29,.72],[9,31,.7]]:
  region===2?[[-13,-3,.85],[13,-3,.9],[-12,19,.9],[12,23,.75],[-9,30,.7]]:
  [[-12,-3,.85],[12,-3,.85],[-12,20,.8],[12,23,.78]];
 for(const [x,z,s] of houses)building('house',x,z,s,x<0?Math.PI/2:-Math.PI/2);
 building('stall',7,-2,.95);building('stall',-7,17,.9,Math.PI/2);building('well',3,7,.85);
 for(const n of NPCS)colliders.push({x:n.x,z:n.z,r:.35});
 // The northern exit is separate from the settlement gates.
 gate(0,-53);
 for(const s of [-1,1]){gate(s*23,8,Math.PI/2);gate(s*36,-24);}
 gate(0,-15);gate(0,31);
 // Regional landmarks: ruined courts / rocky ridges / dense forest glades.
 if(region===3){
  for(let i=0;i<14;i++){const a=(i+.5)*Math.PI*2/14,x=Math.sin(a)*14,z=-38+Math.cos(a)*14;if(Math.abs(x)>4)rock(x,z,1.3,1.8,1.3);}
  for(const s of [-1,1])gate(s*18,-38,Math.PI/2);
 }else{
  for(const [cx,cz] of [[-34,-32],[34,-32]])for(const [dx,dz] of [[-9,-5],[9,-5],[-9,7],[9,7]])rock(cx+dx,cz+dz,region===2?2.1:1.4,region===1?.7:1.7,1.4);
 }
 for(const side of [-1,1])for(let i=0;i<12;i++){
  const x=side*(51+rand()*6),z=-54+i*9;
  if(distanceToRoad(region,x,z)>4)rock(x,z,1.8+rand(),region===2?1.5+rand():.7+rand(),1.5+rand());
 }
 // Small hamlets, old camps and orchard markers give the southern loop a purpose.
 for(const side of [-1,1]){building('house',side*27,40,.7,side<0?Math.PI/2:-Math.PI/2);building('stall',side*32,45,.8);rock(side*7,45,.7,.65,.8);}
 // Small riverside and coastal destinations use the same authored kit, but
 // belong to their landscape instead of repeating the market everywhere.
 if(region===0){building('house',-56,17,.62,Math.PI/2);building('stall',-56,-33,.7);}
 if(region===1){building('house',56,22,.6,-Math.PI/2);building('stall',56,27,.65);}
 if(region===2){building('stall',47,17,.85,-Math.PI/2);building('house',47,-14,.65,-Math.PI/2);}
 for(let z=-54;z<=54;z+=9)for(const side of [-1,1]){
  if(region>1)continue;const bridge=geographyProps(region).find(p=>p.kind==='bridge'&&Math.abs(p.z-z)<5);if(bridge)continue;
  // Low bank stones are solid but leave both bridge approaches and hunting
  // clearings open; their scale exposes the water edge rather than hiding it.
  const x=riverX(region,z)+side*((region===0?2.6:2.2)+2.3);if(distanceToRoad(region,x,z)>2.5)rock(x,z,.35,.16,.4);
 }
 // Human-scale courtyard edges. Keep entrances and the four roads unobstructed.
 for(const side of [-1,1]){
  for(const [x,z,k] of [[7.3,15.4,.72],[17,-9,.85],[17,27,.75]]){
   const px=x*side;if(canStandIn(colliders,px,z)){add('hornbeam',px,z,k);colliders.push({x:px,z,r:.32*k});}
  }
  for(const [x,z] of [[6,-1.8],[6,23]]){
   const px=x*side;if([-1.95,0,1.95].every(dx=>canStandIn(colliders,px+dx,z))){add('garden',px,z);colliders.push({x:px,z,w:3.9,d:.9});}
  }
  for(const z of [-11,27]){const x=side*3.7;if(canStandIn(colliders,x-.37,z)){add('standard',x,z);colliders.push({x:x-.37,z,r:.36});}}
 }
 const protectedPoints=landmarks(region);
 const count=[390,500,130,200][region];
 for(let i=0;i<count;i++){
  const x=(rand()-.5)*138,z=(rand()-.5)*138,k=.65+rand()*.65;
  if(inTown(x,z)||waterDistance(region,x,z)<(region===2?9:3)||onCrossing(region,x,z,2)||distanceToRoad(region,x,z)<3.5||protectedPoints.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+1)||colliders.some(c=>c.r?Math.hypot(x-c.x,z-c.z)<c.r+1:Math.abs(x-c.x)<c.w/2+2&&Math.abs(z-c.z)<c.d/2+2))continue;
  const kind=region!==2&&i%3===0?'hornbeam':'pine';add(kind,x,z,k,region===1?k*1.15:k,k,rand()*6.28);if(Math.abs(x)<WORLD_LIMIT&&Math.abs(z)<WORLD_LIMIT)colliders.push({x,z,r:.32*k});
 }
 // Light only the market; distant lanterns retain their emissive mesh without costly lights.
 for(const [x,z] of [[-3,11],[8,11],[-5,-5],[5,-5],[-5,23],[5,23],[-25,11],[25,11],[-3,-18],[3,34],[-3,-55],[3,-55]]){
  add('lantern',x,z);lanterns.push({x,z,lit:inTown(x,z)});colliders.push({x,z,r:.1});
 }
 return {props,colliders,lanterns};
}
export function canStandIn(colliders,x,z){
 if(Math.abs(x)>WORLD_LIMIT||Math.abs(z)>WORLD_LIMIT)return false;
 return !colliders.some(c=>c.r?Math.hypot(x-c.x,z-c.z)<c.r+.3:Math.abs(x-c.x)<c.w/2+.28&&Math.abs(z-c.z)<c.d/2+.28);
}
export function pavingLayout(region){
 const tiles=[],used=new Set(),rand=seeded(7504+region);
 const put=(x,z,sx=1.55,sz=1.55,rotation=0)=>{
  if(waterDistance(region,x,z)<1.6||onCrossing(region,x,z,.3))return;
  const key=`${Math.round(x*3)},${Math.round(z*3)}`;if(used.has(key))return;used.add(key);
  tiles.push({x,z,sx,sz,rotation});
 };
 // Staggered market paving is shared, but the wilderness routes and surfaces differ.
 for(let row=0;row<38;row++)for(let col=0;col<48;col++){const x=(col-23.5)*.415+(row%2)*.2075,z=(row-18.5)*.535+8;if(Math.hypot(x,z-8)<9.7)put(x+(rand()-.5)*.018,z+(rand()-.5)*.018,1.55,1.45,(rand()-.5)*.045);}
 for(const path of roads(region))for(let p=1;p<path.length;p++){
  const [ax,az]=path[p-1],[bx,bz]=path[p],length=Math.hypot(bx-ax,bz-az),angle=Math.atan2(bx-ax,bz-az);
  for(let d=0;d<length;d+=.59)for(const offset of [-.45,0,.45]){
   const x=ax+(bx-ax)*d/length+Math.cos(angle)*offset,z=az+(bz-az)*d/length-Math.sin(angle)*offset;
   if(Math.hypot(x,z-8)<9.7)continue;
   if(region===1&&!inTown(x,z)&&rand()<.45)continue;
   put(x+(rand()-.5)*.08,z+(rand()-.5)*.08,region===2?1.85:1.65,1.65,angle+(rand()-.5)*.2);
  }
 }
 if(region===3)for(let ring=1;ring<=16;ring++){const r=ring*.72,n=Math.round(r*8.5);for(let i=0;i<n;i++){const a=i/n*Math.PI*2;put(Math.sin(a)*r,-38+Math.cos(a)*r,1.65,1.5,a);}}
 return tiles;
}
