// 404 reference: wildlife. A speckled hen: round body, fanned tail, red comb
// and wattle, yellow legs on named hips and a named head for pecking.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9)=>Object.assign(new THREE.MeshStandardMaterial({color,roughness}),{name});
 const featherMat=mat('feather',0xc98e4e),featherDarkMat=mat('feather',0x8a5a30),combMat=mat('comb',0xc3302a,.6),beakMat=mat('beak',0xe0b040,.5),eyeMat=mat('eyes',0x120d0a,.3);
 const ell=(m,x,y,z,sx,sy,sz,parent=root)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;};
 ell(featherMat,0,.24,0,.13,.12,.17);ell(featherDarkMat,0,.3,-.14,.06,.1,.09).rotation.x=-.6;
 for(const s of [-1,1])ell(featherDarkMat,s*.11,.25,-.01,.03,.07,.11);
 const head=new THREE.Group();head.name='head';head.position.set(0,.36,.13);root.add(head);
 ell(featherMat,0,.02,0,.06,.07,.065,head);ell(combMat,0,.09,.01,.015,.03,.04,head);ell(combMat,0,-.04,.05,.012,.022,.012,head);
 const beak=new THREE.Mesh(new THREE.ConeGeometry(.018,.05,5).rotateX(Math.PI/2),beakMat);beak.position.set(0,.01,.075);head.add(beak);
 for(const s of [-1,1])ell(eyeMat,s*.045,.03,.035,.008,.008,.006,head);
 for(const [name,x] of [['leftLeg',.05],['rightLeg',-.05]]){const hip=new THREE.Group();hip.name=name;hip.position.set(x,.16,0);root.add(hip);const leg=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.14,4),beakMat);leg.position.y=-.08;hip.add(leg);const foot=new THREE.Mesh(new THREE.ConeGeometry(.025,.05,3).rotateX(Math.PI/2),beakMat);foot.position.set(0,-.15,.02);hip.add(foot);}
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());
 for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
