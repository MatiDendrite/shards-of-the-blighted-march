// 404 reference: settlement-props. Split firewood stacked between stakes under
// a small shingled lean-to, with a chopping block and embedded axe. Front +Z.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9,metalness=0)=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,metalness}),{name});
 const barkMat=mat('bark',0x5a4230),endMat=mat('timber',0xc9a06a,.85),stakeMat=mat('timber',0x5e4128),roofMat=mat('tile',0x6b5a48),ironMat=mat('metal',0x5a5a5a,.45,.5),handleMat=mat('timber',0x8a6440);
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 // Logs: instanced bark cylinders with lighter instanced end grain, 5 rows.
 const logGeom=new THREE.CylinderGeometry(.11,.11,.9,7).rotateX(Math.PI/2),capGeom=new THREE.CircleGeometry(.1,7),pose=new THREE.Object3D();
 const rows=5,perRow=8,count=rows*perRow,logs=new THREE.InstancedMesh(logGeom,barkMat,count),caps=new THREE.InstancedMesh(capGeom,endMat,count);let n=0;
 for(let r=0;r<rows;r++)for(let i=0;i<perRow;i++){const x=-.8+i*.23+(r%2)*.11,y=.12+r*.2,z=((i*7+r*3)%5)*.012,roll=(i*1.7+r)%6;
  pose.position.set(x,y,z);pose.rotation.set(0,0,roll);pose.scale.set(1,1,1);pose.updateMatrix();logs.setMatrixAt(n,pose.matrix);
  pose.position.set(x,y,z+.451);pose.rotation.set(0,0,roll);pose.updateMatrix();caps.setMatrixAt(n,pose.matrix);n++;}
 root.add(logs,caps);
 for(const x of [-.98,.98])add(new THREE.BoxGeometry(.08,1.4,.08),stakeMat,x,.7,0);
 // Lean-to roof on four posts.
 for(const [x,z,h] of [[-1.05,-.55,1.7],[1.05,-.55,1.7],[-1.05,.6,1.35],[1.05,.6,1.35]])add(new THREE.BoxGeometry(.09,h,.09),stakeMat,x,h/2,z);
 const roof=new THREE.Group();roof.position.set(0,1.55,.02);roof.rotation.x=.3;root.add(roof);
 for(let i=0;i<6;i++)add(new THREE.BoxGeometry(2.35,.04,.26),roofMat,0,-i*.012,-.62+i*.24,roof);
 // Chopping block with a split log and an axe buried in the top.
 const block=add(new THREE.CylinderGeometry(.26,.29,.45,12),barkMat,.7,.225,.95);add(new THREE.CircleGeometry(.25,12).rotateX(-Math.PI/2),endMat,0,.226,0,block);
 const axe=new THREE.Group();axe.position.set(.7,.5,.95);axe.rotation.set(0,.5,-.35);root.add(axe);
 add(new THREE.CylinderGeometry(.02,.024,.7,6),handleMat,0,.3,0,axe);const head=add(new THREE.BoxGeometry(.2,.1,.03),ironMat,.08,-.02,0,axe);
 for(const [x,r] of [[.2,.4],[-.2,1.2],[.05,2.4]]){const split=add(new THREE.CylinderGeometry(.1,.1,.4,6,1,false,0,Math.PI),barkMat,x+.2,.06,1.3);split.rotation.set(Math.PI/2,0,r);}
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
