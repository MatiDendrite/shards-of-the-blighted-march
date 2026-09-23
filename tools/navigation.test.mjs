import test from 'node:test';
import assert from 'node:assert/strict';
import {route} from './navigation.mjs';
import {sceneryLayout,canStandIn} from '../game/src/region-layout.js';
const obstacles=[...[-2.75,2.75].flatMap(x=>[9,0,-9,-19].map(z=>({x,z,r:.1}))),...[[-4,3],[4.4,-3],[-5.5,-9],[5.5,-13]].map(([x,z])=>({x,z,r:.75}))];
const clear=(x,z)=>!obstacles.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+.3);
for(const [x,z] of [[3.881,-8.95],[-2.336,-.211],[0,-20]])test(`input routing can approach ${x}, ${z} around lanterns`,()=>{
 const pos=[.289,-8.323],path=route(pos,{x,z},obstacles,.95);let done=false;
 for(let i=0;i<3000;i++){
  if(Math.hypot(pos[0]-x,pos[1]-z)<1.3){done=true;break;}
  while(path.length>1&&Math.hypot(path[0].x-pos[0],path[0].z-pos[1])<.35)path.shift();const target=path[0]||{x,z};
  let dx=Math.abs(target.x-pos[0])>.18?Math.sign(target.x-pos[0]):0,dz=Math.abs(target.z-pos[1])>.18?Math.sign(target.z-pos[1]):0;const l=Math.hypot(dx,dz)||1;dx=dx/l*.34;dz=dz/l*.34;
  if(clear(pos[0]+dx,pos[1]))pos[0]+=dx;if(clear(pos[0],pos[1]+dz))pos[1]+=dz;
 }
 assert(done,JSON.stringify({pos,path}));
});
test('wide browser routes leave steering drift room at settlement gate pillars',()=>{
 const obstacles=sceneryLayout(0).colliders,path=route([-35,9.98],{x:36,z:8},obstacles,1.2,1.3);
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
  for(let d=0;d<=length;d+=.2)for(const drift of [-.7,0,.7]){
   const x=a.x+dx*d/length-dz/length*drift,z=a.z+dz*d/length+dx/length*drift;
   assert(canStandIn(obstacles,x,z),JSON.stringify({x,z,a,b,drift}));
  }
 }
});
