// Pegged plank construction: level deck, braced rails and masonry footings.
export default function generate(T){
 const g=new T.Group(),mat=(name,color)=>Object.assign(new T.MeshStandardMaterial({color,roughness:.91}),{name});
 const wood=mat('timber',0x544132),edge=mat('timber',0x685140),stone=mat('stone',0x7d8276),iron=mat('metal',0x505d61);
 const box=(w,h,d,x,y,z,m=wood)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);return o;};
 const beam=(a,b,w,d,m=wood)=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),o=box(w,start.distanceTo(end),d,0,0,0,m);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...b).sub(new T.Vector3(...a)).normalize());};
 for(const x of [-1.72,1.72])for(const z of [-3.65,3.65])for(let row=0;row<3;row++)for(let col=0;col<2;col++)box(.41,.29,.95,x+(col-.5)*.44,.145+row*.295,z,stone);
 for(const x of [-1.65,1.65])box(.3,.38,8.8,x,.91,0);
 for(let i=0;i<28;i++){
  const z=-4.05+i*.30,o=box(4.16,.14,.285,0,1.12,z,i%4===0?edge:wood);o.rotation.y=Math.sin(i*4)*.004;
  for(const x of [-1.65,1.65]){const nail=new T.Mesh(new T.CylinderGeometry(.025,.025,.013,6),iron);nail.position.set(x,1.197,z);g.add(nail);}
 }
 for(const x of [-2.02,2.02]){
  for(const z of [-3.9,-1.3,1.3,3.9]){
   box(.25,1.22,.25,x,1.61,z);box(.29,.11,.29,x,2.26,z,edge);
   for(const y of [1.36,2.02]){box(.275,.13,.275,x,y,z,iron);for(const side of [-1,1]){const pin=new T.Mesh(new T.SphereGeometry(.036,6,4),iron);pin.position.set(x+side*.14,y,z);g.add(pin);}}
  }
  for(const y of [1.43,2.12])box(.16,.16,8.12,x,y,0,edge);
  for(const z of [-2.6,0,2.6])beam([x,1.41,z-1.16],[x,2.09,z+1.16],.12,.13);
  for(const side of [-1,1])beam([x*.84,.38,side*3.5],[x*.84,.95,side*1.55],.17,.17);
 }
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return g;
}
