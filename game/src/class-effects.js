import * as T from 'three';
import {SKILLS} from './class-data.js';
import {groundHeight} from './terrain-height.js';
import {drapeGround} from './ground-projection.js';

export function createClassEffects(scene){
 const root=new T.Group();root.name='classEffects';scene.add(root);
 const shots=new Map(),bombs=new Map(),sphere=new T.SphereGeometry(1,10,7),knife=new T.ConeGeometry(.075,.55,4),circle=new T.RingGeometry(.95,1,48);
 const materials={firebolt:new T.MeshBasicMaterial({color:0xffae64}),venom:new T.MeshBasicMaterial({color:0x9cee9b}),bomb:new T.MeshBasicMaterial({color:0x68442d})};
 const ward=new T.Mesh(new T.SphereGeometry(.75,14,9),new T.MeshBasicMaterial({color:0xeed09a,wireframe:true,transparent:true,opacity:.26,depthWrite:false}));root.add(ward);
 const smoke=new T.InstancedMesh(sphere,new T.MeshBasicMaterial({color:0x98b4b9,transparent:true,opacity:.18,depthWrite:false}),8);smoke.frustumCulled=false;root.add(smoke);
 const pose=new T.Object3D(),up=new T.Vector3(0,1,0),direction=new T.Vector3();
 function update(model){
   const p=model.player,heightAt=(x,z)=>groundHeight(model.region,x,z),playerY=heightAt(p.x,p.z),liveShots=new Set(model.projectiles.map(s=>s.id)),liveBombs=new Set(model.bombs.map(b=>b.id));
   for(const [id,m] of shots)if(!liveShots.has(id)){root.remove(m);shots.delete(id);}
   for(const s of model.projectiles){let mesh=shots.get(s.id);if(!mesh){mesh=new T.Mesh(s.kind==='venom'?knife:sphere,materials[s.kind]);if(s.kind==='firebolt')mesh.scale.set(.21,.21,.37);root.add(mesh);shots.set(s.id,mesh);}mesh.position.set(s.x,heightAt(s.x,s.z)+.85,s.z);mesh.rotation.set(s.kind==='venom'?Math.PI/2:0,s.angle,0);if(s.kind==='venom')mesh.quaternion.setFromUnitVectors(up,direction.set(Math.sin(s.angle),0,Math.cos(s.angle)));}
   for(const [id,g] of bombs)if(!liveBombs.has(id)){root.remove(g);g.children[1].material.dispose();g.children[1].geometry.dispose();bombs.delete(id);}
   for(const b of model.bombs){let g=bombs.get(b.id);if(!g){g=new T.Group();const ball=new T.Mesh(sphere,materials.bomb);ball.scale.setScalar(.22);ball.position.y=.25;const ring=new T.Mesh(circle.clone(),new T.MeshBasicMaterial({color:SKILLS.cinderbomb.color,transparent:true,opacity:.65,depthWrite:false,side:T.DoubleSide}));ring.material.forceSinglePass=true;ring.rotation.x=-Math.PI/2;ring.position.y=.11;ring.scale.setScalar(b.radius);g.add(ball,ring);root.add(g);bombs.set(b.id,g);}g.position.set(b.x,heightAt(b.x,b.z),b.z);g.children[0].position.y=.24+Math.max(0,1-b.age/.35)*1.1;g.children[1].material.opacity=.2+.6*b.age/b.fuse;drapeGround(g.children[1],heightAt,.11);}
   ward.visible=p.ward>0&&p.hp>0;ward.position.set(p.x,playerY+.85,p.z);ward.rotation.y=model.time*.5;ward.scale.y=p.classId==='dwarf'?.95:1.2;
   smoke.visible=p.smoke>0&&p.hp>0;if(smoke.visible){for(let i=0;i<8;i++){const a=i*Math.PI/4+model.time*.7;pose.position.set(p.x+Math.sin(a)*.64,playerY+.3+(i%3)*.22,p.z+Math.cos(a)*.64);pose.scale.set(.40,.23,.40);pose.updateMatrix();smoke.setMatrixAt(i,pose.matrix);}smoke.instanceMatrix.needsUpdate=true;}
 }
 function clear(){for(const mesh of shots.values())root.remove(mesh);shots.clear();for(const g of bombs.values()){root.remove(g);g.children[1].material.dispose();g.children[1].geometry.dispose();}bombs.clear();ward.visible=smoke.visible=false;}
 clear();return{update,clear};
}
