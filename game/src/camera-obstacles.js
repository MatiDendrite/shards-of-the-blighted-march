import * as T from 'three';

// Read the authored model geometry once, before render-sector merging destroys
// object boundaries. Compound boxes preserve archways and spaces below roofs.
export function cameraTemplate(kind,root){
 root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root);
 if(kind==='pine'||kind==='hornbeam')return{bounds:new T.Box3(new T.Vector3(-.22,0,-.22),new T.Vector3(.22,Math.min(2.4,bounds.max.y*.45),.22)),parts:null};
 const compound=['house','gate','stall','well','bridge'].includes(kind),parts=[];
 if(compound)root.traverse(o=>{if(!o.isMesh)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();parts.push(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});
 return{bounds,parts:compound?parts:null,overhead:kind==='gate'};
}
export function placeCameraObstacle(template,prop){
 const matrix=new T.Matrix4().compose(new T.Vector3(prop.x,prop.y||0,prop.z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),prop.rotation),new T.Vector3(prop.sx,prop.sy,prop.sz));
 const bounds=template.bounds.clone().applyMatrix4(matrix);
 return{min:bounds.min,max:bounds.max,parts:template.parts?.map(b=>Object.assign(b.clone().applyMatrix4(matrix),{overhead:!!template.overhead}))||null};
}
