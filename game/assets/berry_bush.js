// 404 reference: wilderness-foliage. A rounded bramble of layered leaf clumps
// on woody stems, dotted with red berries and a few pale blossoms.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,...extra}),{name});
 const leafDarkMat=mat('leaves',0x3f6a2e,.9,{side:THREE.DoubleSide}),leafLightMat=mat('leaves',0x62903f,.9,{side:THREE.DoubleSide}),stemMat=mat('bark',0x5a4230),berryMat=mat('berry',0xb02a2a,.35),blossomMat=mat('blossom',0xf2e6d6,.8,{side:THREE.DoubleSide});
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 // Woody stems fan out from the root crown.
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2,curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,0,0),new THREE.Vector3(Math.cos(a)*.2,.35,Math.sin(a)*.2),new THREE.Vector3(Math.cos(a)*.45,.6+(i%2)*.15,Math.sin(a)*.45));add(new THREE.TubeGeometry(curve,6,.025,4),stemMat,0,0,0);}
 // Leaf clumps: squashed icosahedra shell, then instanced leaf cards on top.
 const clumpGeom=new THREE.IcosahedronGeometry(1,1);
 const clumps=[[0,.55,0,.62],[.38,.42,.12,.42],[-.34,.45,-.1,.45],[.08,.4,.4,.4],[-.1,.4,-.42,.42],[.2,.78,-.12,.38],[-.22,.72,.2,.36]];
 clumps.forEach(([x,y,z,s],i)=>{const clump=add(clumpGeom,i%2?leafLightMat:leafDarkMat,x,y,z);clump.scale.set(s,s*.72,s);clump.rotation.set(i*.7,i*1.1,0);});
 const leafGeom=new THREE.PlaneGeometry(.16,.1),leaves=new THREE.InstancedMesh(leafGeom,leafLightMat,90),pose=new THREE.Object3D();
 for(let i=0;i<90;i++){const c=clumps[i%clumps.length],a=i*2.399,e=((i*37)%90)/90*Math.PI-.3,r=c[3]*1.02;pose.position.set(c[0]+Math.cos(a)*Math.cos(e)*r,c[1]+Math.sin(e)*r*.72,c[2]+Math.sin(a)*Math.cos(e)*r);pose.rotation.set(e,-a,i*.5);pose.updateMatrix();leaves.setMatrixAt(i,pose.matrix);}root.add(leaves);
 // Berries in small bunches on the outer surface; a few blossoms.
 const berries=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.036,0),berryMat,42);
 for(let i=0;i<42;i++){const c=clumps[(i*3)%clumps.length],a=i*1.9+c[0]*3,e=((i*23)%42)/42*1.2,r=c[3]*1.05,j=(i%3)*.03;pose.position.set(c[0]+Math.cos(a)*Math.cos(e)*r+j,c[1]+Math.sin(e)*r*.72-j,c[2]+Math.sin(a)*Math.cos(e)*r);pose.rotation.set(0,0,0);pose.scale.setScalar(1);pose.updateMatrix();berries.setMatrixAt(i,pose.matrix);}root.add(berries);
 const blossoms=new THREE.InstancedMesh(new THREE.CircleGeometry(.05,5),blossomMat,10);
 for(let i=0;i<10;i++){const c=clumps[(i*2+1)%clumps.length],a=i*2.1;pose.position.set(c[0]+Math.cos(a)*c[3],c[1]+c[3]*.5,c[2]+Math.sin(a)*c[3]);pose.rotation.set(-Math.PI/2+.4,a,0);pose.updateMatrix();blossoms.setMatrixAt(i,pose.matrix);}root.add(blossoms);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
