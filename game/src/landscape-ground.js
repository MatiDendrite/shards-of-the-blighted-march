import {WATER_Y} from './geography.js';

const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
// Cosmetic moisture uses both the shore distance and the actual terrain height.
// It cannot alter the shared terrain/collision field or wet an elevated cliff.
export function groundMoisture(distance,height){
 return (1-smooth(.65,3.8,distance))*(1-smooth(.25,1.65,height-WATER_Y));
}

export function patchGroundSurface(shader,meadow,stone){
 shader.uniforms.uMeadow={value:meadow};shader.uniforms.uRock={value:stone};
 shader.vertexShader=`attribute float meadowWeight; attribute float sandWeight; attribute float rockWeight; attribute float wetWeight;
 varying vec4 vLandscapeWeights; varying vec3 vLandscapePoint;\n`+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vLandscapeWeights=vec4(meadowWeight,sandWeight,rockWeight,wetWeight);
 vLandscapePoint=(modelMatrix*vec4(position,1.0)).xyz;`);
 shader.fragmentShader=`uniform sampler2D uMeadow; uniform sampler2D uRock;
 varying vec4 vLandscapeWeights; varying vec3 vLandscapePoint;
 float landscapeNoise(vec2 p){
  vec2 cell=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  vec4 h=fract(sin(vec4(dot(cell,vec2(127.1,311.7)),dot(cell+vec2(1.0,0.0),vec2(127.1,311.7)),dot(cell+vec2(0.0,1.0),vec2(127.1,311.7)),dot(cell+1.0,vec2(127.1,311.7))))*43758.5453);
  return mix(mix(h.x,h.y,f.x),mix(h.z,h.w,f.x),f.y);
 }
 float landscapeBlend(float weight,float detail){
  float w=clamp(weight,0.0,1.0);
  return clamp(w+(detail-.5)*.8*w*(1.0-w),0.0,1.0);
 }\n`+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
 vec2 land=vLandscapePoint.xz;
 float macro=landscapeNoise(land*.19);
 vec4 soilTex=texture2D(map,vMapUv);
 vec4 meadowTex=texture2D(uMeadow,vMapUv*.78);
 // A broad second sample interrupts the small repeat without another bitmap.
 vec3 broadGrass=texture2D(uMeadow,land*.055+vec2(.31,.67)).rgb;
 meadowTex.rgb=mix(meadowTex.rgb,broadGrass,.18)*mix(.88,1.08,macro);
 vec4 rockTex=texture2D(uRock,vMapUv*.62);
 float grassMix=landscapeBlend(vLandscapeWeights.x,macro);
 float rockMix=landscapeBlend(vLandscapeWeights.z,rockTex.g);
 float sandMix=landscapeBlend(vLandscapeWeights.y,macro);
 float sandDetail=1.0-smoothstep(.015,.1,length(fwidth(land)));
 float ripple=sin(land.y*19.0+sin(land.x*2.3)*1.2);
 vec3 sandColor=vec3(.73,.61,.43)*(mix(.93,1.04,macro)+ripple*.025*sandDetail);
 vec4 surfaceTex=mix(soilTex,meadowTex,grassMix);
 surfaceTex=mix(surfaceTex,rockTex,rockMix);
 surfaceTex=mix(surfaceTex,vec4(sandColor,1.0),sandMix);
 float damp=clamp(vLandscapeWeights.w,0.0,1.0);
 surfaceTex.rgb*=mix(vec3(1.0),vec3(.57,.62,.65),damp);
 diffuseColor*=surfaceTex;
 `);
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor=mix(roughnessFactor,.48,clamp(vLandscapeWeights.w,0.0,1.0));`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 // Filter fine sand relief in the distance to avoid a sparkling shoreline.
 vec2 sandSlope=vec2(cos(land.x*2.3)*2.76,19.0)*cos(land.y*19.0+sin(land.x*2.3)*1.2)*.0018*sandDetail;
 normal=normalize(normal+mat3(viewMatrix)*vec3(-sandSlope.x,0.0,-sandSlope.y)*sandMix);
 `);
}
