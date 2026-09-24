import * as T from 'three';
import {bankPlantGeometry} from '../assets/bank_plants.js';
import {seeded,canStandIn} from './region-layout.js';
import {riverX,coastX,waterDistance,onCrossing} from './geography.js';
import {inTown,distanceToRoad} from './world-map.js';
import {groundHeight,groundGradient} from './terrain-height.js';

export function bankPlacements(region,colliders){
 const random=seeded(51041+region*937),plants=[];
 const add=(kind,x,z,scale)=>{
  if(inTown(x,z)||distanceToRoad(region,x,z)<1.9||onCrossing(region,x,z,1)||!canStandIn(colliders,x,z))return;
  if(region===3&&Math.hypot(x,z+38)<16)return;
  const slope=groundGradient(region,x,z);if(Math.hypot(slope.x,slope.z)>.4)return;
  plants.push({kind,x,z,y:groundHeight(region,x,z),scale,angle:random()*Math.PI*2,shade:.82+random()*.3});
 };
 for(let i=0;i<190;i++){
  const z=-56+random()*112,offset=1.7+random()*2.4;let x,shoreZ=z;
  if(region<2)x=riverX(region,z)+(random()<.5?-1:1)*((region===0?2.6:2.2)+offset);
  else if(region===2)x=coastX(z)-offset;
  else{const a=random()*Math.PI*2;x=47+Math.cos(a)*(7+offset);shoreZ=38+Math.sin(a)*(7+offset);}
  const kind=i%3===0?'pebbles':region===2?'dune':i%3===1?'fern':'reeds';
  if(kind!=='pebbles'&&Math.sin(x*.37+shoreZ*.43)<-.4)continue;
  add(kind,x,shoreZ,kind==='reeds'?.7+random()*.38:.7+random()*.55);
 }
 // Forest-floor islands, not an even carpet across hunting and travel routes.
 if(region<2)for(let i=0;i<480;i++){
  const x=(random()-.5)*112,z=(random()-.5)*112;
  if(waterDistance(region,x,z)<3||Math.sin(x*.31)*Math.cos(z*.22)<.3)continue;
  add('fern',x,z,.7+random()*.45);
 }
 return plants;
}

export function createBankDressing(scene,region,colliders){
 const root=new T.Group();root.name='bank-dressing';scene.add(root);
 const time={value:0},focus={value:new T.Vector2(0,11)},chunks=[],buckets=new Map(),geometries=new Map(),materials=new Map();
 for(const p of bankPlacements(region,colliders)){
  const key=`${p.kind}:${Math.floor(p.x/12)},${Math.floor(p.z/12)}`;
  if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(p);
 }
 const matrix=new T.Matrix4(),rotation=new T.Quaternion(),up=new T.Vector3(0,1,0),position=new T.Vector3(),scale=new T.Vector3(),color=new T.Color();
 for(const placements of buckets.values()){
  const kind=placements[0].kind;
  if(!geometries.has(kind))geometries.set(kind,bankPlantGeometry(T,kind));
  if(!materials.has(kind)){
   const palette={fern:0x9eaf83,reeds:0xb0aa7d,dune:0xc4ba90,pebbles:0x858c87};
   const material=new T.MeshStandardMaterial({color:palette[kind],vertexColors:true,roughness:kind==='pebbles'?.83:.94,side:T.DoubleSide});material.name=`bank-${kind}`;
   material.onBeforeCompile=shader=>{
    shader.uniforms.uBankTime=time;shader.uniforms.uBankFocus=focus;
    shader.vertexShader='uniform float uBankTime; uniform vec2 uBankFocus;\n'+shader.vertexShader;
    if(kind!=='pebbles')shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
     vec3 bankRoot=(modelMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
     float h=max(position.y,0.0);
     float shelter=mix(.06,1.0,smoothstep(1.8,3.8,distance(bankRoot.xz,uBankFocus)));
     transformed.x+=sin(uBankTime*1.5+bankRoot.x*.35+bankRoot.z*.27)*h*h*.09;
     transformed.y*=shelter;
    `);
   };
   material.customProgramCacheKey=()=>`bank-dressing-v1-${kind}`;materials.set(kind,material);
  }
  const mesh=new T.InstancedMesh(geometries.get(kind),materials.get(kind),placements.length);mesh.name=`bank-${kind}`;mesh.receiveShadow=true;
  placements.forEach((p,i)=>{
   rotation.setFromAxisAngle(up,p.angle);matrix.compose(position.set(p.x,p.y-.01,p.z),rotation,scale.setScalar(p.scale));mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,color.setRGB(p.shade,p.shade,p.shade));
  });
  mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingBox();mesh.boundingBox.expandByScalar(.15);mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.15;
  root.add(mesh);chunks.push({mesh,x:Math.floor(placements[0].x/12)*12+6,z:Math.floor(placements[0].z/12)*12+6});
 }
 const update=(dt,player={x:0,z:11})=>{
  time.value+=Number.isFinite(dt)?Math.max(0,Math.min(dt,.1)):0;focus.value.set(player.x,player.z);
  for(const c of chunks)c.mesh.visible=Math.hypot(c.x-player.x,c.z-player.z)<38;
 };
 update(0);return {root,chunks,update};
}
