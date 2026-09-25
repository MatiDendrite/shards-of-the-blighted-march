// 404 reference: camp-fortification. A three-metre palisade run of sharpened
// logs lashed to a rail, braced from behind, with a skull warning post.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9)=>Object.assign(new THREE.MeshStandardMaterial({color,roughness}),{name});
 const logMat=mat('bark',0x5e4630),tipMat=mat('timber',0x9a7250),ropeMat=mat('fabric',0xa88d5f),boneMat=mat('bone',0xd8ccb0,.7);
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 const logs=11,span=3;
 for(let i=0;i<logs;i++){const x=-span/2+(i+.5)*span/logs,h=2+((i*7)%5)*.12,r=.13+((i*3)%4)*.01,lean=((i*5)%3-1)*.03;
  const log=add(new THREE.CylinderGeometry(r,r*1.05,h,7),logMat,x,h/2,((i*11)%3-1)*.03);log.rotation.z=lean;add(new THREE.ConeGeometry(r,.35,7),tipMat,0,h/2+.17,0,log);}
 for(const y of [.6,1.5])add(new THREE.CylinderGeometry(.06,.06,span+.2,6).rotateZ(Math.PI/2),logMat,0,y,-.16);
 for(const x of [-1.1,1.1]){const brace=add(new THREE.CylinderGeometry(.07,.07,2,6),logMat,x,.85,-.6);brace.rotation.x=-.55;}
 for(let i=0;i<logs;i+=2)add(new THREE.TorusGeometry(.15,.02,4,10).rotateX(Math.PI/2),ropeMat,-span/2+(i+.5)*span/logs,1.5,0);
 const skull=add(new THREE.SphereGeometry(.12,10,8),boneMat,.3,2.35,.18);skull.scale.set(1,.9,1.1);add(new THREE.BoxGeometry(.14,.06,.1),boneMat,.3,2.24,.24);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());
 for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
