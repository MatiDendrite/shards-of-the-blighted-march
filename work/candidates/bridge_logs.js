// Independent roundwood trestle strategy; exposed tied beams, not box rails.
export default function generate(T){
 const g=new T.Group(),wood=Object.assign(new T.MeshStandardMaterial({color:0x5e4a37,roughness:1}),{name:'timber'}),rope=Object.assign(new T.MeshStandardMaterial({color:0xa38b5d,roughness:1}),{name:'rope'});
 const log=(a,b,r,m=wood)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),o=new T.Mesh(new T.CylinderGeometry(r*.86,r,av.distanceTo(bv),8),m);o.position.copy(av.clone().add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());g.add(o);};
 for(const x of [-1.7,1.7])log([x,.82,-4.4],[x,.82,4.4],.23);
 for(let i=0;i<30;i++)log([-2,1.13,-4.2+i*.29],[2,1.13,-4.2+i*.29],.16);
 for(const x of [-2,2]){
  for(const z of [-3.9,-1.3,1.3,3.9]){log([x,.16,z],[x,2.3,z],.16);for(const y of [1.4,2])for(let k=0;k<3;k++){const o=new T.Mesh(new T.TorusGeometry(.18,.025,5,10),rope);o.rotation.x=Math.PI/2;o.position.set(x,y+k*.055,z);g.add(o);}}
  log([x,1.5,-4.2],[x,1.5,4.2],.095);log([x,2.14,-4.2],[x,2.14,4.2],.11);
  for(const z of [-2.6,0,2.6])log([x,1.45,z-1.2],[x,2.1,z+1.2],.08);
 }
 return g;
}
