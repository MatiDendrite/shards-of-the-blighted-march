import * as T from 'three';
import { ASSET, bakeStatic } from '../lib/assetlib.js';
import { SMITH } from './progression.js';
import { LANDSCAPES, seeded, sceneryLayout, pavingLayout, canStandIn } from './region-layout.js';
import { inTown, distanceToRoad, MAPS } from './world-map.js';
import {createLandscapeEffects} from './landscape-effects.js';
import {applyScenerySurfaces} from './art.js';
import {cameraTemplate,placeCameraObstacle} from './camera-obstacles.js';
import {createHallViews} from './interior-view.js';
import {DECOR} from './decor.js';
import {beachWeight,waterDistance,onCrossing} from './geography.js';
import {createGeographyView} from './geography-view.js';
import {createMeadowView} from './meadow-view.js';
import {createBankDressing} from './bank-dressing.js';
import {groundMoisture} from './landscape-ground.js';
import {TERRAIN_SIZE,TERRAIN_SEGMENTS,terrainHeight,groundHeight,groundGradient} from './terrain-height.js';

export async function createWorld(host,art){
  const names=['terrain','old_gate','standing_stone','pine','lantern','village_house','market_stall','village_well','hornbeam','garden_wall','village_standard','timber_bridge','limestone_cliff'];
  // Keep individual paving slabs until their regional layout is composed; bake afterwards.
  // Geometry/module construction overlaps texture transfer. Nothing is shown
  // until both finish; readiness still means the complete first region is playable.
  const [models,loadedArt]=await Promise.all([Promise.all(names.map(async n=>{const model=await ASSET(new URL(`../assets/${n}.js`,import.meta.url).href,{keepHierarchy:['terrain','old_gate','village_house','market_stall','village_well','timber_bridge'].includes(n)});if(!['pine','hornbeam'].includes(n))applyScenerySurfaces(model);return model;})),art]);art=loadedArt;
  models.forEach((m,i)=>{let meshes=0;m.traverse(o=>{if(o.isMesh)meshes++;});if(!meshes)throw new Error(`Required asset did not load: ${names[i]}`);});
  models.forEach(art.apply);
  const cameraKinds=['gate','stone','pine','lantern','house','stall','well','hornbeam','garden','standard','bridge','cliff'];
  const cameraTemplates=Object.fromEntries(cameraKinds.map((kind,i)=>[kind,cameraTemplate(kind,models[i+1])]));
  for(let i=5;i<models.length;i++)models[i]=bakeStatic(models[i]);
  const zones=[];let active=0;
  function tint(root,style){
    const mats=new Map();root.traverse(o=>{if(!o.isMesh)return;const original=o.material;
      if(!mats.has(original)){const m=original.clone(),color=style[m.name];if(color)m.color.multiply(new T.Color(color));mats.set(original,m);}o.material=mats.get(original);
    });return root;
  }
  function terrainFor(region,style){
    const root=models[0].clone(),slabs=[];
    root.traverse(o=>{if(o.isMesh&&o.material.name==='paving')slabs.push(o);});
    if(!slabs.length)throw new Error('Terrain paving hierarchy is missing.');
    slabs.forEach(o=>o.removeFromParent());
    tint(root,style);
    // The same triangulated field supports actors, paving and ground effects.
    root.traverse(o=>{if(o.isMesh&&o.material.name==='ground'){
      const geo=new T.PlaneGeometry(TERRAIN_SIZE,TERRAIN_SIZE,TERRAIN_SEGMENTS,TERRAIN_SEGMENTS);geo.rotateX(-Math.PI/2);const p=geo.attributes.position,uv=geo.attributes.uv,colors=new Float32Array(p.count*3),coverage=new Float32Array(p.count),sandCoverage=new Float32Array(p.count),rockCoverage=new Float32Array(p.count),wetness=new Float32Array(p.count),sand=new T.Color(0xffedc3);
      const earth=new T.Color(region===2?0xd4c7ae:region===3?0xbfc1c1:0xf1ead9),green=new T.Color(region===2?0xb3a17b:region===3?0xabb4ab:0xe2e8cc),color=new T.Color();
      for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),noise=.5+.24*Math.sin(x*.13+z*.19)+.2*Math.cos(z*.31-x*.08),verge=Math.min(1,Math.max(0,(distanceToRoad(region,x,z)-.7)/2.6)),plaza=Math.min(1,Math.max(0,(Math.hypot(x,z-8)-8.5)/2)),court=region===3?Math.min(1,Math.max(0,(Math.hypot(x,z+38)-11)/3)):1,beach=beachWeight(region,x,z),bank=Math.min(1,Math.max(0,(waterDistance(region,x,z)-1.3)/2));sandCoverage[i]=beach;coverage[i]=verge*plaza*court*bank*(1-beach)*(region===2?.24:region===3?.54:.92);color.copy(earth).lerp(green,verge*.45).lerp(sand,beach);color.multiplyScalar(.9+noise*.16);color.toArray(colors,i*3);p.setY(i,terrainHeight(region,x,z));const slope=groundGradient(region,x,z);rockCoverage[i]=Math.min(.82,Math.max(0,(Math.hypot(slope.x,slope.z)-.18)*2))*verge*(1-beach);uv.setXY(i,x/3,z/3);}
      for(let i=0;i<p.count;i++)wetness[i]=groundMoisture(waterDistance(region,p.getX(i),p.getZ(i)),p.getY(i));
      geo.computeVertexNormals();
      geo.setAttribute('color',new T.BufferAttribute(colors,3));geo.setAttribute('meadowWeight',new T.BufferAttribute(coverage,1));geo.setAttribute('sandWeight',new T.BufferAttribute(sandCoverage,1));geo.setAttribute('rockWeight',new T.BufferAttribute(rockCoverage,1));geo.setAttribute('wetWeight',new T.BufferAttribute(wetness,1));o.geometry=geo;o.material.vertexColors=true;
    }});
    if(region>=2){
      const stone=slabs[0].material;
      root.traverse(o=>{if(o.isMesh&&o.material.name==='ground'){
        // Reuse the original limestone surface for dry ash / a dark stone foundation.
        o.material.map=stone.map;o.material.bumpMap=stone.map;o.material.bumpScale=.025;o.material.normalMap=null;
      }});
    }
    root.position.y=0;
    const output=new T.Group(),sectors=new Map();output.add(bakeStatic(root));
    const templates=slabs.slice(0,24).map(o=>tint(o.clone(),style));
    const trim=templates.map(o=>{const t=o.clone();t.material=t.material.clone();t.material.color.multiplyScalar(.52);return t;}),inlay=templates.map(o=>{const t=o.clone();t.material=t.material.clone();t.material.color.setHex(0xb5a47d);return t;});
    pavingLayout(region).forEach((p,i)=>{const r=Math.hypot(p.x,p.z-8),border=Math.abs(r-8.65)<.24||Math.abs(r-3.85)<.2,sigil=r<3.2&&Math.abs(Math.abs(p.x)+Math.abs(p.z-8)-2.15)<.26,palette=border?trim:sigil?inlay:templates,tile=palette[i%palette.length].clone();tile.position.set(p.x,groundHeight(region,p.x,p.z)+.035,p.z);tile.rotation.y=p.rotation;tile.scale.set(p.sx,1,p.sz);const slope=groundGradient(region,p.x,p.z),normal=new T.Vector3(-slope.x,1,-slope.z).normalize();tile.quaternion.premultiply(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),normal));const key=`${Math.floor(p.x/12)},${Math.floor(p.z/12)}`;if(!sectors.has(key))sectors.set(key,new T.Group());sectors.get(key).add(tile);});
    for(const sector of sectors.values())output.add(bakeStatic(sector));
    // Millimetre bevels receive the world shadow, but do not need their own shadow pass.
    output.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});return output;
  }
  function build(region){
    const scene=new T.Group();scene.name=`region-${region}`;
    const style=LANDSCAPES[region],layout=sceneryLayout(region),{colliders,lanterns}=layout,scenery=[...colliders,...layout.floors];
    const solidProps=layout.props.filter(p=>!p.decor),cameraObstacles=solidProps.map(p=>placeCameraObstacle(cameraTemplates[p.kind],p)),openObstacles=cameraObstacles.filter((o,i)=>!solidProps[i].hall);
    if(region===0)colliders.push({x:SMITH.x,z:SMITH.z,r:.4});
    scene.add(terrainFor(region,style));
    const prototypes={gate:models[1],stone:models[2],pine:models[3],lantern:models[4],house:models[5],stall:models[6],well:models[7],hornbeam:models[8],garden:models[9],standard:models[10],bridge:models[11],cliff:models[12]};
    // Material variants are shared across placements and never mutate another region.
    for(const kind of ['stone','pine','gate','house','well','hornbeam','garden','standard','bridge','cliff'])prototypes[kind]=tint(prototypes[kind].clone(),style);
    // Regional heraldry and foliage keep the shared constructors visually distinct.
    prototypes.standard.traverse(o=>{if(o.isMesh&&o.material.name==='banner')o.material.color.setHex([0x824b3e,0x4d6851,0x9a8050,0x655778][region]);});
    if(region===2){const needles=[];prototypes.pine.traverse(o=>{if(o.isMesh&&o.material.name==='needles')needles.push(o);});needles.forEach(o=>o.removeFromParent());}
    const sectors=new Map(),coverSectors=new Map(),coverChunks=[];
    function place(proto,x,z,sx=1,sy=sx,sz=sx,rotation=0,cover=false){
      const obj=proto.clone();obj.position.set(x,groundHeight(region,x,z),z);obj.scale.set(sx,sy,sz);obj.rotation.y=rotation;
      const key=`${Math.floor(x/10)},${Math.floor(z/10)}`,buckets=cover?coverSectors:sectors;
      if(!buckets.has(key))buckets.set(key,new T.Group());buckets.get(key).add(obj);return obj;
    }
    for(const p of layout.props)if(!p.hall&&!p.decor)place(prototypes[p.kind],p.x,p.z,p.sx,p.sy,p.sz,p.rotation).position.y=p.y||0;
    // Enterable houses stay out of the static bake so they can open into rooms.
    const halls=createHallViews(scene,layout.props.filter(p=>p.hall).map(p=>({x:p.x,z:p.z,scale:p.sx,rotation:p.rotation,hall:p.hall})),prototypes.house,(x,z)=>groundHeight(region,x,z));
    for(const {x,z,y,lit} of lanterns)if(lit){const light=new T.PointLight(style.light,8,8,2);light.position.set(x,y+1.9,z);scene.add(light);}
    const rand=seeded(9404+region*331),grassmat=Object.assign(new T.MeshStandardMaterial({color:style.grass,roughness:1,side:T.DoubleSide,vertexColors:true}),{name:'foliage'});
    for(let i=0;i<Math.floor(style.cover/37);i++){
      const x=(rand()-.5)*120,z=(rand()-.5)*120;
      const onRoad=Math.hypot(x,z-8)<10||distanceToRoad(region,x,z)<1.6||(region===3&&Math.hypot(x-MAPS[3].shard.x,z-MAPS[3].shard.z)<12);
      if(onRoad||beachWeight(region,x,z)>.2||onCrossing(region,x,z,1)||!canStandIn(scenery,x,z))continue;
      // Organic patches with breathing space, rather than an even dotted carpet.
      if(region<2&&Math.sin(x*.37+Math.cos(z*.29))*Math.cos(z*.41)<-.35&&rand()>.2)continue;
      if(inTown(x,z)&&rand()>.28)continue;
      // Low stones along verges reuse the authored standing-stone constructor.
      if(!inTown(x,z))place(prototypes.stone,x+.35,z,.08+rand()*.08,.045,.09+rand()*.06,rand()*6.28,true);
    }
    // Small wildflower islands reuse a tiny geometry cluster and never block combat.
    const flowerMats=[0xc5bca0,region===2?0xc4a070:0x9c83ba].map(color=>Object.assign(new T.MeshStandardMaterial({color,roughness:1,side:T.DoubleSide}),{name:'petals'}));
    const flower=new T.Group();
    for(let i=0;i<7;i++){const x=Math.sin(i*2.399)*.27,z=Math.cos(i*2.399)*.27,h=.2+(i%3)*.09;const stem=new T.Mesh(new T.CylinderGeometry(.008,.012,h,3),grassmat);stem.position.set(x,h/2,z);flower.add(stem);for(let j=0;j<4;j++){const petal=new T.Mesh(new T.CircleGeometry(.047,5),flowerMats[i%2]);petal.rotation.x=-Math.PI/2;petal.position.set(x+Math.sin(j*1.57)*.033,h,z+Math.cos(j*1.57)*.033);flower.add(petal);}}
    const blooms=bakeStatic(flower);
    for(let i=0;i<(region<2?650:180);i++){const x=(rand()-.5)*112,z=(rand()-.5)*112;if(beachWeight(region,x,z)>.2||onCrossing(region,x,z,1)||distanceToRoad(region,x,z)<1.9||Math.hypot(x,z-8)<10||!canStandIn(scenery,x,z)||(region===3&&Math.hypot(x,z+38)<13))continue;if(Math.sin(x*.32)*Math.cos(z*.28)<.35)continue;const k=.8+rand()*.5;place(blooms,x,z,k,k,k,0,true);}
    for(const sector of sectors.values())scene.add(bakeStatic(sector));
    for(const [key,sector] of coverSectors){const [x,z]=key.split(',').map(Number),root=bakeStatic(sector);coverChunks.push({root,x:x*10+5,z:z*10+5});root.visible=Math.hypot(x*10+5,z*10+5-11)<42;scene.add(root);}
    // Distance fading shrinks plants into their own hill, not the old y=0 plane.
    scene.traverse(o=>{if(o.isMesh&&['foliage','petals'].includes(o.material.name)){const p=o.geometry.attributes.position,base=new Float32Array(p.count);for(let i=0;i<p.count;i++)base[i]=groundHeight(region,p.getX(i),p.getZ(i));o.geometry.setAttribute('groundBase',new T.BufferAttribute(base,1));}});
    art.finish(scene);
    // Instanced geometry must stay outside bakeStatic, which expands instances.
    const meadow=createMeadowView(scene,region,style,scenery);
    const banks=createBankDressing(scene,region,colliders);
    const effects=createLandscapeEffects(scene,layout.props,region);
    const geography=createGeographyView(scene,region);
    const dustGeo=new T.BufferGeometry(),points=[];
    for(let i=0;i<300;i++){const x=(rand()-.5)*120,z=(rand()-.5)*120;points.push(x,groundHeight(region,x,z)+.4+rand()*5,z);}
    dustGeo.setAttribute('position',new T.Float32BufferAttribute(points,3));
    const dust=new T.Points(dustGeo,new T.PointsMaterial({color:style.dust,size:region===1?.05:.035,transparent:true,opacity:.6}));scene.add(dust);
    return {region,style,decorProps:layout.props.filter(p=>p.decor),decorated:false,root:scene,colliders,cameraObstacles,openObstacles,halls,time:0,dust,effects,geography,meadow,banks,coverChunks};
  }
  zones[0]=build(0);host.add(zones[0].root);
  // Dressing props load after the player starts: carts, camps, ruins and
  // bushes bake into culled 10 m sectors a few at a time between frames.
  let decorModels=null;
  function loadDecor(){decorModels??=Promise.all(Object.entries(DECOR).map(async([kind,d])=>{const model=await ASSET(new URL(`../assets/${d.file}.js`,import.meta.url).href);art.apply(model);return[kind,model];})).then(Object.fromEntries);return decorModels;}
  async function decorate(zone){
   if(zone.decorated)return;zone.decorated=true;const models=await loadDecor(),protos={},sectors=new Map();
   for(const kind of Object.keys(models))protos[kind]=tint(models[kind].clone(),zone.style);
   for(const p of zone.decorProps){const obj=protos[p.kind].clone();obj.position.set(p.x,p.y,p.z);obj.scale.set(p.sx,p.sy,p.sz);obj.rotation.y=p.rotation;const key=`${Math.floor(p.x/10)},${Math.floor(p.z/10)}`;if(!sectors.has(key))sectors.set(key,new T.Group());sectors.get(key).add(obj);}
   // Time-sliced: a few milliseconds of baking per frame, never one long stall.
   let slice=performance.now();
   for(const [key,sector] of sectors){const [x,z]=key.split(',').map(Number),root=bakeStatic(sector);root.name='decor-sector';root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});art.finish(root);zone.root.add(root);zone.coverChunks.push({root,x:x*10+5,z:z*10+5});if(performance.now()-slice>12){await new Promise(r=>setTimeout(r,0));slice=performance.now();}}
   zone.decorReady=true;
  }
  return {
    get dust(){return zones[active].dust;},get colliders(){return zones[active].colliders;},get atmosphere(){const {hour,azimuth}=LANDSCAPES[active];return {hour,azimuth};},
    // Inside a room the camera looks over the cut walls, not the missing roof.
    get cameraObstacles(){const z=zones[active];return z.halls.inside?z.openObstacles:z.cameraObstacles;},
    get interior(){return zones[active].halls.inside;},
    decorate(){return decorate(zones[active]);},get decorReady(){return !!zones[active].decorReady;},
    setRegion(region){const created=!zones[region];if(created)zones[region]=build(region);if(region!==active){host.remove(zones[active].root);host.add(zones[region].root);}active=region;return created;},
    canStand(x,z){return canStandIn(zones[active].colliders,x,z);},
    heightAt(x,z){return groundHeight(active,x,z);},
    update(dt,player={x:0,z:11}){const zone=zones[active];zone.time+=dt;zone.halls.update(zone.time,player);art.update(dt,player);zones[active].effects.update(dt);zones[active].geography.update(dt);zones[active].meadow.update(dt,player);zones[active].banks.update(dt,player);for(const c of zones[active].coverChunks)c.root.visible=Math.hypot(c.x-player.x,c.z-player.z)<42;},
  };
}
