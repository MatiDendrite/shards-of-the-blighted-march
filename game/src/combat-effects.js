import * as T from 'three';

// Bounded, reused impact sparks: one draw call, no textures or per-hit lights.
export function createCombatEffects(scene){
 const capacity=96,mesh=new T.InstancedMesh(new T.OctahedronGeometry(.035,0),new T.MeshBasicMaterial({color:0xffffff,toneMapped:false}),capacity),particles=Array.from({length:capacity},()=>({life:0})),matrix=new T.Object3D(),color=new T.Color();let cursor=0,serial=0;
 mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);
 function burst(e){const count=e.heavy?12:7,seed=++serial;
  for(let i=0;i<count;i++){const p=particles[cursor];cursor=(cursor+1)%capacity;const a=i/count*Math.PI*2+seed*.71,speed=e.heavy?2.2:1.4;
   Object.assign(p,{x:e.x,y:e.target==='wolf'?.65:1.05,z:e.z,vx:Math.sin(a)*speed,vy:1.2+(i%3)*.48,vz:Math.cos(a)*speed,age:0,life:.25+(i%4)*.04,heavy:e.heavy});
   color.setHex(e.target==='shard'?0xc3a0e3:e.heavy?0xf0c27e:0xd5d0ae);mesh.setColorAt((cursor+capacity-1)%capacity,color);
  }mesh.instanceColor.needsUpdate=true;mesh.visible=true;
 }
 function update(dt){if(!mesh.visible)return;let alive=0;
  particles.forEach((p,i)=>{if(p.life>0){p.age+=dt;if(p.age>=p.life)p.life=0;else{alive++;p.vy-=dt*5.8;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}}
   const scale=p.life>0?1-p.age/p.life:0;matrix.position.set(p.x||0,Math.max(.13,p.y||0),p.z||0);matrix.rotation.set(i*.91,i*.7,0);matrix.scale.set(scale*.65,scale*(p.heavy?3.8:2.3),scale*.65);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix);
  });mesh.instanceMatrix.needsUpdate=true;mesh.visible=alive>0;
 }
 function clear(){particles.forEach(p=>p.life=0);mesh.visible=false;}
 clear();return{burst,update,clear,get active(){return particles.filter(p=>p.life>0).length;}};
}
