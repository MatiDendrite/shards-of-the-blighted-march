import {DODGE_DURATION} from './combat-model.js';
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n);};

// Every weapon reaches its strike pose during the model's active hit window.
export function attackPose(a){
 if(!a)return {lift:0,cut:0,settle:0,thrust:0,twist:0};
 const lift=ease(a.age/a.windup),cut=ease((a.age-a.windup)/a.active),settle=ease((a.age-a.windup-a.active)/a.recovery),strength=1-settle;
 const direction=a.combo===2?-1:1;
 return {lift:lift*strength,cut:cut*strength,settle,thrust:cut*strength,twist:(-.36*lift+1.05*cut)*strength*direction};
}

// A planted crouch, directional push and eased recovery, driven by simulation
// age rather than render delta. Pause, hit-stop and slow frames cannot drift it.
export function dodgePose(p){
 const t=clamp((p.dodgeAge||0)/DODGE_DURATION);
 const weight=p.dodge>0?ease(t/.24)*(1-ease((t-.42)/.58)):0;
 const forward=(p.dodgeX||0)*Math.sin(p.angle)+(p.dodgeZ||0)*Math.cos(p.angle);
 const side=(p.dodgeX||0)*Math.cos(p.angle)-(p.dodgeZ||0)*Math.sin(p.angle);
 const left=(.88+.10*side)*weight,right=(.88-.10*side)*weight;
 // Actual hip→knee→ankle lengths and ankle offset of the Wanderer rig.
 // Counter-rotated ankles keep the soles flat, with one foot leading sideways.
 const shortening=b=>.825*(1-Math.cos(b))-.065*Math.sin(b);
 return {weight,forward,side,left,right,drop:Math.min(shortening(left),shortening(right)),pitch:.48*forward*weight,roll:-.38*side*weight};
}

export function createHeroMotion(hero){
 const j=hero.userData.joints;
 const rest=Object.values(j).map(node=>({node,position:node.position.clone(),rotation:node.rotation.clone()}));
 return (p,time)=>{
  // Rebuild from the authored rest pose, never from last frame's dodge/attack.
  for(const {node,position,rotation} of rest){node.position.copy(position);node.rotation.copy(rotation);}
  hero.rotation.x=hero.rotation.z=0;
  const pose=dodgePose(p),w=pose.weight,swing=Math.sin(p.walk||0)*.52*(p.gait||0)*(1-w);
  j.leftLeg.rotation.x=swing;j.rightLeg.rotation.x=-swing;
  j.leftShin.rotation.x=Math.max(0,-swing)*.9;j.rightShin.rotation.x=Math.max(0,swing)*.9;
  j.leftArm.rotation.x=-swing*.65;j.rightArm.rotation.x=swing*.65;
  j.torso.position.y+=((p.gait||0)>0.01?Math.abs(Math.sin(p.walk||0))*.023:Math.sin(time*1.6)*.006)*(1-w);
  if(!p.dodge)return pose;
  for(const node of [j.torso,j.head,j.leftArm,j.rightArm,j.leftLeg,j.rightLeg])node.position.y-=pose.drop;
  for(const [leg,shin,foot,bend] of [[j.leftLeg,j.leftShin,j.leftFoot,pose.left],[j.rightLeg,j.rightShin,j.rightFoot,pose.right]]){
   leg.rotation.x=swing*(leg===j.leftLeg?1:-1)-bend;shin.rotation.x=2*bend;
   if(foot)foot.rotation.x=-leg.rotation.x-shin.rotation.x;
  }
  // Head and shoulder joints are siblings, not children of the torso.
  // Follow its lean explicitly so the helmet and arms stay attached.
  for(const [node,height] of [[j.head,.53],[j.leftArm,.30],[j.rightArm,.30]]){
   node.position.x-=Math.sin(pose.roll)*height;
   node.position.z+=Math.sin(pose.pitch)*height;
   node.position.y-=height*(1-Math.cos(pose.pitch)*Math.cos(pose.roll));
  }
  j.torso.rotation.x=pose.pitch;j.torso.rotation.z=pose.roll;
  j.head.rotation.x=pose.pitch*.65;j.head.rotation.z=pose.roll*.65;
  j.leftArm.rotation.x+=(-.8+pose.forward*.20)*w;j.rightArm.rotation.x+=(-1.0+pose.forward*.20)*w;
  j.leftArm.rotation.z=(.16-pose.side*.2)*w;j.rightArm.rotation.z=(-.16-pose.side*.2)*w;
  if(j.leftForearm)j.leftForearm.rotation.x=-.75*w;
  if(j.rightForearm)j.rightForearm.rotation.x=-.12*w;
  return pose;
 };
}
