import * as T from 'three';
import {riverX,coastX,WATER_Y} from './geography.js';

// Tessellation supports real displacement, with finer spacing near the shore.
// The shore and bridge datum still come from the physical geography contract.
export function waterGeometry(region){
 const positions=[],indices=[],across=region<2?12:region===2?48:16,along=region<2?320:region===2?260:96;
 for(let j=0;j<=along;j++)for(let i=0;i<=across;i++){
  const u=i/across,v=j/along;let x,z;
  // Extend beneath the graded bank so the visible boundary is its intersection
  // with terrain, not an exposed polygon edge (especially around the tarn).
  if(region<2){z=-80+160*v;x=riverX(region,z)+(u*2-1)*((region===0?2.6:2.2)+1.4);}
  else if(region===2){z=-260+520*v;const shore=coastX(z)-1.4;x=shore+(260-shore)*u*u;}
  else{const angle=v*Math.PI*2,r=.015+u*(8.4-.015);x=47+Math.cos(angle)*r;z=38+Math.sin(angle)*r;}
  positions.push(x,0,z);
 }
 for(let j=0;j<along;j++)for(let i=0;i<across;i++){
  const a=j*(across+1)+i,b=a+across+1;
  indices.push(a,b,a+1,b,b+1,a+1);
 }
 if(region===3){const center=positions.length/3;positions.push(47,0,38);for(let j=0;j<along;j++)indices.push(center,(j+1)*(across+1),j*(across+1));}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingBox();geo.boundingBox.expandByScalar(.15);geo.computeBoundingSphere();geo.boundingSphere.radius+=.15;return geo;
}

export function createGeographyView(scene,region){
 const time={value:0},sea=region===2;
 const distance=region<2?`abs(p.x-(${region===0?'-48.0+3.0':'49.0+2.0'}*sin((p.y-8.0)/15.0)))-${region===0?'2.6':'2.2'}`:sea?'53.0+1.4*sin(p.y*.085)-p.x':'length(p-vec2(47.0,38.0))-7.0';
 const waveCode=`
  uniform float uWaterTime;
  float shoreDistance(vec2 p){return ${distance};}
  vec3 wave(vec2 p,vec2 direction,float frequency,float speed,float amplitude){
   float phase=dot(p,direction)*frequency-uWaterTime*speed;
   return vec3(sin(phase)*amplitude,cos(phase)*amplitude*frequency*direction);
  }
  vec3 waterWaves(vec2 p){
   p+=vec2(sin(p.y*.41)*.46,cos(p.x*.37)*.38);
   return wave(p,vec2(.94,.34),1.7,1.1,${sea?'.055':'.025'})
     +wave(p,vec2(-.31,.95),2.9,${sea?'1.45':'2.3'},.022)
     +wave(p,vec2(.77,-.64),5.4,1.8,.008);
  }
  vec3 waterNoiseD(vec2 p){
   vec2 cell=floor(p),t=fract(p),f=t*t*(3.0-2.0*t),df=6.0*t*(1.0-t);
   vec4 h=fract(sin(vec4(dot(cell,vec2(127.1,311.7)),dot(cell+vec2(1,0),vec2(127.1,311.7)),dot(cell+vec2(0,1),vec2(127.1,311.7)),dot(cell+vec2(1,1),vec2(127.1,311.7))))*43758.5453);
   float crossTerm=h.w-h.z-h.y+h.x;
   return vec3(mix(mix(h.x,h.y,f.x),mix(h.z,h.w,f.x),f.y),(h.y-h.x+crossTerm*f.y)*df.x,(h.z-h.x+crossTerm*f.x)*df.y);
  }
  float waterNoise(vec2 p){return waterNoiseD(p).x;}
 `;
 const material=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.3,metalness:0,ior:1.333,envMapIntensity:.4});material.name='regional-water';
 material.onBeforeCompile=shader=>{
  shader.uniforms.uWaterTime=time;
  shader.uniforms.uDeepWater={value:new T.Color([0x234b43,0x294c3e,0x29565b,0x334d48][region])};
  shader.uniforms.uShallowWater={value:new T.Color([0x52756b,0x59705a,0x659088,0x627a73][region])};
  shader.vertexShader=waveCode+'varying vec2 vWaterPoint;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vWaterPoint=position.xz;
   transformed.y+=waterWaves(position.xz).x*smoothstep(0.0,1.2,.65-shoreDistance(position.xz));`);
  shader.fragmentShader=waveCode+'uniform vec3 uDeepWater; uniform vec3 uShallowWater; varying vec2 vWaterPoint;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float depth=max(0.0,.65-shoreDistance(vWaterPoint));
   vec2 flow=vWaterPoint+vec2(${sea?'-.12,.04':'.035,-.28'})*uWaterTime;
   float ripple=sin(flow.x*6.2+sin(flow.y*3.1))*sin(flow.y*5.7+sin(flow.x*2.8));
   float foamNoise=waterNoise(flow*3.5)*.65+waterNoise(flow*9.0)*.35;
   float lapping=sin(depth*7.0-uWaterTime*1.25+waterNoise(vWaterPoint*.9)*3.0);
   float foam=(1.0-smoothstep(.12,1.65,depth))*smoothstep(.25,.8,lapping)*smoothstep(.3,.68,foamNoise);
   foam+=exp(-depth*8.0)*smoothstep(.4,.7,foamNoise)*.25;
   vec3 waterColor=mix(uShallowWater,uDeepWater,smoothstep(.05,${sea?'5.0':'3.0'},depth));
   waterColor+=vec3(.06,.08,.055)*pow(max(0.0,ripple),5.0)*exp(-depth*.85);
   diffuseColor.rgb=mix(waterColor,vec3(.5,.57,.5),clamp(foam,0.0,.7));
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(.3,.65,clamp(foam,0.0,1.0));');
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec2 slope=waterWaves(vWaterPoint).yz;
   float detail=1.0-smoothstep(.06,.3,length(fwidth(vWaterPoint)));
   slope+=(waterNoiseD(flow*4.0).yz*.13+waterNoiseD(flow*9.0).yz*.055)*detail;
   slope*=smoothstep(0.0,1.2,depth);
   // Convert the world-space surface gradient to view-space before PBR.
   normal=normalize(mat3(viewMatrix)*normalize(vec3(-slope.x,1.0,-slope.y)));
  `);
 };
 material.customProgramCacheKey=()=>`shore-water-v2-${region}`;
 const mesh=new T.Mesh(waterGeometry(region),material);mesh.name='regional-water';mesh.position.y=WATER_Y;mesh.receiveShadow=true;scene.add(mesh);
 return {mesh,update(dt){time.value+=Math.min(dt,.1);}};
}
