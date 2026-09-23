import {basicAttack} from './combat-model.js';
import {SKILLS,skillForSlot} from './class-data.js';
import {clearPath} from './class-combat.js';

// Touch has no ground cursor. Only offensive inputs acquire a visible target;
// movement, Blink and camera gestures keep their own direction.
export function touchAim(model,actions,held,angle){
 const p=model.player,offensive=actions.filter(a=>['attack','cleave','slam'].includes(a));
 if(!held&&!offensive.length)return{angle,point:null};
 let range=Math.max(4.2,basicAttack(p).range);
 for(const action of offensive){const skill=SKILLS[skillForSlot(p.classId,action)];if(skill?.effect==='projectile'||skill?.effect==='bomb')range=skill.range;}
 const candidates=[...model.enemies,...(model.shard.hp>0?[model.shard]:[])].filter(e=>e.hp>0&&Math.hypot(e.x-p.x,e.z-p.z)<=range).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
 const target=candidates.find(e=>clearPath(model,p,e));return target?{angle:Math.atan2(target.x-p.x,target.z-p.z),point:{x:target.x,z:target.z}}:{angle,point:null};
}
