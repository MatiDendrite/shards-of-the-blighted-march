// 404 reference: wildlife. A red deer stag: swept body, long neck, branching
// antlers, pale rump and throat, legs on named hips for the gait. Front +Z.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9)=>Object.assign(new THREE.MeshStandardMaterial({color,roughness}),{name});
 const coatMat=mat('fur',0x9a6238),paleMat=mat('fur',0xe2cfae),darkMat=mat('fur',0x3a2a1e),antlerMat=mat('bone',0xcdb895,.7),hoofMat=mat('leather',0x241d19,.6),eyeMat=mat('eyes',0x120d0a,.3);
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 const ell=(m,x,y,z,sx,sy,sz,parent=root)=>{const o=add(new THREE.SphereGeometry(1,12,8),m,x,y,z,parent);o.scale.set(sx,sy,sz);return o;};
 const v=(x,y,z)=>new THREE.Vector3(x,y,z);
 ell(coatMat,0,1.05,0,.24,.26,.62);ell(coatMat,0,1.1,.36,.25,.28,.3);ell(paleMat,0,1.02,-.55,.18,.2,.1);ell(paleMat,0,.85,.05,.17,.1,.45);
 // Neck and head on a named group so the deer can graze and look up.
 const head=new THREE.Group();head.name='head';head.position.set(0,1.28,.52);root.add(head);
 add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v(0,-.1,-.05),v(0,.2,.12),v(0,.42,.2)]),8,.1,8),coatMat,0,0,0,head);
 ell(paleMat,0,.12,.16,.08,.14,.06,head);ell(coatMat,0,.48,.28,.09,.1,.19,head);ell(darkMat,0,.44,.46,.05,.05,.05,head);
 for(const s of [-1,1]){ell(eyeMat,s*.07,.52,.34,.015,.018,.012,head);const ear=add(new THREE.ConeGeometry(.045,.16,6),coatMat,s*.09,.6,.2,head);ear.rotation.set(-.3,0,s*.9);
  // Antlers: a curved beam with three tines, all tubes.
  const beam=new THREE.CatmullRomCurve3([v(s*.05,.56,.22),v(s*.2,.8,.14),v(s*.26,1.02,.02),v(s*.2,1.2,-.05)]);add(new THREE.TubeGeometry(beam,10,.022,5),antlerMat,0,0,0,head);
  for(const [t,dx,dy,dz] of [[.3,.02,.14,.14],[.6,.1,.16,.06],[.85,-.06,.14,.05]]){const p=beam.getPoint(t);add(new THREE.TubeGeometry(new THREE.LineCurve3(p,v(p.x+s*dx,p.y+dy,p.z+dz)),1,.015,4),antlerMat,0,0,0,head);}}
 for(const [name,x,z,front] of [['leftFront',.12,.34,true],['rightFront',-.12,.34,true],['leftRear',.12,-.4,false],['rightRear',-.12,-.4,false]]){const hip=new THREE.Group();hip.name=name;hip.position.set(x,1,z);root.add(hip);
  ell(coatMat,0,-.1,0,.09,.2,.12,hip);add(new THREE.CylinderGeometry(.035,.028,.62,6),coatMat,0,-.55,front?.02:-.04,hip);add(new THREE.CylinderGeometry(.03,.036,.06,6),hoofMat,0,-.88,front?.03:-.05,hip);}
 const tail=new THREE.Group();tail.name='tail';tail.position.set(0,1.12,-.6);root.add(tail);ell(paleMat,0,-.04,-.02,.05,.09,.04,tail);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());
 for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
