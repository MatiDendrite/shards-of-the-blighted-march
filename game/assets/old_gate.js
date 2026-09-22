export default function generate(T){
  const g=new T.Group(), stone=Object.assign(new T.MeshStandardMaterial({color:0x767d74,roughness:.94}),{name:'stone'}), wood=Object.assign(new T.MeshStandardMaterial({color:0x49382d,roughness:.9}),{name:'timber'}), iron=Object.assign(new T.MeshStandardMaterial({color:0x333e3d,roughness:.6,metalness:.5}),{name:'metal'});
  const block=(m,x,y,z,w,h,d)=>{const a=new T.Mesh(new T.BoxGeometry(w,h,d),m);a.position.set(x,y,z);g.add(a);return a;};
  for(const s of [-1,1]){
    for(let r=0;r<9;r++)for(let c=0;c<2;c++){let b=block(stone,s*2.4+(c-.5)*.51,r*.45+.225,0,.5,.43,1.15);b.rotation.y=Math.sin(r*7+c)*.018;}
    block(stone,s*2.4,4.12,0,1.24,.22,1.42);
    for(let i=0;i<4;i++)block(wood,s*(3.35+i*.65),1.35,0,.52,2.7,.22);
    for(let j=0;j<2;j++)block(wood,s*4.15,.8+j*.95,.16,3.4,.13,.18);
  }
  for(let i=0;i<13;i++){const a=(i+.5)/13*Math.PI;const b=block(stone,Math.cos(a)*2.35,3.12+Math.sin(a)*1.2,0,.58,.50,1.18);b.rotation.z=Math.atan2(1.2*Math.cos(a),-2.35*Math.sin(a));}
  // Raised portcullis: the opening stays walkable.
  for(let i=0;i<9;i++)block(iron,(i-4)*.43,3.42,.08,.06,.9,.07);
  block(iron,0,3.6,.08,3.8,.06,.08);
  return g;
}
