export default function generate(T){
 const g=new T.Group(),fur=Object.assign(new T.MeshStandardMaterial({color:0x444a48,roughness:1}),{name:'fabric'}),dark=Object.assign(new T.MeshStandardMaterial({color:0x252b2a,roughness:.95}),{name:'fabric'}),eye=new T.MeshStandardMaterial({color:0xefcd84,emissive:0xb58b35,emissiveIntensity:.7});
 const ell=(parent,m,x,y,z,a,b,c)=>{const o=new T.Mesh(new T.SphereGeometry(1,10,7),m);o.position.set(x,y,z);o.scale.set(a,b,c);parent.add(o);return o;};
 ell(g,fur,0,.72,-.03,.27,.32,.58);ell(g,fur,0,.84,.30,.32,.36,.29);
 const head=new T.Group();head.name='head';head.position.set(0,.99,.53);g.add(head);ell(head,fur,0,0,.05,.19,.19,.25);ell(head,fur,0,-.085,.28,.12,.09,.22);ell(head,dark,0,-.06,.44,.095,.065,.06);
 for(const side of [-1,1]){const ear=new T.Mesh(new T.ConeGeometry(.095,.25,4),dark);ear.position.set(side*.125,.20,.005);ear.rotation.z=-side*.12;head.add(ear);ell(head,eye,side*.143,.028,.21,.025,.023,.033);}
 for(const side of [-1,1])for(const front of [false,true]){const leg=new T.Group();leg.name=`${side<0?'left':'right'}${front?'Front':'Rear'}`;leg.position.set(side*.21,.65,front?.34:-.43);g.add(leg);ell(leg,fur,0,-.16,front?0:.04,.095,.24,.105);ell(leg,dark,0,-.42,front?.01:-.04,.055,.19,.06);ell(leg,fur,0,-.595,.06,.088,.055,.14);}
 const tail=new T.Group();tail.name='tail';tail.position.set(0,.74,-.56);tail.rotation.x=.65;g.add(tail);ell(tail,fur,0,-.25,-.08,.12,.34,.13);
 for(let i=0;i<12;i++){const tuft=new T.Mesh(new T.ConeGeometry(.10,.24,4),dark);tuft.position.set(Math.sin(i*2.4)*.20,.98-i*.014,.37-i*.07);tuft.rotation.x=-.7;g.add(tuft);}
 const bounds=new T.Box3(),v=new T.Vector3();g.updateMatrixWorld(true);g.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)bounds.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));});const c=bounds.getCenter(new T.Vector3());g.children.forEach(o=>{o.position.x-=c.x;o.position.y-=bounds.min.y;o.position.z-=c.z;});
 g.userData.joints={};g.traverse(o=>{if(o.isGroup&&o.name)g.userData.joints[o.name]=o;});return g;
}
