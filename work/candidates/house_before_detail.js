// Original reference-led half-timber house. Front +Z; exterior only.
export default function generate(T){
 const g=new T.Group(),mat=(name,color)=>Object.assign(new T.MeshStandardMaterial({color,roughness:.95}),{name});
 const stone=mat('stone',0x929183),wood=mat('timber',0x49382d),plaster=mat('plaster',0xc0b99c),roof=mat('tile',0x43584f),dark=mat('metal',0x263330),glass=mat('glass',0xd7ac68);
 const box=(m,x,y,z,w,h,d)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);return o;};
 box(stone,0,.25,0,5.6,.5,4.8);box(plaster,0,1.95,0,5.4,3.4,4.6);
 for(const z of [-2.35,2.35])for(const x of [-2.72,0,2.72])box(wood,x,2,z,.18,3.6,.18);
 for(const y of [.65,3.6]){for(const z of [-2.38,2.38])box(wood,0,y,z,5.65,.18,.18);for(const x of [-2.78,2.78])box(wood,x,y,0,.18,.18,4.8);}
 // Triangular gables are profiles, tiled slopes are separate overlapping rows.
 for(const z of [-2.3,2.3]){const s=new T.Shape();s.moveTo(-2.7,3.6);s.lineTo(2.7,3.6);s.lineTo(0,6.1);s.closePath();const o=new T.Mesh(new T.ExtrudeGeometry(s,{depth:.15,bevelEnabled:false}),plaster);o.position.z=z-.075;g.add(o);}
 const slope=Math.atan2(2.6,3.1);
 for(const side of [-1,1])for(let row=0;row<8;row++)for(let col=0;col<11;col++){
   const t=(row+.5)/8,o=box(roof,side*t*3.1,6.17-t*2.6,(col-5)*.5+(row%2)*.1,.57,.09,.56);o.rotation.z=-side*slope;
 }
 for(const z of [-2.62,2.62])for(const side of [-1,1]){const o=box(wood,side*1.55,4.88,z,4.14,.16,.18);o.rotation.z=-side*slope;}
 box(wood,0,6.2,0,.18,.2,5.6);box(stone,1.6,5.25,-.6,.7,2.3,.7);box(stone,1.6,6.45,-.6,.85,.16,.85);
 for(const x of [-.27,.27])box(dark,1.6+x,6.68,-.6,.18,.4,.25);
 // Recess, planks and iron straps make the entrance legible at gameplay scale.
 box(dark,0,1.55,2.34,1.45,2.35,.12);for(let i=0;i<6;i++)box(wood,(i-2.5)*.2,1.5,2.44,.19,2.1,.1);
 for(const y of [.9,2])box(dark,0,y,2.51,1.15,.075,.05);
 for(const x of [-.78,.78])box(wood,x,1.6,2.47,.15,2.5,.2);box(wood,0,2.86,2.47,1.7,.17,.2);
 for(let i=0;i<3;i++)box(stone,0,.09+i*.14,3.12-i*.25,2.25,.18,1.1-i*.2);
 for(const z of [-2.42,2.42])for(const x of [-1.8,1.8]){
   box(dark,x,2,z,1,1.25,.14);box(glass,x,2,z*1.006,.65,.85,.08);
   for(const s of [-1,1])box(wood,x+s*.45,2,z*1.024,.32,1.23,.1);box(wood,x,1.36,z*1.03,1.16,.14,.22);
 }
 for(const x of [-2.8,2.8])for(const z of [-1,1]){box(dark,x,2,z,.12,1.2,1);box(wood,x*1.02,2,z,.1,1.12,.8);}
 // Centre the full footprint, including steps, without changing the authored scale.
 const b=new T.Box3().setFromObject(g),c=b.getCenter(new T.Vector3());g.children.forEach(o=>{o.position.x-=c.x;o.position.y-=b.min.y;o.position.z-=c.z;});return g;
}
