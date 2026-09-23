// Stable HUD nodes: identical text must not replace DOM children every frame.
export function createTextWriter(root=document){
 const nodes=new Map();
 return function text(selector,value){let node=nodes.get(selector);if(!node){node=root.querySelector(selector);if(!node)throw Error(`Missing HUD node: ${selector}`);nodes.set(selector,node);}const next=String(value);if(node.textContent!==next)node.textContent=next;};
}
