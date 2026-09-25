// 404 reference: farmland. A 6 x 4 m wheat plot: tilled soil ridges, dense
// instanced stalks with drooping ears, a patched scarecrow and a corner post.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.95,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,...extra}),{name});
 const soilMat=mat('soil',0x6b4f36),ridgeMat=mat('soil',0x5a412c),stalkMat=mat('straw',0xbfa04e,.9,{side:THREE.DoubleSide}),earMat=mat('straw',0xd6b765,.85),postMat=mat('timber',0x6b4a2c),coatMat=mat('fabric',0x7a3b2e),hatMat=mat('straw',0xb8963e),headMat=mat('fabric',0xd8c9a0);
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 const W=6,D=4,rows=8;
 add(new THREE.BoxGeometry(W+.3,.1,D+.3),soilMat,0,.05,0);
 for(let r=0;r<rows;r++)add(new THREE.CylinderGeometry(.14,.14,W,6,1).rotateZ(Math.PI/2),ridgeMat,0,.1,-D/2+.25+r*(D-.5)/(rows-1)).scale.set(1,.5,1);
 // Stalks grow in tufts: five tapered blades fanning from one root, each with
 // a slim ear, so a row reads as a dense crop rather than single sticks.
 const merge=parts=>{const pos=[],nor=[];for(const g of parts){const f=g.index?g.toNonIndexed():g;pos.push(...f.attributes.position.array);nor.push(...f.attributes.normal.array);}const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));out.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));out.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(pos.length/3*2),2));return out;};
 const blades=[],heads=[];
 for(let k=0;k<5;k++){const a=k/5*Math.PI*2+.3,tilt=.12+(k%2)*.1,h=.82+(k%3)*.1,blade=new THREE.BufferGeometry();
  blade.setAttribute('position',new THREE.Float32BufferAttribute([-.018,0,0,.018,0,0,.004,h,0,-.018,0,0,.004,h,0,-.004,h,0],3));blade.computeVertexNormals();
  const place=new THREE.Matrix4().makeRotationY(a).multiply(new THREE.Matrix4().makeRotationX(tilt));blades.push(blade.applyMatrix4(place));
  const ear=new THREE.OctahedronGeometry(.03,0).scale(.8,3.2,.8).translate(0,h+.07,0).applyMatrix4(new THREE.Matrix4().makeRotationY(a).multiply(new THREE.Matrix4().makeRotationX(tilt+.35)));heads.push(ear);}
 const tuftGeom=merge(blades),earGeom=merge(heads);
 const perRow=26,count=rows*perRow,stalks=new THREE.InstancedMesh(tuftGeom,stalkMat,count),ears=new THREE.InstancedMesh(earGeom,earMat,count),pose=new THREE.Object3D(),tone=new THREE.Color();let n=0;
 for(let r=0;r<rows;r++)for(let i=0;i<perRow;i++){const x=-W/2+.12+i*(W-.24)/(perRow-1)+((i*7+r*3)%5-2)*.03,z=-D/2+.25+r*(D-.5)/(rows-1)+((i*11+r)%5-2)*.04,h=.85+((i*13+r*7)%9)*.03;
  pose.position.set(x,.12,z);pose.rotation.set(((i*5+r*3)%7-3)*.03,(i*2.39+r)%6.28,0);pose.scale.set(1+((i+r)%3)*.12,h,1);pose.updateMatrix();stalks.setMatrixAt(n,pose.matrix);ears.setMatrixAt(n,pose.matrix);
  const v=.86+((i*17+r*5)%11)*.025;tone.setRGB(v,v*(.96+((i+r*3)%4)*.015),v*.92);stalks.setColorAt(n,tone);ears.setColorAt(n,tone);n++;}
 root.add(stalks,ears);
 // Scarecrow standing in the field.
 const crow=new THREE.Group();crow.position.set(.6,0,-.3);crow.rotation.y=.4;root.add(crow);
 add(new THREE.CylinderGeometry(.05,.06,2.2,6),postMat,0,1.1,0,crow);add(new THREE.CylinderGeometry(.035,.035,1.5,6).rotateZ(Math.PI/2),postMat,0,1.6,0,crow);
 add(new THREE.BoxGeometry(.6,.7,.28),coatMat,0,1.45,0,crow);for(const s of [-1,1])add(new THREE.CylinderGeometry(.09,.12,.6,6).rotateZ(Math.PI/2),coatMat,s*.55,1.6,0,crow);
 add(new THREE.SphereGeometry(.2,10,8),headMat,0,2.05,0,crow);add(new THREE.CylinderGeometry(.34,.34,.03,12),hatMat,0,2.22,0,crow);add(new THREE.ConeGeometry(.2,.25,10),hatMat,0,2.35,0,crow);
 for(const s of [-1,1])add(new THREE.ConeGeometry(.05,.18,4),hatMat,s*.82,1.55,0,crow).rotation.z=s*Math.PI/2;
 add(new THREE.CylinderGeometry(.07,.08,1,6),postMat,W/2+.1,.5,D/2+.1);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());
 for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
