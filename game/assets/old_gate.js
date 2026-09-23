export default function generate(T){
  const g=new T.Group(), stone=Object.assign(new T.MeshStandardMaterial({color:0x767d74,roughness:.94}),{name:'stone'}), wood=Object.assign(new T.MeshStandardMaterial({color:0x49382d,roughness:.9}),{name:'timber'}), iron=Object.assign(new T.MeshStandardMaterial({color:0x333e3d,roughness:.6,metalness:.5}),{name:'metal'});
  const bevels=new Map();
  const block=(m,x,y,z,w,h,d)=>{
    let geo;if(m===stone){const key=[w,h,d].join(':');geo=bevels.get(key);if(!geo){const cut=.035,s=new T.Shape();[[-w/2+cut,-h/2],[w/2-cut,-h/2],[w/2,-h/2+cut],[w/2,h/2-cut],[w/2-cut,h/2],[-w/2+cut,h/2],[-w/2,h/2-cut],[-w/2,-h/2+cut]].forEach(([u,v],i)=>i?s.lineTo(u,v):s.moveTo(u,v));s.closePath();geo=new T.ExtrudeGeometry(s,{depth:d-.04,bevelEnabled:true,bevelSize:.015,bevelThickness:.02,bevelSegments:1,steps:1});geo.translate(0,0,-(d-.04)/2);bevels.set(key,geo);}}else geo=new T.BoxGeometry(w,h,d);
    const a=new T.Mesh(geo,m);a.position.set(x,y,z);g.add(a);return a;
  };
  for(const s of [-1,1]){
    for(let r=0;r<9;r++)for(let c=0;c<2;c++){let b=block(stone,s*2.4+(c-.5)*.51,r*.45+.225,0,.5,.43,1.15);b.rotation.y=Math.sin(r*7+c)*.018;}
    block(stone,s*2.4,4.12,0,1.24,.22,1.42);
    for(let i=0;i<4;i++)block(wood,s*(3.35+i*.65),1.35,0,.52,2.7,.22);
    for(let j=0;j<2;j++)block(wood,s*4.15,.8+j*.95,.16,3.4,.13,.18);
    // Recessed iron straps, pegs and braces read from both sides of the gate.
    for(const face of [-1,1]){
      const brace=block(wood,s*4.15,1.37,face*.2,3.1,.11,.11);brace.rotation.z=s*.42;
      for(let i=0;i<4;i++)for(const y of [.8,1.75]){const pin=new T.Mesh(new T.CylinderGeometry(.038,.038,.018,6),iron);pin.rotation.x=Math.PI/2;pin.position.set(s*(3.35+i*.65),y,face*.266);g.add(pin);}
      for(const y of [1.15,2.8])block(iron,s*2.4,y,face*.602,.64,.13,.05);
      block(stone,s*2.4,.17,face*.1,1.22,.28,1.2);
    }
  }
  for(let i=0;i<13;i++){const a=(i+.5)/13*Math.PI;const b=block(stone,Math.cos(a)*2.35,3.12+Math.sin(a)*1.2,0,.58,.50,1.18);b.rotation.z=Math.atan2(1.2*Math.cos(a),-2.35*Math.sin(a));}
  // Raised portcullis: the opening stays walkable.
  for(let i=0;i<9;i++)block(iron,(i-4)*.43,3.42,.08,.06,.9,.07);
  block(iron,0,3.6,.08,3.8,.06,.08);
  // A taller central keystone and a narrow weathering lip articulate the arch.
  for(const face of [-1,1]){const key=block(stone,0,4.28,face*.62,.4,.68,.11);key.rotation.z=.025;for(const s of [-1,1])block(stone,s*2.4,3.05,face*.05,1.14,.16,1.3);}
  // Keep the authored base at zero even with millimetre bevels.
  g.updateMatrixWorld(true);const box=new T.Box3().setFromObject(g);g.children.forEach(o=>o.position.y-=box.min.y);
  return g;
}
