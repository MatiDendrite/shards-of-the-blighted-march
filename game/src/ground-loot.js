import * as T from 'three';
import {bakeStatic} from '../lib/assetlib.js';
import {alignToGround} from './ground-projection.js';

const COLORS={common:0xd9c697,uncommon:0x80d6aa,rare:0xb99af5};
// One cached model per kind/tier. Drops never change the inventory/actor materials.
export function createGroundLoot(models,heightAt=()=>0,gradientAt=null){
 const prototypes=new Map(),ownedMaterials=new Set(),ownedGeometry=new Set();
 const ringGeometry=new T.RingGeometry(.87,1,40),haloGeometry=new T.CircleGeometry(1,40);
 const coinGeometry=new T.CylinderGeometry(.09,.09,.025,12);
 ownedGeometry.add(ringGeometry).add(haloGeometry).add(coinGeometry);
 function prototype(kind,rarity){
  const key=`${kind}:${rarity}`;if(prototypes.has(key))return prototypes.get(key);
  const color=new T.Color(COLORS[rarity]||COLORS.common);let body;
  if(kind==='armor'){
   const assembly=new T.Group();
   for(const name of ['torso','leftArm','rightArm']){const part=models.armor.getObjectByName(name).clone(true);part.rotation.set(0,0,0);part.getObjectByName('heroWeaponMount')?.removeFromParent();assembly.add(part);}
   body=bakeStatic(assembly);body.traverse(o=>{if(o.isMesh)ownedGeometry.add(o.geometry);});
  }else if(models[kind])body=models[kind].clone(true);
  else{body=new T.Group();const material=new T.MeshStandardMaterial({color:0xd4aa53,metalness:.55,roughness:.42});ownedMaterials.add(material);for(let i=0;i<7;i++){const coin=new T.Mesh(coinGeometry,material);coin.position.set(Math.sin(i*2.4)*.15,.015+i%3*.027,Math.cos(i*2.4)*.13);body.add(coin);}}
  body.name='ground-item';body.position.set(0,0,0);body.rotation.set(kind==='currency'?0:-Math.PI/2,0,0);body.scale.setScalar(kind==='armor'?1.2:1);
  if(kind==='armor')body.scale.z=.75;
  const materials=new Map();body.traverse(o=>{if(!o.isMesh)return;const source=o.material;if(!materials.has(source)){const mat=source.clone();mat.emissive.copy(color).multiplyScalar(kind==='currency'?.08:.24);mat.emissiveIntensity=1;materials.set(source,mat);ownedMaterials.add(mat);}o.material=materials.get(source);o.castShadow=true;o.receiveShadow=true;});
  const box=new T.Box3().setFromObject(body),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
  body.position.add(new T.Vector3(-center.x,.09-box.min.y,-center.z));
  const group=new T.Group();group.add(body);
  for(const [geometry,opacity,name] of [[haloGeometry,.12,'loot-halo'],[ringGeometry,.55,'loot-outline']]){
   const mat=new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide});ownedMaterials.add(mat);
   const glow=new T.Mesh(geometry,mat);glow.name=name;glow.rotation.x=-Math.PI/2;glow.position.y=name==='loot-halo'?.072:.075;
   glow.scale.set(Math.max(.31,size.x*.65),Math.max(.35,size.z*.62),1);group.add(glow);
  }
  prototypes.set(key,group);return group;
 }
 function create(drop){const kind=drop.item?.kind||'currency',rarity=drop.item?.rarity||'common',root=prototype(kind,rarity).clone(true);root.name='ground-loot';root.userData.itemKind=kind;root.userData.rarity=rarity;
  // Stable on reload; a grounded sword does not hover or spin like a pickup token.
  let hash=0;for(const c of String(drop.id))hash=(hash*31+c.charCodeAt(0))>>>0;
  const yaw=(hash%628)/100;root.rotation.y=yaw;root.position.set(drop.x,heightAt(drop.x,drop.z),drop.z);if(gradientAt)alignToGround(root,gradientAt(drop.x,drop.z),yaw);return root;
 }
 function update(time){for(const group of prototypes.values())group.getObjectByName('loot-outline').material.opacity=.46+Math.sin(time*2.6)*.15;}
 function dispose(){ownedMaterials.forEach(m=>m.dispose());ownedGeometry.forEach(g=>g.dispose());prototypes.clear();}
 return{create,update,dispose};
}
