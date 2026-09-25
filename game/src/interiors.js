// Enterable market houses. The two houses facing each market square open onto
// a furnished room; walls keep a real doorway, and scenery stays outside.
export const HALLS=Object.freeze([
 Object.freeze({kind:'inn',name:'The Lantern Inn'}),
 Object.freeze({kind:'home',name:'Hearth House'}),
]);
// Local plaster box of village_house.js (front +Z), and the doorway through it.
const HALF_W=2.7,HALF_D=2.3,WALL=.24,DOOR=.72;

// Local (x,z) in the house frame to world coordinates.
export function hallToWorld(site,x,z){const c=Math.cos(site.rotation),s=Math.sin(site.rotation),k=site.scale;return{x:site.x+(x*c+z*s)*k,z:site.z+(-x*s+z*c)*k};}
export function worldToHall(site,x,z){const c=Math.cos(site.rotation),s=Math.sin(site.rotation),k=site.scale,dx=(x-site.x)/k,dz=(z-site.z)/k;return{x:dx*c-dz*s,z:dx*s+dz*c};}

function box(site,x,z,w,d){const p=hallToWorld(site,x,z),c=Math.abs(Math.cos(site.rotation)),s=Math.abs(Math.sin(site.rotation)),k=site.scale;return{x:p.x,z:p.z,w:(w*c+d*s)*k,d:(w*s+d*c)*k};}
export function hallColliders(site){
 const side=HALF_W-DOOR,front=(HALF_W+DOOR)/2;
 return [
  box(site,0,-HALF_D,HALF_W*2,WALL),box(site,-HALF_W,0,WALL,HALF_D*2),box(site,HALF_W,0,WALL,HALF_D*2),
  box(site,-front,HALF_D,side,WALL),box(site,front,HALF_D,side,WALL),
  // Furniture footprints: hearth on the back wall, bed or counter on one side.
  box(site,0,-HALF_D+.45,1.5,.6),box(site,site.hall==='inn'?-1.9:1.95,-1.1,.9,site.hall==='inn'?1.8:1.9),
 ];
}
// Keeps grass, flowers and stones off the floorboards without blocking the player.
export function hallFloor(site){return box(site,0,0,HALF_W*2,HALF_D*2);}
export function insideHall(site,x,z,margin=0){const p=worldToHall(site,x,z);return Math.abs(p.x)<HALF_W-.1+margin&&p.z>-HALF_D+.1-margin&&p.z<HALF_D+margin;}
export function hallDoor(site){return hallToWorld(site,0,HALF_D+.55);}
export const HALL_SIZE=Object.freeze({halfWidth:HALF_W,halfDepth:HALF_D,wall:WALL,door:DOOR});
