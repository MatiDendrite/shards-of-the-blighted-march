import * as T from 'three';
export const HERO_GRIP={x:0,y:-.317,z:.043};
export const WEAPON_GRIPS={sword:[0,.21,0],axe:[-.15,.26,0],spear:[0,.85,0]};
export function equipHeroWeapon(mount,prototype,kind){
 const weapon=prototype.clone(true);weapon.name='held-'+kind;
 // Counter ASSET's normalisation before placing the authored grip in the palm.
 weapon.children[0].updateMatrix();const grip=new T.Vector3(...WEAPON_GRIPS[kind]).applyMatrix4(weapon.children[0].matrix);
 weapon.rotation.y=kind==='axe'?-Math.PI/2:0;grip.applyEuler(weapon.rotation);weapon.position.copy(grip).negate();
 mount.clear();mount.position.set(HERO_GRIP.x,HERO_GRIP.y,HERO_GRIP.z);mount.rotation.set(Math.PI/2,0,0);mount.add(weapon);return weapon;
}
