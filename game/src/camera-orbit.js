// Camera math is independent of Three.js, input devices and saved game state.
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const smooth=dt=>1-Math.exp(-Math.max(0,dt)*14);
export const CAMERA_DEFAULTS={zoom:.88,minZoom:.7,maxZoom:1.35,minPitch:.48,maxPitch:1.16};
export function cameraRelative(x,z,yaw){const c=Math.cos(yaw),s=Math.sin(yaw);return{x:x*c+z*s,z:z*c-x*s};}
export function cameraHeading(yaw){return ['N','NE','E','SE','S','SW','W','NW'][(Math.round(-yaw/(Math.PI/4))+8)%8];}

// Slab intersection on a finite boom. Bounds are precomputed once per region.
export function boxEntry(origin,direction,length,box,padding=.24){
 let entry=0,exit=length;
 for(const axis of ['x','y','z']){
  const lo=box.min[axis]-padding,hi=box.max[axis]+padding,d=direction[axis],p=origin[axis];
  if(Math.abs(d)<1e-9){if(p<lo||p>hi)return null;continue;}
  let a=(lo-p)/d,b=(hi-p)/d;if(a>b)[a,b]=[b,a];entry=Math.max(entry,a);exit=Math.min(exit,b);if(entry>exit)return null;
 }
 return entry;
}
export function cameraClearance(origin,direction,length,obstacles){
 let safe=length;
 for(const obstacle of obstacles){
  const broad=boxEntry(origin,direction,safe,obstacle);if(broad===null)continue;
  if(obstacle.parts){for(const part of obstacle.parts){const hit=boxEntry(origin,direction,safe,part);if(hit!==null)safe=Math.min(safe,Math.max(0,hit-.06));}}
  else safe=Math.min(safe,Math.max(0,broad-.06));
 }
 return safe;
}
export class CameraOrbit{
 constructor(){this.reset(true);this.focus=null;this.distance=0;this.blocked=false;}
 reset(snap=false){this.targetYaw=0;this.targetTilt=0;this.targetZoom=CAMERA_DEFAULTS.zoom;if(snap){this.yaw=0;this.tilt=0;this.zoom=CAMERA_DEFAULTS.zoom;this.distance=0;}}
 stop(){this.targetYaw=this.yaw;this.targetTilt=this.tilt;this.targetZoom=this.zoom;}
 drag(dx,dy,touch=false){const speed=touch?.009:.006;this.targetYaw=wrap(this.targetYaw-dx*speed);this.targetTilt=clamp(this.targetTilt+dy*speed*.7,-.25,.42);}
 wheel(delta){this.targetZoom=clamp(this.targetZoom+delta*.00045,CAMERA_DEFAULTS.minZoom,CAMERA_DEFAULTS.maxZoom);}
 advance(dt){const a=smooth(dt);this.yaw=wrap(this.yaw+wrap(this.targetYaw-this.yaw)*a);this.tilt+=(this.targetTilt-this.tilt)*a;this.zoom+=(this.targetZoom-this.zoom)*a;}
 position(player,dt,portrait,obstacles=[]){
  const focus={x:player.x,y:.75,z:player.z};
  // Follow the player's focus directly: yaw remains screen-relative even while
  // strafing. Smooth angles/radius, never interpolate Cartesian points through walls.
  this.focus=focus;
  const up=portrait?12:10,back=portrait?13:11;
  const pitch=clamp(Math.atan2(up,back)+this.tilt,CAMERA_DEFAULTS.minPitch,CAMERA_DEFAULTS.maxPitch);
  const wanted=Math.hypot(up,back)*this.zoom;
  const direction=a=>({x:Math.sin(this.yaw)*Math.cos(a),y:Math.sin(a),z:Math.cos(this.yaw)*Math.cos(a)});
  let actualPitch=pitch,dir=direction(pitch),safe=cameraClearance(focus,dir,wanted,obstacles);
  // A high angle is preferable to pushing the camera into the hero's head in
  // narrow alleys. Test the entire new boom, including raised gate masonry.
  if(safe<2.6)for(let a=pitch+.12;a<=Math.PI/2+.001;a=Math.min(Math.PI/2,a+.12)){
   const trial=direction(a),room=cameraClearance(focus,trial,wanted,obstacles);
   if(room>safe){safe=room;dir=trial;actualPitch=a;}if(safe>=2.6||a===Math.PI/2)break;
  }
  // The focus can lie inside a conservative bound (for example a roof eave).
  // Escape vertically beyond all nearby solids rather than placing the lens inside.
  if(safe<.35){
   let height=focus.y+2.6;
   for(const box of obstacles)for(const b of box.parts||[box])if(focus.x>=b.min.x-.3&&focus.x<=b.max.x+.3&&focus.z>=b.min.z-.3&&focus.z<=b.max.z+.3)height=Math.max(height,b.max.y+.4);
   this.distance=height-focus.y;this.blocked=true;this.pitch=Math.PI/2;this.eye={x:focus.x+Math.sin(this.yaw)*.001,y:height,z:focus.z+Math.cos(this.yaw)*.001};return this.eye;
  }
  // Retract immediately for safety; ease back out when the obstacle clears.
  this.distance=!this.distance||safe<this.distance?safe:Math.min(safe,this.distance+(safe-this.distance)*smooth(dt));
  this.blocked=safe<wanted-.01||actualPitch!==pitch;this.pitch=actualPitch;
  this.eye={x:focus.x+dir.x*this.distance,y:focus.y+dir.y*this.distance,z:focus.z+dir.z*this.distance};return this.eye;
 }
 telemetry(){return{yaw:this.yaw,pitch:this.pitch,zoom:this.zoom,distance:this.distance,blocked:this.blocked,heading:cameraHeading(this.yaw),position:this.eye?{...this.eye}:null};}
 shaken(dx,dy,obstacles){
  if(this.blocked||!this.eye)return this.eye;
  const end={x:this.eye.x+dx,y:this.eye.y+dy,z:this.eye.z},delta={x:end.x-this.focus.x,y:end.y-this.focus.y,z:end.z-this.focus.z},length=Math.hypot(delta.x,delta.y,delta.z);
  const dir={x:delta.x/length,y:delta.y/length,z:delta.z/length},safe=cameraClearance(this.focus,dir,length,obstacles);
  return safe<.35?this.eye:{x:this.focus.x+dir.x*safe,y:this.focus.y+dir.y*safe,z:this.focus.z+dir.z*safe};
 }
}
