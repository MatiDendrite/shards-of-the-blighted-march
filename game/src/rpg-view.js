import * as T from 'three';
import {loadNpcActor,createNpcMotion} from './npc-actors.js';
import { itemName,itemPower,xpNeeded,SMITH,sellPrice } from './progression.js';
import { WEAPONS,basicAttack } from './combat-model.js';
import { createGroundLoot } from './ground-loot.js';
import {groundHeight,groundGradient} from './terrain-height.js';
import { createTextWriter } from './hud-bindings.js';
import {classInfo} from './class-data.js';
export async function createRpgView(scene,progress,combat,store,onChange,portraitSource,lootModels){
 const $=s=>document.querySelector(s),text=createTextWriter(),panel=$('#inventory'),list=$('#item-list'),drops=new Map();let mode='inventory',rendered=-1,selected=1,filter='all',pendingSale=null;
 const kindNames={sword:'Sword',axe:'Axe',spear:'Spear',armor:'Armour'};
 let portraits,portraitClass;
 const smith=await loadNpcActor('smith'),animateSmith=createNpcMotion(smith,'smith');smith.position.set(SMITH.x,.07,SMITH.z);smith.rotation.y=1.7;scene.add(smith);
 const glow=new T.PointLight(0xffc07c,9,6,2);glow.position.set(SMITH.x,2,SMITH.z);scene.add(glow);
 const smithLabel=document.createElement('div');smithLabel.className='smith-label';smithLabel.textContent='BORIN · BLACKSMITH · UPGRADES';$('#enemy-labels').append(smithLabel);
 const heightAt=(x,z)=>groundHeight(combat.region,x,z),groundLoot=createGroundLoot(lootModels,heightAt,(x,z)=>groundGradient(combat.region,x,z));
 const lootOccluders=[...document.querySelectorAll('#action-bar,#navigation-map,#utility,#objective,#boss-bar')];
 function info(text){$('#rpg-message').textContent=text;}
 function image(item){const img=document.createElement('img');img.src=portraits[item.kind];img.alt=`${kindNames[item.kind]} model`;img.draggable=false;return img;}
 function slot(item,loadout=false){const button=document.createElement('button');button.className=`item-slot ${item.rarity}${selected===item.id?' selected':''}`;button.dataset.selectItem=item.id;if(!loadout)button.dataset.itemId=item.id;button.setAttribute('aria-pressed',String(selected===item.id));
  const equipped=progress.data.loadout[item.kind]===item.id,active=equipped&&(item.kind==='armor'||combat.player.weapon===item.kind);
  button.setAttribute('aria-label',`${itemName(item)}, ${item.rarity}${active?', active':equipped?', in loadout':''}`);button.title=button.getAttribute('aria-label');button.append(image(item));
  if(equipped){const badge=document.createElement('span');badge.className='slot-equipped';badge.textContent=active?'◆':'◇';badge.setAttribute('aria-hidden','true');button.append(badge);}
  if(item.upgrade){const rank=document.createElement('span');rank.className='slot-rank';rank.textContent=`+${item.upgrade}`;button.append(rank);}
  if(loadout){const label=document.createElement('small');label.textContent=kindNames[item.kind];button.append(label);}return button;
 }
 function row(dl,label,value){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}
 function renderDetail(item){const detail=$('#item-detail');detail.replaceChildren();detail.className=item.rarity;
  const tier=document.createElement('span');tier.className='item-tier';tier.textContent=`${item.rarity} · ${kindNames[item.kind]}`;
  const title=document.createElement('h3');title.textContent=itemName(item);
  const preview=document.createElement('div');preview.className='inspect-model';preview.append(image(item));
  const stats=document.createElement('dl'),power=itemPower(item),equipped=progress.data.loadout[item.kind]===item.id,active=equipped&&(item.kind==='armor'||combat.player.weapon===item.kind),delta=power-itemPower(progress.equipped(item.kind));
  row(stats,item.kind==='armor'?'Damage reduction':'Bonus damage',`+${power}`);
  if(item.kind!=='armor'){const mage=combat.player.classId==='mage',w=mage?basicAttack(combat.player):WEAPONS[item.kind];row(stats,mage?'Arcane Bolt base damage':'Base weapon damage',w.damage);row(stats,'Reach',`${w.range} m`);}else row(stats,'Slot','Body armour');
  row(stats,'Forge level',`${item.upgrade} / 3`);
  const compare=document.createElement('p');compare.className=`item-compare ${delta>0?'better':delta<0?'worse':''}`;compare.textContent=active?'Currently equipped':equipped?'In your weapon loadout':`${delta>=0?'+':''}${delta} ${item.kind==='armor'?'defence':'bonus damage'} vs equipped`;
  const note=document.createElement('p');note.className='item-lore';note.textContent={sword:'Weathered iron. A balanced blade for a long road.',axe:'A heavy bearded edge. Wide swings, decisive strikes.',spear:'An ash haft and a leaf-shaped point. Keep the blight at a distance.',armor:'Layered iron and oxblood cloth. The armour of a Marchguard.'}[item.kind];
  const actions=document.createElement('div');actions.className='item-actions';function button(label,action,disabled=false){const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.dataset.itemAction=action;b.dataset.id=item.id;actions.append(b);}
  if(mode==='smith'){const cost=progress.price(item);button(item.upgrade>=3?'Maximum +3':`Forge · ${cost.gold}g + ${cost.ore} ore`,'upgrade',item.upgrade>=3||progress.data.gold<cost.gold||progress.data.ore<cost.ore);button('Salvage spare equipment','salvage',equipped);}
  else if(mode==='merchant'){
   row(stats,'Sale price',`${sellPrice(item)} gold`);
   if(pendingSale===item.id){note.textContent='Selling removes this item permanently. Confirm the sale or keep it.';button(`Confirm sale · ${sellPrice(item)} gold`,'confirm-sale');button('Keep item','cancel-sale');}
   else button(equipped?'In loadout · cannot sell':`Sell · ${sellPrice(item)} gold`,'sell',equipped||progress.data.gold+sellPrice(item)>1000000);
  }
  else button(active?'Equipped':equipped?'Use weapon':'Equip item','equip',active);
  detail.append(tier,title,preview,stats,compare,note,actions);
 }
 function render(){if(!portraits||portraitClass!==progress.data.classId){portraits=typeof portraitSource==='function'?portraitSource():portraitSource;portraitClass=progress.data.classId;$('#character-preview').src=portraits.character||portraits.armor;$('#character-preview').alt=`${classInfo(portraitClass).name} character model`;$('.paperdoll-caption').textContent=classInfo(portraitClass).name.toUpperCase();}const scroll=panel.scrollTop;rendered=progress.revision;const d=progress.data,p=combat.player;
  const shown=d.items.filter(i=>filter==='all'||(filter==='armor'?i.kind==='armor':i.kind!=='armor'));
  if(!shown.some(i=>i.id===selected))selected=shown[0]?.id;
  $('#bag-title').textContent=mode==='smith'?'Borin’s forge':mode==='merchant'?'Mara’s equipment trade':'Equipment & inventory';$('#bag-intro').textContent=mode==='smith'?'Reforge your equipment up to +3. Salvage spare gear for ore.':mode==='merchant'?'Select spare equipment to sell. Items in your loadout are protected.':'Steel for the road. A place for everything you carry.';
  $('#bag-money').replaceChildren();for(const [label,value] of [['GOLD',d.gold],['ORE',d.ore],['DRAUGHTS',d.potions]]){const el=document.createElement('span'),b=document.createElement('b');b.textContent=value;el.append(b,` ${label}`);$('#bag-money').append(el);}
  $('#sheet-level').textContent=`LV ${d.level}`;$('#bag-capacity').textContent=`${d.items.length} / 24`;
  const stats=$('#character-stats');stats.replaceChildren();row(stats,'Health',`${Math.ceil(p.hp)} / ${p.maxHp}`);row(stats,p.classId==='mage'?'Arcane Bolt¹':'Attack¹',Math.round((basicAttack(p).damage+(p.damageBonus||0))*(p.damageMultiplier||1)));row(stats,'Defence',p.armor||0);row(stats,'Experience',d.level===8?'MAX':`${d.xp} / ${xpNeeded(d.level)}`);stats.title='¹ Basic hit before combo or Battle Cry bonuses.';
  $('#buy-potion').hidden=mode==='inventory';$('#buy-potion').disabled=d.gold<25||d.potions>=20;
  $('#loadout-slots').replaceChildren(...Object.keys(kindNames).map(kind=>slot(progress.equipped(kind),true)));
  for(const b of $('#bag-filters').children)b.setAttribute('aria-pressed',String(b.dataset.filter===filter));
  list.replaceChildren(...shown.map(i=>slot(i)));
  for(let i=shown.length;i<24;i++){const empty=document.createElement('div');empty.className='item-slot empty';empty.setAttribute('aria-hidden','true');list.append(empty);}
  const item=d.items.find(i=>i.id===selected);if(item)renderDetail(item);else $('#item-detail').textContent='No items in this category.';panel.scrollTop=scroll;
 }
 panel.addEventListener('click',e=>{
  const choose=e.target.closest('[data-select-item]');if(choose){pendingSale=null;const fromLoadout=!!choose.closest('#loadout-slots');selected=Number(choose.dataset.selectItem);if(fromLoadout)filter='all';render();const next=panel.querySelector(`${fromLoadout?'#loadout-slots':'#item-list'} [data-select-item="${selected}"]`);next?.focus({preventScroll:true});if(innerWidth<=760)$('#item-detail').scrollIntoView({block:'nearest'});return;}
  const category=e.target.closest('[data-filter]');if(category){pendingSale=null;filter=category.dataset.filter;render();return;}
  const b=e.target.closest('button[data-item-action]');if(!b||b.disabled)return;const id=Number(b.dataset.id),action=b.dataset.itemAction;
  if(mode==='merchant'&&(action==='sell'||action==='cancel-sale')){pendingSale=action==='sell'?id:null;render();panel.querySelector('[data-item-action]:not(:disabled)')?.focus({preventScroll:true});return;}
  const ok=mode==='inventory'&&action==='equip'?progress.equip(id,combat):mode==='smith'&&action==='upgrade'?progress.upgrade(id,combat.player):mode==='smith'&&action==='salvage'?progress.salvage(id,combat.player):mode==='merchant'&&action==='confirm-sale'&&pendingSale===id?progress.sell(id,combat.player):false;
  if(ok){pendingSale=null;progress.sync(combat);onChange();info(progress.messages.at(-1)||'Equipment updated');render();(panel.querySelector('[data-item-action]:not(:disabled)')||panel.querySelector('#item-list button'))?.focus({preventScroll:true});}else info('That action is unavailable right now.');
 });
 panel.addEventListener('keydown',e=>{if(e.code!=='Tab')return;const buttons=[...panel.querySelectorAll('button:not(:disabled)')].filter(b=>!b.hidden&&b.getClientRects().length);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
 $('#buy-potion').onclick=()=>{if(mode==='merchant'?progress.buySupplies(combat.player):mode==='smith'&&progress.buyPotion(combat.player)){onChange();info('Healing draught added to your supplies.');render();}};
 function open(nextMode){mode=nextMode;pendingSale=null;filter='all';selected=mode==='merchant'?(progress.data.items.find(i=>!Object.values(progress.data.loadout).includes(i.id))?.id??progress.data.loadout[combat.player.weapon]):progress.data.loadout[combat.player.weapon];info('');render();panel.hidden=false;panel.scrollTop=0;$('#bag-close').focus();}
 const projected=new T.Vector3();function update(dt,camera){
  const inCamp=(progress.data.campaign?.region||0)===0;smith.visible=inCamp&&Math.hypot(combat.player.x-SMITH.x,combat.player.z-SMITH.z)<35;glow.visible=smith.visible;
  const d=progress.data,p=combat.player;text('#level-text',`LV ${d.level} · ${d.gold} gold`);$('#xp-fill').style.width=`${d.level===8?100:d.xp/xpNeeded(d.level)*100}%`;text('#potion-count',progress.potionCD>0?`${Math.ceil(progress.potionCD)}s`:`${d.potions}`);text('#save-state',store.status);$('#smith-button').classList.toggle('near',progress.nearSmith(p));$('#smith-button').title=progress.nearSmith(p)?'Speak to Borin':'Borin is at the west side of Hearthstead market';
  text('#character-level',d.level);text('#xp-text',d.level===8?'MAX LEVEL':`${d.xp} / ${xpNeeded(d.level)} XP`);
  if(!panel.hidden&&rendered!==progress.revision)render();
  groundLoot.update(combat.time);
  for(const [id,mesh] of drops)if(!d.drops.some(x=>x.id===id)){mesh.userData.label.remove();scene.remove(mesh);drops.delete(id);}
  const nearest=[...d.drops].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)).slice(0,3),labelRects=[],hudRects=d.drops.length?lootOccluders.map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height):[];
  for(const drop of d.drops){let g=drops.get(drop.id);if(!g){g=groundLoot.create(drop);const label=document.createElement('div');label.className=`loot-label ${drop.item?.rarity||'common'}`;label.textContent=drop.item?itemName(drop.item):`${drop.gold} gold${drop.ore?` · ${drop.ore} ore`:''}`;$('#enemy-labels').append(label);g.userData.label=label;scene.add(g);drops.set(drop.id,g);}
   projected.set(drop.x,heightAt(drop.x,drop.z)+.9,drop.z).project(camera);const label=g.userData.label;label.hidden=!nearest.includes(drop)||Math.hypot(drop.x-p.x,drop.z-p.z)>8||projected.z<0||projected.z>1||Math.abs(projected.x)>.85||Math.abs(projected.y)>.6;
   if(!label.hidden){const half=label.offsetWidth/2,height=label.offsetHeight,sx=T.MathUtils.clamp((projected.x*.5+.5)*innerWidth,half+8,innerWidth-half-8);let sy=(-projected.y*.5+.5)*innerHeight;
    // At most three labels: stack clustered drops without hiding the item models.
    for(let n=0;n<3;n++){const hit=labelRects.find(r=>sx+half>r.left&&sx-half<r.right&&sy>r.top-4&&sy-height<r.bottom+4);if(!hit)break;sy=hit.top-5;}
    label.hidden=hudRects.some(r=>sx+half>r.left&&sx-half<r.right&&sy>r.top&&sy-height<r.bottom);
    label.style.left=`${sx}px`;label.style.top=`${sy}px`;if(!label.hidden)labelRects.push({left:sx-half,right:sx+half,top:sy-height,bottom:sy});
   }
  }
  smith.position.y=heightAt(SMITH.x,SMITH.z)+.07;if(smith.visible)animateSmith(combat.time);glow.position.y=heightAt(SMITH.x,SMITH.z)+2;
  projected.set(SMITH.x,heightAt(SMITH.x,SMITH.z)+2.5,SMITH.z).project(camera);smithLabel.hidden=!inCamp||projected.z<0||projected.z>1||Math.abs(projected.x)>.9||Math.abs(projected.y)>.85;smithLabel.style.left=`${(projected.x*.5+.5)*innerWidth}px`;smithLabel.style.top=`${(-projected.y*.5+.5)*innerHeight}px`;
 }
 function clearDrops(){for(const g of drops.values()){g.userData.label.remove();scene.remove(g);}drops.clear();}
 return{open,update,render,clearDrops};
}
