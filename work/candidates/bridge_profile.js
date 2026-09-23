// Independent stone-profile strategy with a timber deck and parapet piers.
export default function generate(T){
 const g=new T.Group(),stone=Object.assign(new T.MeshStandardMaterial({color:0x777d72,roughness:1}),{name:'stone'}),wood=Object.assign(new T.MeshStandardMaterial({color:0x584334,roughness:.94}),{name:'timber'});
 const box=(w,h,d,x,y,z,m)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);};
 const profile=new T.Shape();profile.moveTo(-4.4,0);profile.lineTo(-3.5,0);profile.quadraticCurveTo(0,1.6,3.5,0);profile.lineTo(4.4,0);profile.lineTo(4.4,1.22);profile.lineTo(-4.4,1.22);profile.closePath();
 for(const x of [-1.85,1.85]){const geo=new T.ExtrudeGeometry(profile,{depth:.45,steps:1,curveSegments:12,bevelEnabled:false});geo.rotateY(Math.PI/2);geo.translate(x-.225,0,0);g.add(new T.Mesh(geo,stone));}
 for(let i=0;i<29;i++)box(4.1,.12,.285,0,1.28,-4.2+i*.3,wood);
 for(const x of [-2,2])for(let i=0;i<9;i++){box(.35,.9,.32,x,1.79,-4+i,stone);box(.5,.14,.45,x,2.31,-4+i,stone);if(i<8)box(.2,.16,.75,x,2.15,-3.5+i,wood);}
 return g;
}
