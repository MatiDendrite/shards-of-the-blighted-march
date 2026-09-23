// Test-side routing only. The game is still moved exclusively with real key input.
import {WORLD_LIMIT} from '../game/src/world-map.js';
export function route(start,goal,obstacles,radius=1,clearance=.75){
 const step=.6,key=(x,z)=>`${x},${z}`,point=(x,z)=>({x:x*step,z:z*step});
 // Software-rendered browser input can coast several simulation steps before
 // key-up arrives. Leave room for that drift when turning beside gate pillars.
 const clear=(x,z)=>Math.abs(x)<WORLD_LIMIT-.3&&Math.abs(z)<WORLD_LIMIT-.3&&!obstacles.some(c=>c.r?Math.hypot(x-c.x,z-c.z)<c.r+clearance:Math.abs(x-c.x)<c.w/2+clearance-.02&&Math.abs(z-c.z)<c.d/2+clearance-.02);
 const sx=Math.round(start[0]/step),sz=Math.round(start[1]/step),first={x:sx,z:sz,cost:0},open=[first],seen=new Map([[key(sx,sz),first]]);
 let end=null;
 while(open.length){open.sort((a,b)=>(a.cost+Math.hypot(a.x*step-goal.x,a.z*step-goal.z))-(b.cost+Math.hypot(b.x*step-goal.x,b.z*step-goal.z)));const n=open.shift(),p=point(n.x,n.z);
  if(Math.hypot(p.x-goal.x,p.z-goal.z)<radius){end=n;break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=n.x+dx,z=n.z+dz,k=key(x,z),v=point(x,z),cost=n.cost+step;if(!clear(v.x,v.z)||seen.has(k)&&seen.get(k).cost<=cost)continue;const next={x,z,cost,parent:n};seen.set(k,next);open.push(next);}
 }
 if(!end)throw Error(`No test route to ${goal.x},${goal.z}`);
 const path=[];while(end.parent){path.unshift(point(end.x,end.z));end=end.parent;}
 // Keep turning points only, avoiding needless per-grid-cell input calls.
 return path.filter((p,i)=>i===path.length-1||i===0||Math.sign(p.x-path[i-1].x)!==Math.sign(path[i+1].x-p.x)||Math.sign(p.z-path[i-1].z)!==Math.sign(path[i+1].z-p.z));
}
