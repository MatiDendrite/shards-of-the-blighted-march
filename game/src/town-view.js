import * as T from 'three';
import {ASSET} from '../lib/assetlib.js';
import {NPCS,MAPS,zoneName} from './world-map.js';
import {drawMap} from './map-renderer.js';
import {journeyGuide} from './journey-guide.js';
import {createTextWriter} from './hud-bindings.js';

export async function createTownView(scene,combat,progress,campaign,callbacks){
 const $=s=>document.querySelector(s),text=createTextWriter(),panel=$('#town-dialog'),people=[];
 const base=await ASSET(new URL('../assets/wanderer.js',import.meta.url).href,{surfaces:true,height:1.85});
 for(const n of NPCS){const root=base.clone();const materials=new Map();root.traverse(o=>{if(o.isMesh){if(!materials.has(o.material)){const m=o.material.clone();if(m.name==='fabric')m.color.setHex(n.color);materials.set(o.material,m);}o.material=materials.get(o.material);}});root.position.set(n.x,.05,n.z);root.rotation.y=Math.PI;scene.add(root);const label=document.createElement('div');label.className='smith-label town-label';label.textContent=`${n.name.toUpperCase()} · ${n.role.toUpperCase()}`;$('#enemy-labels').append(label);people.push({...n,root,label});}
 // Paint the minimap on the initial update, before the player opens the HUD.
 const small=$('#mini-map'),large=$('#local-map'),projection=new T.Vector3();let selected=null,tick=.13;
 function near(){const p=combat.player;return NPCS.find(n=>Math.hypot(n.x-p.x,n.z-p.z)<3)||null;}
 function close(){if(panel.hidden)return;panel.hidden=true;selected=null;callbacks.close();$('#npc-button').focus({preventScroll:true});}
 function content(){if(!selected)return;const m=MAPS[campaign.region];$('#town-title').textContent=`${selected.name} · ${selected.role}`;
  const guide=journeyGuide(campaign),advice=campaign.data.cleared[campaign.region]?`You have brought light back to ${m.town}. ${guide.title}. ${guide.tip}`:campaign.region===3?'The Warden waits in the northern court. His golden sweep leaves his back open; when the violet circle appears, get clear before the ground breaks. He grows fiercer at half health.':`Guardians roam ${m.west} to the west and ${m.east} to the east. The shard waits beyond the northern roads and calls reinforcements as it cracks. Your journal tracks every step.`;
  $('#town-story').textContent=selected.id==='elder'?`Welcome to ${m.town}. ${advice} Return to these lanterns whenever you need to recover.`:selected.id==='merchant'?`I buy spare weapons and armour here in ${m.town}. Your equipped loadout is protected. A healing draught restores 65 health. Borin handles upgrades up to +3 and salvage in Hearthstead; use the southern portals to return there.`:`Take any of the four roads out of ${m.town}. ${guide.title}${guide.target?` · ${guide.direction}, ${guide.distance} m`:''}. M shows services and portals. The northern portal leads onward after your quest; the southern portal leads back. J records your quests, but cannot teleport you.`;
  $('#town-trade').hidden=selected.id!=='merchant';
  $('#town-buy').hidden=selected.id!=='merchant';$('#town-buy').disabled=progress.data.gold<25||progress.data.potions>=20;$('#town-buy').textContent=`Healing draught · 25 gold (${progress.data.gold} available)`;$('#town-message').textContent='';
 }
 function open(){const n=near();if(!n||!callbacks.open())return false;selected=n;content();panel.hidden=false;$('#town-close').focus();return true;}
 $('#npc-button').onclick=open;$('#town-close').onclick=close;
 $('#town-journal').onclick=()=>{close();callbacks.journal();};
 $('#town-buy').onclick=()=>{if(selected?.id==='merchant'&&progress.buySupplies(combat.player)){callbacks.save();content();$('#town-message').textContent='Healing draught added to your supplies.';}};
 $('#town-trade').onclick=()=>{if(selected?.id!=='merchant')return;close();callbacks.trade();};
 panel.addEventListener('keydown',e=>{if(e.code!=='Tab')return;const buttons=[...panel.querySelectorAll('button:not(:disabled)')].filter(b=>!b.hidden),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
 function map(canvas,detailed){drawMap(canvas,{region:campaign.region,combat,progress,detailed});}
 function update(dt,camera){const p=combat.player;tick+=dt;
  for(const n of people){const distance=Math.hypot(n.x-p.x,n.z-p.z);n.root.visible=distance<35;projection.set(n.x,2.5,n.z).project(camera);n.label.hidden=distance>13||projection.z<0||projection.z>1||Math.abs(projection.x)>.9||Math.abs(projection.y)>.7;n.label.style.left=`${(projection.x*.5+.5)*innerWidth}px`;n.label.style.top=`${(-projection.y*.5+.5)*innerHeight}px`;}
  const n=near();$('#npc-button').hidden=!n||p.hp<=0||!panel.hidden;text('#npc-button',n?`Speak to ${n.name} · E`:'');
  text('#zone-name',zoneName(campaign.region,p.x,p.z));text('#town-location',`${MAPS[campaign.region].town} · 120 × 120 m region`);
  if(tick>.12||!$('#journal').hidden){tick=0;map(small,false);if(!$('#journal').hidden)map(large,true);}
 }
 return {open,close,update,near};
}
