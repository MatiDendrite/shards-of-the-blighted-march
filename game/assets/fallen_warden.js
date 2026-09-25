// Standalone ceremonial armour: curved forged shells and a thick torn mantle.
export default function generate(T){
 const root=new T.Group(),joints={};root.userData.compactActorPalette=true;root.userData.compactActorFabric=true;
 const mat=(name,color,roughness=.6,metalness=0)=>Object.assign(new T.MeshStandardMaterial({color,roughness,metalness}),{name});
 const iron=mat('metal',0x4d5661,.44,.72),edge=mat('metal',0xaca48a,.44,.72),black=mat('fabric',0x22282a),cloth=mat('fabric',0x50334f,.95),leather=mat('leather',0x372d28),rune=mat('rune',0xb294cd,.4,.25);rune.emissive.setHex(0x503563);rune.emissiveIntensity=.65;
 const put=(p,geo,m,x=0,y=0,z=0)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);p.add(o);return o;};
 function joint(name,x,y,z,parent=root){const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);joints[name]=g;return g;}
 function plate(p,m,points,depth,x,y,z){const s=new T.Shape();points.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.008,bevelThickness:.007,bevelSegments:1,steps:1});geo.translate(0,0,-depth/2);return put(p,geo,m,x,y,z);}
 const ell=(p,m,x,y,z,a,b,c)=>{const o=put(p,new T.SphereGeometry(1,12,8),m,x,y,z);o.scale.set(a,b,c);return o;};
 const cord=(p,m,points,r=.006)=>put(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),16,r,5,false),m);
 function shell(p,m,rows,{n=24,start=0,arc=Math.PI*2,thick=0,fold=0,name=''}={}){
  const pos=[],uv=[],col=[],idx=[],stride=n+1,count=rows.length*stride;
  for(let layer=0;layer<(thick?2:1);layer++)for(let j=0;j<rows.length;j++)for(let i=0;i<=n;i++){
   const [y,w,f,b,off=0]=rows[j],a=start+arc*i/n,ripple=fold*Math.cos(a*11)*(1-j/rows.length),inset=layer*thick;
   pos.push(Math.sin(a)*(w+ripple-inset),y-(j===0&&fold?Math.abs(Math.sin(a*5))*.09:0),off+Math.cos(a)*((Math.cos(a)>=0?f:b)+ripple-inset));uv.push(i/n,j/(rows.length-1));const c=layer?.64:.9+Math.cos(a*2)*.035;col.push(c,c,c);
   if(j&&i){const a=layer*count+(j-1)*stride+i-1,b=a+stride;idx.push(...(layer?[a,b,a+1,a+1,b,b+1]:[a,a+1,b,a+1,b+1,b]));}
  }
  if(thick){const rim=(a,b)=>idx.push(a,b,a+count,b,b+count,a+count);for(let i=0;i<n;i++){rim(i+1,i);const a=(rows.length-1)*stride+i;rim(a,a+1);}if(arc<Math.PI*2)for(let j=0;j<rows.length-1;j++){const a=j*stride;rim(a,a+stride);rim(a+stride+n,a+n);}}
  else for(const j of [0,rows.length-1]){const c=pos.length/3;pos.push(0,rows[j][0],rows[j][4]||0);uv.push(.5,j?1:0);col.push(1,1,1);for(let i=0;i<n;i++){const a=j*stride+i;idx.push(...(j?[c,a,a+1]:[c,a+1,a]));}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
  if(arc===Math.PI*2){const normals=g.attributes.normal,v=new T.Vector3();for(let layer=0;layer<(thick?2:1);layer++)for(let j=0;j<rows.length;j++){const a=layer*count+j*stride,b=a+n;v.set(normals.getX(a)+normals.getX(b),normals.getY(a)+normals.getY(b),normals.getZ(a)+normals.getZ(b)).normalize();normals.setXYZ(a,v.x,v.y,v.z);normals.setXYZ(b,v.x,v.y,v.z);}}
  m.vertexColors=true;m.side=T.DoubleSide;const mesh=put(p,g,m);mesh.name=name;return mesh;
 }
 const torso=joint('torso',0,1.55,0);
 shell(torso,black,[[-.22,.26,.18,.19],[.05,.29,.22,.21],[.32,.35,.24,.22],[.48,.25,.17,.17],[.55,.095,.083,.08]],{n:24,name:'warden-undercoat'});
 shell(torso,iron,[[-.07,.285,.219,.208],[.06,.32,.26,.23],[.24,.365,.279,.25],[.39,.377,.256,.227],[.49,.27,.164,.17],[.55,.12,.10,.102]],{n:32,name:'warden-cuirass'});
 for(const s of [-1,1]){
  cord(torso,edge,[[s*.075,.47,.17],[s*.18,.38,.239],[s*.255,.19,.205],[s*.19,.05,.226]],.008);
  cord(torso,edge,[[s*.06,.44,-.18],[s*.23,.28,-.213],[s*.20,.06,-.212]],.008);
 }
 for(let i=0;i<2;i++)shell(torso,iron,[[-.22+i*.09,.285,.20,.21],[-.15+i*.09,.30,.222,.217],[-.095+i*.09,.286,.209,.21]],{n:24,thick:.012,name:'warden-waistLame'+i});
 for(const s of [-1,1]){
  for(let row=0;row<2;row++){const tasset=plate(torso,iron,[[-.12,.09],[.12,.09],[.13,-.065],[0,-.115],[-.13,-.065]],.045,s*.20,-.25-row*.14,.18+row*.025);tasset.rotation.y=s*.22;}
 }
 const belt=put(torso,new T.CylinderGeometry(.315,.32,.09,14),leather,0,-.03,0);belt.scale.z=.72;
 plate(torso,edge,[[-.068,0],[0,.072],[.068,0],[0,-.072]],.036,0,-.03,.26);
 const mantle=joint('mantle',0,.33,-.265,torso);
 shell(mantle,cloth,[[-1.16,.455,.035,.20],[-1.02,.45,.032,.18],[-.75,.43,.03,.13],[-.43,.34,.025,.09],[-.18,.265,.023,.05],[.055,.15,.021,.015]],{n:30,start:Math.PI/2,arc:Math.PI,thick:.014,fold:.014,name:'warden-tornMantle'});
 const thread=mat('fabric',0x9b869c,1);
 for(const s of [-1,1]){cord(mantle,thread,[[0,-.19,-.064],[s*.16,-.42,-.09],[0,-.72,-.154]],.008);cord(mantle,thread,[[s*.15,-.05,-.034],[s*.265,-.42,-.066],[s*.355,-1.07,-.126]],.009);}
 for(const s of [-1,1])ell(torso,edge,s*.255,.47,.19,.047,.047,.024);
 const head=joint('head',0,2.22,0);ell(head,black,0,.035,0,.173,.236,.17);
 const profile=[new T.Vector2(.178,-.13),new T.Vector2(.191,.07),new T.Vector2(.14,.24),new T.Vector2(.025,.37),new T.Vector2(0,.39)];put(head,new T.LatheGeometry(profile,16),iron);
 for(const s of [-1,1]){
  plate(head,iron,[[-.069,.05],[.072,.03],[.068,-.21],[-.023,-.28],[-.065,-.15]],.043,s*.088,-.035,.16);
  const eye=put(head,new T.BoxGeometry(.104,.019,.018),rune,s*.085,.015,.194);eye.rotation.z=-s*.12;
  for(let k=0;k<3;k++)put(head,new T.BoxGeometry(.016,.032,.01),black,s*(.038+k*.036),-.094,.190);
  const fin=plate(head,edge,[[-.07,0],[0,.25],[.055,.07],[.04,-.12]],.035,s*.16,.15,-.015);fin.rotation.y=s*.45;
 }
 plate(head,edge,[[-.018,.18],[.018,.18],[.023,-.18],[0,-.24],[-.023,-.18]],.02,0,0,.207);
 for(const s of [-1,1]){
  const leg=joint(s<0?'leftLeg':'rightLeg',s*.185,1.22,0);shell(leg,black,[[-.49,.107,.12,.12],[-.29,.14,.135,.14],[.075,.143,.143,.13]],{n:18});
  const skirt=shell(leg,cloth,[[-.42,.34,.231,.22],[-.18,.31,.214,.20],[.12,.285,.194,.19]],{n:16,start:s<0?Math.PI+.12:.12,arc:Math.PI-.24,thick:.012,fold:.006,name:s<0?'warden-leftSkirt':'warden-rightSkirt'});skirt.position.x=-s*.185;
  const shin=joint(s<0?'leftShin':'rightShin',0,-.49,0,leg);
  shell(shin,leather,[[-.58,.095,.098,.094],[-.34,.12,.119,.12],[.02,.12,.117,.113]],{n:18});
  shell(shin,iron,[[-.54,.097,.12,.097],[-.36,.139,.145,.127],[-.13,.15,.171,.137],[.025,.127,.148,.113],[.07,.06,.075,.08]],{n:24,start:-1.65,arc:3.3,thick:.012,name:'warden-greave'});
  cord(shin,edge,[[0,-.52,.126],[0,-.29,.159],[0,-.08,.169],[0,.055,.103]],.007);
  shell(shin,iron,[[-.7145,.122,.286,.106],[-.68,.139,.29,.11],[-.60,.135,.258,.102],[-.53,.093,.124,.097]],{n:20,name:'warden-sabatons'});
  const arm=joint(s<0?'leftArm':'rightArm',s*.43,1.98,0);shell(arm,black,[[-.37,.103,.11,.103],[-.20,.13,.135,.129],[.05,.12,.117,.11]],{n:18});
  for(let k=0;k<2;k++){
   shell(arm,iron,[[-.17-k*.11,.17,.169,.159],[-.055-k*.11,.222,.20,.18],[.065-k*.11,.19,.182,.16],[.13-k*.11,.12,.11,.108],[.16-k*.11,.014,.023,.02]],{n:24,name:'warden-pauldron'+s+'-'+k});
   cord(arm,edge,[[-.155,-.15-k*.11,.07],[0,-.17-k*.11,.17],[.155,-.15-k*.11,.07]],.008);
  }
  const fore=joint(s<0?'leftForearm':'rightForearm',0,-.36,0,arm);
  shell(fore,iron,[[-.30,.073,.08,.077],[-.22,.098,.11,.095],[-.07,.124,.126,.119],[.035,.117,.11,.103]],{n:22,name:'warden-vambrace'});
  shell(fore,leather,[[-.44,.057,.05,.04],[-.37,.085,.067,.049],[-.30,.057,.055,.04]],{n:18});
  for(let k=0;k<4;k++){const x=(k-1.5)*.034;cord(fore,leather,[[x,-.39,.048],[x,-.46,.075],[x,-.482,.03]],.016);put(fore,new T.BoxGeometry(.027,.053,.017),iron,x,-.407,.071);}
  cord(fore,leather,[[s*.071,-.32,.02],[s*.10,-.38,.05],[s*.063,-.424,.066]],.023);
 }
 // Inset heraldry and crown vanes distinguish the Warden from ordinary raiders.
 for(const s of [-1,1]){
  const arm=joints[s<0?'leftArm':'rightArm'];
  plate(arm,edge,[[-.10,.03],[0,.095],[.10,.03],[.07,-.07],[0,-.12],[-.07,-.07]],.012,0,.005,.172);
  plate(arm,iron,[[-.065,.02],[0,.058],[.065,.02],[0,-.077]],.014,0,.005,.184);
  const vane=plate(head,iron,[[-.04,-.08],[-.025,.12],[0,.20],[.035,.02],[.035,-.08]],.022,s*.13,.11,-.13);vane.rotation.z=-s*.25;
  for(let i=0;i<3;i++)put(torso,new T.BoxGeometry(.01,.08,.008),edge,s*(.13+i*.034),.22-i*.028,.264-i*.008).rotation.z=s*.35;
 }
 plate(torso,edge,[[-.063,0],[0,.082],[.063,0],[0,-.082]],.014,0,.28,.284);
 plate(torso,rune,[[-.025,0],[0,.045],[.025,0],[0,-.045]],.012,0,.28,.299);
 root.traverse(o=>{if(o.isMesh&&o.material.vertexColors&&!o.geometry.attributes.color)o.geometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(o.geometry.attributes.position.count*3).fill(1),3));});
 const box=new T.Box3(),v=new T.Vector3();root.updateMatrixWorld(true);root.traverse(n=>{const p=n.isMesh&&n.geometry.attributes.position;if(p)for(let i=0;i<p.count;i++)box.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(n.matrixWorld));});const c=box.getCenter(new T.Vector3());root.children.forEach(n=>{n.position.x-=c.x;n.position.y-=box.min.y;n.position.z-=c.z;});root.userData.joints=joints;return root;
}
