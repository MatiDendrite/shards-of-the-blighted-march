import * as T from 'three';
import {REGIONS,guardianCount} from './campaign-data.js';
import {EXIT,RETURN} from './world-map.js';
import {journeyGuide,questSteps} from './journey-guide.js';
import {enemyAttack,windupProgress} from './combat-model.js';
import {createTextWriter} from './hud-bindings.js';
import {groundHeight} from './terrain-height.js';
import {drapeGround} from './ground-projection.js';

export function createCampaignView(scene,campaign){
 const $=s=>document.querySelector(s),text=createTextWriter(),panel=$('#journal'),touch=document.body.classList.contains('touch');let stamp='',celebration=0;
 // M is the detailed atlas; J should put actionable quest steps before the map.
 panel.insertBefore($('#quest-list'),panel.querySelector('.local-map-wrap'));
 // Portal VFX use native rings, not a downloaded scenery mesh.
 const portals=[EXIT,RETURN].map(point=>{
  const root=new T.Group(),material=new T.MeshBasicMaterial({color:0xddba78,transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false});
  const rim=new T.Mesh(new T.RingGeometry(1.35,1.5,48),material);rim.position.y=1.6;root.add(rim);
  const veil=new T.Mesh(new T.CircleGeometry(1.3,48),material.clone());veil.material.opacity=.14;veil.position.y=1.6;root.add(veil);
  const floor=new T.Mesh(new T.RingGeometry(1.25,1.6,48),material);floor.rotation.x=-Math.PI/2;floor.position.y=.12;root.add(floor);
  root.position.set(point.x,0,point.z);scene.add(root);return{root,material,veil};
 });
 function render(){const m=campaign.combat,c=campaign.data;
  $('#travel-rule').textContent='Travel requires a world portal: north goes onward, south returns to the previous region. Approach it and press E. This journal cannot teleport you.';
  $('#region-map').replaceChildren();$('#quest-list').replaceChildren();
  REGIONS.forEach((q,i)=>{
   const current=i===campaign.region,done=c.cleared[i],unlocked=campaign.unlocked(i),button=document.createElement('div');button.dataset.region=i;button.className=`map-node${current?' current':''}${done?' cleared':''}${!unlocked?' locked':''}`;if(current)button.setAttribute('aria-current','location');
   const number=document.createElement('b'),name=document.createElement('span'),state=document.createElement('small');number.textContent=done?'✓':String(i+1).padStart(2,'0');name.textContent=q.short;state.textContent=current?'YOU ARE HERE':done?'CLEARED':unlocked?'ROAD OPEN':'SEALED';button.append(number,name,state);$('#region-map').append(button);
   const card=document.createElement('article');card.className=`quest-card${done?' done':current?' current':''}`;
   const tag=document.createElement('span');tag.className='eyebrow';tag.textContent=`QUEST ${i+1} · ${done?'COMPLETE':current?'ACTIVE':unlocked?'AVAILABLE':'LOCKED'}`;
   const title=document.createElement('h3');title.textContent=q.quest;const story=document.createElement('p');story.textContent=q.description;
   const objective=document.createElement('strong');objective.textContent=done?'The road is safe.':i===3?current?`Defeat the Warden · ${Math.ceil(m.enemies[0]?.hp||0)} / 640 health`:'Defeat the Fallen Warden':current?`Shard ${m.shard.exploded?'cleansed':`${Math.ceil(m.shard.hp)} / 250 HP`} · Guardians ${m.kills} / ${m.requiredKills}`:`Cleanse the shard and defeat all ${guardianCount(i)} guardians`;
   const reward=document.createElement('small');reward.textContent=`${done?'Reward received':'Reward'} · ${q.gold} gold · ${q.xp} XP · 2 draughts`;card.append(tag,title,story,objective);
   if(current){const steps=document.createElement('ul');steps.className='quest-steps';for(const step of questSteps(campaign)){const li=document.createElement('li');li.textContent=`${step.done?'✓':'◇'} ${step.text}`;li.classList.toggle('complete',step.done);steps.append(li);}const tip=document.createElement('p');tip.className='quest-advice';tip.textContent=journeyGuide(campaign).tip;card.append(steps,tip);}
   card.append(reward);$('#quest-list').append(card);
  });
 }
 panel.addEventListener('keydown',e=>{if(e.code!=='Tab')return;const buttons=[...panel.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
 function open(){render();panel.hidden=false;panel.scrollTop=0;$('#journal-close').focus();}
 function celebrate(){const q=REGIONS[campaign.region];$('#arrival').replaceChildren();const heading=document.createElement('strong'),reward=document.createElement('span');heading.textContent=`QUEST COMPLETE · ${q.quest}`;reward.textContent=`+${q.gold} gold · +${q.xp} XP · +2 draughts · collect the spoils`;$('#arrival').append(heading,reward);$('#arrival').hidden=false;celebration=6;}
 function update(dt=0){const c=campaign.data,m=campaign.combat,i=campaign.region,q=REGIONS[i],guide=journeyGuide(campaign);
  const nextStamp=`${i}:${c.cleared.join()}`;if(nextStamp!==stamp){stamp=nextStamp;$('#location h2').textContent=q.name;document.body.classList.toggle('boss-region',i===3);}
  text('#objective .eyebrow',`QUEST ${i+1} / 4 · ${q.quest}`);
  text('#objective-text',guide.title);
  $('#objective-route').hidden=!guide.target;text('#objective-route',guide.target?`${guide.direction} · ${guide.distance} m · M to view map`:'');
  text('#objective-tip',guide.tip);
  text('#objective-detail',touch?`${i===3?'':`${m.kills} / ${m.requiredKills} guardians · `}${campaign.shards} / 3 shards`:`${campaign.shards} / 3 shards · ${i===3?'J: map & journal':`${m.kills} / ${m.requiredKills} guardians · J: journal`}`);
  const portal=campaign.nearPortal,unlocked=portal&&campaign.unlocked(portal.destination);$('#gate-button').hidden=!portal||m.dead;$('#gate-button').disabled=!unlocked||!campaign.safe;text('#gate-button',!unlocked?'Portal sealed · finish this quest':!campaign.safe?'Portal unsafe · leave combat first':`Enter ${REGIONS[portal.destination].name} · E`);
  portals.forEach((gate,n)=>{gate.root.visible=n===0?i<3:i>0;gate.root.position.y=groundHeight(i,gate.root.position.x,gate.root.position.z);if(gate.region!==i){drapeGround(gate.root.children[2],(x,z)=>groundHeight(i,x,z),.12);gate.region=i;}const color=n===1?0x80cddd:c.cleared[i]?0xe8c16e:0x946baf;gate.material.color.setHex(color);gate.veil.material.color.setHex(color);gate.material.opacity=.5+Math.sin(m.time*2)*.12;gate.veil.material.opacity=.12+Math.sin(m.time*1.3)*.035;});
  const boss=m.enemies.find(e=>e.kind==='boss');$('#boss-bar').hidden=!boss||boss.hp<=0||Math.hypot(boss.x-m.player.x,boss.z-m.player.z)>25;text('#boss-phase',boss?.enraged?'ENRAGED · WATCH THE GROUND':'KEEPER OF THE BROKEN OATH');if(boss)$('#boss-health').style.width=`${boss.hp/boss.maxHp*100}%`;
  const windup=boss?.phase==='windup',attack=boss?enemyAttack(boss):null;
  text('#boss-intent',windup?`${attack.name} · ${Math.max(0,boss.timer).toFixed(1)}s · ${attack.hint}`:boss?.phase==='recovery'?'RECOVERING · Your opening to strike':'');
  $('#boss-cast').hidden=!windup;$('#boss-cast-fill').style.width=`${windup?windupProgress(boss)*100:0}%`;
  $('#boss-cast-fill').style.background=boss?.attackKind==='slam'?'#c6a3ef':'#e1b568';
  celebration=Math.max(0,celebration-dt);if(celebration<=0)$('#arrival').hidden=true;
 }
 return{open,update,render,celebrate};
}
