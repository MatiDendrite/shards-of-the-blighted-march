import * as T from 'three';
import { ASSET, bakeStatic } from '../lib/assetlib.js';
import { SMITH } from './progression.js';

export async function createWorld(scene,art){
  const names=['terrain','old_gate','standing_stone','pine','lantern'];
  const models=await Promise.all(names.map(n=>ASSET(new URL(`../assets/${n}.js`,import.meta.url).href,{surfaces:n!=='pine'})));
  models.forEach((m,i)=>{let meshes=0;m.traverse(o=>{if(o.isMesh)meshes++;});if(!meshes)throw new Error(`Required asset did not load: ${names[i]}`);});
  models.forEach(art.apply);
  const [terrain,gate,stone,pine,lantern]=models,colliders=[],lanterns=[];
  colliders.push({x:SMITH.x,z:SMITH.z,r:.4});
  const ground=terrain.clone(); // Loader centres/grounds scenery; terrain keeps its authored path coordinates below.
  ground.position.y=-.025;scene.add(ground);
  const sectors=new Map();
  function place(proto,x,z,scale=1,rotation=0){const obj=proto.clone();obj.position.set(x,0,z);obj.scale.setScalar(scale);obj.rotation.y=rotation;const key=`${Math.floor(x/12)},${Math.floor(z/12)}`;if(!sectors.has(key))sectors.set(key,new T.Group());sectors.get(key).add(obj);return obj;}
  place(gate,0,-17,1,0);
  colliders.push({x:-2.4,z:-17,w:1.2,d:1.2},{x:2.4,z:-17,w:1.2,d:1.2},{x:-4.5,z:-17,w:3.3,d:.6},{x:4.5,z:-17,w:3.3,d:.6});
  const markers=[[-4,3],[4.4,-3],[-5.5,-9],[5.5,-13],[-7,11],[7,8]];
  markers.forEach(([x,z],i)=>{place(stone,x,z,.55+(i%3)*.19,i*1.4);colliders.push({x,z,r:.75});});
  let seed=8404;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<110;i++){const s=i%2?1:-1,x=s*(7+rand()*25),z=-31+rand()*61,k=.65+rand()*.8;place(pine,x,z,k,rand()*6.28);if(Math.abs(x)<20&&Math.abs(z)<26)colliders.push({x,z,r:.3*k});}
  for(const z of [9,0,-9,-19])for(const s of [-1,1]){const x=s*2.75;place(lantern,x,z);lanterns.push({x,z});colliders.push({x,z,r:.10});}
  for(const {x,z} of lanterns){const light=new T.PointLight(0xffac52,8,8,2);light.position.set(x,1.9,z);scene.add(light);}
  // Small procedural ground cover; built from constructors and clustered by sector.
  const grassmat=Object.assign(new T.MeshStandardMaterial({color:0x46543b,roughness:1,side:T.DoubleSide}),{name:'foliage'});
  const blade=new T.ConeGeometry(.017,.31,3,1);
  for(let i=0;i<900;i++){const x=(rand()-.5)*48,z=(rand()-.5)*58;if(Math.abs(x)<2.2)continue;const tuft=new T.Group();for(let b=0;b<3;b++){const m=new T.Mesh(blade,grassmat);m.position.set((rand()-.5)*.22,.15,(rand()-.5)*.22);m.rotation.z=(rand()-.5)*.4;tuft.add(m);}place(tuft,x,z,.5+rand(),rand()*6.28);}
  for(const sector of sectors.values())scene.add(bakeStatic(sector));
  const dustGeo=new T.BufferGeometry(),points=[];
  for(let i=0;i<100;i++)points.push((rand()-.5)*32,.4+rand()*5,(rand()-.5)*45);
  dustGeo.setAttribute('position',new T.Float32BufferAttribute(points,3));
  const dust=new T.Points(dustGeo,new T.PointsMaterial({color:0xc1c5a0,size:.035,transparent:true,opacity:.6}));scene.add(dust);
  return {colliders,dust,canStand(x,z){if(Math.abs(x)>19||z>22||z< -23)return false;for(const c of colliders){if(c.r){if(Math.hypot(x-c.x,z-c.z)<c.r+.3)return false;}else if(Math.abs(x-c.x)<c.w/2+.28&&Math.abs(z-c.z)<c.d/2+.28)return false;}return true;}};
}
