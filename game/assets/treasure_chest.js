// 404 reference: loot. A banded treasure chest with a barrel-vaulted lid on a
// named hinge group, iron corners, a lock plate and a heap of coins inside.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.8,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,...extra}),{name});
 const woodMat=mat('timber',0x7a4a2a),ironMat=mat('metal',0x3a3632,.45,{metalness:.55}),goldMat=Object.assign(new THREE.MeshStandardMaterial({color:0xe8b64a,roughness:.3,metalness:.6,emissive:0x5a3a08,emissiveIntensity:.4}),{name:'gold'}),velvetMat=mat('fabric',0x6a1f2a,.95);
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 const W=1,D=.62,H=.5;
 add(new THREE.BoxGeometry(W,H,D),woodMat,0,H/2,0);add(new THREE.BoxGeometry(W-.08,.02,D-.08),velvetMat,0,H-.04,0);
 for(const x of [-W/2+.14,W/2-.14])add(new THREE.BoxGeometry(.06,H+.02,D+.02),ironMat,x,H/2,0);
 for(const [x,z] of [[-1,-1],[1,-1],[-1,1],[1,1]])add(new THREE.BoxGeometry(.1,.1,.1),ironMat,x*(W/2-.03),.05,z*(D/2-.03));
 // Coin heap: instanced flattened discs piled in a low dome.
 const coins=new THREE.InstancedMesh(new THREE.CylinderGeometry(.045,.045,.012,10),goldMat,36),pose=new THREE.Object3D();
 for(let i=0;i<36;i++){const a=i*2.399,r=Math.sqrt(i/36)*.32,h=H-.02+(1-r/.32)*.1+(i%3)*.012;pose.position.set(Math.cos(a)*r,h,Math.sin(a)*r*.55);pose.rotation.set((i%4)*.35,0,(i%5)*.25);pose.updateMatrix();coins.setMatrixAt(i,pose.matrix);}root.add(coins);
 // Lid pivots on the back edge; the named group opens in play.
 const lid=new THREE.Group();lid.name='chest-lid';lid.position.set(0,H,-D/2);root.add(lid);
 // Half cylinder along X: after rotateZ the arc faces up over the chest depth.
 add(new THREE.CylinderGeometry(D/2,D/2,W,16,1,false,0,Math.PI).rotateZ(Math.PI/2),woodMat,0,0,D/2,lid);
 for(const x of [-W/2+.14,W/2-.14])add(new THREE.TorusGeometry(D/2+.01,.025,4,16,Math.PI).rotateY(Math.PI/2),ironMat,x,0,D/2,lid);
 add(new THREE.BoxGeometry(.16,.2,.04),ironMat,0,-.02,D+.01,lid);add(new THREE.TorusGeometry(.04,.012,4,10),goldMat,0,-.1,D+.035,lid);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());
 for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
