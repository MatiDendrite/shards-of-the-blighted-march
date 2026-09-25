// Standalone constructor-built cast. Each role has its own silhouette and props.
export default function generate(T){
 const root=new T.Group();root.userData.compactActorPalette=true;root.userData.compactActorFabric=true;
 const mat=(name,color,metalness=0)=>Object.assign(new T.MeshStandardMaterial({color,roughness:.85,metalness,side:T.DoubleSide}),{name});
 const iron=mat('metal',0x66717a,.65),brass=mat('metal',0xbda064,.65),hide=mat('leather',0x493126),sole=mat('leather',0x282a27),paper=mat('fabric',0xd3c09a),ink=mat('fabric',0x55483e);
 const put=(p,g,m,x=0,y=0,z=0,name='')=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.name=name;p.add(o);return o;};
 const ell=(p,m,x,y,z,a,b,c)=>{const o=put(p,new T.SphereGeometry(1,10,7),m,x,y,z);o.scale.set(a,b,c);return o;};
 const box=(p,m,x,y,z,a,b,c,name='')=>put(p,new T.BoxGeometry(a,b,c),m,x,y,z,name);
 const cord=(p,m,points,r=.006)=>put(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),12,r,5,false),m);
 // Closed cross-sections shape anatomy. Open garments include inner faces and rims.
 function loft(p,m,rows,{n=20,start=0,arc=Math.PI*2,thick=0,fold=0,x=0,z=0,name=''}={}){
  const pos=[],uv=[],indices=[],colors=[],stride=n+1,count=rows.length*stride;
  for(let layer=0;layer<(thick?2:1);layer++)for(let j=0;j<rows.length;j++)for(let i=0;i<=n;i++){
   const [y,w,f,b,offset=0]=rows[j],a=start+arc*i/n,wrinkle=fold*Math.sin(a*9+.4)*(1-j/rows.length),inset=layer*thick;
   pos.push(x+Math.sin(a)*(w+wrinkle-inset),y,z+offset+Math.cos(a)*((Math.cos(a)>=0?f:b)+wrinkle-inset));uv.push(i/n,j/(rows.length-1));const c=layer?.68:.92+Math.cos(a*2)*.035;colors.push(c,c,c);
   if(j&&i){const a=layer*count+(j-1)*stride+i-1,b=a+stride;indices.push(...(layer?[a,b,a+1,a+1,b,b+1]:[a,a+1,b,a+1,b+1,b]));}
  }
  if(thick){const rim=(a,b)=>indices.push(a,b,a+count,b,b+count,a+count);for(let i=0;i<n;i++){rim(i+1,i);const a=(rows.length-1)*stride+i;rim(a,a+1);}if(arc<Math.PI*2)for(let j=0;j<rows.length-1;j++){const a=j*stride;rim(a,a+stride);rim(a+stride+n,a+n);}}
  else for(const j of [0,rows.length-1]){const center=pos.length/3;pos.push(x,rows[j][0],z+(rows[j][4]||0));uv.push(.5,j?1:0);colors.push(1,1,1);for(let i=0;i<n;i++){const a=j*stride+i;indices.push(...(j?[center,a,a+1]:[center,a+1,a]));}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
  if(arc===Math.PI*2){const normals=g.attributes.normal,v=new T.Vector3();for(let layer=0;layer<(thick?2:1);layer++)for(let j=0;j<rows.length;j++){const a=layer*count+j*stride,b=a+n;v.set(normals.getX(a)+normals.getX(b),normals.getY(a)+normals.getY(b),normals.getZ(a)+normals.getZ(b)).normalize();normals.setXYZ(a,v.x,v.y,v.z);normals.setXYZ(b,v.x,v.y,v.z);}}
  m.vertexColors=true;return put(p,g,m,0,0,0,name);
 }
 const roles=['smith','merchant','elder','guide','raider'];
 for(const [index,role] of roles.entries()){
  const actor=new T.Group();actor.name=role;actor.position.x=(index-2)*2.2;actor.userData.role=role;root.add(actor);
  const enemy=role==='raider',smith=role==='smith',merchant=role==='merchant',elder=role==='elder',guide=role==='guide';
  const width=smith?1.2:merchant?1.02:elder?.88:guide?.92:1.04;
  const cloth=mat('fabric',smith?0x64645b:merchant?0x75483d:elder?0x50645c:guide?0x45576b:0x38473c),lining=mat('fabric',0x282f30),trim=mat('fabric',merchant?0xcfb078:0x9e9b7a),skin=mat('skin',smith?0xb59378:merchant?0xc6a288:elder?0xb3a18d:guide?0xb8987d:0x939780),hair=mat('hair',elder?0xa9a89c:smith?0x564b40:merchant?0x49332d:0x494336),eye=mat('eyes',enemy?0xa8bfa0:0x333c3c);eye.roughness=.82;
  const joint=(name,x,y,z,parent=actor,rigid=false)=>{const o=new T.Group();o.name=role+'-'+name;o.position.set(x,y,z);o.userData.rigid=rigid;parent.add(o);return o;};
  const torso=joint('torso',0,1.08,0),head=joint('head',0,1.65,enemy?.025:0),arms={};
  loft(torso,cloth,[[-.18,.19*width,.14,.14],[-.04,.19*width,.15,.14],[.13,.22*width,.175,.16],[.30,.24*width,.16,.15],[.39,.17*width,.11,.1],[.44,.065,.06,.06]],{fold:.003,name:role+'-fittedCoat'});
  loft(torso,skin,[[.38,.057,.058,.052],[.50,.057,.061,.057]],{n:16});
  for(const s of [-1,1]){
   const side=s<0?'left':'right',leg=joint(side+'Leg',s*.12*width,.90,0,actor,!enemy),shin=joint(side+'Shin',0,-.39,0,leg,!enemy);
   loft(leg,lining,[[-.40,.09,.096,.1],[-.18,.105,.10,.115],[.05,.11,.115,.11]],{n:16,fold:.003});
   loft(shin,hide,[[-.42,.066,.065,.065],[-.2,.086,.083,.08],[.02,.082,.077,.075]],{n:16});
   loft(shin,hide,[[-.49,.08,.20,.08],[-.46,.094,.205,.09],[-.40,.083,.17,.085],[-.35,.055,.066,.065]],{n:18});
   loft(shin,sole,[[-.51,.087,.206,.09],[-.488,.091,.209,.092]],{n:18});
   const arm=joint(side+'Arm',s*.28*width,1.4,0),fore=joint(side+'Forearm',0,-.27,0,arm,!enemy&&!smith);arms[side]={arm,fore};
   loft(arm,smith?skin:cloth,[[-.28,.077,.08,.08],[-.16,smith?.11:.10,.10,.1],[.005,.11,.108,.11],[.06,.063,.07,.07]],{n:18,fold:smith?0:.003});
   loft(fore,smith?skin:cloth,[[-.24,.049,.05,.05],[-.14,.079,.085,.075],[.02,.084,.082,.08]],{n:18,fold:smith?0:.003});
   loft(fore,hide,[[-.225,.062,.065,.064],[-.175,.079,.080,.078]],{n:16,thick:.005});
   loft(fore,skin,[[-.31,.042,.033,.025],[-.27,.051,.039,.03],[-.235,.037,.033,.028]],{n:16,z:.015});
   for(let f=0;f<4;f++){const x=(f-1.5)*.021;cord(fore,skin,[[x,-.285,.044],[x,-.328,.053],[x,-.352,.029]],.010);}
   cord(fore,skin,[[s*.036,-.25,.033],[s*.062,-.285,.049],[s*.04,-.319,.049]],.014);
  }
  // Face, projecting nose and lips remain visible from oblique game-camera angles.
  loft(head,skin,[[-.155,.037,.064,.046],[-.125,.074,.092,.065],[-.072,.098,.109,.09],[-.02,.115,.113,.11],[.042,.115,.1,.116],[.104,.108,.095,.113],[.159,.076,.073,.084],[.18,.012,.02,.025]],{n:24,name:role+'-face'});
  loft(head,skin,[[-.069,.022,.153,.1],[-.041,.022,.15,.1],[.02,.011,.112,.1]],{n:14});
  for(const s of [-1,1]){ell(head,skin,s*.117,-.018,0,.019,.037,.023);ell(head,eye,s*.048,.018,.11,.014,.006,.007);cord(head,hair,[[s*.025,.044,.112],[s*.052,.05,.111],[s*.073,.038,.097]],.0045);}
  cord(head,skin,[[-.025,-.098,.111],[0,-.102,.121],[.025,-.098,.111]],.005);
  loft(head,hair,[[.075,.122,.104,.127],[.13,.113,.104,.12],[.184,.068,.068,.074],[.194,.008,.012,.019]],{n:20});
  if(smith||elder){
   loft(head,hair,[[-(elder?.39:.235),.012,.06,.016],[-.20,.065,.109,.03],[-.12,.103,.115,.05],[-.06,.108,.084,.061]],{n:18,start:-1.55,arc:3.1,thick:.01,z:.02,name:role+'-beard'});
   for(const s of [-1,1])cord(head,hair,[[s*.014,-.074,.141],[s*.054,-.081,.133],[s*.077,-.106,.113]],.015);
  }
  loft(torso,hide,[[-.095,.208*width,.169,.159],[-.04,.211*width,.175,.16]],{n:22,thick:.007,name:role+'-belt'});box(torso,brass,0,-.065,.183,.061,.048,.013);
  if(smith){
   // The apron wraps the belly and drops between the knees; tools stay in its pocket.
   loft(torso,hide,[[-.53,.24,.18,.12],[-.30,.255,.2,.14],[-.07,.24,.19,.14],[.15,.19,.197,.13],[.31,.16,.162,.11]],{n:20,start:-1.4,arc:2.8,thick:.012,fold:.004,name:'smith-apron'});
   for(const s of [-1,1])cord(torso,hide,[[s*.15,.3,.16],[s*.12,.43,.055],[s*.15,.31,-.14]],.018);
   box(torso,hide,0,-.20,.218,.24,.15,.031,'smith-toolPocket');for(let i=0;i<3;i++)box(torso,iron,(i-1)*.065,-.105,.23,.023,.11,.022);
   const fore=arms.right.fore;box(fore,hide,0,-.29,.15,.035,.036,.34,'smith-hammerHandle');box(fore,iron,0,-.29,.35,.18,.12,.10,'smith-hammer');
   // Anvil is stationary in the actor's local workspace, not attached to an arm.
   loft(actor,hide,[[0,.22,.19,.19],[.10,.23,.21,.21],[.42,.18,.17,.17],[.57,.2,.19,.19]],{n:12,x:.33,z:.49,name:'smith-stump'});
   loft(actor,iron,[[.57,.21,.14,.14],[.61,.16,.10,.10],[.72,.10,.075,.075],[.81,.22,.12,.12],[.86,.23,.12,.12]],{n:12,x:.33,z:.49,name:'smith-anvil'});
   const horn=put(actor,new T.ConeGeometry(.09,.28,12),iron,.64,.805,.49);horn.rotation.z=-Math.PI/2;
   box(actor,iron,.33,.875,.49,.075,.027,.24,'smith-workpiece');
   arms.right.arm.rotation.x=-.28;head.rotation.x=.15;
  }else if(merchant){
   loft(torso,cloth,[[-.78,.27,.19,.20],[-.5,.25,.178,.18],[-.21,.23,.16,.17],[-.08,.21,.157,.15]],{n:26,fold:.008,thick:.009,name:'merchant-skirt'});
   loft(torso,trim,[[.18,.26,.185,.177],[.30,.25,.16,.15],[.40,.125,.093,.087]],{n:22,thick:.01,name:'merchant-shawl'});
   for(const s of [-1,1]){cord(head,hair,[[s*.109,.09,0],[s*.117,-.02,-.05],[s*.10,-.2,-.06],[s*.087,-.33,-.043]],.026);ell(head,brass,s*.13,-.066,.007,.018,.023,.007);}
   loft(head,cloth,[[.094,.138,.128,.136],[.15,.135,.13,.13],[.20,.076,.087,.08],[.211,.025,.04,.025]],{n:22,name:'merchant-cap'});
   const book=joint('ledger',0,-.29,.08,arms.left.fore,true);book.rotation.x=.22;box(book,hide,0,0,0,.26,.06,.21,'merchant-ledger');box(book,paper,0,.034,0,.237,.012,.19);
   for(let i=0;i<5;i++)box(book,ink,.01,.042,-.065+i*.027,.16,.002,.002);
   arms.left.arm.rotation.x=-1.15;arms.right.arm.rotation.x=-.85;arms.right.arm.rotation.z=-.20;
   box(arms.right.fore,brass,0,-.30,.048,.031,.031,.009,'merchant-coin');
   ell(torso,hide,.245,-.16,.015,.075,.10,.063);cord(torso,brass,[[.18,-.015,.09],[.25,-.12,.07],[.28,-.06,.045]],.006);
  }else if(elder){
   loft(torso,cloth,[[-.92,.25,.18,.19],[-.64,.245,.18,.18],[-.30,.215,.17,.17],[-.09,.206,.159,.153]],{n:26,fold:.01,thick:.01,name:'elder-robe'});
   loft(torso,lining,[[.02,.29,.19,.18],[.23,.27,.18,.17],[.39,.17,.13,.11],[.44,.08,.078,.067]],{n:22,thick:.012,name:'elder-cowl'});
   for(const s of [-1,1])cord(torso,trim,[[s*.12,.34,.155],[s*.14,.05,.193],[s*.115,-.37,.166],[s*.15,-.87,.149]],.011);
   arms.right.arm.rotation.x=-.30;
   // Staff parented to the hand: the whole grip moves together during a nod.
   cord(arms.right.fore,hide,[[0,-1.10,.05],[0,-.30,.065],[.02,.30,.085],[.055,.53,.10],[.018,.64,.10],[-.065,.63,.10]],.023);
   ell(arms.right.fore,brass,.01,.56,.10,.052,.064,.042);box(torso,brass,0,.13,.22,.07,.10,.013);
  }else if(guide){
   loft(torso,cloth,[[-.34,.25,.16,.18],[-.16,.23,.157,.16],[.02,.215,.157,.15]],{n:20,thick:.008,fold:.004});
   loft(torso,hide,[[.01,.226,.183,.18],[.22,.25,.185,.18],[.34,.20,.139,.13]],{n:22,start:.28,arc:Math.PI*2-.56,thick:.012,name:'guide-vest'});
   const pack=joint('pack',0,.05,-.23,torso,true);loft(pack,hide,[[-.19,.12,.068,.07],[-.12,.156,.085,.09],[.18,.15,.087,.084],[.23,.11,.06,.07]],{n:18});box(pack,brass,0,.1,-.09,.031,.041,.015);
   const roll=put(pack,new T.CylinderGeometry(.075,.075,.38,14),cloth,0,-.16,-.1);roll.rotation.z=Math.PI/2;
   for(const s of [-1,1])cord(torso,hide,[[s*.13,-.01,.17],[s*.17,.30,.13],[s*.15,.37,-.05],[s*.14,.18,-.29]],.014);
   cord(torso,hide,[[.23,-.25,-.1],[.39,.18,-.20],[.28,.62,-.20]],.022);cord(torso,trim,[[.23,-.25,-.1],[.29,.17,-.18],[.28,.62,-.20]],.003);
   loft(head,cloth,[[.08,.147,.13,.145],[.13,.151,.14,.14],[.21,.084,.077,.09],[.23,.015,.025,.027]],{n:20,name:'guide-hood'});
   loft(arms.left.fore,brass,[[-.32,.037,.036,.036],[-.30,.037,.037,.037]],{n:14,z:.06,name:'guide-compass'});arms.left.arm.rotation.x=-1.05;
  }else{
   // Patched hide, a lowered hood and one scavenged shoulder replace player armour.
   loft(torso,hide,[[-.11,.235,.175,.18],[.12,.25,.2,.185],[.31,.26,.18,.17],[.39,.16,.115,.11]],{n:24,thick:.009,name:'raider-jerkin'});
   for(const s of [-1,1]){const leg=actor.getObjectByName(role+'-'+(s<0?'leftLeg':'rightLeg'));loft(leg,cloth,[[-.31,.245,.182,.175],[-.12,.23,.175,.168],[.11,.207,.153,.15]],{n:12,start:s<0?Math.PI+.1:.1,arc:Math.PI-.2,thick:.009,fold:.009,x:-s*.12*width});}
   loft(head,cloth,[[-.20,.16,.103,.148],[-.03,.163,.15,.168],[.12,.143,.15,.163],[.23,.092,.09,.114],[.27,.013,.02,.035]],{n:26,start:.7,arc:Math.PI*2-1.4,thick:.015,name:'raider-hood'});
   loft(head,hide,[[-.16,.086,.096,.065],[-.085,.127,.145,.10],[.004,.131,.143,.112]],{n:14,start:-1.6,arc:3.2,thick:.008,name:'raider-mask'});
   loft(arms.left.arm,iron,[[-.14,.14,.135,.135],[-.04,.18,.16,.15],[.07,.135,.125,.12],[.11,.025,.032,.032]],{n:20,name:'raider-scavengedPauldron'});
   loft(arms.right.fore,hide,[[-.24,.065,.07,.065],[-.08,.09,.10,.085],[.03,.085,.083,.08]],{n:18});
   for(let i=0;i<5;i++)cord(torso,trim,[[-.06,.26-i*.05,.211],[.065,.23-i*.05,.216]],.004);
   const mantle=joint('mantle',0,.33,-.18,torso);loft(mantle,cloth,[[-.8,.27,.025,.13],[-.5,.25,.025,.11],[-.2,.19,.02,.07],[0,.11,.019,.03]],{n:20,start:Math.PI/2,arc:Math.PI,thick:.008,fold:.008,name:'raider-mantle'});
  }
  // Fold non-animated construction pivots into their parents, deepest first.
  const rigid=[];actor.traverse(o=>{if(o.isGroup&&o.userData.rigid)rigid.push(o);});for(const o of rigid.reverse()){o.updateMatrix();const parent=o.parent;for(const child of [...o.children]){child.applyMatrix4(o.matrix);parent.add(child);}parent.remove(o);}
  if(enemy)actor.scale.setScalar(1.85/1.92);
 }
 root.traverse(o=>{if(o.isMesh&&o.material.vertexColors&&!o.geometry.attributes.color)o.geometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(o.geometry.attributes.position.count*3).fill(1),3));});
 // Centre only the presentation bundle. Runtime extracts roles at their own origin.
 const bounds=new T.Box3().setFromObject(root,true),center=bounds.getCenter(new T.Vector3());for(const o of root.children){o.position.x-=center.x;o.position.z-=center.z;}root.position.y=-bounds.min.y;
 return root;
}
