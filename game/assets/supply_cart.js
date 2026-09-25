// 404 reference: market-props. Two-wheeled supply cart with plank bed, spoked
// wheels, shafts and a lashed load of crates, sacks and a tarp. Front +Z.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9,metalness=0)=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,metalness}),{name});
 const woodMat=mat('timber',0x8a6440),darkWoodMat=mat('timber',0x5e4128),ironMat=mat('metal',0x3a3a3a,.5,.5),sackMat=mat('fabric',0xc8b48a,.95),tarpMat=mat('fabric',0x6f7d5a,.95),ropeMat=mat('fabric',0xb49a6a,.95),crateMat=mat('timber',0xa47a4c);
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 const wheelR=.62,axleY=wheelR,bedY=.95,bedW=1.3,bedL=2.1;
 // Bed: floor planks with gaps, side boards and corner stakes.
 const plankGeom=new THREE.BoxGeometry(bedW,.06,.25);
 for(let i=0;i<8;i++)add(plankGeom,i%2?woodMat:darkWoodMat,0,bedY,-bedL/2+.14+i*.26);
 for(const s of [-1,1]){
  for(const y of [bedY+.16,bedY+.36])add(new THREE.BoxGeometry(.05,.14,bedL),woodMat,s*(bedW/2+.02),y,0);
  for(const z of [-bedL/2+.05,0,bedL/2-.05])add(new THREE.BoxGeometry(.07,.5,.07),darkWoodMat,s*(bedW/2+.03),bedY+.2,z);
 }
 add(new THREE.BoxGeometry(bedW,.3,.05),woodMat,0,bedY+.2,-bedL/2);
 const chassis=add(new THREE.BoxGeometry(.12,.12,bedL+.2),darkWoodMat,0,bedY-.1,0);
 for(const s of [-1,1])add(new THREE.BoxGeometry(.1,.1,bedL),darkWoodMat,s*.5,bedY-.08,0);
 // Shafts sweep forward and down to the harness point.
 for(const s of [-1,1]){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(s*.5,bedY-.08,bedL/2-.2),new THREE.Vector3(s*.47,bedY-.18,bedL/2+.6),new THREE.Vector3(s*.42,.45,bedL/2+1.3)]);add(new THREE.TubeGeometry(curve,12,.04,6),darkWoodMat,0,0,0);}
 // Spoked wheels on an iron axle; spokes instanced.
 add(new THREE.CylinderGeometry(.04,.04,bedW+.5,8).rotateZ(Math.PI/2),ironMat,0,axleY,-.15);
 const spokeGeom=new THREE.CylinderGeometry(.022,.022,wheelR*1.9,5),pose=new THREE.Object3D();
 for(const s of [-1,1]){
  const wheel=new THREE.Group();wheel.position.set(s*(bedW/2+.2),axleY,-.15);root.add(wheel);
  const rim=add(new THREE.TorusGeometry(wheelR,.05,6,24).rotateY(Math.PI/2),woodMat,0,0,0,wheel);
  add(new THREE.TorusGeometry(wheelR+.03,.022,4,24).rotateY(Math.PI/2),ironMat,0,0,0,wheel);
  add(new THREE.CylinderGeometry(.1,.1,.18,10).rotateZ(Math.PI/2),darkWoodMat,0,0,0,wheel);
  const spokes=new THREE.InstancedMesh(spokeGeom,woodMat,6);for(let i=0;i<6;i++){pose.rotation.set(i/6*Math.PI,0,0);pose.updateMatrix();spokes.setMatrixAt(i,pose.matrix);}wheel.add(spokes);
 }
 // Load: crates, grain sacks, a coiled rope and a tarp draped over the back.
 const crateGeom=new THREE.BoxGeometry(.5,.42,.5),slatGeom=new THREE.BoxGeometry(.52,.05,.05);
 for(const [x,y,z,r] of [[-.32,bedY+.24,-.55,.1],[.3,bedY+.24,-.6,-.15],[0,bedY+.66,-.58,.3]]){const crate=add(crateGeom,crateMat,x,y,z);crate.rotation.y=r;for(const dy of [-.16,.16])add(slatGeom,darkWoodMat,0,dy,.26,crate);}
 const sackProfile=[0,.16,.22,.23,.2,.12,.05].map((r,i)=>new THREE.Vector2(r,i*.08));
 for(const [x,z,r] of [[-.3,.25,.4],[.28,.35,-.3],[0,.8,.9]]){const sack=add(new THREE.LatheGeometry(sackProfile,10),sackMat,x,bedY,z);sack.rotation.set(Math.PI/2*.85,r,0);sack.position.y=bedY+.2;add(new THREE.TorusGeometry(.05,.02,4,8).rotateX(Math.PI/2),ropeMat,0,.48,0,sack);}
 add(new THREE.TorusGeometry(.18,.035,5,14).rotateX(Math.PI/2),ropeMat,.35,bedY+.06,.85);
 const tarpShape=new THREE.Shape();tarpShape.moveTo(-.72,0);tarpShape.quadraticCurveTo(0,.55,.72,0);tarpShape.lineTo(.7,-.05);tarpShape.quadraticCurveTo(0,.48,-.7,-.05);tarpShape.closePath();
 const tarp=add(new THREE.ExtrudeGeometry(tarpShape,{depth:.9,bevelEnabled:false}),tarpMat,0,bedY+.5,-1.03);
 for(const z of [-.85,-.35])add(new THREE.TorusGeometry(.7,.012,3,20,Math.PI).rotateZ(0),ropeMat,0,bedY+.48,z);
 // Ground and centre, matching the game's metre-scale asset contract.
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());for(const n of root.children){n.position.x-=c.x;n.position.z-=c.z;n.position.y-=box.min.y;}
 return root;
}
