// Secondary motion is cosmetic and evaluated from simulation time, never
// integrated from frame delta. Repeating a paused frame cannot drift a joint.
export function createActorSecondaryMotion(root){
 const cloth=['mantle','scarfLeft','scarfRight'].map(name=>root.getObjectByName(name)).filter(Boolean).map(node=>({node,rest:node.rotation.clone()}));
 const jaw=root.getObjectByName('jaw'),tail=root.getObjectByName('tail'),jawRest=jaw?.rotation.clone(),tailRest=tail?.rotation.clone();
 return (time,{gait=0,windup=0,recovery=0}={})=>{
  const t=Number.isFinite(time)?time:0,movement=Math.max(0,Math.min(1,gait));
  cloth.forEach(({node,rest},i)=>{
   node.rotation.copy(rest);node.rotation.x+=.035+movement*.075+Math.sin(t*2.1+i*.9)*(.012+movement*.018);
   node.rotation.z+=Math.sin(t*1.65+i*1.7)*(.012+movement*.019);
  });
  if(jaw){jaw.rotation.copy(jawRest);jaw.rotation.x+=Math.max(0,Math.min(1,windup))*.16+Math.max(0,Math.min(1,recovery))*.30;}
  if(tail){tail.rotation.copy(tailRest);tail.rotation.z+=Math.sin(t*2.8)*(.035+movement*.075);}
 };
}
