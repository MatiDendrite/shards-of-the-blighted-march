import * as T from 'three';

// One analytic soft-particle draw for chimney wisps. No image downloads or extra lights.
export function createLandscapeEffects(scene,props,region){
 const chimneys=props.filter(p=>p.kind==='house'),count=chimneys.length*7,positions=new Float32Array(count*3),sizes=new Float32Array(count),alpha=new Float32Array(count);
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('puffSize',new T.BufferAttribute(sizes,1));geo.setAttribute('puffAlpha',new T.BufferAttribute(alpha,1));
 const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{smokeColor:{value:new T.Color(region===2?0xaaa28e:0xa5b1ab)}},vertexShader:'attribute float puffSize; attribute float puffAlpha; varying float vAlpha; void main(){vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=min(48.0,puffSize*240.0/max(1.0,-mv.z)); vAlpha=puffAlpha*clamp((60.0+mv.z)/30.0,0.0,1.0);}',fragmentShader:'uniform vec3 smokeColor; varying float vAlpha; void main(){float radius=length(gl_PointCoord-vec2(.5))*2.0; float fade=1.0-smoothstep(.2,1.0,radius); gl_FragColor=vec4(smokeColor,vAlpha*fade);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n }'});
 const smoke=new T.Points(geo,mat);smoke.frustumCulled=false;scene.add(smoke);let clock=0;
 function update(dt){clock+=Math.min(dt,.1);let n=0;for(let h=0;h<chimneys.length;h++){const p=chimneys[h],c=Math.cos(p.rotation),s=Math.sin(p.rotation);for(let i=0;i<7;i++){const t=(clock*.12+i/7+h*.17)%1,x=1.6*p.sx,z=-.9*p.sz;positions[n*3]=p.x+x*c+z*s+t*1.2;positions[n*3+1]=(p.y||0)+6.55*p.sy+t*2.3;positions[n*3+2]=p.z-x*s+z*c+Math.sin(t*4+h)*.17;sizes[n]=.3+t*.9;alpha[n]=Math.sin(t*Math.PI)*.12;n++;}}geo.attributes.position.needsUpdate=true;geo.attributes.puffSize.needsUpdate=true;geo.attributes.puffAlpha.needsUpdate=true;}
 update(0);return {update};
}
