// 404 reference: landmark. A striped stone lighthouse on a rocky islet: plinth,
// tapered tower with bands and windows, iron gallery, a glazed lantern room
// under a domed roof, and a named rotating beam.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,...extra}),{name});
 const rockMat=mat('stone',0x7d786e),rockDarkMat=mat('stone',0x5f5b54),whiteMat=mat('plaster',0xefe8da),redMat=mat('paint',0xa8382c,.7),ironMat=mat('metal',0x2f3335,.5,{metalness:.5}),glassMat=Object.assign(new THREE.MeshStandardMaterial({color:0xfff2c8,emissive:0xffcf6a,emissiveIntensity:1.8,roughness:.2}),{name:'glow'}),woodMat=mat('timber',0x6b4a2c),weedMat=mat('seaweed',0x4f6a3a);
 const beamMat=Object.assign(new THREE.MeshBasicMaterial({color:0xfff0b0,transparent:true,opacity:.06,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),{name:'beam'});
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 // Islet: a heap of jittered boulders; index-derived variation only.
 for(let i=0;i<16;i++){const a=i*2.399,r=1.2+(i%4)*.9,s=.8+(i%3)*.45,rock=add(new THREE.DodecahedronGeometry(1,0),i%2?rockDarkMat:rockMat,Math.cos(a)*r,.3+(i%3)*.25,Math.sin(a)*r);rock.scale.set(s*1.3,s*.8,s);rock.rotation.set(i,i*.7,0);}
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2+.2;add(new THREE.SphereGeometry(1,8,5),weedMat,Math.cos(a)*3.6,.12,Math.sin(a)*3.6).scale.set(.5,.08,.35);}
 const baseY=1.1,towerH=10.5,rBase=1.65,rTop=1.15;
 add(new THREE.CylinderGeometry(2.1,2.3,.8,20),rockMat,0,baseY,0);
 // Tower bands alternate white and red on a single taper.
 const bands=6;for(let i=0;i<bands;i++){const y0=baseY+.4+i*towerH/bands,y1=y0+towerH/bands,r0=rBase+(rTop-rBase)*(i/bands),r1=rBase+(rTop-rBase)*((i+1)/bands);add(new THREE.CylinderGeometry(r1,r0,towerH/bands,24),i%2?redMat:whiteMat,0,(y0+y1)/2,0);}
 for(const [a,y] of [[0,3.2],[Math.PI*.6,5.6],[Math.PI*1.3,8],[Math.PI,4.4]]){const r=rBase+(rTop-rBase)*((y-baseY)/towerH)+.02,win=add(new THREE.BoxGeometry(.32,.55,.08),glassMat,Math.sin(a)*r,y,Math.cos(a)*r);win.rotation.y=a;}
 add(new THREE.BoxGeometry(.8,1.5,.1),woodMat,0,baseY+1.15,rBase+.02);
 // Gallery with instanced railing posts.
 const topY=baseY+.4+towerH;add(new THREE.CylinderGeometry(rTop+.55,rTop+.3,.18,24),ironMat,0,topY,0);
 const posts=new THREE.InstancedMesh(new THREE.CylinderGeometry(.025,.025,.7,4),ironMat,24),pose=new THREE.Object3D();for(let i=0;i<24;i++){const a=i/24*Math.PI*2;pose.position.set(Math.cos(a)*(rTop+.5),topY+.35,Math.sin(a)*(rTop+.5));pose.updateMatrix();posts.setMatrixAt(i,pose.matrix);}root.add(posts);
 add(new THREE.TorusGeometry(rTop+.5,.03,4,28).rotateX(Math.PI/2),ironMat,0,topY+.7,0);
 // Lantern room: glowing glazing between iron mullions, domed cap and vane.
 add(new THREE.CylinderGeometry(.85,.85,1.3,16,1,true),glassMat,0,topY+.8,0);
 const mullions=new THREE.InstancedMesh(new THREE.BoxGeometry(.06,1.35,.06),ironMat,8);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;pose.position.set(Math.cos(a)*.87,topY+.8,Math.sin(a)*.87);pose.updateMatrix();mullions.setMatrixAt(i,pose.matrix);}root.add(mullions);
 add(new THREE.SphereGeometry(.95,16,8,0,Math.PI*2,0,Math.PI/2),redMat,0,topY+1.45,0);add(new THREE.ConeGeometry(.08,.6,6),ironMat,0,topY+2.6,0);
 // Beam: two long faint cones on a named pivot inside the lantern.
 const beam=new THREE.Group();beam.name='lighthouse-beam';beam.position.y=topY+.85;root.add(beam);
 for(const s of [-1,1]){const cone=add(new THREE.ConeGeometry(1.4,16,16,1,true).translate(0,-8,0),beamMat,0,0,0,beam);cone.rotation.z=s*Math.PI/2;}
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());
 // The beam reaches far past the islet; ground and centre on the solid parts.
 const solid=new THREE.Box3();for(const k of root.children)if(k!==beam)solid.expandByObject(k,true);const sc=solid.getCenter(new THREE.Vector3());
 for(const k of root.children){k.position.x-=sc.x;k.position.z-=sc.z;k.position.y-=solid.min.y;}
 return root;
}
