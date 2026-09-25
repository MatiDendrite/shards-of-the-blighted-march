// 404 reference: farmland-props. A four-metre split-rail fence run: five
// weathered posts, two sagging rails per bay, a gate latch and tall weeds.
export default function generate(THREE){
 const root=new THREE.Group();
 const mat=(name,color,roughness=.9,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness,...extra}),{name});
 const postMat=mat('timber',0x6b4a2c),railMat=mat('timber',0x8a6440),weedMat=mat('weeds',0x6f8f45,.95,{side:THREE.DoubleSide,vertexColors:true}),ironMat=Object.assign(new THREE.MeshStandardMaterial({color:0x3a3a3a,roughness:.5,metalness:.5}),{name:'metal'});
 const add=(geo,m,x,y,z,parent=root)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 const bays=4,span=1,postH=1.15;
 const postGeom=new THREE.CylinderGeometry(.065,.08,postH,6);
 for(let i=0;i<=bays;i++){const post=add(postGeom,postMat,-bays*span/2+i*span,postH/2,0);post.rotation.set((i%2?.03:-.02),i*.9,(i%3-1)*.03);add(new THREE.ConeGeometry(.07,.1,6),postMat,0,postH/2+.05,0,post);}
 // Rails sag slightly between posts: short tubes along a curve.
 for(let i=0;i<bays;i++)for(const [y,sag] of [[.45,.03],[.85,.05]]){const x0=-bays*span/2+i*span,curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(x0,y,0),new THREE.Vector3(x0+span/2,y-sag,.02*(i%2?1:-1)),new THREE.Vector3(x0+span,y+(i%2?.02:-.01),0));add(new THREE.TubeGeometry(curve,6,.035,5),railMat,0,0,0);}
 add(new THREE.BoxGeometry(.05,.1,.12),ironMat,bays*span/2-.08,.85,0);
 // Weeds at the post feet as vertex-coloured grass cards.
 const blade=new THREE.PlaneGeometry(.06,.45,1,2);const colors=[];for(let i=0;i<blade.attributes.position.count;i++){const top=blade.attributes.position.getY(i)>0;colors.push(top?.75:.35,top?.85:.45,top?.4:.25);}blade.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const weeds=new THREE.InstancedMesh(blade,weedMat,30),pose=new THREE.Object3D();
 for(let i=0;i<30;i++){const p=i%5,x=-bays*span/2+p*span+((i*13)%7-3)*.04,a=i*1.7;pose.position.set(x,.2,((i*11)%7-3)*.05);pose.rotation.set(((i*5)%3-1)*.2,a,((i*3)%5-2)*.1);pose.scale.set(1,.7+((i*7)%4)*.2,1);pose.updateMatrix();weeds.setMatrixAt(i,pose.matrix);}root.add(weeds);
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root,true),c=box.getCenter(new THREE.Vector3());for(const k of root.children){k.position.x-=c.x;k.position.z-=c.z;k.position.y-=box.min.y;}
 return root;
}
