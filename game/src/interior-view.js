import * as T from 'three';
import {HALL_SIZE,HALLS,insideHall} from './interiors.js';
import {bakeStatic} from '../lib/assetlib.js';

// A cutaway room per enterable house. Outside, the full exterior shows; step
// through the doorway and the exterior hides, leaving knee-high walls, the
// hearth and furniture visible from the gameplay camera. Materials named
// timber/plaster/stone receive the regional art textures in art.finish().
const named=(name,color,o={})=>Object.assign(new T.MeshStandardMaterial({color,roughness:.85,...o}),{name});
function materials(){
 const fire=new T.MeshStandardMaterial({color:0xffb050,emissive:0xff7a20,emissiveIntensity:2.2,roughness:1});
 const candle=new T.MeshStandardMaterial({color:0xfff0c0,emissive:0xffc060,emissiveIntensity:1.8});
 return{timber:named('timber',0x6e4a2c),plank:named('timber',0x8e6038),plaster:named('plaster',0xc9b58f),stone:named('stone',0x8f877a),soot:named('metal',0x2a2420,{roughness:1}),rug:named('fabric',0x9a3b2e,{roughness:1}),rugTrim:named('fabric',0xd8b25a,{roughness:1}),linen:named('fabric',0xe8dfc9,{roughness:1}),blanket:named('fabric',0x3f6b8a,{roughness:1}),iron:named('metal',0x3a3a3a,{metalness:.6,roughness:.5}),pot:named('ceramic',0xb86b45,{roughness:.6}),green:named('glass',0x5f8a4a,{roughness:.2}),fire,candle};
}
export function createHallInterior(site,m=materials()){
 const {halfWidth:W,halfDepth:D,wall,door}=HALL_SIZE,room=new T.Group(),H=1.25;room.name=`interior-${site.hall}`;
 const box=(mat,x,y,z,w,h,d,parent=room)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);parent.add(o);return o;};
 const cyl=(mat,x,y,z,r,h,seg=10,parent=room)=>{const o=new T.Mesh(new T.CylinderGeometry(r,r,h,seg),mat);o.position.set(x,y,z);parent.add(o);return o;};
 // Floorboards with alternating tones and a patterned rug.
 for(let i=0;i<9;i++)box(i%2?m.plank:m.timber,-W+.3+i*(W*2-.6)/8,.03,0,(W*2-.4)/9,.05,D*2-.3);
 box(m.rug,0,.065,.35,1.9,.02,1.3);box(m.rugTrim,0,.07,.35,1.6,.02,1.0);box(m.rug,0,.075,.35,1.3,.02,.7);
 // Cut walls, posts and a top rail frame the room like a doll's house.
 const walls=[[0,-D,W*2+wall,wall],[-W,0,wall,D*2],[W,0,wall,D*2],[-(W+door)/2,D,W-door,wall],[(W+door)/2,D,W-door,wall]];
 for(const [x,z,w,d] of walls){box(m.plaster,x,H/2,z,w,H,d);box(m.timber,x,H+.04,z,w+.04,.08,d+.04);box(m.stone,x,.09,z,w+.03,.18,d+.03);}
 for(const [x,z] of [[-W,-D],[W,-D],[-W,D],[W,D],[-door,D],[door,D],[0,-D]])box(m.timber,x,H/2+.05,z,.2,H+.1,.2);
 box(m.timber,0,.02,D,door*2,.04,wall+.1);
 // Stone hearth with a live fire on the back wall.
 const hearth=new T.Group();hearth.position.set(0,0,-D+.35);room.add(hearth);
 box(m.stone,-.6,.55,0,.3,1.1,.5,hearth);box(m.stone,.6,.55,0,.3,1.1,.5,hearth);box(m.stone,0,1.0,0,1.5,.3,.55,hearth);box(m.soot,0,.45,-.12,.9,.8,.25,hearth);box(m.stone,0,.06,.12,1.4,.12,.4,hearth);box(m.timber,0,1.2,.05,1.7,.1,.4,hearth);
 for(const [x,r] of [[-.12,.35],[.14,-.3]]){const log=cyl(m.timber,x,.16,.05,.06,.6,6,hearth);log.rotation.set(0,r,Math.PI/2);}
 const flames=[];for(const [x,h,s] of [[0,.5,.14],[-.16,.36,.1],[.17,.4,.1],[.05,.3,.08]]){const f=new T.Mesh(new T.ConeGeometry(s,h,6),m.fire);f.position.set(x,.2+h/2,.05);hearth.add(f);flames.push({mesh:f,h,base:.2+h/2});}
 for(const [x,c] of [[-.4,m.pot],[.4,m.green]])cyl(c,x,1.33,.05,.07,.18,8,hearth);
 if(site.hall==='inn'){
  // Counter with mugs and a barrel stack; a long table with benches.
  box(m.timber,-1.9,.5,-1.1,.8,1,1.7);box(m.plank,-1.9,1.03,-1.1,.95,.06,1.85);
  for(let i=0;i<4;i++)cyl(m.pot,-1.85,1.12,-1.7+i*.38,.05,.12,8);
  for(const [x,y,z] of [[-2.2,.35,1.5],[-1.6,.35,1.6],[-1.9,.95,1.55]]){const b=cyl(m.timber,x,y,z,.28,.6,12);for(const dy of [-.2,.2])cyl(m.iron,x,y+dy,z,.29,.04,12);b.rotation.z=y>.5?Math.PI/2:0;}
  box(m.timber,.6,.72,.35,2.0,.08,.8);for(const [x,z] of [[-.3,0],[1.5,0],[-.3,.7],[1.5,.7]])box(m.timber,x,.36,z,.08,.72,.08);
  for(const z of [-.35,1.05]){box(m.plank,.6,.42,z,1.9,.06,.3);for(const x of [-.25,1.45])box(m.timber,x,.2,z,.08,.4,.25);}
  for(const [x,z] of [[.1,.3],[.9,.45],[1.3,.2]])cyl(m.pot,x,.82,z,.045,.12,8);
 }else{
  // Bed with blanket, a chest at its foot, a shelf and a small table with a candle.
  box(m.timber,1.95,.22,-1.1,.9,.3,1.9);box(m.linen,1.95,.42,-1.1,.82,.12,1.82);box(m.blanket,1.95,.5,-.85,.84,.06,1.3);box(m.linen,1.95,.55,-1.8,.6,.1,.3);box(m.timber,1.95,.55,-2.02,.9,.7,.08);
  box(m.timber,1.95,.24,.25,.8,.45,.5);box(m.iron,1.95,.47,.25,.82,.04,.52);
  box(m.timber,-2.45,.95,-.6,.35,.05,1.6);box(m.timber,-2.45,.55,-.6,.35,.05,1.6);
  for(let i=0;i<4;i++)cyl(i%2?m.green:m.pot,-2.45,1.07,-1.2+i*.4,.07,.2,8);for(let i=0;i<3;i++)cyl(m.pot,-2.45,.66,-1.0+i*.45,.09,.16,8);
  box(m.timber,-.9,.45,.9,.7,.06,.7);for(const [x,z] of [[-1.15,.65],[-.65,.65],[-1.15,1.15],[-.65,1.15]])box(m.timber,x,.22,z,.06,.44,.06);
  cyl(m.linen,-.9,.54,.9,.035,.12,8);const c=new T.Mesh(new T.SphereGeometry(.03,6,4),m.candle);c.position.set(-.9,.63,.9);room.add(c);
 }
 for(const f of flames)f.mesh.removeFromParent();
 const baked=bakeStatic(room),result=new T.Group();result.name=room.name;result.add(baked);
 const fire=new T.Group();fire.position.copy(hearth.position);for(const f of flames)fire.add(f.mesh);result.add(fire);
 result.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
 return{room:result,flames};
}

export function createHallViews(scene,sites,exteriorPrototype,heightAt){
 if(!sites.length)return{update(){},get inside(){return null;}};
 const m=materials(),light=new T.PointLight(0xffa04a,0,7,2);light.name='hearth-light';scene.add(light);
 const halls=sites.map(site=>{
  const y=heightAt(site.x,site.z),exterior=exteriorPrototype.clone();exterior.position.set(site.x,y,site.z);exterior.scale.setScalar(site.scale);exterior.rotation.y=site.rotation;scene.add(exterior);
  const {room,flames}=createHallInterior(site,m);room.position.copy(exterior.position);room.scale.setScalar(site.scale);room.rotation.y=site.rotation;room.visible=false;scene.add(room);
  const hearth=new T.Vector3(0,.7,-HALL_SIZE.halfDepth+.7);room.updateMatrixWorld(true);room.localToWorld(hearth);
  return{site,exterior,room,flames,hearth,info:HALLS.find(h=>h.kind===site.hall)};
 });
 let inside=null;
 return{
  update(time,player){
   const next=player?halls.find(h=>insideHall(h.site,player.x,player.z,.45))||null:null;
   if(next!==inside){if(inside){inside.exterior.visible=true;inside.room.visible=false;}inside=next;if(inside){inside.exterior.visible=false;inside.room.visible=true;light.position.copy(inside.hearth);}}
   light.intensity=inside?5.5+Math.sin(time*9)*.6+Math.sin(time*23)*.35:0;
   if(inside)for(const [i,f] of inside.flames.entries()){const k=1+Math.sin(time*11+i*2.1)*.12+Math.sin(time*27+i)*.06;f.mesh.scale.set(1,k,1);f.mesh.position.y=f.base-(1-k)*f.h/2;}
  },
  get inside(){return inside?.info||null;},
 };
}
