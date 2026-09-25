import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RECIPES} from '../game/lib/surfaces.js';
import {propRecipe,applyPropSurfaces} from '../game/src/prop-surfaces.js';

// Same deterministic noise shape as the library: any smooth function in -1..1 works here.
const noise=(x,y)=>Math.sin(x*12.9898+y*78.233)*.7;

test('every coded prop material name maps onto a real surface recipe',()=>{
 for(const name of ['masonry','fabric','metal','gold','bark','straw','moss','seaweed','weeds','herb','soil','sand','ore','paint','bone','wax','mushroom'])assert.ok(RECIPES[propRecipe(name)],name);
 // Emissive markers, glass and bright fruit stay flat so they read at a glance.
 for(const name of ['glow','beam','glass','berry','blossom'])assert.equal(propRecipe(name),null);
});

test('prop recipes stay in range and masonry joints sit below the block faces',()=>{
 for(const name of ['bark','straw','moss','soil','masonry'])for(let i=0;i<64;i++){const u=i/64,v=(i*7%64)/64,h=RECIPES[name].height(noise,u,v);assert.ok(h>=0&&h<=1,name);assert.ok(RECIPES[name].tint(h,noise,u,v)>0,name);}
 const m=RECIPES.masonry,joint=m.height(noise,.001,.125),face=m.height(noise,.25,.125);
 assert.ok(joint<.4&&face>.75,'mortar joints are recessed');
 assert.ok(m.tint(joint,noise,.001,.125)<m.tint(face,noise,.25,.125),'mortar is darker than stone');
});

test('prop surfaces leave emissive markers alone and keep world-sized planar UVs',()=>{
 const root=new T.Group(),glow=new T.Mesh(new T.BoxGeometry(1,1,1),Object.assign(new T.MeshStandardMaterial(),{name:'glow'}));root.add(glow);
 const wall=new T.Mesh(new T.PlaneGeometry(4,2),Object.assign(new T.MeshStandardMaterial(),{name:'masonry'}));root.add(wall);
 const shared=wall.geometry;
 // Canvas is browser-only; exercise the UV path through a stub document.
 globalThis.document??={createElement:()=>({getContext:()=>({putImageData(){}})})};globalThis.ImageData??=class{constructor(d,w,h){Object.assign(this,{data:d,width:w,height:h});}};
 const result=applyPropSurfaces(root);
 assert.equal(result.textured,1);assert.equal(glow.material.map,null);
 assert.notEqual(wall.geometry,shared,'geometry is cloned before its UVs change');
 const uv=wall.geometry.attributes.uv,span=Math.max(...Array.from({length:uv.count},(_,i)=>uv.getX(i)))-Math.min(...Array.from({length:uv.count},(_,i)=>uv.getX(i)));
 assert.ok(Math.abs(span-4/RECIPES.masonry.tile)<1e-6,'four metres of wall span 4/tile repeats');
});
