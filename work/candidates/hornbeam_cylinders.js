// Branching cylinders and curved, crossed leaf sprays; textures belong to the surface layer.
export default function generate(T){
 const root=new T.Group(),wood=Object.assign(new T.MeshStandardMaterial({color:0x655442,roughness:1}),{name:'timber'}),leaves=Object.assign(new T.MeshStandardMaterial({color:0x65804a,side:T.DoubleSide,roughness:1}),{name:'leaves'});
 const branch=(a,b,r1,r2)=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),d=end.clone().sub(start);const mesh=new T.Mesh(new T.CylinderGeometry(r2,r1,d.length(),7,3),wood);mesh.position.copy(start).addScaledVector(d,.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());root.add(mesh);};
 branch([0,.08,0],[.12,2.7,.08],.31,.19);branch([.12,2.7,.08],[-.2,4.9,0],.19,.045);
 for(let i=0;i<6;i++){const a=i*2.399;branch([0,.18,0],[Math.cos(a)*.75,.055,Math.sin(a)*.75],.16,.025);}
 for(let i=0;i<12;i++){
  const a=i*2.399,h=2.25+(i%4)*.54,r=1.2+(i%3)*.24,x=Math.cos(a)*r,z=Math.sin(a)*r;
  branch([.06,h-.35,0],[x,h+.75,z],.10-(i%4)*.011,.025);
  for(let j=0;j<3;j++){
   const b=a+j*2.1,cx=x+Math.cos(b)*.6,cy=h+.8+(j%2)*.5,cz=z+Math.sin(b)*.6;
   branch([x*.75,h+.6,z*.75],[cx,cy,cz],.037,.012);
   for(let plane=0;plane<3;plane++){
    const geo=new T.PlaneGeometry(1.65+(i%3)*.15,1.55,2,2),p=geo.attributes.position;
    for(let k=0;k<p.count;k++)p.setZ(k,.19*Math.cos(p.getX(k)*2)*Math.cos(p.getY(k)*2));geo.computeVertexNormals();
    const spray=new T.Mesh(geo,leaves);spray.position.set(cx,cy,cz);spray.rotation.set(plane===2?-Math.PI/2:.1*(j-1),a+plane*Math.PI/2,.1*Math.sin(i));root.add(spray);
   }
  }
 }
 const box=new T.Box3(),v=new T.Vector3();root.updateMatrixWorld(true);root.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)box.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));}});const c=box.getCenter(new T.Vector3());root.children.forEach(o=>{o.position.x-=c.x;o.position.z-=c.z;o.position.y-=box.min.y;});return root;
}
