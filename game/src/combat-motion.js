import {DODGE_DURATION} from './combat-model.js';
import {createActorSecondaryMotion} from './actor-motion.js';
import * as T from 'three';
import {motionStyle,createLocomotionSampler,footfall} from './hero-locomotion.js';
import {heroActionPose} from './hero-actions.js';
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
 const angle=Number.isFinite(p.angle)?p.angle:0;
 const forward=(p.dodgeX||0)*Math.sin(angle)+(p.dodgeZ||0)*Math.cos(angle);
 const side=(p.dodgeX||0)*Math.cos(angle)-(p.dodgeZ||0)*Math.sin(angle);
 const left=(.88+.10*side)*weight,right=(.88-.10*side)*weight;
 // Actual hip→knee→ankle lengths and ankle offset of the Wanderer rig.
 // Counter-rotated ankles keep the soles flat, with one foot leading sideways.
 const shortening=b=>.825*(1-Math.cos(b))-.065*Math.sin(b);
 return {weight,forward,side,left,right,drop:Math.min(shortening(left),shortening(right)),pitch:.48*forward*weight,roll:-.38*side*weight};
}

export function createHeroMotion(hero,options={}){
 const j=hero.userData.joints,secondary=createActorSecondaryMotion(hero);
 const rest=Object.values(j).map(node=>({node,position:node.position.clone(),rotation:node.rotation.clone()}));
 const bind=Object.fromEntries(Object.entries(j).map(([name,node])=>[name,{position:node.position.clone(),rotation:node.rotation.clone()}]));
 hero.updateWorldMatrix(true,true);const scale=j.leftLeg.parent.getWorldScale(new T.Vector3());
 let id=options.classId||'warrior',style=motionStyle(id),sample=createLocomotionSampler(style,scale.z);
 const target=new T.Vector3(),direction=new T.Vector3(),pole=new T.Vector3(),knee=new T.Vector3(),lower=new T.Vector3(),down=new T.Vector3(0,-1,0),inverse=new T.Quaternion(),combined=new T.Quaternion(),offset=new T.Vector3();
 function legPose(side,travelX,travelZ,lift){
  const leg=j[side+'Leg'],shin=j[side+'Shin'],foot=j[side+'Foot'],hip=bind[side+'Leg'].position,calf=bind[side+'Shin'].position,ankle=bind[side+'Foot'].position;
  const a=-calf.y,b=-ankle.y;
  target.set(hip.x+travelX-leg.position.x,hip.y+calf.y+ankle.y+lift-leg.position.y,hip.z+travelZ-leg.position.z);
  const length=Math.max(.001,Math.min(a+b,target.length()));direction.copy(target).normalize();
  pole.set(0,0,1).addScaledVector(direction,-direction.z).normalize();
  const along=(a*a-b*b+length*length)/(2*length),height=Math.sqrt(Math.max(0,a*a-along*along));
  knee.copy(direction).multiplyScalar(along).addScaledVector(pole,height);leg.quaternion.setFromUnitVectors(down,lower.copy(knee).normalize());
  inverse.copy(leg.quaternion).invert();lower.copy(direction).multiplyScalar(length).sub(knee).applyQuaternion(inverse).normalize();shin.quaternion.setFromUnitVectors(down,lower);
  combined.copy(leg.quaternion).multiply(shin.quaternion);inverse.copy(combined).invert();foot.quaternion.copy(inverse);
  // The authored foot origin is forward of the ankle. Keep that sole offset
  // level instead of treating it as a bent lower-leg bone (which pops knees).
  offset.set(ankle.x,0,ankle.z).applyQuaternion(inverse);foot.position.set(0,ankle.y,0).add(offset);
 }
 const animate=(p,time)=>{
  const classId=options.classId||p.classId||'warrior';if(classId!==id){id=classId;style=motionStyle(id);sample=createLocomotionSampler(style,scale.z);}
  // Rebuild from the authored rest pose, never from last frame's dodge/attack.
  for(const {node,position,rotation} of rest){node.position.copy(position);node.rotation.copy(rotation);}
  hero.rotation.x=hero.rotation.z=0;
  const t=Number.isFinite(time)?time:0,locomotion=sample(p,t),pose=dodgePose(p),w=pose.weight,g=locomotion.gait*(1-w),swing=Math.sin(locomotion.phase*Math.PI*2)*g,action=p.dodge?null:heroActionPose(id,p.action),aw=action?.weight||0;
  let drop=style.idleDrop+g*style.crouch+style.dodgeDepth*w;
  j.torso.rotation.set(style.lean*g+pose.pitch*style.dodgeLean,0,style.sway*swing-pose.side*.34*w-locomotion.turn*.022*g);
  j.leftArm.rotation.set(-.12-style.arms*swing,0,.07);j.rightArm.rotation.set(-.08+style.arms*swing,0,-.07);
  j.leftForearm.rotation.x=-.08-style.elbow*g;j.rightForearm.rotation.x=-.04-style.elbow*.55*g;
  if(id==='mage'){j.leftArm.rotation.x-=.18;j.leftForearm.rotation.x-=.22;}
  if(id==='ninja'){j.leftArm.rotation.x-=.20;j.rightArm.rotation.x-=.14;j.leftForearm.rotation.x-=.20;j.torso.rotation.x+=.045;}
  if(id==='dwarf'){j.leftArm.rotation.z+=.09;j.rightArm.rotation.z-=.09;}
  if(action&&aw>0){
   for(const name of ['leftArm','rightArm','leftForearm','rightForearm']){const a=action[name],r=j[name].rotation;r.set(r.x+(a[0]-r.x)*aw,r.y+(a[1]-r.y)*aw,r.z+(a[2]-r.z)*aw);}
   const b=action.body;j.torso.rotation.x+=b[0]*aw;j.torso.rotation.y=b[1]*aw;j.torso.rotation.z+=b[2]*aw;drop+=b[3]*aw;
  }
  if(w){
   const mage=id==='mage',ninja=id==='ninja';j.leftArm.rotation.x+=(-.7+pose.forward*.18)*w;j.rightArm.rotation.x+=(-.95+pose.forward*.18)*w;
   j.leftArm.rotation.z+=(mage?.30:ninja?.34:.14)*w-pose.side*.12*w;j.rightArm.rotation.z-=.15*w+pose.side*.12*w;
   j.leftForearm.rotation.x-=.65*w;j.rightForearm.rotation.x-=.08*w;
  }
  const breath=Math.sin(t*(id==='mage'?1.3:1.6))*.004*(1-g)*(1-w)*(1-aw);
  j.torso.position.y+=breath-drop;
  for(const name of ['head','leftArm','rightArm']){
   const node=j[name];offset.copy(bind[name].position).sub(bind.torso.position).applyQuaternion(j.torso.quaternion);node.position.copy(j.torso.position).add(offset);
   if(name==='head'){node.rotation.x=-j.torso.rotation.x*.35;node.rotation.y=-j.torso.rotation.y*.55;node.rotation.z=-j.torso.rotation.z*.4;}
   node.quaternion.premultiply(j.torso.quaternion);
  }
  for(const [side,phase,sign] of [['left',locomotion.phase,-1],['right',locomotion.phase+.5,1]]){
   const step=footfall(phase),travel=step.travel*style.stride*g;
   j[side+'Leg'].position.y-=drop;
   const x=travel*locomotion.side*scale.z/scale.x+(id==='dwarf'?.018*sign:0)+pose.side*w*.065*sign,z=travel*locomotion.forward+pose.forward*w*.075*sign;
   legPose(side,x,z,step.lift*style.lift*g);
  }
  secondary(t,{gait:g,windup:action?.phase==='windup'?aw:0});
  return pose;
 };
 animate.reset=()=>sample.reset();return animate;
}
