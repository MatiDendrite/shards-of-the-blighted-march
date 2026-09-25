// 404 reference: landmark. The broken west front of a cathedral: twin
// buttressed towers, a pointed arch portal, an empty rose window, roofless
// nave walls with lancet windows, fallen masonry and two robed saints.
// The portal is open; the nave floor is walkable. Front +Z.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.95,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,...extra}),{name});
 const stoneMat=mat('stone',0xc4b89e),darkMat=mat('stone',0x958a76),mossMat=mat('moss',0x5d7f39),ivyMat=mat('leaves',0x4d7a36,.9,{side:THREE.DoubleSide}),floorMat=mat('paving',0xb8ab92);
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 const W=11,frontZ=3.2,H=8.5;
 // Pointed-arch helper as a Shape (two circular arcs meeting at the apex).
 function lancet(w,h){const s=new THREE.Shape(),r=w;s.moveTo(-w/2,0);s.lineTo(-w/2,h-w*.87);s.absarc(w/2,h-w*.87,r,Math.PI,Math.PI-Math.PI/3,true);s.absarc(-w/2,h-w*.87,r,Math.PI/3,0,true);s.lineTo(w/2,0);s.closePath();return s;}
 // A lancet outline lifted off the ground, for window holes in wall shapes.
 function raised(shape,dy){const p=new THREE.Path();p.setFromPoints(shape.getPoints().map(q=>new THREE.Vector2(q.x,q.y+dy)));return p;}
 // Façade: a wall slab with the portal and rose window cut through it.
 const front=new THREE.Shape();front.moveTo(-W/2+1.4,0);front.lineTo(W/2-1.4,0);front.lineTo(W/2-1.4,H-1.2);front.lineTo(1.4,H+.3);front.lineTo(.2,H-.4);front.lineTo(-1.8,H+.1);front.lineTo(-W/2+1.4,H-1.8);front.closePath();
 front.holes.push(lancet(2.2,4.4));const rose=new THREE.Path();rose.absarc(0,6.1,1.25,0,Math.PI*2,true);front.holes.push(rose);
 add(new THREE.ExtrudeGeometry(front,{depth:.8,bevelEnabled:false}),stoneMat,0,0,frontZ-.8);
 // Portal mouldings and the rose window's tracery.
 const archShape=lancet(2.7,4.9);archShape.holes.push(raised(lancet(2.2,4.4),0));const arch=add(new THREE.ExtrudeGeometry(archShape,{depth:.25,bevelEnabled:false}),darkMat,0,0,frontZ);
 add(new THREE.TorusGeometry(1.3,.1,6,32),darkMat,0,6.1,frontZ+.05);add(new THREE.TorusGeometry(.4,.08,6,20),darkMat,0,6.1,frontZ+.05);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2,spoke=add(new THREE.BoxGeometry(.1,.9,.12),darkMat,Math.cos(a)*.85,6.1+Math.sin(a)*.85,frontZ);spoke.rotation.z=a+Math.PI/2;}
 // Twin towers with buttresses and broken tops.
 for(const s of [-1,1]){const x=s*(W/2-.7);add(new THREE.BoxGeometry(1.4,s>0?H+1.6:H-.6,1.6),stoneMat,x,(s>0?H+1.6:H-.6)/2,frontZ-.5);
  for(const dz of [frontZ+.35,frontZ-1.3])add(new THREE.BoxGeometry(.5,3.2,.6),darkMat,x+s*.55,1.6,dz);
  for(let k=0;k<3;k++)add(new THREE.ConeGeometry(.2,.6+k*.2,4),stoneMat,x-.4+k*.4,(s>0?H+1.6:H-.6)+.25,frontZ-.5);
  const lw=add(new THREE.ExtrudeGeometry(lancet(.5,1.6),{depth:.1,bevelEnabled:false}),darkMat,x,5,frontZ+.31);}
 // Roofless nave: side walls stepping down as they recede, with lancets.
 for(const s of [-1,1]){for(let k=0;k<4;k++){const z=frontZ-2.1-k*2.2,h=6-k*1.3-(s>0?.6:0);if(h<1)continue;const wall=new THREE.Shape();wall.moveTo(-1.1,0);wall.lineTo(1.1,0);wall.lineTo(1.1,h);wall.lineTo(.3,h+.4);wall.lineTo(-1.1,h-.3);wall.closePath();if(h>3)wall.holes.push(raised(lancet(.7,2.2),1.2));
   const seg=add(new THREE.ExtrudeGeometry(wall,{depth:.55,bevelEnabled:false}),k%2?darkMat:stoneMat,s*(W/2-1.1),0,z);seg.rotation.y=s*Math.PI/2;
   add(new THREE.BoxGeometry(.5,Math.min(h,2.6),.6),darkMat,s*(W/2-.8),Math.min(h,2.6)/2,z-1.1);}}
 // Nave floor slabs and fallen masonry.
 for(let i=0;i<5;i++)for(let j=0;j<3;j++)add(new THREE.BoxGeometry(2.4,.12,2.1),(i+j)%2?floorMat:darkMat,-2.6+j*2.6,.06,frontZ-2+(-i*2.2));
 for(const [x,z,r,s] of [[-2.4,-3,.4,1],[1.8,-6.5,1.1,.8],[3,1.2,.2,.7],[-3.6,-8,2,.9]]){const block=add(new THREE.BoxGeometry(1*s,.6*s,.8*s),stoneMat,x,.3*s,z);block.rotation.set(.1,r,.15);}
 for(const [x,z] of [[-1,-5],[2.6,-3.4]]){const drum=add(new THREE.CylinderGeometry(.4,.4,.7,14),darkMat,x,.4,z);drum.rotation.set(Math.PI/2,0,.4);}
 // Two robed saints flanking the portal on plinths.
 for(const s of [-1,1]){const saint=new THREE.Group();saint.position.set(s*2.4,0,frontZ+.9);root.add(saint);add(new THREE.BoxGeometry(.9,.7,.9),darkMat,0,.35,0,saint);
  add(new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(.42,0),new THREE.Vector2(.36,.8),new THREE.Vector2(.26,1.6),new THREE.Vector2(.22,1.75),new THREE.Vector2(0,1.8)],14),stoneMat,0,.7,0,saint);
  add(new THREE.SphereGeometry(.2,12,8),stoneMat,0,2.65,0,saint);add(new THREE.SphereGeometry(.24,12,8,0,Math.PI*2,0,Math.PI*.6),darkMat,0,2.7,-.03,saint);
  for(const a of [-1,1])add(new THREE.CapsuleGeometry(.08,.6,3,6),stoneMat,a*.2,2.05,.18,saint).rotation.set(-1.1,0,a*.3);}
 // Moss and climbing ivy on the right tower.
 for(const [x,y,z,sc] of [[-4.6,.1,frontZ+.4,.6],[3.5,.1,-6,.5],[0,.13,-2,.8]])add(new THREE.SphereGeometry(1,8,5),mossMat,x,y,z).scale.set(sc,.08,sc*.6);
 const ivy=new THREE.InstancedMesh(new THREE.CircleGeometry(.14,5),ivyMat,70),pose=new THREE.Object3D();
 for(let i=0;i<70;i++){const t=i/70,x=W/2-.7+Math.sin(i*1.7)*.6,y=.4+t*8.5,z=frontZ+.32+((i*3)%4)*.02;pose.position.set(x,y,z);pose.rotation.set(0,((i*5)%7)*.1,i*.9);pose.scale.setScalar(.8+((i*7)%5)*.12);pose.updateMatrix();ivy.setMatrixAt(i,pose.matrix);}root.add(ivy);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());
 for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
