import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import sword from '../game/assets/iron_sword.js';
import axe from '../game/assets/bearded_axe.js';
import spear from '../game/assets/ash_spear.js';
import armor from '../game/assets/wanderer.js';
import {createGroundLoot} from '../game/src/ground-loot.js';
import {groundHeight,groundGradient} from '../game/src/terrain-height.js';
const models={sword:sword(T),axe:axe(T),spear:spear(T),armor:armor(T)};
for(const kind of ['sword','axe','spear','armor','currency'])test(`${kind} loot has a grounded, visible model and rarity highlight`,()=>{
 const loot=createGroundLoot(models),drop={id:'1-0-5',x:3,z:7,item:kind==='currency'?null:{kind,rarity:'rare'}},root=loot.create(drop),body=root.getObjectByName('ground-item'),box=new T.Box3().setFromObject(body),size=box.getSize(new T.Vector3());
 assert(body);assert(box.min.y>=.089&&box.min.y<.091);assert(size.y<.6,'item should lie flat, not stand upright');assert(size.x>.1&&size.z>.1);assert(root.getObjectByName('loot-outline'));assert(root.getObjectByName('loot-halo'));
 root.updateMatrixWorld(true);const pose=root.matrixWorld.clone();loot.update(1);loot.update(2);root.updateMatrixWorld(true);assert.deepEqual(root.matrixWorld.elements,pose.elements,'only the highlight pulses, the item does not float/spin');
 const restored=loot.create(drop);assert.equal(restored.rotation.y,root.rotation.y);assert.equal(root.userData.itemKind,kind);loot.dispose();
});
test('loot uses private materials and shared prototypes without changing equipped weapons',()=>{
 const before=[];models.sword.traverse(o=>{if(o.isMesh)before.push([o.material,o.material.color.clone(),o.material.emissive.clone()]);});const loot=createGroundLoot(models),drop={id:'a',x:0,z:0,item:{kind:'sword',rarity:'uncommon'}},a=loot.create(drop),b=loot.create({...drop,id:'b'}),ma=[],mb=[];
 a.getObjectByName('ground-item').traverse(o=>{if(o.isMesh)ma.push(o);});b.getObjectByName('ground-item').traverse(o=>{if(o.isMesh)mb.push(o);});
 assert(ma.length>0);ma.forEach((m,i)=>{assert.equal(m.geometry,mb[i].geometry);assert.equal(m.material,mb[i].material);assert(!before.some(([mat])=>m.material===mat));assert(m.material.emissive.g>m.material.emissive.r);});
 before.forEach(([m,color,emissive])=>{assert(m.color.equals(color));assert(m.emissive.equals(emissive));});loot.dispose();
});
test('all ground equipment follows hillside elevation and inclination on reload',()=>{
 const heightAt=(x,z)=>groundHeight(0,x,z),gradientAt=(x,z)=>groundGradient(0,x,z),loot=createGroundLoot(models,heightAt,gradientAt);
 for(const kind of ['sword','axe','spear','armor','currency'])for(const [x,z] of [[29,-9],[34,-20],[-34,3]]){
  const drop={id:`hill-${kind}`,x,z,item:kind==='currency'?null:{kind,rarity:'rare'}},root=loot.create(drop),g=gradientAt(x,z),up=new T.Vector3(0,1,0).applyQuaternion(root.quaternion),normal=new T.Vector3(-g.x,1,-g.z).normalize();
  assert(Math.abs(root.position.y-heightAt(x,z))<1e-6);assert(up.distanceTo(normal)<1e-6);
  const copy=loot.create(drop);assert(copy.quaternion.equals(root.quaternion));assert(copy.position.equals(root.position));root.updateMatrixWorld(true);
  let minimum=Infinity;const v=new T.Vector3();root.getObjectByName('ground-item').traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);minimum=Math.min(minimum,v.y-heightAt(v.x,v.z));}});
  assert(minimum>-.025,`${kind} should remain above the hillside: ${minimum}`);
 }
 loot.dispose();
});
