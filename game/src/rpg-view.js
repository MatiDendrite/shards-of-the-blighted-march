import * as T from 'three';
import { ASSET } from '../lib/assetlib.js';
import { itemName,itemPower,xpNeeded,SMITH } from './progression.js';
import { mergeJoints } from './combat-view.js';
export async function createRpgView(scene,progress,combat,store,onChange){
 const $=s=>document.querySelector(s),panel=$('#inventory'),list=$('#item-list'),drops=new Map();let mode='inventory',rendered=-1;
 const smith=await ASSET(new URL('../assets/wanderer.js',import.meta.url).href,{keepHierarchy:true,height:1.85,surfaces:true});mergeJoints(smith);smith.position.set(SMITH.x,.07,SMITH.z);smith.rotation.y=1.7;smith.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(o.material.name==='fabric')o.material.color.setHex(0x57472f);}});scene.add(smith);
 const glow=new T.PointLight(0xffc07c,9,6,2);glow.position.set(SMITH.x,2,SMITH.z);scene.add(glow);
 const smithLabel=document.createElement('div');smithLabel.className='smith-label';smithLabel.textContent='BORIN · SMITH';$('#enemy-labels').append(smithLabel);
 const ringGeo=new T.TorusGeometry(.17,.025,5,20),auraGeo=new T.CylinderGeometry(.08,.18,.8,8,1,true);
 const dropMats=[new T.MeshBasicMaterial({color:0xd6c28b}),new T.MeshBasicMaterial({color:0x83cdb0}),new T.MeshBasicMaterial({color:0xa994f0})];
 function info(text){$('#rpg-message').textContent=text;}
 function stats(item){return `${item.kind==='armor'?'Defence':'Bonus damage'} +${itemPower(item)}`;}
 function render(){rendered=progress.revision;const d=progress.data;$('#bag-title').textContent=mode==='smith'?'Borin’s forge':'Your equipment';$('#bag-intro').textContent=mode==='smith'?'Improve equipment up to +3, salvage spares or buy supplies.':'Equip an item to compare its effect. R cycles your three equipped weapons.';$('#bag-money').textContent=`Level ${d.level} · ${d.xp} / ${xpNeeded(d.level)} XP · ${d.gold} gold · ${d.ore} ore · ${d.items.length}/24 slots`;$('#buy-potion').hidden=mode!=='smith';$('#buy-potion').disabled=d.gold<25||d.potions>=20;list.replaceChildren();
  for(const item of d.items){const equipped=d.loadout[item.kind]===item.id,active=equipped&&(item.kind==='armor'||combat.player.weapon===item.kind),card=document.createElement('article');card.className=`item-card ${item.rarity}${equipped?' equipped':''}`;card.dataset.itemId=item.id;
   const icon=document.createElement('span');icon.className='item-icon';icon.textContent={sword:'⚔',axe:'⚒',spear:'↟',armor:'♜'}[item.kind];const content=document.createElement('div'),name=document.createElement('h3'),detail=document.createElement('p'),compare=document.createElement('small');name.textContent=itemName(item);detail.textContent=`${item.rarity} · ${stats(item)}`;const delta=itemPower(item)-itemPower(progress.equipped(item.kind));compare.textContent=equipped?'Equipped':`${delta>=0?'+':''}${delta} vs equipped`;content.append(name,detail,compare);card.append(icon,content);
   const actions=document.createElement('div');actions.className='item-actions';function button(label,action,disabled=false){const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.dataset.itemAction=action;b.dataset.id=item.id;actions.append(b);}
   if(mode==='smith'){const cost=progress.price(item);button(item.upgrade>=3?'Maximum +3':`Forge · ${cost.gold}g + ${cost.ore} ore`,'upgrade',item.upgrade>=3||d.gold<cost.gold||d.ore<cost.ore);button('Salvage','salvage',equipped);}
   else button(active?'Equipped':equipped?'Use weapon':'Equip','equip',active);
   card.append(actions);list.append(card);
  }
 }
 list.addEventListener('click',e=>{const b=e.target.closest('button[data-item-action]');if(!b)return;const id=Number(b.dataset.id),action=b.dataset.itemAction;const ok=action==='equip'?progress.equip(id,combat):action==='upgrade'?progress.upgrade(id,combat.player):progress.salvage(id,combat.player);if(ok){progress.sync(combat);onChange();info(progress.messages.at(-1)||'Equipment updated');render();}else info('That action is unavailable right now. Finish your attack first.');});
 $('#buy-potion').onclick=()=>{if(progress.buyPotion(combat.player)){onChange();info('Healing draught added to your supplies.');render();}};
 function open(nextMode){mode=nextMode;info('');render();panel.hidden=false;$('#bag-close').focus();}
 const projected=new T.Vector3();function update(dt,camera){
  const d=progress.data,p=combat.player;$('#level-text').textContent=`LV ${d.level} · ${d.gold} gold`;$('#xp-fill').style.width=`${d.level===8?100:d.xp/xpNeeded(d.level)*100}%`;$('#potion-count').textContent=progress.potionCD>0?`${Math.ceil(progress.potionCD)}s`:`${d.potions}`;$('#save-state').textContent=store.status;$('#smith-button').classList.toggle('near',progress.nearSmith(p));$('#smith-button').title=progress.nearSmith(p)?'Speak to Borin':'Borin is southwest of the starting lanterns';
  if(!panel.hidden&&rendered!==progress.revision)render();
  for(const [id,mesh] of drops)if(!d.drops.some(x=>x.id===id)){mesh.userData.aura.material.dispose();scene.remove(mesh);drops.delete(id);}
  for(const drop of d.drops){let g=drops.get(drop.id);if(!g){g=new T.Group();const tier=drop.item?.rarity==='rare'?2:drop.item?1:0,m=dropMats[tier],ring=new T.Mesh(ringGeo,m);ring.rotation.x=-Math.PI/2;g.add(ring);const aura=new T.Mesh(auraGeo,new T.MeshBasicMaterial({color:m.color,transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide}));aura.position.y=.4;g.add(aura);g.userData.aura=aura;scene.add(g);drops.set(drop.id,g);}g.position.set(drop.x,.14+Math.sin(combat.time*3)*.035,drop.z);g.rotation.y+=dt;}
  projected.set(SMITH.x,2.5,SMITH.z).project(camera);smithLabel.hidden=projected.z<0||projected.z>1||Math.abs(projected.x)>.9||Math.abs(projected.y)>.85;smithLabel.style.left=`${(projected.x*.5+.5)*innerWidth}px`;smithLabel.style.top=`${(-projected.y*.5+.5)*innerHeight}px`;
 }
 function clearDrops(){for(const g of drops.values()){g.userData.aura.material.dispose();scene.remove(g);}drops.clear();}
 return{open,update,render,clearDrops};
}
