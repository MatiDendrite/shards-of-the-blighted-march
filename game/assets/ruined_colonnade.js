// 404 reference: ancient-ruins. Three fluted columns on a cracked stylobate:
// one whole with its capital, one snapped, one fallen in drums. Ivy climbs.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.95)=>Object.assign(new THREE.MeshStandardMaterial({color,roughness}),{name});
 const stoneMat=mat('stone',0xc9bfa8),weatheredMat=mat('stone',0xa39a86),mossMat=mat('moss',0x51633a),ivyMat=Object.assign(new THREE.MeshStandardMaterial({color:0x4d7a36,roughness:.9,side:THREE.DoubleSide}),{name:'leaves'});
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 // Stylobate: two stepped slabs broken into blocks.
 for(const [w,d,y] of [[5.2,1.9,.12],[4.6,1.4,.34]])for(let i=0;i<4;i++){const bw=w/4-.04,block=add(new THREE.BoxGeometry(bw,.22,d),i%2?weatheredMat:stoneMat,-w/2+bw/2+.02+i*(w/4),y,0);block.rotation.y=((i*3)%4-1.5)*.012;}
 // Fluted shaft: lathe with entasis, flutes as instanced slim boxes.
 const shaftProfile=new THREE.SplineCurve([new THREE.Vector2(.34,0),new THREE.Vector2(.335,.8),new THREE.Vector2(.31,1.8),new THREE.Vector2(.28,2.8)]).getSpacedPoints(8);
 const fluteGeom=new THREE.BoxGeometry(.05,1,.04),pose=new THREE.Object3D();
 function column(x,height,broken){
  const g=new THREE.Group();g.position.set(x,.45,0);root.add(g);
  add(new THREE.CylinderGeometry(.46,.5,.2,16),weatheredMat,0,.1,0,g);add(new THREE.TorusGeometry(.4,.06,6,16).rotateX(Math.PI/2),stoneMat,0,.22,0,g);
  const pts=shaftProfile.filter(p=>p.y<=height);if(pts.at(-1).y<height)pts.push(new THREE.Vector2(.28+.06*(1-height/2.8),height));
  const shaft=add(new THREE.LatheGeometry(pts,16),stoneMat,0,.25,0,g);
  const flutes=new THREE.InstancedMesh(fluteGeom,weatheredMat,12);for(let i=0;i<12;i++){const a=i/12*Math.PI*2;pose.position.set(Math.cos(a)*.31,.25+height/2,Math.sin(a)*.31);pose.rotation.set(0,-a,0);pose.scale.set(1,height*.96,1);pose.updateMatrix();flutes.setMatrixAt(i,pose.matrix);}g.add(flutes);
  if(broken){for(let i=0;i<5;i++){const shard=add(new THREE.ConeGeometry(.09,.22,4),stoneMat,Math.cos(i*1.3)*.2,.25+height+.06,Math.sin(i*1.3)*.2,g);shard.rotation.z=(i%2?.3:-.3);}}
  else{add(new THREE.CylinderGeometry(.42,.3,.24,16),stoneMat,0,.25+height+.12,0,g);add(new THREE.BoxGeometry(.98,.2,.98),weatheredMat,0,.25+height+.34,0,g);}
  return g;
 }
 column(-1.7,2.8,false);column(0,1.5,true);
 // Fallen column: drums scattered along the ground at the east end.
 for(const [x,z,r,t] of [[1.5,.2,.1,.02],[2.05,.55,.35,.1],[2.3,-.35,1.2,-.05]]){const drum=add(new THREE.CylinderGeometry(.31,.31,.55,16),stoneMat,x,.45+.31,z);drum.rotation.set(0,r,Math.PI/2+t);}
 add(new THREE.BoxGeometry(.98,.2,.98),weatheredMat,1.7,.55,-.55).rotation.set(.3,.5,.1);
 // Moss on the steps and ivy leaves climbing the whole column.
 for(const [x,z,s] of [[-2.2,.7,.5],[.6,-.6,.4],[2.3,.8,.35]])add(new THREE.SphereGeometry(1,8,5),mossMat,x,.46,z).scale.set(s,.06,s*.7);
 const leafGeom=new THREE.CircleGeometry(.09,5),ivy=new THREE.InstancedMesh(leafGeom,ivyMat,48);
 for(let i=0;i<48;i++){const t=i/48,a=t*Math.PI*5.5,h=.5+t*2.6;pose.position.set(-1.7+Math.cos(a)*.35,h,Math.sin(a)*.35);pose.rotation.set(Math.sin(i)*.6,-a+Math.PI/2,Math.cos(i*1.7)*.5);pose.scale.setScalar(.8+((i*7)%5)*.1);pose.updateMatrix();ivy.setMatrixAt(i,pose.matrix);}root.add(ivy);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
