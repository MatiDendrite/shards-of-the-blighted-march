import {loadActorAsset} from './actor-surfaces.js';
import {mergeJoints} from './actor-batching.js';

const roles=['smith','merchant','elder','guide','raider'];let prototypes;
export function prepareMarchfolk(bundle){
 const result={};
 for(const role of roles){
  const actor=bundle.getObjectByName(role);if(!actor)throw Error(`Missing cast role: ${role}`);
  actor.removeFromParent();actor.position.set(0,0,0);
  if(role==='raider')actor.traverse(o=>{if(o.isGroup&&o.name.startsWith('raider-'))o.name=o.name.slice(7);});
  mergeJoints(actor);result[role]=actor;
 }
 return result;
}
export async function loadNpcActor(role){
 if(!roles.includes(role))throw Error(`Unknown cast role: ${role}`);
 prototypes??=loadActorAsset(new URL('../assets/marchfolk.js',import.meta.url).href,{keepHierarchy:true}).then(prepareMarchfolk).catch(error=>{prototypes=null;throw error;});
 const root=(await prototypes)[role].clone(true);root.name=role==='raider'?'hollow-raider':`npc-${role}`;return root;
}

// Absolute simulation-time poses: menus freeze the work cycle without drift.
export function createNpcMotion(root,role){
 const handles={};for(const name of ['torso','head','leftArm','rightArm','rightForearm']){const node=root.getObjectByName(`${role}-${name}`);if(node)handles[name]={node,rotation:node.rotation.clone(),position:node.position.clone()};}
 return time=>{
  const t=Number.isFinite(time)?Math.max(0,time):0;
  for(const {node,rotation,position} of Object.values(handles)){node.rotation.copy(rotation);node.position.copy(position);}
  const head=handles.head.node,torso=handles.torso.node,left=handles.leftArm.node,right=handles.rightArm.node;
  torso.scale.y=1+Math.sin(t*1.65)*.0025;
  if(role==='smith'){
   // Long lift, quick strike, then a pause over the workpiece.
   const phase=t%3.2,raised=phase<1.55?Math.sin(phase/1.55*Math.PI/2):phase<1.9?Math.cos((phase-1.55)/.35*Math.PI/2):0;
   right.rotation.x-=raised*.95;handles.rightForearm.node.rotation.x-=raised*.22;head.rotation.x+=raised*.035;left.rotation.x=-.22;
  }else if(role==='merchant'){
   head.rotation.x=.13+Math.sin(t*.7)*.045;head.rotation.y=Math.sin(t*.46)*.12;right.rotation.x+=Math.sin(t*1.4)*.035;right.rotation.z+=Math.sin(t*1.4+.4)*.025;
  }else if(role==='elder'){
   head.rotation.y=Math.sin(t*.35)*.18;head.rotation.x=.035+Math.sin(t*.8)*.025;left.rotation.x=-.16+Math.sin(t*.8)*.025;
  }else if(role==='guide'){
   const scan=Math.sin(t*.42);head.rotation.y=scan*.32;head.rotation.x=.03+Math.max(0,-scan)*.09;left.rotation.x+=Math.sin(t*.65)*.035;right.rotation.x=-.10;
  }
 };
}
