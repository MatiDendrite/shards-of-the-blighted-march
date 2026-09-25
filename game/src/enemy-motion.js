import * as T from 'three';

// The axe generator's grip is expressed before ASSET's ground/centre transform.
export function attachEnemyAxe(root,prototype,kind){
 const hand=root.getObjectByName('rightForearm');if(!hand)throw Error('Enemy forearm is missing.');
 const axe=prototype.clone(true),scale=kind==='boss'?1.65:1;axe.name='enemy-axe';axe.scale.setScalar(scale);axe.rotation.set(Math.PI/2,-Math.PI/2,0);
 const frame=axe.children[0];frame.updateMatrix();const grip=new T.Vector3(-.15,.26,0).applyMatrix4(frame.matrix).multiplyScalar(scale).applyEuler(axe.rotation);
 axe.position.set(0,kind==='boss'?-.414:-.316,.043).sub(grip);hand.add(axe);
 axe.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.userData.restEmissive=o.material.emissive.clone();}});
 return axe;
}

// Poses only read combat state; hit timing, reach and ground warnings remain in
// the combat model. Every owned joint resets before applying a new phase.
export function createEnemyMotion(root,kind){
 const names=['head','torso','leftArm','rightArm','leftForearm','rightForearm','leftLeg','rightLeg','leftShin','rightShin'],parts={};
 for(const name of names){const node=root.getObjectByName(name);if(node)parts[name]={node,rest:node.rotation.clone()};}
 return (time,{swing=0,charge=0,follow=0,phase='idle',attackKind='sweep'}={})=>{
  for(const {node,rest} of Object.values(parts))node.rotation.copy(rest);
  const node=name=>parts[name]?.node,windup=phase==='windup',recovery=phase==='recovery',boss=kind==='boss',slam=attackKind==='slam',t=Number.isFinite(time)?time:0;
  node('leftLeg').rotation.x=swing;node('rightLeg').rotation.x=-swing;
  if(node('leftShin'))node('leftShin').rotation.x=Math.max(0,-swing)*.8;if(node('rightShin'))node('rightShin').rotation.x=Math.max(0,swing)*.8;
  node('rightArm').rotation.x=windup?-1.1-charge*1.25:recovery?-.35-follow*.4:boss?-.13:0;
  node('rightArm').rotation.z=windup&&!slam?-.35*charge:0;
  node('torso').rotation.y=windup?-.22*charge:follow*.22;
  if(kind==='brute'){
   // Both fists climb overhead, then drop into the slam.
   const lift=windup?-.5-charge*2.1:recovery?-.15-follow*.3:-.18-Math.abs(swing)*.2;
   node('leftArm').rotation.x=lift;node('rightArm').rotation.x=lift;node('leftArm').rotation.z=windup?.25*charge:.08;node('rightArm').rotation.z=windup?-.25*charge:-.08;
   node('torso').rotation.x=windup?-.12*charge:recovery?.18*follow:.04;node('torso').rotation.y=0;node('head').rotation.x=windup?-.1*charge:.05;
   return;
  }
  if(kind==='archer'){
   // Bow arm reaches forward while the string hand draws back to the cheek.
   node('leftArm').rotation.x=windup?-1.45:recovery?-1.1+follow*.6:-.35-swing*.2;node('leftArm').rotation.z=windup?.12:.05;
   node('rightArm').rotation.x=windup?-1.25-charge*.15:recovery?-.6:-.1+swing*.2;node('rightArm').rotation.z=windup?.55*charge:0;
   if(node('rightForearm'))node('rightForearm').rotation.x=windup?-1.2*charge:0;
   node('torso').rotation.y=windup?.35:0;node('torso').rotation.x=.03;node('head').rotation.y=windup?-.3:0;
   return;
  }
  if(boss){
   node('leftArm').rotation.x=windup&&slam?-.3-charge*1.25:-.30+follow*.12;
   node('leftArm').rotation.z=.12+(windup&&!slam?charge*.20:0);
   node('leftForearm').rotation.x=-.22;
   node('head').rotation.y=windup&&!slam?charge*.18:Math.sin(t*.8)*.022;
   node('head').rotation.x=windup&&slam?-.12*charge:.035+follow*.10;
   node('torso').rotation.x=windup&&slam?-.045*charge:follow*.045;
  }else{
   node('leftArm').rotation.x=-.18-swing*.32;node('leftForearm').rotation.x=-.10;
   node('torso').rotation.x=.045;node('head').rotation.x=.07;
  }
 };
}
