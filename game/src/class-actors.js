import * as T from 'three';
import {loadActorAsset} from './actor-surfaces.js';
import {createHeroMotion} from './combat-motion.js';
import {CLASS_IDS} from './class-data.js';

// Load only the selected class; keep neutral portrait and live animation apart.
export function createClassActors(hero,weaponMount,{mergeJoints,cloneActor,prepare}){
 const warrior=new T.Group();warrior.scale.copy(hero.scale);warrior.userData.joints=hero.userData.joints;
 for(const node of [...hero.children])warrior.add(node);hero.scale.setScalar(1);hero.add(warrior);
 function entry(root,id){const portrait=cloneActor(root);portrait.rotation.set(0,0,0);portrait.traverse(o=>{delete o.userData.joints;if(o.name==='heroWeaponMount')o.visible=false;});return{root,portrait,motion:createHeroMotion(root,{classId:id})};}
 const cache=new Map([['warrior',entry(warrior,'warrior')]]);let current='warrior';
 async function load(id){
  if(!CLASS_IDS.includes(id))throw Error('Unknown class');if(cache.has(id))return;
  const root=await loadActorAsset(new URL(`../assets/${id}.js`,import.meta.url).href,{keepHierarchy:true});
  for(const name of ['head','torso','leftArm','rightArm','leftForearm','rightForearm','leftLeg','rightLeg','leftShin','rightShin','leftFoot','rightFoot'])if(!root.userData.joints?.[name])throw Error(`Missing ${id} joint: ${name}`);
  mergeJoints(root);cache.set(id,entry(root,id));prepare(root);
 }
 function activate(id){
  if(id===current)return;const next=cache.get(id);if(!next)throw Error('Character is not prepared');
  hero.remove(cache.get(current).root);hero.add(next.root);hero.userData.joints=next.root.userData.joints;next.root.userData.joints.rightForearm.add(weaponMount);next.motion.reset();current=id;
 }
 return{load,activate,animate:(p,t)=>cache.get(current).motion(p,t),resetMotion:()=>cache.get(current).motion.reset(),portrait:()=>cache.get(current).portrait,get joints(){return hero.userData.joints;},get current(){return current;}};
}
