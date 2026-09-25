import * as T from 'three';
import {seeded,canStandIn} from './region-layout.js';
import {inTown,distanceToRoad,MAPS} from './world-map.js';
import {beachWeight,onCrossing} from './geography.js';
import {groundHeight,groundGradient} from './terrain-height.js';

// Tapered ribbons, not transparent crossed cards. Each blade is five triangles;
// two nested layers let distant meadows lose detail progressively.
export function meadowGeometry(first=0,count=3){
 const positions=[],colors=[],indices=[];
 for(let b=first;b<first+count;b++){
  const angle=b*2.399963,h=.57+(b%4)*.115,bend=.16+(b%3)*.055,c=Math.cos(angle),s=Math.sin(angle),start=positions.length/3;
  for(let row=0;row<4;row++){
   const t=row/3,width=row===3?0:(.029+(b%3)*.011)*Math.sin((.13+t*.87)*Math.PI),lean=t*t*bend;
   for(let side=0;side<(row===3?1:2);side++){
    const x=(side?1:-1)*width;
    const spread=.12+(b%3)*.055;
    positions.push(c*x+s*lean+s*spread,t*h,-s*x+c*lean+c*spread);
    const shade=.32+.68*t,warm=b%3===0;colors.push(shade*(warm?1.13:.93),shade,shade*(warm?.68:.86));
   }
  }
  for(let row=0;row<2;row++){const i=start+row*2;indices.push(i,i+1,i+2,i+1,i+3,i+2);}
  indices.push(start+4,start+5,start+6);
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}

export function meadowPlacements(region,style,colliders){
 const random=seeded(79404+region*331),sectors=new Map();
 for(let i=0;i<Math.round(style.cover*2.1);i++){
  const x=(random()-.5)*120,z=(random()-.5)*120;
  if(Math.hypot(x,z-8)<10||distanceToRoad(region,x,z)<1.65||(region===3&&Math.hypot(x-MAPS[3].shard.x,z-MAPS[3].shard.z)<12))continue;
  if(beachWeight(region,x,z)>.2||onCrossing(region,x,z,1)||!canStandIn(colliders,x,z))continue;
  const patch=Math.sin(x*.18+Math.cos(z*.21))*Math.cos(z*.24);
  if((patch<-.46&&random()>.34)||(inTown(x,z)&&random()>.3))continue;
  const slope=groundGradient(region,x,z),scale=.72+random()*.48,key=`${Math.floor(x/12)},${Math.floor(z/12)}`;
  if(!sectors.has(key))sectors.set(key,[]);
  sectors.get(key).push({x,z,y:groundHeight(region,x,z)-.025,scale,angle:random()*Math.PI*2,shade:.78+random()*.3,hue:.5+.5*Math.sin(x*.22+Math.cos(z*.17)),slope});
 }
 return sectors;
}

export function createMeadowView(scene,region,style,colliders){
 const time={value:0},focus={value:new T.Vector2(0,11)},chunks=[],geometries=[meadowGeometry(),meadowGeometry(3,5)];
 const materials=[0,1].map(detail=>{
  const m=new T.MeshStandardMaterial({color:style.grass,roughness:.96,side:T.DoubleSide,vertexColors:true});m.name=`meadow-${detail}`;
  m.onBeforeCompile=shader=>{
   shader.uniforms.uMeadowTime=time;shader.uniforms.uMeadowFocus=focus;
   shader.vertexShader='uniform float uMeadowTime; uniform vec2 uMeadowFocus;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vec3 root=(modelMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
    float reach=distance(root.xz,uMeadowFocus);
    float fade=1.0-smoothstep(${detail?'15.0,24.0':'33.0,43.0'},reach);
    // Keep the immediate fighting space below grounded attack warnings.
    float shelter=mix(.07,1.0,smoothstep(2.25,3.6,reach));
    float h=position.y;
    float gust=sin(root.x*.19+root.z*.27-uMeadowTime*1.6);
    float ripple=sin(root.x*1.1-root.z*.6+uMeadowTime*2.3);
    transformed.x+=(gust*.16+ripple*.035)*h*h;
    transformed.z+=cos(root.z*.31-uMeadowTime*1.25)*.08*h*h;
    transformed.y*=fade*shelter;
   `);
  };
  m.customProgramCacheKey=()=>`instanced-meadow-v2-${detail}`;return m;
 });
 const matrix=new T.Matrix4(),rotation=new T.Quaternion(),yaw=new T.Quaternion(),up=new T.Vector3(0,1,0),normal=new T.Vector3(),position=new T.Vector3(),scale=new T.Vector3(),color=new T.Color();
 for(const [key,placements] of meadowPlacements(region,style,colliders)){
  const [sx,sz]=key.split(',').map(Number),root=new T.Group();root.name='instanced-meadow-sector';
  for(let layer=0;layer<2;layer++){
   const mesh=new T.InstancedMesh(geometries[layer],materials[layer],placements.length);mesh.name=`meadow-layer-${layer}`;mesh.receiveShadow=true;
   for(let i=0;i<placements.length;i++){
    const p=placements[i];rotation.setFromUnitVectors(up,normal.set(-p.slope.x,1,-p.slope.z).normalize());yaw.setFromAxisAngle(up,p.angle);rotation.multiply(yaw);
    const width=p.scale*(.8+p.hue*.35);
    matrix.compose(position.set(p.x,p.y,p.z),rotation,scale.set(width,p.scale,width));mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,color.setRGB(p.shade*(.88+p.hue*.2),p.shade,p.shade*(.86+(1-p.hue)*.12)));
   }
   mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;
   mesh.computeBoundingBox();mesh.boundingBox.expandByScalar(.3);mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.3;
   // Receive building/tree shadows; base shading comes from vertex colours.
   // No second shadow pass with mismatched wind-deformed geometry.
   root.add(mesh);
  }
  scene.add(root);chunks.push({root,x:sx*12+6,z:sz*12+6});
 }
 const update=(dt,player={x:0,z:11})=>{time.value+=Math.min(dt,.1);focus.value.set(player.x,player.z);for(const c of chunks){const distance=Math.hypot(c.x-player.x,c.z-player.z);c.root.visible=distance<52;c.root.children[1].visible=distance<33;}};
 update(0);return {update,chunks};
}
