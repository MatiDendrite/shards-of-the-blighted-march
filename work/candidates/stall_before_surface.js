export default function generate(T){
 const g=new T.Group(),wood=Object.assign(new T.MeshStandardMaterial({color:0x574333,roughness:1}),{name:'timber'}),cloth=Object.assign(new T.MeshStandardMaterial({color:0x793e36,roughness:1,side:T.DoubleSide}),{name:'fabric'}),iron=Object.assign(new T.MeshStandardMaterial({color:0x48534e,roughness:.6,metalness:.4}),{name:'metal'});
 const box=(m,x,y,z,w,h,d)=>{const a=new T.Mesh(new T.BoxGeometry(w,h,d),m);a.position.set(x,y,z);g.add(a);return a;};
 for(const x of [-1.5,1.5])for(const z of [-.8,.8])box(wood,x,1.3,z,.13,2.6,.13);
 for(const z of [-.82,.82])box(wood,0,2.5,z,3.25,.12,.12);
 for(const side of [-1,1]){const shape=new T.Shape();shape.moveTo(0,3.1);shape.lineTo(side*1.75,2.45);shape.lineTo(side*1.75,2.35);shape.lineTo(0,3);shape.closePath();const m=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:2,bevelEnabled:false}),cloth);m.position.z=-1;g.add(m);}
 for(let i=0;i<12;i++)box(wood,(i-5.5)*.25,.55,.7,.24,1.1,.12);box(wood,0,1.15,.58,3.15,.13,.75);
 for(const z of [-.8,.2])for(const x of [-1,1]){box(wood,x,.3,z,.6,.6,.5);for(const y of [.1,.5])box(iron,x,y,z+.26,.62,.06,.04);}
 for(let i=0;i<5;i++){const bottle=new T.Mesh(new T.LatheGeometry([new T.Vector2(.13,0),new T.Vector2(.16,.08),new T.Vector2(.13,.3),new T.Vector2(.06,.36),new T.Vector2(.06,.48)],8),iron);bottle.position.set((i-2)*.32,1.22,.6);g.add(bottle);}
 const fruit=Object.assign(new T.MeshStandardMaterial({color:0x9f9254,roughness:.8}),{name:'produce'}),ceramic=Object.assign(new T.MeshStandardMaterial({color:0x956a4f,roughness:.9,side:T.DoubleSide}),{name:'pottery'});
 for(const z of [-1,1])for(let i=0;i<14;i++){const a=new T.Shape();a.moveTo(-.12,0);a.lineTo(.12,0);a.lineTo(.1,-.18);a.lineTo(0,-.23);a.lineTo(-.1,-.18);a.closePath();const hem=new T.Mesh(new T.ShapeGeometry(a),cloth);hem.position.set((i-6.5)*.245,2.41,z);g.add(hem);}
 for(const x of [-1.49,1.49])for(const z of [-.8,.8]){const brace=box(wood,x,2.18,z*.55,.1,.74,.1);brace.rotation.x=z>0?.55:-.55;}
 for(const z of [-.8,.2])for(const x of [-1,1])for(let j=0;j<4;j++){box(wood,x+(j-1.5)*.145,.32,z+.28,.12,.53,.035);box(wood,x,.13+j*.14,z-.27,.61,.11,.035);}
 const profile=[[.15,0],[.2,.08],[.24,.3],[.25,.35],[.2,.35],[.19,.28],[.16,.08]].map(([x,y])=>new T.Vector2(x,y));
 for(const x of [-1.1,1.1]){const pot=new T.Mesh(new T.LatheGeometry(profile,12),ceramic);pot.position.set(x,1.22,.5);g.add(pot);for(let j=0;j<5;j++){const apple=new T.Mesh(new T.SphereGeometry(.085,7,5),fruit);apple.position.set(x+Math.sin(j*2.4)*.12,1.53+Math.cos(j*3)*.03,.5+Math.cos(j*2.4)*.12);g.add(apple);}}
 const bounds=new T.Box3(),v=new T.Vector3();g.updateMatrixWorld(true);g.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)bounds.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));}});const center=bounds.getCenter(new T.Vector3());g.children.forEach(o=>{o.position.x-=center.x;o.position.z-=center.z;o.position.y-=bounds.min.y;});return g;
}
