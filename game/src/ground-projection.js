import * as T from 'three';

// Call only with privately owned geometry. Original vertices are retained once;
// pooled rings never accumulate deformation or mutate a shared source template.
const originals=new WeakMap(),point=new T.Vector3(),inverse=new T.Matrix4();
export function drapeGround(mesh,heightAt,lift=.1){
 const geometry=mesh.geometry,p=geometry.attributes.position;
 if(!originals.has(geometry))originals.set(geometry,p.array.slice());
 const source=originals.get(geometry);mesh.updateWorldMatrix(true,false);inverse.copy(mesh.matrixWorld).invert();
 for(let i=0;i<p.count;i++){point.fromArray(source,i*3).applyMatrix4(mesh.matrixWorld);point.y=heightAt(point.x,point.z)+lift;point.applyMatrix4(inverse);p.setXYZ(i,point.x,point.y,point.z);}
 p.needsUpdate=true;geometry.computeBoundingSphere();
}
export function alignToGround(root,gradient,yaw=0){
 const normal=new T.Vector3(-gradient.x,1,-gradient.z).normalize();
 root.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),yaw).premultiply(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),normal));
}
