// Map events shared by layout and combat: one fortified bandit camp per region
// and, outside the Warden's court, a roaming elite. Their foes are optional:
// they pay out on the spot and never count towards quest guardians.
export const CAMP_IDS=[101,102,103,104],ELITE_ID=120;
export const CAMPS=[
 {x:16,z:-50,guards:[['raider',-1.5,.5],['raider',1.8,-.8],['wolf',0,2.2],['wolf',1.2,-1.4]]},
 {x:-26,z:-50,guards:[['raider',-1.5,.5],['archer',1.8,-.8],['boar',0,2.4],['raider',1.2,-1.4]]},
 {x:-44,z:46,guards:[['raider',-1.5,.5],['archer',1.8,-.8],['brute',0,2.4],['archer',1.2,-1.4]]},
 {x:44,z:-46,guards:[['raider',-1.5,.5],['archer',1.8,-.8],['brute',0,2.4],['boar',1.2,-1.4]]},
];
// The elite walks the outer ring road between the glades, ruins and grove.
export const ELITE_ROUTE=[[-36,8],[-39,-11],[-34,-32],[0,-38],[34,-32],[39,-11],[36,8],[32,31],[0,43],[-32,31]];
export const hasElite=region=>region<3;
export const ELITE_NAME='Dread Champion';
