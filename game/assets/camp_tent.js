// 404 reference: wilderness-camp. Ridge-pole canvas tent with guy ropes, a
// stone-ringed campfire, a bedroll, a cooking tripod with kettle. Front +Z.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9,metalness=0,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,metalness,...extra}),{name});
 const canvasMat=mat('fabric',0xc9b690,.95,0,{side:THREE.DoubleSide}),canvasDarkMat=mat('fabric',0x9c8462,.95,0,{side:THREE.DoubleSide}),poleMat=mat('timber',0x6b4a2c),ropeMat=mat('fabric',0xb49a6a,.95),stoneMat=mat('stone',0x8a877e,.95),charMat=mat('bark',0x2e2621),bedMat=mat('fabric',0x7a3b2e,.95),ironMat=mat('metal',0x3a3a3a,.5,.5);
 const flameMat=new THREE.MeshStandardMaterial({color:0xffb050,emissive:0xff7a20,emissiveIntensity:1.6,roughness:1});
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 const tentW=2.2,tentH=1.55,tentL=2.4,tz=-.8;
 // Canvas: two sloped panels meeting at the ridge, plus back and door flaps.
 const slope=Math.hypot(tentW/2,tentH),pitch=Math.atan2(tentH,tentW/2);
 for(const s of [-1,1]){const panel=add(new THREE.BoxGeometry(slope+.12,.025,tentL+.1),canvasMat,s*tentW/4,tentH/2,tz);panel.rotation.z=-s*pitch;}
 const back=new THREE.Shape();back.moveTo(-tentW/2,0);back.lineTo(tentW/2,0);back.lineTo(0,tentH);back.closePath();
 add(new THREE.ShapeGeometry(back),canvasDarkMat,0,0,tz-tentL/2);
 for(const s of [-1,1]){const flap=new THREE.Shape();flap.moveTo(0,0);flap.lineTo(s*tentW/2,0);flap.lineTo(0,tentH);flap.closePath();const f=add(new THREE.ShapeGeometry(flap),canvasDarkMat,s*.06,0,tz+tentL/2+.02);f.rotation.y=s*-.5;}
 // Ridge pole, uprights and guy ropes to pegs.
 add(new THREE.CylinderGeometry(.035,.035,tentL+.3,6).rotateX(Math.PI/2),poleMat,0,tentH,tz);
 for(const z of [tz-tentL/2,tz+tentL/2])add(new THREE.CylinderGeometry(.035,.035,tentH+.15,6),poleMat,0,(tentH+.15)/2,z);
 for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1],[0,-1.3],[0,1.3]]){const top=new THREE.Vector3(sx*tentW*.3,tentH*.55,tz+sz*tentL*.4),peg=new THREE.Vector3(sx*(tentW/2+.7),.05,tz+sz*(tentL/2+.3));add(new THREE.TubeGeometry(new THREE.LineCurve3(top,peg),1,.008,3),ropeMat,0,0,0);add(new THREE.CylinderGeometry(.02,.012,.18,4),poleMat,peg.x,.09,peg.z);}
 // Campfire: ring of stones, crossed logs, flames and embers.
 const fire=new THREE.Group();fire.position.set(.9,0,1.25);root.add(fire);
 const ring=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.11,0),stoneMat,10),pose=new THREE.Object3D();
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2;pose.position.set(Math.cos(a)*.42,.09,Math.sin(a)*.42);pose.rotation.set(i*.7,i*1.3,0);pose.scale.set(1.2,.8,1);pose.updateMatrix();ring.setMatrixAt(i,pose.matrix);}fire.add(ring);
 add(new THREE.CircleGeometry(.36,12).rotateX(-Math.PI/2),charMat,0,.012,0,fire);
 for(let i=0;i<4;i++){const log=add(new THREE.CylinderGeometry(.05,.06,.6,6),charMat,0,.1,0,fire);log.rotation.set(Math.PI/2-.35,i*Math.PI/2+.4,0);}
 for(const [x,z,h,r] of [[0,0,.5,.14],[.08,-.06,.36,.09],[-.09,.05,.32,.08]])add(new THREE.ConeGeometry(r,h,7),flameMat,x,.12+h/2,z,fire);
 // Cooking tripod and kettle over the fire.
 for(let i=0;i<3;i++){const a=i/3*Math.PI*2,leg=add(new THREE.CylinderGeometry(.02,.02,1.2,5),poleMat,Math.cos(a)*.3,.55,Math.sin(a)*.3,fire);leg.rotation.set(Math.sin(a)*.25,0,-Math.cos(a)*.25);}
 const kettle=add(new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(.1,.02),new THREE.Vector2(.13,.1),new THREE.Vector2(.1,.18),new THREE.Vector2(.06,.2)],10),ironMat,0,.62,0,fire);
 add(new THREE.CylinderGeometry(.004,.004,.45,3),ironMat,0,.95,0,fire);
 // Bedroll beside the tent and a log to sit on.
 const bedroll=add(new THREE.CapsuleGeometry(.14,.7,4,8).rotateZ(Math.PI/2),bedMat,-.95,.14,.9);bedroll.rotation.y=.4;
 const seat=add(new THREE.CylinderGeometry(.16,.17,1.1,8).rotateZ(Math.PI/2),poleMat,1.1,.16,2.1);seat.rotation.y=-.3;
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
