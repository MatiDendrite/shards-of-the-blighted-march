import * as T from 'three';
import {loadActorAsset} from './actor-surfaces.js';
import {mergeJoints} from './actor-batching.js';
import {loadNpcActor} from './npc-actors.js';
import {landmarks} from './world-map.js';
import {waterDistance,WATER_Y} from './geography.js';
import {groundHeight} from './terrain-height.js';
import {seeded} from './region-layout.js';

// Ambient life: deer that graze and bolt, finches that take flight, hens by
// the houses, butterflies over the meadows, villagers on the lanes and fish
// leaping near the hero. Purely cosmetic; none of it blocks or fights.
const SEEN=40;
// A townsfolk stroll: legs and opposite arms swing, the torso sways a little.
function walkCycle(actor){const parts={},rest={};for(const n of ['torso','head','leftArm','rightArm','leftLeg','rightLeg','leftShin','rightShin']){const o=actor.getObjectByName(n);if(o){parts[n]=o;rest[n]=o.rotation.clone();}}
 return (t,{swing=0}={})=>{for(const [n,o] of Object.entries(parts))o.rotation.copy(rest[n]);const r=(n,ax,v)=>{if(parts[n])parts[n].rotation[ax]+=v;};
  r('leftLeg','x',swing);r('rightLeg','x',-swing);r('leftShin','x',Math.max(0,-swing)*.8);r('rightShin','x',Math.max(0,swing)*.8);r('leftArm','x',-swing*.7);r('rightArm','x',swing*.7);r('torso','y',swing*.08);r('head','y',Math.sin(t*.7)*.15);};}
export function createWildlife(scene){
 const root=new T.Group();root.name='wildlife';scene.add(root);
 let protos=null,region=-1,canStand=()=>true,rand=Math.random,creatures=[],flutter=null,fish=null,splash=null,nextJump=3,time=0;
 async function load(){
  if(protos)return protos;
  const url=f=>new URL(`../assets/${f}.js`,import.meta.url).href;
  const [deer,hen,bird,walker,trader]=await Promise.all([loadActorAsset(url('deer'),{keepHierarchy:true,surfaces:true}),loadActorAsset(url('chicken'),{keepHierarchy:true,surfaces:true}),loadActorAsset(url('songbird'),{keepHierarchy:true,surfaces:true}),loadNpcActor('guide'),loadNpcActor('merchant')]);
  for(const a of [deer,hen,bird]){mergeJoints(a);a.traverse(o=>{delete o.userData.joints;});}
  // Villagers: townsfolk builds with their joint prefixes stripped for the
  // walking gait, re-dyed so they never pass for Rowan or Mara.
  const dye=(actor,role,shift)=>{actor.traverse(o=>{if(o.name.startsWith(role+'-'))o.name=o.name.slice(role.length+1);});const tints=new Map();actor.traverse(o=>{if(!o.isMesh)return;if(!tints.has(o.material)){const m=o.material.clone(),hsl={};m.color.getHSL(hsl);if(hsl.s>.12)m.color.setHSL((hsl.h+shift)%1,hsl.s,hsl.l);tints.set(o.material,m);}o.material=tints.get(o.material);});return actor;};
  const villagers=[dye(walker,'guide',.42),dye(trader,'merchant',.28)];
  protos={deer,hen,bird,villager:villagers[0],villager2:villagers[1]};return protos;
 }
 function clear(){for(const c of creatures)c.node.removeFromParent();creatures=[];flutter?.removeFromParent();fish?.removeFromParent();splash?.removeFromParent();flutter=fish=splash=null;}
 const h=(x,z)=>groundHeight(region,x,z);
 function spawn(kind,x,z,extra={}){const node=protos[kind].clone(true);node.position.set(x,h(x,z),z);root.add(node);const c={kind,node,x,z,homeX:x,homeZ:z,angle:rand()*Math.PI*2,tx:x,tz:z,timer:rand()*4,state:'idle',phase:rand()*10,vx:0,vy:0,vz:0,y:0,...extra};
  c.parts=Object.fromEntries(['head','leftFront','rightFront','leftRear','rightRear','tail','leftLeg','rightLeg','leftWing','rightWing'].map(n=>[n,node.getObjectByName(n)]).filter(([,v])=>v));if(kind.startsWith('villager')){c.motion=walkCycle(node);c.kind='villager';}creatures.push(c);return c;}
 function setRegion(next,standTest){
  if(!protos||next===region)return;clear();region=next;canStand=standTest;rand=seeded(7331+region*53);
  const marks=landmarks(region),glades=marks.filter(m=>m.kind==='glade'||m.kind==='grove');
  for(const g of glades)for(let i=0;i<(region===3?1:2);i++){const a=rand()*6.28,r=5+rand()*5,x=g.x+Math.cos(a)*r,z=g.z+Math.sin(a)*r;if(canStand(x,z)&&waterDistance(region,x,z)>2)spawn('deer',x,z);}
  for(const g of [...glades,{x:0,z:-24},{x:24,z:-8}]){const a=rand()*6.28,cx=g.x+Math.cos(a)*6,cz=g.z+Math.sin(a)*6;for(let i=0;i<4;i++){const x=cx+(rand()-.5)*2.4,z=cz+(rand()-.5)*2.4;if(canStand(x,z))spawn('bird',x,z,{flock:g});}}
  if(region<3)for(const [x,z] of [[-8.6,-6],[8.6,-5.2],[-8.4,20],[15,-9]])if(canStand(x,z))spawn('hen',x,z);
  for(const [n,[axis,from,to,at]] of [['z',-12,27,1.1],['x',-21,21,9.6]].entries()){const x=axis==='z'?at:from,z=axis==='z'?from:at;const v=spawn(n%2?'villager2':'villager',x,z,{axis,from,to,at,dir:1,speed:1.05+rand()*.25});v.along=from+(to-from)*rand();}
  // Butterflies: two wing cards per instance, flapping via instance matrices.
  const count=28,wing=new T.PlaneGeometry(.09,.07).translate(.045,0,0),mat=new T.MeshStandardMaterial({color:0xffffff,roughness:.7,side:T.DoubleSide,vertexColors:false});
  flutter=new T.InstancedMesh(wing,mat,count*2);flutter.frustumCulled=false;flutter.userData.homes=[];const palette=[0xf2c14e,0xe86f5a,0x9fd4f0,0xf5f0e6,0xc58ae8];
  for(let i=0;i<count;i++){const g=i%3?glades[i%glades.length]:{x:0,z:8,r:14},a=rand()*6.28,r=3+rand()*(g.r||10);flutter.userData.homes.push({x:g.x+Math.cos(a)*r,z:g.z+Math.sin(a)*r,phase:rand()*10});const c=new T.Color(palette[i%palette.length]);flutter.setColorAt(i*2,c);flutter.setColorAt(i*2+1,c);}
  root.add(flutter);
  fish=new T.Mesh(new T.SphereGeometry(.1,10,6).scale(1,.5,2.2),new T.MeshStandardMaterial({color:0xb9c6cc,roughness:.3,metalness:.4}));fish.visible=false;root.add(fish);
  splash=new T.Mesh(new T.RingGeometry(.8,1,32).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xf0faff,transparent:true,opacity:0,depthWrite:false}));splash.visible=false;root.add(splash);
 }
 const pose=new T.Object3D();
 function steer(c,speed,dt){const dx=c.tx-c.x,dz=c.tz-c.z,d=Math.hypot(dx,dz);if(d<.15)return false;const a=Math.atan2(dx,dz);c.angle+=Math.atan2(Math.sin(a-c.angle),Math.cos(a-c.angle))*Math.min(1,dt*5);const nx=c.x+Math.sin(c.angle)*speed*dt,nz=c.z+Math.cos(c.angle)*speed*dt;if(!canStand(nx,nz)||waterDistance(region,nx,nz)<1.5){c.tx=c.homeX;c.tz=c.homeZ;return false;}c.x=nx;c.z=nz;return true;}
 function update(dt,player){
  if(!protos||region<0)return;time+=dt;
  for(const c of creatures){
   const pd=Math.hypot(c.x-player.x,c.z-player.z);c.node.visible=pd<(c.kind==='hen'||c.kind==='bird'?30:SEEN)&&c.state!=='gone';if(pd>SEEN+10&&c.kind!=='villager')continue;
   if(c.kind==='deer'){
    if(pd<9&&c.state!=='flee'){c.state='flee';c.timer=3.5;const a=Math.atan2(c.x-player.x,c.z-player.z);c.tx=c.x+Math.sin(a)*14;c.tz=c.z+Math.cos(a)*14;}
    c.timer-=dt;if(c.state==='flee'&&c.timer<=0)c.state='idle';
    if(c.state==='idle'&&c.timer<=0){c.timer=5+rand()*5;const a=rand()*6.28,r=rand()*6;c.tx=c.homeX+Math.cos(a)*r;c.tz=c.homeZ+Math.sin(a)*r;}
    const moving=steer(c,c.state==='flee'?5.6:.9,dt);c.phase+=dt*(c.state==='flee'?11:4)*(moving?1:0);const swing=moving?Math.sin(c.phase)*(c.state==='flee'?.7:.3):0;
    for(const [n,s] of [['leftFront',1],['rightFront',-1],['leftRear',-1],['rightRear',1]])if(c.parts[n])c.parts[n].rotation.x=swing*s;
    if(c.parts.head)c.parts.head.rotation.x=moving?0:.9+Math.sin(time*1.3+c.homeX)*.12;if(c.parts.tail)c.parts.tail.rotation.x=Math.sin(time*6)*.2;
    c.node.position.set(c.x,h(c.x,c.z)+(c.state==='flee'?Math.abs(Math.sin(c.phase))*.12:0),c.z);c.node.rotation.y=c.angle;
   }else if(c.kind==='hen'){
    if(pd<1.8){const a=Math.atan2(c.x-player.x,c.z-player.z);c.tx=c.x+Math.sin(a)*2;c.tz=c.z+Math.cos(a)*2;c.timer=1;}
    c.timer-=dt;if(c.timer<=0){c.timer=2+rand()*3;const a=rand()*6.28;c.tx=c.homeX+Math.cos(a)*2.4;c.tz=c.homeZ+Math.sin(a)*2.4;}
    const moving=steer(c,pd<1.8?2.6:.55,dt);c.phase+=dt*(moving?14:0);
    if(c.parts.leftLeg){c.parts.leftLeg.rotation.x=moving?Math.sin(c.phase)*.6:0;c.parts.rightLeg.rotation.x=moving?-Math.sin(c.phase)*.6:0;}
    if(c.parts.head)c.parts.head.rotation.x=moving?0:Math.max(0,Math.sin(time*5+c.homeZ))*.9;
    c.node.position.set(c.x,h(c.x,c.z)+(moving?Math.abs(Math.sin(c.phase))*.03:0),c.z);c.node.rotation.y=c.angle;
   }else if(c.kind==='bird'){
    if(c.state==='gone'){c.timer-=dt;if(c.timer<=0&&pd>12){c.state='idle';c.x=c.homeX;c.z=c.homeZ;c.y=0;}continue;}
    if(c.state==='idle'&&pd<7){c.state='fly';const a=Math.atan2(c.x-player.x,c.z-player.z)+(rand()-.5);c.vx=Math.sin(a)*6;c.vz=Math.cos(a)*6;c.vy=3+rand()*2;c.timer=5;c.angle=a;}
    if(c.state==='fly'){c.x+=c.vx*dt;c.z+=c.vz*dt;c.y+=c.vy*dt;c.vy=Math.max(.8,c.vy-dt*1.2);c.timer-=dt;const flap=Math.sin(time*38+c.homeX)*1.1;if(c.parts.leftWing){c.parts.leftWing.rotation.z=flap;c.parts.rightWing.rotation.z=-flap;}if(c.timer<=0){c.state='gone';c.timer=20;}}
    else{if(c.parts.leftWing){c.parts.leftWing.rotation.z=-1.3;c.parts.rightWing.rotation.z=1.3;}c.timer-=dt;if(c.timer<=0){c.timer=.6+rand()*1.5;c.angle+=(rand()-.5)*2;}c.y=Math.max(0,Math.sin(time*9+c.homeZ*3))*.02;c.node.rotation.x=Math.max(0,Math.sin(time*4+c.homeX))*.5;}
    c.node.position.set(c.x,h(c.x,c.z)+c.y,c.z);c.node.rotation.y=c.angle;
   }else if(c.kind==='villager'){
    c.along+=c.dir*c.speed*dt;if(c.along>c.to){c.along=c.to;c.dir=-1;}else if(c.along<c.from){c.along=c.from;c.dir=1;}
    // Villagers step aside when the hero walks the same lane.
    const side=pd<1.6?.9:0,lx=c.axis==='z'?c.at+side:c.along,lz=c.axis==='z'?c.along:c.at+side;c.x+=(lx-c.x)*Math.min(1,dt*6);c.z+=(lz-c.z)*Math.min(1,dt*6);
    c.angle=c.axis==='z'?(c.dir>0?0:Math.PI):(c.dir>0?Math.PI/2:-Math.PI/2);c.phase+=dt*c.speed*3.2;c.motion(time,{swing:Math.sin(c.phase)*.45,phase:'idle'});
    c.node.position.set(c.x,h(c.x,c.z)+.02,c.z);c.node.rotation.y=c.angle;
   }
  }
  if(flutter){const homes=flutter.userData.homes;for(let i=0;i<homes.length;i++){const hm=homes[i],t=time*.6+hm.phase,x=hm.x+Math.sin(t)*1.4+Math.sin(t*2.3)*.4,z=hm.z+Math.cos(t*.8)*1.2,y=h(hm.x,hm.z)+.7+Math.sin(t*3.1)*.25,flap=Math.sin(time*22+hm.phase)*1.1,dir=Math.atan2(Math.cos(t),-Math.sin(t*.8));
    for(const s of [1,-1]){pose.position.set(x,y,z);pose.rotation.set(0,dir,s*flap,'YXZ');pose.scale.set(s,1,1);pose.updateMatrix();flutter.setMatrixAt(i*2+(s>0?0:1),pose.matrix);}}
   flutter.instanceMatrix.needsUpdate=true;flutter.visible=Math.abs(player.x)<80;}
  // Fish leap in open water within sight of the hero, every few seconds.
  nextJump-=dt;if(fish&&!fish.visible&&nextJump<=0){nextJump=3+rand()*5;for(let k=0;k<8;k++){const a=rand()*6.28,r=6+rand()*9,x=player.x+Math.sin(a)*r,z=player.z+Math.cos(a)*r;if(waterDistance(region,x,z)<-1){fish.userData={x,z,a:rand()*6.28,t:0};fish.visible=true;break;}}}
  if(fish?.visible){const f=fish.userData;f.t+=dt/.8;const d=(f.t-.5)*1.4;fish.position.set(f.x+Math.sin(f.a)*d,WATER_Y+Math.sin(Math.min(1,f.t)*Math.PI)*.9,f.z+Math.cos(f.a)*d);fish.rotation.set(-Math.cos(f.t*Math.PI)*.9,f.a,0);
   if(f.t>=1){fish.visible=false;splash.visible=true;splash.userData={t:0};splash.position.set(fish.position.x,WATER_Y+.02,fish.position.z);}}
  if(splash?.visible){const s=splash.userData;s.t+=dt/1.1;splash.scale.setScalar(.3+s.t*1.2);splash.material.opacity=(1-s.t)*.6;if(s.t>=1)splash.visible=false;}
 }
 return{load,setRegion,update,get count(){return creatures.length;},reset(){const r=region;region=-1;clear();return r;}};
}
