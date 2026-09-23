// Shared rigid structure sites. Terrain grading and scenery use the same plan.
export function buildingSites(region){
 const houses=[
  [[-12,-3,1],[12,-3,1],[-12,17,1.05],[12,20,.9],[-7,-7,.78],[7,25,.85],[-9,29,.8],[14,30,.72]],
  [[-12,-3,.83],[12,-3,.8],[-12,19,.9],[12,22,.8],[-8,29,.72],[9,31,.7]],
  [[-13,-3,.85],[13,-3,.9],[-12,19,.9],[12,23,.75],[-9,30,.7]],
  [[-12,-3,.85],[12,-3,.85],[-12,20,.8],[12,23,.78]],
 ][region].map(([x,z,scale])=>({kind:'house',x,z,scale,rotation:x<0?Math.PI/2:-Math.PI/2}));
 const sites=[...houses,{kind:'stall',x:7,z:-2,scale:.95,rotation:0},{kind:'stall',x:-7,z:17,scale:.9,rotation:Math.PI/2},{kind:'well',x:3,z:7,scale:.85,rotation:0}];
 for(const side of [-1,1])sites.push({kind:'house',x:side*27,z:40,scale:.7,rotation:side<0?Math.PI/2:-Math.PI/2},{kind:'stall',x:side*32,z:45,scale:.8,rotation:0});
 const extras=[[['house',-56,17,.62,Math.PI/2],['stall',-56,-33,.7,0]],[['house',56,22,.6,-Math.PI/2],['stall',56,27,.65,0]],[['stall',47,17,.85,-Math.PI/2],['house',47,-14,.65,-Math.PI/2]],[]][region];
 return [...sites,...extras.map(([kind,x,z,scale,rotation])=>({kind,x,z,scale,rotation}))];
}
export function gateSites(region){return [[0,-53,0],[-23,8,Math.PI/2],[23,8,Math.PI/2],[-36,-24,0],[36,-24,0],[0,-15,0],[0,31,0],...(region===3?[[-18,-38,Math.PI/2],[18,-38,Math.PI/2]]:[])].map(([x,z,rotation])=>({x,z,rotation}));}
