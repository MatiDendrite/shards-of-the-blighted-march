// 404 reference: settlement-props. Crossroads signpost: a weathered post on a
// stone footing with three carved arrow boards, a hanging lantern hook and a
// small shrine niche. No lettering; the boards read by shape. Front +Z.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9,metalness=0)=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,metalness}),{name});
 const postMat=mat('timber',0x6b4a2c),boardMat=mat('timber',0xa47a4c),paintMat=mat('paint',0x7a3b2e,.8),stoneMat=mat('stone',0x9a958a,.95),ironMat=mat('metal',0x3a3a3a,.5,.5);
 const glowMat=new THREE.MeshStandardMaterial({color:0xffc070,emissive:0xff9b36,emissiveIntensity:1.2});
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 // Footing of stacked stones and the post.
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2,stone=add(new THREE.DodecahedronGeometry(.16,0),stoneMat,Math.cos(a)*.24,.1,Math.sin(a)*.24);stone.scale.set(1.2,.7,1);stone.rotation.set(i,i*.6,0);}
 const post=add(new THREE.CylinderGeometry(.075,.09,2.6,8),postMat,0,1.3,0);
 add(new THREE.ConeGeometry(.11,.2,8),postMat,0,2.7,0);
 // Arrow boards: extruded pointed planks with a painted band.
 const arrow=new THREE.Shape();arrow.moveTo(0,-.1);arrow.lineTo(.62,-.1);arrow.lineTo(.8,0);arrow.lineTo(.62,.1);arrow.lineTo(0,.1);arrow.closePath();
 const boardGeom=new THREE.ExtrudeGeometry(arrow,{depth:.04,bevelEnabled:true,bevelSize:.01,bevelThickness:.01,bevelSegments:1});boardGeom.translate(.05,0,-.02);
 for(const [y,a] of [[2.25,.3],[1.95,Math.PI-.5],[1.68,1.9]]){const board=add(boardGeom,boardMat,0,y,0);board.rotation.y=a;const band=add(new THREE.BoxGeometry(.4,.05,.065),paintMat,.35,0,0,board);}
 // Lantern arm and a small lamp, plus an offering niche on the post.
 const arm=add(new THREE.BoxGeometry(.5,.05,.05),ironMat,.25,2.45,.08);arm.rotation.y=-.9;
 add(new THREE.CylinderGeometry(.005,.005,.2,3),ironMat,.28,2.33,.42);
 add(new THREE.CylinderGeometry(.07,.07,.16,6),glowMat,.28,2.17,.42);add(new THREE.ConeGeometry(.1,.08,6),ironMat,.28,2.29,.42);
 add(new THREE.BoxGeometry(.22,.26,.1),stoneMat,0,.95,.1);add(new THREE.SphereGeometry(.03,6,4),glowMat,0,.92,.16);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
