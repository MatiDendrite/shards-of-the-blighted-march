import * as T from 'three';
import {bakeStatic} from '../lib/assetlib.js';

export function mergeJoints(root){const nodes=[],owned=[];root.traverse(n=>{if(n.isGroup)nodes.push(n);});for(const node of nodes){const meshes=node.children.filter(n=>n.isMesh);if(meshes.length<2)continue;const rigid=new T.Group();meshes.forEach(m=>rigid.add(m));const baked=bakeStatic(rigid);baked.traverse(o=>{if(o.isMesh)owned.push(o.geometry);});node.add(baked);}return owned;}
