import {waterDistance,geographyHeight,crossings} from './geography.js';
import {buildingSites,gateSites} from './settlement-layout.js';

// One immutable height field for geometry, footing, aiming, camera and overlays.
// The sampler follows PlaneGeometry's actual triangle diagonal, not a second
// analytic approximation. No height needs to be stored in an existing save.
export const TERRAIN_SIZE=160,TERRAIN_SEGMENTS=192,TERRAIN_STEP=TERRAIN_SIZE/TERRAIN_SEGMENTS;
export const MAX_AXIS_GRADE=.42;
const HALF=TERRAIN_SIZE/2,N=TERRAIN_SEGMENTS+1,fields=new Map();
const bridgesByRegion=[0,1,2,3].map(crossings);
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export const TOWN_HEIGHT=[.85,1.15,1.35,1.65];
const hills=[
 [[-31,3,19,23,4.6],[34,-15,19,23,5.5],[-22,-42,19,16,3.1],[23,42,24,17,2.6]],
 [[-32,-14,19,22,5.8],[29,17,22,25,4.3],[-21,44,22,17,3.6],[29,-42,20,18,4.4]],
 [[-34,5,21,27,5.4],[28,-30,23,24,3.5],[-29,-43,22,18,4.2],[10,43,26,17,2.4]],
 [[-32,-21,22,23,5.2],[32,-17,22,25,5.6],[-26,38,23,21,3.5],[24,40,23,19,3.2]],
];
function landform(region,x,z){
 let y=.32;
 for(const [cx,cz,rx,rz,height] of hills[region]){const q=((x-cx)/rx)**2+((z-cz)/rz)**2;y+=height*Math.exp(-q*1.45);}
 // Small broad undulations, never noisy sawtooth geometry beneath the feet.
 y+=(.14+.1*Math.sin(x*.14+region))*Math.sin(z*.16+x*.07)**2;
 const town=1-smooth(0,12,Math.max(Math.abs(x)-18,Math.abs(z-8)-18));
 y+=(TOWN_HEIGHT[region]-y)*town;
 // The Court remains a level raised arena with generous approach grades.
 if(region===3)y+=(3.15-y)*(1-smooth(11,19,Math.hypot(x,z+38)));
 return y;
}
function heightFunction(region){
 const bridges=bridgesByRegion[region];
 const bridgeGrade=(x,z)=>{let factor=1;for(const p of bridges){const distance=Math.max(Math.abs(x-p.x)-(4.4*p.sz+1.5),Math.abs(z-p.z)-2.6);factor*=smooth(0,12,distance);}return factor;};
 const natural=(x,z)=>landform(region,x,z)*smooth(1.3,14,waterDistance(region,x,z))*bridgeGrade(x,z);
 const pads=[...buildingSites(region).map(p=>({...p,rx:(p.kind==='house'?3.7:2.1)*p.scale,rz:(p.kind==='house'?3.8:1.7)*p.scale})),...gateSites(region).map(p=>({...p,rx:6.1,rz:1.1}))].map(p=>({...p,y:natural(p.x,p.z)}));
 // Adjacent cottages/stalls share one terrace. Independent flat pads with
 // different levels otherwise create an abrupt ramp in the narrow gap.
 const parents=pads.map((_,i)=>i),find=i=>parents[i]===i?i:(parents[i]=find(parents[i]));
 const extents=pads.map(p=>({x:Math.abs(Math.cos(p.rotation))*p.rx+Math.abs(Math.sin(p.rotation))*p.rz,z:Math.abs(Math.sin(p.rotation))*p.rx+Math.abs(Math.cos(p.rotation))*p.rz}));
 for(let i=0;i<pads.length;i++)for(let j=i+1;j<pads.length;j++)if(Math.abs(pads[i].x-pads[j].x)<extents[i].x+extents[j].x+3&&Math.abs(pads[i].z-pads[j].z)<extents[i].z+extents[j].z+3)parents[find(j)]=find(i);
 const groups=new Map();pads.forEach((p,i)=>{const id=find(i);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(p);});
 for(const group of groups.values()){const central=group.some(p=>Math.abs(p.x)<18&&Math.abs(p.z-8)<18),height=central?TOWN_HEIGHT[region]:group.reduce((sum,p)=>sum+p.y,0)/group.length;group.forEach(p=>p.y=height);}
 return (x,z)=>{
  let y=natural(x,z),weightSum=1,weighted=y;const shore=Math.pow(smooth(1.3,14,waterDistance(region,x,z)),4);
  for(const p of pads){const c=Math.cos(p.rotation),s=Math.sin(p.rotation),dx=x-p.x,dz=z-p.z,u=dx*c-dz*s,v=dx*s+dz*c;
   const distance=Math.max(Math.abs(u)-p.rx,Math.abs(v)-p.rz),influence=1-smooth(0,12,distance),weight=shore*influence*influence/(1-influence+.00001);weightSum+=weight;weighted+=p.y*weight;
  }
  y=weighted/weightSum;
  // Dry banks slope gently to the original level decks. The water remains a
  // shared level plane; do not lift it with the surrounding hills.
  for(const p of bridges){const distance=Math.max(Math.abs(x-p.x)-(4.4*p.sz+.8),Math.abs(z-p.z)-2.2);y*=smooth(0,2,distance);}
  const border=smooth(62,79,Math.max(Math.abs(x),Math.abs(z)));
  y+=border*(4+3*Math.sin(x*.07+z*.09)**2+2*Math.cos(z*.1)**2);
  return geographyHeight(region,x,z,y);
 };
}
export function terrainField(region){
 if(!Number.isInteger(region)||region<0||region>3)throw new RangeError('Unknown terrain region');
 if(!fields.has(region)){
  const values=new Float32Array(N*N),height=heightFunction(region),beds=[];
  for(let z=0;z<N;z++)for(let x=0;x<N;x++){const px=x*TERRAIN_STEP-HALF,pz=z*TERRAIN_STEP-HALF,i=z*N+x,y=height(px,pz);values[i]=y;if(waterDistance(region,px,pz)<1.3){beds.push([i,y]);values[i]=Infinity;}}
  // Separable min-plus distance transform: lower abrupt edges into continuous
  // grades without raising the riverbed or changing X/Z collision footprints.
  // Dry-land triangles have |dy/dx| and |dy/dz| <= .42 (about 31 degrees combined).
  // Submerged banks are excluded: the riverbed must not lower bridge approaches.
  const step=MAX_AXIS_GRADE*TERRAIN_STEP;
  for(let z=0;z<N;z++){
   for(let x=1;x<N;x++){const i=z*N+x;values[i]=Math.min(values[i],values[i-1]+step);}
   for(let x=N-2;x>=0;x--){const i=z*N+x;values[i]=Math.min(values[i],values[i+1]+step);}
  }
  for(let x=0;x<N;x++){
   for(let z=1;z<N;z++){const i=z*N+x;values[i]=Math.min(values[i],values[i-N]+step);}
   for(let z=N-2;z>=0;z--){const i=z*N+x;values[i]=Math.min(values[i],values[i+N]+step);}
  }
  for(const [i,y] of beds)values[i]=y;
  fields.set(region,values);
 }
 return fields.get(region);
}
export function terrainHeight(region,x,z){
 const values=terrainField(region),gx=clamp((x+HALF)/TERRAIN_SIZE)*TERRAIN_SEGMENTS,gz=clamp((z+HALF)/TERRAIN_SIZE)*TERRAIN_SEGMENTS;
 const ix=Math.min(TERRAIN_SEGMENTS-1,Math.floor(gx)),iz=Math.min(TERRAIN_SEGMENTS-1,Math.floor(gz)),u=gx-ix,v=gz-iz,i=iz*N+ix;
 const a=values[i],b=values[i+N],c=values[i+N+1],d=values[i+1];
 return u+v<=1?a+(d-a)*u+(b-a)*v:c+(b-c)*(1-u)+(d-c)*(1-v);
}
export function groundHeight(region,x,z){const onDeck=bridgesByRegion[region]?.some(p=>Math.abs(x-p.x)<4.4*p.sz&&Math.abs(z-p.z)<1.75);return onDeck?Math.max(0,terrainHeight(region,x,z)):terrainHeight(region,x,z);}
export function groundGradient(region,x,z){const d=.16;return {x:(groundHeight(region,x+d,z)-groundHeight(region,x-d,z))/(2*d),z:(groundHeight(region,x,z+d)-groundHeight(region,x,z-d))/(2*d)};}
// Same height query as movement; ray marching brackets the first visible ground
// crossing, then bisects. A mouse target on a hill is not projected onto y=0.
export function intersectGroundRay(region,origin,direction,maxDistance=180){
 let prior=0,above=origin.y-groundHeight(region,origin.x,origin.z);
 if(above<=0)return null;
 for(let t=.5;t<=maxDistance;t+=.5){const x=origin.x+direction.x*t,z=origin.z+direction.z*t,delta=origin.y+direction.y*t-groundHeight(region,x,z);
  if(delta<=0){let lo=prior,hi=t;for(let n=0;n<12;n++){const mid=(lo+hi)/2,mx=origin.x+direction.x*mid,mz=origin.z+direction.z*mid;if(origin.y+direction.y*mid>groundHeight(region,mx,mz))lo=mid;else hi=mid;}const hit=(lo+hi)/2;return {x:origin.x+direction.x*hit,y:origin.y+direction.y*hit,z:origin.z+direction.z*hit};}
  prior=t;above=delta;
 }
 return null;
}
