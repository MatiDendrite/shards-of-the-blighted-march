import * as T from 'three';
import {waterOutline,WATER_Y} from './geography.js';

// Code-native water: no external normal maps, large RTTs or reflection passes.
export function createGeographyView(scene,region){
 const outline=waterOutline(region),shape=new T.Shape();outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
 const geo=new T.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);
 const time={value:0},material=new T.MeshStandardMaterial({color:[0x41666a,0x3d6360,0x477a83,0x46576c][region],roughness:.32,metalness:.28});
 material.onBeforeCompile=shader=>{
  shader.uniforms.uWaterTime=time;
  shader.vertexShader='varying vec2 vWaterPoint;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWaterPoint=position.xz;');
  shader.fragmentShader='uniform float uWaterTime; varying vec2 vWaterPoint;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float wave=sin(vWaterPoint.x*2.4+vWaterPoint.y*.7+uWaterTime*.8)*sin(vWaterPoint.y*3.5-uWaterTime*.6);
   float longWave=sin(vWaterPoint.x*.6+vWaterPoint.y*.24-uWaterTime*.4);
   diffuseColor.rgb*=.9+wave*.10+longWave*.07;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal=normalize(normal+vec3(sin(vWaterPoint.x*2.4+uWaterTime)*.12,cos(vWaterPoint.y*3.5-uWaterTime)*.08,0.0));');
 };
 const mesh=new T.Mesh(geo,material);mesh.position.y=WATER_Y;mesh.receiveShadow=true;scene.add(mesh);
 // Broken foam/ripple strokes follow the same continuous shoreline as the map.
 const points=[];for(let i=1;i<outline.length;i++){
  if(i%4===0)continue;const [ax,az]=outline[i-1],[bx,bz]=outline[i];if(Math.hypot(bx-ax,bz-az)>4)continue;
  if(region===2&&ax>80)continue;points.push(ax,WATER_Y+.014,az,bx,WATER_Y+.014,bz);
 }
 const foam=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(points,3)),new T.LineBasicMaterial({color:0xc0d2be,transparent:true,opacity:.34}));scene.add(foam);
 return {update(dt){time.value+=Math.min(dt,.1);foam.material.opacity=.29+Math.sin(time.value*.8)*.07;}};
}
