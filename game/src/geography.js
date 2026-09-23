// Shared physical geography. Renderer, navigation, atlas and save migration use
// this same contract. Water and bridge decks keep their datum; dry-land relief
// and exact rendered triangle sampling live in terrain-height.js.
export const WATER_Y=-.46;
export function waterOutline(region,edge=.65){
 if(region===3)return Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return [47+Math.cos(a)*(7+edge),38+Math.sin(a)*(7+edge)];});
 const left=[],right=[],span=region===2?260:80;for(let z=-span;z<=span;z+=1){
  if(region<2){const w=(region===0?2.6:2.2)+edge;left.push([riverX(region,z)-w,z]);right.push([riverX(region,z)+w,z]);}
  else{left.push([coastX(z)-edge,z]);right.push([260,z]);}
 }return [...left,...right.reverse()];
}
export const riverX=(region,z)=>region===0?-48+3*Math.sin((z-8)/15):49+2*Math.sin((z-8)/15);
export const coastX=z=>53+1.4*Math.sin(z*.085);
export const waterDistance=(region,x,z)=>region<2?Math.abs(x-riverX(region,z))-(region===0?2.6:2.2):region===2?coastX(z)-x:Math.hypot(x-47,z-38)-7;
export function crossings(region){
 if(region<2)return (region===0?[8,-40]:[8,32]).map(z=>({kind:'bridge',x:riverX(region,z),z,y:-1.19,sx:1,sy:1,sz:1.2,rotation:Math.PI/2}));
 return region===2?[{kind:'bridge',x:55.1,z:8,y:-1.19,sx:1,sy:1,sz:1.1,rotation:Math.PI/2}]:[];
}
export const onCrossing=(region,x,z,margin=0)=>crossings(region).some(p=>Math.abs(x-p.x)<4.4*p.sz+margin&&Math.abs(z-p.z)<1.75+margin);
export const geographyBlocked=(region,x,z)=>waterDistance(region,x,z)<1.3&&!onCrossing(region,x,z);
export const beachWeight=(region,x,z)=>region===2?Math.max(0,Math.min(1,(10-waterDistance(region,x,z))/6)):0;
export function geographyHeight(region,x,z,original=0){
 const d=waterDistance(region,x,z),t=Math.max(0,Math.min(1,d/1.3));
 return d<1.3?-.98*(1-t*t*(3-2*t)):original;
}
export function geographyColliders(region){
 const result=[];
 // Half-metre strips follow the continuous shore, leaving real bridge openings.
 for(let z=-60;z<60;z+=.5){
  const mid=z+.25;if(crossings(region).some(p=>Math.abs(mid-p.z)<1.75))continue;
  if(region<2)result.push({x:riverX(region,mid),z:mid,w:(region===0?5.2:4.4)+2.6,d:.5,terrain:true});
  else if(region===2){const edge=coastX(mid)-1.3;result.push({x:(edge+64)/2,z:mid,w:64-edge,d:.5,terrain:true});}
  else if(Math.abs(mid-38)<8.3){const half=Math.sqrt(8.3**2-(mid-38)**2);result.push({x:47,z:mid,w:half*2,d:.5,terrain:true});}
 }
 for(const p of crossings(region))for(const side of [-1,1])result.push({x:p.x,z:p.z+side*2.02,w:8.12*p.sz,d:.25,terrain:true});
 // The sea pier is a destination, not an invisible bridge into open water.
 if(region===2)result.push({x:59.55,z:8,w:.25,d:4.3,terrain:true});
 return result;
}
export function geographyProps(region){
 const cliffs=[];
 const put=(x,z,sx,sy,sz,rotation=0)=>cliffs.push({kind:'cliff',x,z,y:0,sx,sy,sz,rotation});
 // Most mountain silhouettes are outside the playable bounds. The few crags
 // inside have solid footprints and never occupy portal or encounter routes.
 for(let i=0;i<8;i++){
  const z=-58+i*16,side=region===2?-1:region===1?1:i%2?1:-1;
  put(side*(66+(i%2)*3),z,1.7+(i%3)*.3,1.5+(i%3)*.6,1.4,(i%4)*.5);
 }
 for(const x of [-46,-23,23,46])put(x,-68,2,region===3?3.6:2.1,1.8,x*.04);
 if(region===0){put(-57,-22,.62,.8,.8);put(55,37,.7,.9,.85);}
 if(region===1){put(56,-36,.7,1.8,1.4);put(-55,36,.8,1.4,.9);}
 if(region===2){put(48,-48,.68,1.2,1);put(46,43,.55,.6,.8);}
 if(region===3){put(-54,-25,1.05,2.5,1.3);put(54,-25,1.05,2.5,1.3);put(55,49,.55,.9,.6);}
 return [...crossings(region),...cliffs];
}
export function scenicLocations(region){
 return [
  [{name:'Willow Run',x:-42,z:30,r:7,kind:'river'},{name:'Old Timber Crossing',x:-48,z:8,r:5,kind:'bridge'},{name:'Highbank Trail',x:-55,z:-40,r:5,kind:'bridge'}],
  [{name:'Mosswater Run',x:43,z:-27,r:6,kind:'river'},{name:'Forester’s Crossing',x:49,z:8,r:5,kind:'bridge'},{name:'Fernbank Bridge',x:49,z:32,r:5,kind:'bridge'}],
  [{name:'Saltwind Beach',x:47,z:22,r:7,kind:'beach'},{name:'Watchman’s Jetty',x:55,z:8,r:4,kind:'bridge'},{name:'The Pale Sea',x:59,z:-18,r:6,kind:'sea'}],
  [{name:'Mirror Tarn',x:38,z:38,r:6,kind:'lake'},{name:'The Crownwall',x:-49,z:-25,r:6,kind:'mountain'}],
 ][region];
}
