export const MOTION_STYLES={
 warrior:{stride:.33,lift:.11,crouch:.12,idleDrop:0,lean:.10,sway:.025,arms:.34,elbow:.20,dodgeDepth:.23,dodgeLean:1},
 mage:{stride:.29,lift:.075,crouch:.095,idleDrop:0,lean:.035,sway:.018,arms:.18,elbow:.30,dodgeDepth:.18,dodgeLean:.72},
 ninja:{stride:.35,lift:.14,crouch:.15,idleDrop:.025,lean:.18,sway:.038,arms:.43,elbow:.52,dodgeDepth:.29,dodgeLean:1.14},
 dwarf:{stride:.28,lift:.095,crouch:.11,idleDrop:.025,lean:.075,sway:.042,arms:.27,elbow:.24,dodgeDepth:.22,dodgeLean:.82},
};
export const motionStyle=id=>MOTION_STYLES[id]||MOTION_STYLES.warrior;
export const STANCE_FRACTION=.52;
const clamp=n=>Math.max(0,Math.min(1,n));
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

// Read-only visual odometry. No input intent, cooldown or saved player field is
// changed. Blocked movement cannot keep advancing the footfall cycle.
export function createLocomotionSampler(style,worldScale=1){
 let last=null,state={phase:0,gait:0,speed:0,forward:1,side:0,turn:0};
 function reset(){last=null;state={phase:0,gait:0,speed:0,forward:1,side:0,turn:0};}
 function sample(p,time){
  if(!Number.isFinite(p.x)||!Number.isFinite(p.z))return{phase:(p.walk||0)/(Math.PI*2),gait:clamp(p.gait||0),speed:3.4*(p.gait||0),forward:1,side:0,turn:0};
  const t=Number.isFinite(time)?time:0;
  if(last&&(t<last.time||p.region!==last.region||p.hp<=0))reset();
  if(!last){last={x:p.x,z:p.z,angle:p.angle||0,time:t,region:p.region};return state;}
  const dt=t-last.time;if(dt<=0)return state;
  const dx=p.x-last.x,dz=p.z-last.z,distance=Math.hypot(dx,dz),angle=p.angle||0;
  if(dt>.3||distance>dt*9+.15){reset();last={x:p.x,z:p.z,angle,time:t,region:p.region};return state;}
  const speed=p.dodge>0?0:distance/dt,blend=1-Math.exp(-dt*16),target=clamp(speed/3.4);
  state.gait+=(target-state.gait)*blend;if(state.gait<.0001)state.gait=0;
  state.speed=speed;
  if(speed>.03){state.forward=(dx*Math.sin(angle)+dz*Math.cos(angle))/distance;state.side=(dx*Math.cos(angle)-dz*Math.sin(angle))/distance;state.phase=(state.phase+distance*STANCE_FRACTION/(2*style.stride*worldScale*Math.max(.3,state.gait)))%1;}
  state.turn+=(Math.max(-3,Math.min(3,angleDelta(angle,last.angle)/dt))-state.turn)*(1-Math.exp(-dt*10));
  last={x:p.x,z:p.z,angle,time:t,region:p.region};return state;
 }
 sample.reset=reset;return sample;
}

export function footfall(phase){
 const t=((phase%1)+1)%1;
 if(t<STANCE_FRACTION)return{travel:1-2*t/STANCE_FRACTION,lift:0,planted:true};
 const u=(t-STANCE_FRACTION)/(1-STANCE_FRACTION),ease=u*u*(3-2*u);
 return{travel:-1+2*ease,lift:Math.sin(Math.PI*u)**2,planted:false};
}
