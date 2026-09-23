import * as T from 'three';

// Photograph the actual constructor models once, using the existing WebGL context.
// No downloaded icons, new geometry, per-frame preview scene or extra renderer.
export function createItemPortraits(renderer, models) {
  const width=256,height=320;
  const target=new T.WebGLRenderTarget(width,height,{depthBuffer:true});
  target.texture.colorSpace=T.SRGBColorSpace;
  const prior={target:renderer.getRenderTarget(),viewport:renderer.getViewport(new T.Vector4()),scissor:renderer.getScissor(new T.Vector4()),scissorTest:renderer.getScissorTest(),color:renderer.getClearColor(new T.Color()),alpha:renderer.getClearAlpha(),autoClear:renderer.autoClear};
  const scene=new T.Scene();
  scene.add(new T.HemisphereLight(0xe9efff,0x766247,3));
  for(const [x,y,z,power] of [[-3,4,5,5],[3,1,-2,4]]){const light=new T.DirectionalLight(0xffedd0,power);light.position.set(x,y,z);scene.add(light);}
  const camera=new T.OrthographicCamera(-1,1,1,-1,.01,50);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d'),pixels=new Uint8Array(width*height*4),urls={};
  try {
    renderer.setRenderTarget(target);renderer.setViewport(0,0,width,height);renderer.setScissorTest(false);renderer.setClearColor(0x000000,0);renderer.autoClear=true;
    for(const [kind,source] of Object.entries(models)){
      const person=kind==='armor'||kind==='character',model=source.clone(true);model.position.set(0,0,0);model.rotation.set(0,person?.24:-.3,person?0:-.36);model.scale.setScalar(1);
      model.traverse(o=>{if(o.name==='heroWeaponMount')o.visible=false;});
      const box=new T.Box3().setFromObject(model),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
      model.position.sub(center);scene.add(model);
      const half=Math.max(size.y/2,size.x/2/(width/height))*1.13;
      camera.left=-half*width/height;camera.right=half*width/height;camera.top=half;camera.bottom=-half;camera.position.set(0,0,8);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
      renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
      const frame=context.createImageData(width,height);
      for(let y=0;y<height;y++)frame.data.set(pixels.subarray((height-y-1)*width*4,(height-y)*width*4),y*width*4);
      context.putImageData(frame,0,0);urls[kind]=canvas.toDataURL('image/png');scene.remove(model);
    }
  } finally {
    renderer.setRenderTarget(prior.target);renderer.setViewport(prior.viewport);renderer.setScissor(prior.scissor);renderer.setScissorTest(prior.scissorTest);renderer.setClearColor(prior.color,prior.alpha);renderer.autoClear=prior.autoClear;target.dispose();
  }
  return urls;
}
