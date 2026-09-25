// 404 reference: market-props. Merchant's stock pile: slatted crates, hooped
// barrels on a lathe profile, tied grain sacks and a leaning broom. Front +Z.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9,metalness=0)=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,metalness}),{name});
 const crateMat=mat('timber',0xa47a4c),slatMat=mat('timber',0x6b4a2c),staveMat=mat('timber',0x7d5634),hoopMat=mat('metal',0x444444,.5,.5),sackMat=mat('fabric',0xcdb98f,.95),ropeMat=mat('fabric',0xa88d5f,.95),strawMat=mat('fabric',0xd6b85c,.95);
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 // Crates: body plus edge slats on every face that shows.
 const crateGeom=new THREE.BoxGeometry(.6,.55,.6),slatH=new THREE.BoxGeometry(.64,.06,.06),slatV=new THREE.BoxGeometry(.06,.6,.06);
 function crate(x,y,z,r){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=r;root.add(g);add(crateGeom,crateMat,0,.275,0,g);
  for(const s of [-1,1]){for(const dy of [.03,.52]){add(slatH,slatMat,0,dy,s*.3,g);const side=add(slatH,slatMat,s*.3,dy,0,g);side.rotation.y=Math.PI/2;}for(const t of [-1,1])add(slatV,slatMat,s*.3,.275,t*.3,g);}
  const cross=add(new THREE.BoxGeometry(.06,.72,.03),slatMat,0,.275,.31,g);cross.rotation.z=.74;return g;}
 crate(-.55,0,-.35,.08);crate(.12,0,-.45,-.12);crate(-.25,.58,-.4,.35);
 // Barrels: bulged lathe staves with iron hoops.
 const staveProfile=new THREE.SplineCurve([new THREE.Vector2(.24,0),new THREE.Vector2(.29,.2),new THREE.Vector2(.31,.4),new THREE.Vector2(.29,.6),new THREE.Vector2(.24,.8)]).getSpacedPoints(10);
 staveProfile.unshift(new THREE.Vector2(0,0));staveProfile.push(new THREE.Vector2(0,.8));
 const barrelGeom=new THREE.LatheGeometry(staveProfile,16);
 for(const [x,z,tilt] of [[.75,.15,0],[.72,-.5,0],[.2,.5,Math.PI/2]]){const barrel=add(barrelGeom,staveMat,x,tilt?.3:0,z);if(tilt){barrel.rotation.z=tilt;barrel.position.x+=.4;}
  for(const y of [.1,.3,.5,.7]){const hoop=add(new THREE.TorusGeometry(y===.3||y===.5?.308:.27,.014,4,20).rotateX(Math.PI/2),hoopMat,0,y,0,barrel);}}
 // Sacks: tied necks, slumped against the crates.
 const sackProfile=[0,.17,.24,.25,.22,.13,.05,.07].map((r,i)=>new THREE.Vector2(r,i*.075));
 for(const [x,z,lean] of [[-.75,.35,.25],[-.35,.45,-.2],[-.6,.8,.5]]){const sack=add(new THREE.LatheGeometry(sackProfile,10),sackMat,x,0,z);sack.rotation.set(lean,0,lean*.4);add(new THREE.TorusGeometry(.055,.018,4,8).rotateX(Math.PI/2),ropeMat,0,.46,0,sack);}
 // A broom leaning on the crate stack.
 const handle=add(new THREE.CylinderGeometry(.018,.018,1.3,6),slatMat,.45,.62,.25);handle.rotation.z=-.3;
 const bristles=add(new THREE.ConeGeometry(.1,.3,8),strawMat,.63,.08,.25);bristles.rotation.z=-.3;
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());for(const n of root.children){n.position.x-=c.x;n.position.z-=c.z;n.position.y-=box.min.y;}
 return root;
}
