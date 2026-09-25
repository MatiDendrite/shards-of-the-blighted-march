// 404 reference: wilderness-props. A hollow fallen trunk with torn root plate,
// broken branch stubs, moss cushions and a ring of toadstools.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,...extra}),{name});
 const barkMat=mat('bark',0x5b4636),heartMat=mat('timber',0x9a7250,.85),rotMat=mat('bark',0x3a2c22),mossMat=mat('moss',0x5d7f39),capMat=mat('mushroom',0xb8452f,.6),spotMat=mat('mushroom',0xf2ead8,.7),stalkMat=mat('mushroom',0xe6dcc4,.8);
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 const length=3.2,radius=.34;
 // Trunk: open tube lying along X with a darker inside and a split heartwood end.
 const trunk=add(new THREE.CylinderGeometry(radius*.92,radius,length,14,4,true).rotateZ(Math.PI/2),barkMat,0,radius,0);
 const hollowMat=mat('bark',0x3a2c22,.9,{side:THREE.BackSide});add(new THREE.CylinderGeometry(radius*.72,radius*.8,length-.02,12,1,true).rotateZ(Math.PI/2),hollowMat,0,radius,0);
 add(new THREE.RingGeometry(radius*.72,radius,14).rotateY(Math.PI/2),heartMat,length/2,radius,0);
 // Root plate: splayed root cones at the west end.
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2,rootCone=add(new THREE.ConeGeometry(.09,.8,5),barkMat,-length/2-.12,radius+Math.sin(a)*.3,Math.cos(a)*.3);rootCone.rotation.set(a,0,Math.PI/2+.5);}
 add(new THREE.CircleGeometry(radius*.95,12).rotateY(-Math.PI/2),rotMat,-length/2-.01,radius,0);
 // Branch stubs.
 for(const [x,a,l] of [[-.6,.9,.55],[.4,-.7,.4],[1.0,2.2,.5]]){const stub=add(new THREE.CylinderGeometry(.04,.08,l,6),barkMat,x,radius+Math.cos(a)*radius,Math.sin(a)*radius);stub.rotation.x=a;stub.position.y+=Math.cos(a)*l/2;stub.position.z+=Math.sin(a)*l/2;}
 // Moss cushions along the top.
 for(const [x,s] of [[-1.1,.5],[-.2,.42],[.8,.36]])add(new THREE.SphereGeometry(1,10,6),mossMat,x,radius*1.9,0).scale.set(s,.08,radius*.9);
 // Toadstools: stalks and spotted caps, instanced.
 const pose=new THREE.Object3D(),spots=[[.3,.55],[.55,.62],[.7,.5],[-.9,-.55],[-1.2,-.6],[1.3,.58],[1.45,.7]];
 const stalks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.025,.035,.18,6),stalkMat,spots.length),caps=new THREE.InstancedMesh(new THREE.SphereGeometry(.09,10,6,0,Math.PI*2,0,Math.PI/2),capMat,spots.length),dots=new THREE.InstancedMesh(new THREE.SphereGeometry(.018,4,3),spotMat,spots.length*3);
 spots.forEach(([x,z],i)=>{const s=.7+(i%3)*.25;pose.rotation.set(0,0,0);pose.scale.setScalar(s);pose.position.set(x,.09*s,z);pose.updateMatrix();stalks.setMatrixAt(i,pose.matrix);pose.position.set(x,.17*s,z);pose.scale.set(s,s*.8,s);pose.updateMatrix();caps.setMatrixAt(i,pose.matrix);
  for(let k=0;k<3;k++){const a=k*2.1+i;pose.scale.setScalar(s);pose.position.set(x+Math.cos(a)*.05*s,.23*s,z+Math.sin(a)*.05*s);pose.updateMatrix();dots.setMatrixAt(i*3+k,pose.matrix);}});
 root.add(stalks,caps,dots);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
