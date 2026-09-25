// 404 reference: farmland-props. Three round hay bales, two standing and one
// stacked, wrapped in twine bands, with a pitchfork and loose straw.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.95,metalness=0)=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,metalness}),{name});
 const hayMat=mat('straw',0xd2b25c),hayEndMat=mat('straw',0xb8963e),twineMat=mat('fabric',0x9c7a45),handleMat=mat('timber',0x8a6440,.7),ironMat=mat('metal',0x555555,.45,.5);
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 const r=.62,w=1.15;
 // Bales: rounded cylinders (lathe rim) lying on their sides, spiral end faces.
 const rim=[new THREE.Vector2(0,-w/2),new THREE.Vector2(r*.9,-w/2),new THREE.Vector2(r,-w/2+.08),new THREE.Vector2(r,w/2-.08),new THREE.Vector2(r*.9,w/2),new THREE.Vector2(0,w/2)];
 const baleGeom=new THREE.LatheGeometry(rim,20).rotateZ(Math.PI/2),spiralGeom=new THREE.TorusGeometry(1,.03,4,20);
 function bale(x,y,z,yaw){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=yaw;root.add(g);add(baleGeom,hayMat,0,0,0,g);
  for(const s of [-1,1]){for(let k=1;k<5;k++){const ring=add(spiralGeom,hayEndMat,s*(w/2-.005),0,0,g);ring.rotation.y=Math.PI/2;ring.scale.setScalar(r*k/5);}}
  for(const dx of [-.3,.3]){const band=add(new THREE.TorusGeometry(r+.01,.015,4,24),twineMat,dx,0,0,g);band.rotation.y=Math.PI/2;}return g;}
 bale(-.7,r,0,.1);bale(.65,r,.15,-.25);bale(0,r*2+.35,.05,.4);
 // Pitchfork leaning against the stack.
 const fork=new THREE.Group();fork.position.set(1.15,0,.75);fork.rotation.set(-.28,.4,0);root.add(fork);
 add(new THREE.CylinderGeometry(.018,.02,1.5,6),handleMat,0,.75,0,fork);add(new THREE.BoxGeometry(.2,.03,.03),ironMat,0,1.52,0,fork);
 for(const x of [-.08,0,.08])add(new THREE.CylinderGeometry(.008,.005,.3,4),ironMat,x,1.67,0,fork);
 // Loose straw tufts on the ground.
 const tuft=new THREE.ConeGeometry(.06,.18,4);for(let i=0;i<14;i++){const a=i*2.4,d=.9+(i%4)*.2,t=add(tuft,hayEndMat,Math.cos(a)*d,.05,Math.sin(a)*d*.8);t.rotation.set(1.2+(i%3)*.2,a,0);}
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
