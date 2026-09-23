import * as T from 'three';
import {drapeGround} from './ground-projection.js';

// Bounded cosmetic pool: attacks reuse meshes/materials and a small set of arcs.
// Combat timing, damage and warning geometry still belong to the combat model.
export function createCombatRings(scene,prepare=()=>{},heightAt=null){
 const capacity=24,pool=[],geometries=new Map();let serial=0;
 function geometry(inner,outer,segments,start=0,arc=Math.PI*2){const key=[inner,outer,segments,start,arc].join(':');if(!geometries.has(key))geometries.set(key,new T.RingGeometry(inner,outer,segments,1,start,arc));return geometries.get(key);}
 function take(geo,color,x,y,z,angle,life,size,fixed){let effect=pool.find(e=>!e.mesh.visible);
  if(!effect&&pool.length<capacity){const mesh=new T.Mesh(geo,new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.6,depthWrite:false,forceSinglePass:true}));scene.add(mesh);prepare(mesh);effect={mesh,copies:new Map()};pool.push(effect);}
  if(!effect)effect=pool.reduce((old,e)=>e.serial<old.serial?e:old);
  const mesh=effect.mesh;if(heightAt&&!effect.copies.has(geo))effect.copies.set(geo,geo.clone());mesh.geometry=heightAt?effect.copies.get(geo):geo;mesh.material.color.set(color);mesh.material.opacity=.6;mesh.position.set(x,y,z);mesh.rotation.set(-Math.PI/2,0,angle);mesh.scale.setScalar(1);mesh.visible=true;Object.assign(effect,{age:0,life,size,fixed,lift:y,serial:++serial});if(heightAt)drapeGround(mesh,heightAt,y);
 }
 function pulse(x,z,color,size=1){take(geometry(.8,1,40),color,x,.12,z,0,.45,size,false);}
 function swing(e){const thick=e.combo===3?.32:.14,geo=geometry(e.range-thick,e.range,24,-Math.PI/2-e.arc/2,e.arc),color=e.combo===3?0xecc076:e.weapon==='axe'?0xe6b377:0xd3e3db;take(geo,color,e.x,.8,e.z,e.angle,.18,1,true);}
 function update(dt){for(const e of pool){if(!e.mesh.visible)continue;e.age+=dt;if(e.age>=e.life){e.mesh.visible=false;continue;}if(!e.fixed)e.mesh.scale.setScalar(e.size*(.3+e.age/e.life*.7));if(heightAt)drapeGround(e.mesh,heightAt,e.lift);e.mesh.material.opacity=Math.max(0,1-e.age/e.life)*.6;}}
 function clear(){for(const e of pool)e.mesh.visible=false;}
 function dispose(){for(const e of pool){e.mesh.removeFromParent();e.mesh.material.dispose();e.copies.forEach(g=>g.dispose());}geometries.forEach(g=>g.dispose());pool.length=0;geometries.clear();}
 return{pulse,swing,update,clear,dispose,get active(){return pool.filter(e=>e.mesh.visible).length;},get allocated(){return pool.length;},get geometryCount(){return geometries.size;}};
}
