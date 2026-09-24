// Original constructor-built ground cover. Opaque double-sided leaf geometry,
// not alpha cards or imported meshes. All placements share these small buffers.
export function bankPlantGeometry(T,kind){
 if(kind==='pebbles'){
  const geo=new T.IcosahedronGeometry(1,0);geo.scale(.16,.085,.12);geo.translate(0,.05,0);
  const p=geo.attributes.position,colors=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){const shade=.6+p.getY(i)*1.5;colors.set([shade*.92,shade,shade*.97],i*3);}
  geo.setAttribute('color',new T.BufferAttribute(colors,3));return geo;
 }
 if(!['fern','reeds','dune'].includes(kind))throw Error(`Unknown bank plant: ${kind}`);
 const positions=[],colors=[];
 const tri=(a,b,c,color)=>{for(const p of [a,b,c]){positions.push(...p);colors.push(...color);}};
 const leaf=(a,b,width,color)=>{
  const dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz)||1;
  const mid=[a[0]+dx*.52,(a[1]+b[1])*.5+.028,a[2]+dz*.52],left=[mid[0]-dz/len*width,mid[1],mid[2]+dx/len*width],right=[mid[0]+dz/len*width,mid[1]-.013,mid[2]-dx/len*width];
  tri(a,left,b,color);tri(a,b,right,color.map(v=>v*.86));
 };
 if(kind==='fern')for(let frond=0;frond<7;frond++){
  const angle=frond*2.399963,length=.46+(frond%3)*.065,c=Math.cos(angle),s=Math.sin(angle);
  const point=t=>[c*length*t,.025+Math.sin(t*Math.PI*.8)*(.29+(frond%2)*.09),s*length*t];
  for(let j=0;j<3;j++)leaf(point(j/3),point((j+1)/3),.008,[.22,.34,.10]);
  for(let j=1;j<=4;j++)for(const side of [-1,1]){
   const t=j/5,a=point(t),span=.13*(1-t*.68),b=[a[0]+c*.065-s*span*side,a[1]-.035,a[2]+s*.065+c*span*side];
   leaf(a,b,.049*(1-t*.45),[.32+t*.11,.48+t*.12,.13+t*.07]);
  }
 }
 if(kind==='dune')for(let blade=0;blade<9;blade++){
  const angle=blade*2.399963,h=.43+(blade%4)*.08,c=Math.cos(angle),s=Math.sin(angle);
  leaf([c*.05,0,s*.05],[c*.31,h,s*.31],.025,[.54,.53,.32]);
 }
 if(kind==='reeds')for(let stem=0;stem<4;stem++){
  const angle=stem*2.399963,x=Math.cos(angle)*.12,z=Math.sin(angle)*.12,h=.7+stem*.105;
  for(let face=0;face<2;face++){
   const a=angle+face*Math.PI/2,dx=Math.cos(a)*.012,dz=Math.sin(a)*.012;
   tri([x-dx,0,z-dz],[x+dx,0,z+dz],[x-dx,h,z-dz],[.36,.43,.17]);
   tri([x+dx,0,z+dz],[x+dx,h,z+dz],[x-dx,h,z-dz],[.42,.49,.21]);
  }
  for(const side of [-1,1])leaf([x,h*.35,z],[x+Math.cos(angle)*.3*side,h*.61,z+Math.sin(angle)*.3*side],.03,[.42,.51,.22]);
  for(let face=0;face<5;face++){
   const a=face*Math.PI*2/5,b=(face+1)*Math.PI*2/5,r=.027;
   const p=[x+Math.cos(a)*r,h-.17,z+Math.sin(a)*r],q=[x+Math.cos(b)*r,h-.17,z+Math.sin(b)*r],u=[q[0],h,q[2]],v=[p[0],h,p[2]];
   tri(p,q,u,[.28,.18,.09]);tri(p,u,v,[.33,.22,.12]);
  }
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();return geo;
}
export default function generate(T){const root=new T.Group();root.add(new T.Mesh(bankPlantGeometry(T,'fern'),new T.MeshStandardMaterial({color:0x9eaf83,vertexColors:true,roughness:.94,side:T.DoubleSide})));return root;}
