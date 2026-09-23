// Independent 404 reading: block-forged cuirass, stacked collars, octagonal crown.
export default function generate(T){
 const g=new T.Group(),iron=new T.MeshStandardMaterial({color:0x555f68,metalness:.7,roughness:.5}),trim=new T.MeshStandardMaterial({color:0xa49b83,metalness:.6,roughness:.5}),cloth=new T.MeshStandardMaterial({color:0x50334f,roughness:1});
 const box=(m,x,y,z,w,h,d)=>{const n=new T.Mesh(new T.BoxGeometry(w,h,d),m);n.position.set(x,y,z);g.add(n);return n;};
 box(iron,0,1.62,0,.61,.63,.38);box(cloth,0,1.05,0,.60,.48,.32);box(trim,0,1.30,.01,.64,.08,.40);
 for(let row=0;row<4;row++){box(trim,0,1.40+row*.14,.205,.57,.015,.02);box(trim,0,1.40+row*.14,-.205,.57,.015,.02);}
 const helm=new T.Mesh(new T.CylinderGeometry(.14,.20,.38,8),iron);helm.position.set(0,2.13,0);g.add(helm);
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2,n=new T.Mesh(new T.ConeGeometry(.038,.23,4),trim);n.position.set(Math.sin(a)*.147,2.40,Math.cos(a)*.147);g.add(n);}
 for(const s of [-1,1]){box(cloth,s*.084,2.15,.177,.114,.026,.035);box(iron,s*.18,.56,0,.24,1,.27);box(trim,s*.18,.73,.15,.26,.1,.05);box(iron,s*.18,.09,.065,.27,.18,.44);box(iron,s*.42,1.5,0,.20,.76,.23);for(let k=0;k<3;k++)box(iron,s*(.42+k*.013),1.87-k*.08,0,.33,.08,.42);box(cloth,s*.42,1.07,.02,.19,.18,.20);}
 for(let i=0;i<7;i++)box(cloth,(i-3)*.092,1.34,-.275-Math.cos(i*2)*.025,.103,1.21+(i%3)*.055,.04);
 return g;
}
