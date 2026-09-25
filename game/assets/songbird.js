// 404 reference: wildlife. A small finch with named wing groups that flap,
// a forked tail and a bright breast. Front +Z.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.85,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,...extra}),{name});
 const backMat=mat('feather',0x6a5a4a),breastMat=mat('feather',0xd88a3a),wingMat=mat('feather',0x4a4038,.85,{side:THREE.DoubleSide}),beakMat=mat('beak',0x2a2622,.5);
 const ell=(m,x,y,z,sx,sy,sz)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);root.add(o);return o;};
 ell(backMat,0,.06,0,.045,.042,.08);ell(breastMat,0,.045,.02,.038,.035,.06);ell(backMat,0,.085,.07,.032,.032,.034);
 const beak=new THREE.Mesh(new THREE.ConeGeometry(.01,.03,4).rotateX(Math.PI/2),beakMat);beak.position.set(0,.082,.11);root.add(beak);
 const tail=new THREE.Mesh(new THREE.PlaneGeometry(.05,.07).rotateX(-Math.PI/2+.3),wingMat);tail.position.set(0,.06,-.11);root.add(tail);
 for(const [name,s] of [['leftWing',1],['rightWing',-1]]){const wing=new THREE.Group();wing.name=name;wing.position.set(s*.03,.075,.01);root.add(wing);const blade=new THREE.Mesh(new THREE.PlaneGeometry(.12,.07).translate(s*.06,0,0).rotateX(-Math.PI/2),wingMat);wing.add(blade);}
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());
 for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
