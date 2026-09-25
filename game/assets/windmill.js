// 404 reference: landmark. A stone tower mill with a timber cap, four lattice
// sails on a named rotating hub, a door, windows, a gallery and sacks of grain.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,...extra}),{name});
 const stoneMat=mat('stone',0xcfc4ad),trimMat=mat('stone',0x9c927f),timberMat=mat('timber',0x7a5436),darkMat=mat('timber',0x4e3522),roofMat=mat('tile',0x6d5a47),sailMat=mat('fabric',0xeee3c8,.95,{side:THREE.DoubleSide}),glassMat=Object.assign(new THREE.MeshStandardMaterial({color:0xe9b86a,emissive:0xd9953a,emissiveIntensity:.5,roughness:.3}),{name:'glass'}),ironMat=mat('metal',0x3c3c3c,.5,{metalness:.5}),sackMat=mat('fabric',0xcdb98f,.95);
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 const towerH=7.2,baseR=2.4,topR=1.7;
 // Tapered tower: lathe profile with a plinth; stone courses as thin rings.
 const profile=[new THREE.Vector2(0,0),new THREE.Vector2(baseR+.25,0),new THREE.Vector2(baseR+.25,.5),new THREE.Vector2(baseR,.55),new THREE.Vector2(topR,towerH),new THREE.Vector2(0,towerH)];
 const tower=add(new THREE.LatheGeometry(profile,28),stoneMat,0,0,0);
 for(let i=1;i<9;i++){const t=i/9,r=baseR+(topR-baseR)*t+.02;add(new THREE.TorusGeometry(r,.035,4,28).rotateX(Math.PI/2),trimMat,0,.55+t*(towerH-.55),0);}
 // Door, windows and a timber gallery ring around the upper tower.
 const door=add(new THREE.BoxGeometry(.95,1.8,.14),darkMat,0,1.45,baseR+.02);door.rotation.x=-.08;
 add(new THREE.CylinderGeometry(.48,.48,.14,12,1,false,0,Math.PI).rotateX(Math.PI/2).rotateZ(Math.PI/2),darkMat,0,2.35,baseR+.02);
 for(const [a,y] of [[.9,3.2],[-1.2,4.6],[2.6,5.4],[Math.PI,3.8]]){const r=baseR+(topR-baseR)*(y/towerH)+.03,win=add(new THREE.BoxGeometry(.5,.7,.1),glassMat,Math.sin(a)*r,y,Math.cos(a)*r);win.rotation.y=a;const frame=add(new THREE.BoxGeometry(.66,.86,.08),darkMat,0,0,-.03,win);}
 const galleryY=5.2,galleryR=topR+(baseR-topR)*(1-galleryY/towerH)+.55;
 add(new THREE.CylinderGeometry(galleryR,galleryR,.12,24),timberMat,0,galleryY,0);
 const railPost=new THREE.CylinderGeometry(.04,.04,.8,5),posts=new THREE.InstancedMesh(railPost,darkMat,20),pose=new THREE.Object3D();
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2;pose.position.set(Math.cos(a)*galleryR,galleryY+.4,Math.sin(a)*galleryR);pose.updateMatrix();posts.setMatrixAt(i,pose.matrix);}root.add(posts);
 add(new THREE.TorusGeometry(galleryR,.035,4,28).rotateX(Math.PI/2),darkMat,0,galleryY+.8,0);
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2,brace=add(new THREE.BoxGeometry(.08,.9,.08),darkMat,Math.cos(a)*(galleryR-.35),galleryY-.4,Math.sin(a)*(galleryR-.35));brace.rotation.set(Math.sin(a)*.5,0,-Math.cos(a)*.5);}
 // Cap: boat-shaped timber roof with shingles and a tail pole to the ground.
 const cap=new THREE.Group();cap.position.y=towerH;root.add(cap);
 const capProfile=new THREE.SplineCurve([new THREE.Vector2(topR+.25,0),new THREE.Vector2(topR*.9,.9),new THREE.Vector2(.9,1.6),new THREE.Vector2(.02,2.05)]).getSpacedPoints(8);capProfile.unshift(new THREE.Vector2(0,0));
 add(new THREE.LatheGeometry(capProfile,20),roofMat,0,0,0,cap).scale.set(1,1,1.25);
 for(let i=0;i<5;i++){const t=i/5;add(new THREE.TorusGeometry(topR*(.95-t*.5)+.2,.03,3,20).rotateX(Math.PI/2),darkMat,0,.2+t*1.5,0,cap).scale.set(1,1.25,1);}
 add(new THREE.SphereGeometry(.14,8,6),ironMat,0,2.08,0,cap);
 const tail=add(new THREE.CylinderGeometry(.08,.1,6.4,6),darkMat,0,-3.1,-2.9,cap);tail.rotation.x=-.52;
 // Sails: hub, windshaft and four lattice stocks with canvas; the named group turns.
 const sails=new THREE.Group();sails.name='windmill-sails';sails.position.set(0,towerH+.9,topR+1.05);root.add(sails);
 add(new THREE.CylinderGeometry(.16,.16,1.2,10).rotateX(Math.PI/2),darkMat,0,0,-.55,sails);add(new THREE.SphereGeometry(.28,10,8),ironMat,0,0,.1,sails);
 const stockGeom=new THREE.BoxGeometry(.16,5.2,.12),barGeom=new THREE.BoxGeometry(1.25,.05,.05),railGeom=new THREE.BoxGeometry(.05,4.3,.05),clothGeom=new THREE.PlaneGeometry(1.1,3.9);
 for(let i=0;i<4;i++){const arm=new THREE.Group();arm.rotation.z=i*Math.PI/2+Math.PI/4;sails.add(arm);add(stockGeom,timberMat,0,2.7,0,arm);
  for(let k=0;k<9;k++)add(barGeom,darkMat,.62,.95+k*.5,0,arm);add(railGeom,darkMat,1.22,2.95,0,arm);
  const cloth=add(clothGeom,sailMat,.62,3.0,-.04,arm);cloth.rotation.y=.12;}
 // Grain sacks and a cart wheel against the base.
 const sackProfile=[0,.17,.24,.25,.22,.13,.05,.07].map((r,i)=>new THREE.Vector2(r,i*.075));
 for(const [a,lean] of [[.5,.2],[.75,-.3],[.62,.1]]){const sack=add(new THREE.LatheGeometry(sackProfile,10),sackMat,Math.sin(a)*(baseR+.55),0,Math.cos(a)*(baseR+.55));sack.rotation.set(lean,a,lean*.5);}
 const wheel=add(new THREE.TorusGeometry(.6,.05,6,20),timberMat,Math.sin(-.7)*(baseR+.35),.62,Math.cos(-.7)*(baseR+.35));wheel.rotation.set(.15,-.7,0);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());
 for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
