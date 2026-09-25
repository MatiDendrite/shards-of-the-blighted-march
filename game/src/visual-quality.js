export const VISUAL_PROFILES=Object.freeze({
 low:Object.freeze({pixelRatio:1,shadowSize:1024}),
 high:Object.freeze({pixelRatio:1.5,shadowSize:2048}),
});

export function applyVisualQuality(renderer,rig,profile='low',deviceRatio=1){
 const key=Object.hasOwn(VISUAL_PROFILES,profile)?profile:'low',settings=VISUAL_PROFILES[key];
 const dpr=Number.isFinite(deviceRatio)&&deviceRatio>0?deviceRatio:1;
 renderer.setPixelRatio(Math.min(dpr,settings.pixelRatio));
 const size=Math.min(renderer.capabilities.maxTextureSize||settings.shadowSize,settings.shadowSize);
 const lights=rig.csm?.lights||[rig.sun];
 for(const light of lights){
  const shadow=light?.shadow;if(!shadow||shadow.mapSize.x===size&&shadow.mapSize.y===size)continue;
  shadow.map?.dispose();shadow.mapPass?.dispose();shadow.map=null;shadow.mapPass=null;
  shadow.mapSize.set(size,size);shadow.needsUpdate=true;
 }
 if(rig.csm)rig.csm.shadowMapSize=size;
 renderer.shadowMap.needsUpdate=true;
 return key;
}
