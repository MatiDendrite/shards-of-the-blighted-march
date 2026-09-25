// 404 reference: gatherable. A clump of moonleaf: broad leaves at the base and
// slender stems carrying glowing violet bell flowers.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.85,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,...extra}),{name});
 const leafMat=mat('herb',0x4f8a46,.8,{side:THREE.DoubleSide}),stemMat=mat('herb',0x5f7f3a),bloomMat=Object.assign(new THREE.MeshStandardMaterial({color:0xc9a0ff,emissive:0x8a4fe0,emissiveIntensity:1.1,roughness:.4,side:THREE.DoubleSide}),{name:'glow'});
 const v=(x,y,z)=>new THREE.Vector3(x,y,z),pose=new THREE.Object3D();
 // Rosette of leaves, instanced and tilted outward.
 const leaf=new THREE.SphereGeometry(1,8,4).scale(.07,.012,.2).translate(0,0,.18),leaves=new THREE.InstancedMesh(leaf,leafMat,12);
 for(let i=0;i<12;i++){pose.position.set(0,.01+(i%3)*.008,0);pose.rotation.set(-.25-(i%2)*.2,i/12*Math.PI*2,0);pose.scale.setScalar(.9+(i%3)*.15);pose.updateMatrix();leaves.setMatrixAt(i,pose.matrix);}root.add(leaves);
 // Stems arch out; each ends in a drooping bell of five petals.
 const bell=new THREE.ConeGeometry(.045,.08,5,1,true).rotateX(Math.PI),bells=new THREE.InstancedMesh(bell,bloomMat,9);
 for(let i=0;i<9;i++){const a=i/9*Math.PI*2+.3,r=.08+(i%3)*.05,h=.38+(i%4)*.07,end=v(Math.cos(a)*(r+.08),h,Math.sin(a)*(r+.08));
  const stem=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(v(0,.02,0),v(Math.cos(a)*r,h+.08,Math.sin(a)*r),end),6,.008,4),stemMat);root.add(stem);
  pose.position.copy(end);pose.position.y-=.035;pose.rotation.set(0,0,0);pose.scale.setScalar(1);pose.updateMatrix();bells.setMatrixAt(i,pose.matrix);}
 root.add(bells);
 // Exact bounds, instances included: instanced boxes are looser than the leaves.
 root.updateMatrixWorld(true);const box=new THREE.Box3(),p=new THREE.Vector3(),m=new THREE.Matrix4();
 root.traverse(o=>{if(!o.isMesh)return;const pos=o.geometry.attributes.position,n=o.isInstancedMesh?o.count:1;for(let k=0;k<n;k++){if(o.isInstancedMesh)o.getMatrixAt(k,m);for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i);if(o.isInstancedMesh)p.applyMatrix4(m);box.expandByPoint(p.applyMatrix4(o.matrixWorld));}}});
 const c=box.getCenter(new THREE.Vector3());for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
