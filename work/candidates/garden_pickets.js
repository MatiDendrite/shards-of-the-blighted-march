export default function generate(T){
 const g=new T.Group(),wood=Object.assign(new T.MeshStandardMaterial({color:0x655642,roughness:1}),{name:'timber'}),stone=Object.assign(new T.MeshStandardMaterial({color:0x999883,roughness:1}),{name:'stone'}),foliage=Object.assign(new T.MeshStandardMaterial({color:0x566e41,roughness:1}),{name:'foliage'});
 const add=(geo,mat,x,y,z)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m;};
 for(let i=0;i<7;i++){add(new T.BoxGeometry(.48,.3,.46),stone,(i-3)*.51,.15,0);add(new T.BoxGeometry(.09,.68,.11),wood,(i-3)*.51,.64,0);add(new T.ConeGeometry(.064,.13,4),wood,(i-3)*.51,1.04,0).rotation.y=Math.PI/4;}
 for(const y of [.46,.86])add(new T.BoxGeometry(3.5,.08,.09),wood,0,y,-.02);
 for(let i=0;i<8;i++)add(new T.SphereGeometry(.18,6,4),foliage,(i-3.5)*.39,.14,i%2?.33:-.33).scale.y=.6;return g;
}
