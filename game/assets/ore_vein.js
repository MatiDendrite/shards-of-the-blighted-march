// 404 reference: gatherable. A split granite outcrop veined with copper and
// silver ore, with a pick left wedged in the crack.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,flatShading:true,...extra}),{name});
 const rockMat=mat('stone',0x8a8378),rockDarkMat=mat('stone',0x6c655c),copperMat=mat('ore',0xc9743a,.4,{metalness:.5,emissive:0x5a2208,emissiveIntensity:.35}),silverMat=mat('ore',0xd7dde2,.3,{metalness:.55,emissive:0x2a3440,emissiveIntensity:.3}),handleMat=Object.assign(new THREE.MeshStandardMaterial({color:0x7a5436,roughness:.7}),{name:'timber'}),ironMat=Object.assign(new THREE.MeshStandardMaterial({color:0x4a4a4a,roughness:.45,metalness:.5}),{name:'metal'});
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 for(const [x,y,z,sx,sy,sz,m] of [[-.35,.35,0,.55,.45,.5,rockMat],[.35,.3,.05,.5,.4,.45,rockDarkMat],[0,.62,-.1,.4,.32,.38,rockMat],[.1,.15,.4,.3,.18,.25,rockDarkMat]]){const r=add(new THREE.DodecahedronGeometry(1,0),m,x,y,z);r.scale.set(sx,sy,sz);r.rotation.set(x*2,z*3+x,0);}
 // Ore nuggets studding the faces: instanced octahedra in two metals.
 const nug=new THREE.OctahedronGeometry(.1,0),pose=new THREE.Object3D();
 for(const [m,count,seed] of [[copperMat,18,1],[silverMat,10,5]]){const inst=new THREE.InstancedMesh(nug,m,count);for(let i=0;i<count;i++){const a=(i+seed)*2.399,e=((i*7+seed)%10)/10*1.2-.2,r=.52;pose.position.set(Math.cos(a)*Math.cos(e)*r*.95,.35+Math.sin(e)*r*.7,Math.sin(a)*Math.cos(e)*r*.8);pose.rotation.set(i,i*.6,0);pose.scale.set(1,.7+(i%3)*.3,1);pose.updateMatrix();inst.setMatrixAt(i,pose.matrix);}root.add(inst);}
 // Pick wedged in the crack between the two boulders.
 const pick=new THREE.Group();pick.position.set(.02,.72,.12);pick.rotation.set(.5,.3,-.9);root.add(pick);
 add(new THREE.CylinderGeometry(.02,.025,.7,6),handleMat,0,.35,0,pick);const head=add(new THREE.ConeGeometry(.03,.36,5).rotateZ(Math.PI/2),ironMat,0,.02,0,pick);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());
 for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
