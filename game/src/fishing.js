// Shore fishing rules. The view only draws this state; saves only hold the
// catch. A cast needs open water within reach and no enemy nearby.
import {waterDistance} from './geography.js';

export const FISH=Object.freeze([
 Object.freeze({id:'perch',name:'Silver Perch',heal:40,weight:.62,color:0xc9d3d6}),
 Object.freeze({id:'trout',name:'Rainbow Trout',heal:70,weight:.3,color:0xd99a7c}),
 Object.freeze({id:'carp',name:'Golden Carp',heal:110,weight:.08,color:0xf2b84b}),
]);
export const FISH_LIMIT=20,CAST_TIME=.55,BITE_WINDOW=1.1;
const SAFE_RADIUS=7,REACH=[2.2,4.2];

// Nearest open-water point in front of the angler, preferring the facing direction.
export function fishingSpot(region,player,enemies=[]){
 if(!player||player.hp<=0)return null;
 if(enemies.some(e=>e.hp>0&&Math.hypot(e.x-player.x,e.z-player.z)<SAFE_RADIUS))return null;
 let best=null;
 for(let i=0;i<24;i++){const angle=player.angle+(i%2?1:-1)*Math.ceil(i/2)*Math.PI/12;
  for(let r=REACH[0];r<=REACH[1];r+=.5){const x=player.x+Math.sin(angle)*r,z=player.z+Math.cos(angle)*r;
   if(waterDistance(region,x,z)<-.35){const score=Math.abs(i)+r*.1;if(!best||score<best.score)best={x,z,angle,score};break;}}
  if(best&&i>=6)break;
 }
 return best&&{x:best.x,z:best.z,angle:best.angle};
}

export function pickFish(roll){let sum=0;for(const f of FISH){sum+=f.weight;if(roll<sum)return f;}return FISH[0];}

export class Fishing{
 constructor(random=Math.random){this.random=random;this.reset();}
 reset(){this.phase='idle';this.timer=0;this.spot=null;this.catch=null;this.events=[];}
 get active(){return this.phase!=='idle';}
 emit(type,data={}){this.events.push({type,...data});}
 consume(){return this.events.splice(0);}
 cast(region,player,enemies){
  if(this.active)return false;const spot=fishingSpot(region,player,enemies);if(!spot)return false;
  Object.assign(this,{phase:'cast',timer:CAST_TIME,spot,origin:{x:player.x,z:player.z}});player.angle=spot.angle;this.emit('cast',{spot});return true;
 }
 // E during a bite lands the fish; any other press reels in empty.
 hook(){
  if(this.phase==='bite'){const fish=pickFish(this.random());this.catch=fish;this.emit('catch',{fish,spot:this.spot});this.phase='idle';this.timer=0;return fish;}
  if(this.active){const spot=this.spot;this.phase='idle';this.timer=0;this.spot=null;this.emit('reel',{spot});}
  return null;
 }
 cancel(reason){if(!this.active)return;this.emit('cancel',{reason,spot:this.spot});this.phase='idle';this.timer=0;this.spot=null;}
 update(dt,player,enemies=[]){
  if(!this.active)return;
  if(player.hp<=0)return this.cancel('fallen');
  if(Math.hypot(player.x-this.origin.x,player.z-this.origin.z)>.25||player.action||player.dodge>0)return this.cancel('moved');
  if(enemies.some(e=>e.hp>0&&Math.hypot(e.x-player.x,e.z-player.z)<SAFE_RADIUS*.8))return this.cancel('danger');
  this.timer-=dt;if(this.timer>0)return;
  if(this.phase==='cast'){this.phase='wait';this.timer=2+this.random()*3.5;this.emit('land',{spot:this.spot});}
  else if(this.phase==='wait'){this.phase='bite';this.timer=BITE_WINDOW;this.emit('bite',{spot:this.spot});}
  else if(this.phase==='bite'){this.emit('escape',{spot:this.spot});this.phase='wait';this.timer=1.5+this.random()*3;}
 }
}
