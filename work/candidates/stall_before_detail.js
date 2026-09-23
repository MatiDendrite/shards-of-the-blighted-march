export default function generate(T){
 const g=new T.Group(),wood=Object.assign(new T.MeshStandardMaterial({color:0x574333,roughness:1}),{name:'timber'}),cloth=Object.assign(new T.MeshStandardMaterial({color:0x793e36,roughness:1,side:T.DoubleSide}),{name:'fabric'}),iron=Object.assign(new T.MeshStandardMaterial({color:0x48534e,roughness:.6,metalness:.4}),{name:'metal'});
 const box=(m,x,y,z,w,h,d)=>{const a=new T.Mesh(new T.BoxGeometry(w,h,d),m);a.position.set(x,y,z);g.add(a);return a;};
 for(const x of [-1.5,1.5])for(const z of [-.8,.8])box(wood,x,1.3,z,.13,2.6,.13);
 for(const z of [-.82,.82])box(wood,0,2.5,z,3.25,.12,.12);
 for(const side of [-1,1]){const shape=new T.Shape();shape.moveTo(0,3.1);shape.lineTo(side*1.75,2.45);shape.lineTo(side*1.75,2.35);shape.lineTo(0,3);shape.closePath();const m=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:2,bevelEnabled:false}),cloth);m.position.z=-1;g.add(m);}
 for(let i=0;i<12;i++)box(wood,(i-5.5)*.25,.55,.7,.24,1.1,.12);box(wood,0,1.15,.58,3.15,.13,.75);
 for(const z of [-.8,.2])for(const x of [-1,1]){box(wood,x,.3,z,.6,.6,.5);for(const y of [.1,.5])box(iron,x,y,z+.26,.62,.06,.04);}
 for(let i=0;i<5;i++){const bottle=new T.Mesh(new T.LatheGeometry([new T.Vector2(.13,0),new T.Vector2(.16,.08),new T.Vector2(.13,.3),new T.Vector2(.06,.36),new T.Vector2(.06,.48)],8),iron);bottle.position.set((i-2)*.32,1.22,.6);g.add(bottle);}return g;
}
