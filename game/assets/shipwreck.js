// 404 reference: landmark. A beached cog lying on its side in the sand: keel,
// curved ribs, surviving strakes on one flank, a snapped mast with a torn
// sail, a stern castle fragment and cargo spilled across the beach. Front +Z.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,...extra}),{name});
 const woodMat=mat('timber',0x6e5238),wetMat=mat('timber',0x4c3a2a),sailMat=mat('fabric',0xd8ccae,.95,{side:THREE.DoubleSide}),ropeMat=mat('fabric',0xa88d5f),ironMat=mat('metal',0x4a403a,.6,{metalness:.4}),weedMat=mat('seaweed',0x4a6236),sandMat=mat('sand',0xcdb784);
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 const v=(x,y,z)=>new THREE.Vector3(x,y,z),L=9,hull=new THREE.Group();hull.rotation.z=.42;hull.position.y=.2;root.add(hull);
 // Keel, stem and sternpost sweep up at both ends.
 add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v(0,1.9,-L/2-.4),v(0,.35,-L/2+.8),v(0,.15,0),v(0,.35,L/2-.8),v(0,2.4,L/2+.5)]),24,.16,6),wetMat,0,0,0,hull);
 // Ribs: U-shaped frames narrowing towards bow and stern; some broken short.
 const ribs=13;for(let i=0;i<ribs;i++){const t=i/(ribs-1),z=-L/2+.7+t*(L-1.4),w=1.9*Math.sin(Math.PI*(.12+t*.76)),top=(i%4===1)?1.3:2.3;
  for(const s of [-1,1]){if(s>0&&i%3===0)continue;const curve=new THREE.CatmullRomCurve3([v(0,.2,z),v(s*w*.8,.5,z),v(s*w,1.3,z),v(s*w*.92,top,z)]);add(new THREE.TubeGeometry(curve,8,.07,5),i%2?woodMat:wetMat,0,0,0,hull);}}
 // Strakes along the lower flank, with gaps where planks have sprung.
 for(let k=0;k<5;k++){const h=.45+k*.36;for(let seg=0;seg<3;seg++){if((k+seg)%4===3)continue;const z0=-L/2+1+seg*(L-2)/3,z1=z0+(L-2)/3-.1,pts=[];for(let j=0;j<=6;j++){const z=z0+(z1-z0)*j/6,t=(z+L/2)/L;pts.push(v(-1.9*Math.sin(Math.PI*(.12+t*.76))*(.8+k*.05)-.02,h,z));}add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),8,.09,4),k%2?woodMat:wetMat,0,0,0,hull).scale.set(1,.6,1);}}
 // Stern castle fragment and a deck beam.
 add(new THREE.BoxGeometry(2.2,1,1.4),woodMat,0,2.3,L/2-1.3,hull);add(new THREE.BoxGeometry(2.3,.1,1.5),wetMat,0,2.85,L/2-1.3,hull);
 add(new THREE.BoxGeometry(3,.14,.18),wetMat,0,1.8,-.6,hull);
 // Snapped mast lying across the sand with a torn sail.
 const mast=add(new THREE.CylinderGeometry(.14,.18,5.8,8).rotateX(Math.PI/2),woodMat,-2.6,.25,.6);mast.rotation.y=.35;
 add(new THREE.CylinderGeometry(.08,.08,3.2,6).rotateZ(Math.PI/2),woodMat,-3.3,.2,2.3).rotation.y=.2;
 const sailShape=new THREE.Shape();sailShape.moveTo(0,0);sailShape.lineTo(2.6,0);sailShape.lineTo(2.3,1.3);sailShape.lineTo(1.6,.9);sailShape.lineTo(1.1,1.6);sailShape.lineTo(.3,1.1);sailShape.closePath();
 const sail=add(new THREE.ShapeGeometry(sailShape),sailMat,-4.6,.08,1.2);sail.rotation.set(-Math.PI/2+.06,0,.3);
 add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v(-1.2,1.8,-1.6),v(-2.4,.9,-.4),v(-3.4,.05,.8)]),10,.02,3),ropeMat,0,0,0);
 // Cargo: barrels and a chest in the sand, weed draped over the hull.
 const staveProfile=[new THREE.Vector2(0,0),new THREE.Vector2(.24,0),new THREE.Vector2(.29,.2),new THREE.Vector2(.31,.4),new THREE.Vector2(.29,.6),new THREE.Vector2(.24,.8),new THREE.Vector2(0,.8)];
 for(const [x,z,r,tilt] of [[2.4,-1.5,.3,Math.PI/2],[3.1,.4,1.1,Math.PI/2],[2.2,2.6,0,0]]){const b=add(new THREE.LatheGeometry(staveProfile,14),woodMat,x,tilt?.3:0,z);b.rotation.set(0,r,tilt);for(const y of [.15,.65])add(new THREE.TorusGeometry(.28,.015,4,16).rotateX(Math.PI/2),ironMat,0,y,0,b);}
 const chest=add(new THREE.BoxGeometry(.8,.45,.5),wetMat,1.2,.2,3.4);chest.rotation.set(.2,.6,.1);add(new THREE.BoxGeometry(.82,.05,.52),ironMat,0,.1,0,chest);
 for(const [x,z,s] of [[-1.3,-2,.6],[-1.6,1.4,.5],[.9,-3.6,.45]])add(new THREE.SphereGeometry(1,8,5),weedMat,x,.08,z).scale.set(s,.07,s*.8);
 for(const [x,z,s] of [[-1.8,0,1.4],[1.6,1.2,1]])add(new THREE.SphereGeometry(1,10,6),sandMat,x,-.05,z).scale.set(s*1.3,.22,s);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());
 for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
