import * as T from 'three';
import {WATER_Y} from './geography.js';
import {CAST_TIME} from './fishing.js';

// Procedural rod, line, float, ripples and a leaping catch. The rod rides the
// hero's weapon mount so it stays in the active class's hand.
function makeRod(){
 const rod=new T.Group();rod.name='fishing-rod';
 const wood=new T.MeshStandardMaterial({color:0x7a5534,roughness:.7}),cork=new T.MeshStandardMaterial({color:0xb99468,roughness:.9}),brass=new T.MeshStandardMaterial({color:0xc9a25a,metalness:.7,roughness:.35});
 const shaft=new T.Mesh(new T.CylinderGeometry(.009,.022,2.1,6).translate(0,1.0,0),wood);
 const grip=new T.Mesh(new T.CylinderGeometry(.03,.028,.34,8).translate(0,-.1,0),cork);
 const reel=new T.Mesh(new T.CylinderGeometry(.045,.045,.035,12).rotateZ(Math.PI/2).translate(.045,.08,0),brass);
 for(const y of [.55,1.05,1.5,1.9]){const ring=new T.Mesh(new T.TorusGeometry(.016,.004,4,8).rotateY(Math.PI/2).translate(.018,y,0),brass);rod.add(ring);}
 rod.add(shaft,grip,reel);rod.rotation.x=.95;rod.userData.tip=new T.Vector3(0,2.05,0);return rod;
}
function makeFish(){
 const g=new T.Group();g.name='caught-fish';
 const body=new T.Mesh(new T.SphereGeometry(.12,12,8).scale(1,.55,2.1),new T.MeshStandardMaterial({color:0xc9d3d6,roughness:.3,metalness:.35}));
 const tail=new T.Mesh(new T.ConeGeometry(.1,.16,4).rotateX(-Math.PI/2).scale(.25,1,1).translate(0,0,-.3),body.material);
 const fin=new T.Mesh(new T.ConeGeometry(.05,.1,3).scale(.2,1,1.4).translate(0,.08,0),body.material);
 g.add(body,tail,fin);g.userData.material=body.material;return g;
}

export function createFishingView(scene,hero,heightAt){
 const root=new T.Group();root.name='fishing';scene.add(root);
 const rod=makeRod();rod.visible=false;
 const segments=14,linePositions=new Float32Array((segments+1)*3),lineGeometry=new T.BufferGeometry();lineGeometry.setAttribute('position',new T.BufferAttribute(linePositions,3));
 const line=new T.Line(lineGeometry,new T.LineBasicMaterial({color:0xe9e4d6,transparent:true,opacity:.75}));line.frustumCulled=false;line.visible=false;root.add(line);
 const bobber=new T.Group();bobber.name='fishing-float';
 bobber.add(new T.Mesh(new T.SphereGeometry(.07,10,6,0,Math.PI*2,0,Math.PI/2),new T.MeshStandardMaterial({color:0xd8412f,roughness:.5})),new T.Mesh(new T.SphereGeometry(.07,10,6,0,Math.PI*2,Math.PI/2,Math.PI/2),new T.MeshStandardMaterial({color:0xf2eee4,roughness:.5})),new T.Mesh(new T.CylinderGeometry(.008,.008,.12,4).translate(0,.1,0),new T.MeshStandardMaterial({color:0x2b2b2b})));
 bobber.visible=false;root.add(bobber);
 const ringGeometry=new T.RingGeometry(.86,1,40).rotateX(-Math.PI/2),ripples=Array.from({length:6},()=>{const m=new T.Mesh(ringGeometry,new T.MeshBasicMaterial({color:0xf4fbff,transparent:true,opacity:0,depthWrite:false}));m.visible=false;root.add(m);return{mesh:m,age:0,life:1,size:1};});
 const drops=new T.InstancedMesh(new T.SphereGeometry(.035,5,4),new T.MeshBasicMaterial({color:0xe8f6ff,transparent:true,opacity:.85}),40),droplets=[],pose=new T.Object3D();
 drops.count=0;drops.visible=false;drops.frustumCulled=false;root.add(drops);
 const fish=makeFish();fish.visible=false;root.add(fish);
 let mount=null,phase='idle',spot=null,castAge=0,bite=0,leap=null,time=0;const tip=new T.Vector3(),from=new T.Vector3(),to=new T.Vector3();
 const surface=()=>WATER_Y+.02;
 function ripple(x,z,size=.5,life=1.1){const r=ripples.find(r=>!r.mesh.visible)||ripples[0];Object.assign(r,{age:0,life,size});r.mesh.position.set(x,surface()+.01,z);r.mesh.visible=true;}
 function splash(x,z,count=14,speed=1.6){for(let i=0;i<count;i++){if(droplets.length>=40)droplets.shift();const a=Math.random()*Math.PI*2,v=speed*(.4+Math.random()*.6);droplets.push({x,y:surface()+.05,z,vx:Math.sin(a)*v,vy:1.6+Math.random()*1.8,vz:Math.cos(a)*v,age:0});}}
 function attach(){const next=hero.getObjectByName('heroWeaponMount');if(next!==mount){rod.removeFromParent();mount=next;mount?.add(rod);}}
 function holdWeapon(show){if(!mount)return;for(const c of mount.children)if(c!==rod)c.visible=show;rod.visible=!show;}
 function process(events,player){for(const e of events){
  if(e.type==='cast'){phase='cast';spot=e.spot;castAge=0;attach();holdWeapon(false);}
  else if(e.type==='land'){phase='wait';ripple(spot.x,spot.z,.6);splash(spot.x,spot.z,6,.8);}
  else if(e.type==='bite'){phase='bite';bite=0;ripple(spot.x,spot.z,.9,.8);splash(spot.x,spot.z,10,1.2);}
  else if(e.type==='escape'){phase='wait';ripple(spot.x,spot.z,.5);}
  else if(e.type==='catch'){splash(spot.x,spot.z,18,2);ripple(spot.x,spot.z,1.1,1.2);fish.userData.material.color.setHex(e.fish.color);leap={age:0,sx:spot.x,sz:spot.z,px:player.x,pz:player.z};end();}
  else if(e.type==='reel'||e.type==='cancel'){if(spot)ripple(spot.x,spot.z,.4,.7);end();}
 }}
 function end(){phase='idle';line.visible=bobber.visible=false;holdWeapon(true);}
 function update(dt,player){
  time+=dt;
  for(const r of ripples){if(!r.mesh.visible)continue;r.age+=dt;const t=r.age/r.life;if(t>=1){r.mesh.visible=false;continue;}r.mesh.scale.setScalar(r.size*(.25+t));r.mesh.material.opacity=(1-t)*.6;}
  let n=0;for(let i=droplets.length-1;i>=0;i--){const d=droplets[i];d.age+=dt;d.vy-=9*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;if(d.y<surface()||d.age>1.2)droplets.splice(i,1);}
  for(const d of droplets){pose.position.set(d.x,d.y,d.z);pose.scale.setScalar(1);pose.updateMatrix();drops.setMatrixAt(n++,pose.matrix);}drops.count=n;drops.visible=n>0;if(n)drops.instanceMatrix.needsUpdate=true;
  if(leap){leap.age+=dt;const t=Math.min(1,leap.age/.75),x=leap.sx+(leap.px-leap.sx)*t,z=leap.sz+(leap.pz-leap.sz)*t,y=surface()+Math.sin(t*Math.PI)*1.8+t*(heightAt(leap.px,leap.pz)+1-surface());fish.visible=t<1;fish.position.set(x,y,z);fish.rotation.set(Math.cos(t*Math.PI)*-.9,Math.atan2(leap.px-leap.sx,leap.pz-leap.sz),Math.sin(time*30)*.35);if(t>=1)leap=null;}
  if(phase==='idle')return;
  // Raise the casting arm; the class animator rewrites joints every frame.
  const joints=hero.userData.joints;if(joints?.rightArm){const lift=phase==='cast'?-1.25+Math.min(1,castAge/CAST_TIME)*.55:-.7;joints.rightArm.rotation.x+=lift;joints.rightForearm.rotation.x-=.35;}
  hero.updateMatrixWorld(true);tip.copy(rod.userData.tip);rod.localToWorld(tip);
  castAge+=dt;bite+=dt;
  let bx=spot.x,bz=spot.z,by=surface()+.02;
  if(phase==='cast'){const t=Math.min(1,castAge/CAST_TIME);bx=tip.x+(spot.x-tip.x)*t;bz=tip.z+(spot.z-tip.z)*t;by=tip.y+(surface()-tip.y)*t+Math.sin(t*Math.PI)*1.2;}
  else if(phase==='bite')by-=.07+Math.abs(Math.sin(bite*22))*.06;
  else by+=Math.sin(time*2.4)*.015;
  bobber.visible=line.visible=true;bobber.position.set(bx,by,bz);bobber.rotation.z=phase==='bite'?Math.sin(bite*18)*.4:Math.sin(time*1.7)*.08;
  if(phase==='wait'&&Math.random()<dt*.5)ripple(bx,bz,.25,.9);
  from.copy(tip);to.set(bx,by+.06,bz);const sag=phase==='cast'?0:Math.min(.6,from.distanceTo(to)*.12);
  for(let i=0;i<=segments;i++){const t=i/segments;linePositions[i*3]=from.x+(to.x-from.x)*t;linePositions[i*3+1]=from.y+(to.y-from.y)*t-Math.sin(t*Math.PI)*sag;linePositions[i*3+2]=from.z+(to.z-from.z)*t;}
  lineGeometry.attributes.position.needsUpdate=true;
 }
 function reset(){end();leap=null;fish.visible=false;droplets.length=0;drops.count=0;drops.visible=false;for(const r of ripples)r.mesh.visible=false;}
 return{process,update,reset,get casting(){return phase!=='idle';}};
}
