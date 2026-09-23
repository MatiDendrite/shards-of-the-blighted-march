// One source of truth for class selection, combat, tooltips and the action bar.
export const CLASSES = {
 warrior:{name:'Warrior',role:'Steel & courage',description:'Hold the front line with wide strikes, a ground slam and a rallying cry.',skills:['cleave','slam','cry'],color:'#d6b475'},
 mage:{name:'Mage',role:'Fire & frost',description:'Hold Attack to cast Arcane Bolts. Burst with fire, slow pursuers with frost, then blink to safety.',skills:['firebolt','frostnova','blink'],color:'#acb7ef'},
 ninja:{name:'Ninja',role:'Venom & shadows',description:'Close the gap, throw poisoned knives and slip away under a smoke veil.',skills:['shadowcut','venom','smoke'],color:'#8bcab2'},
 dwarf:{name:'Dwarf',role:'Iron & embers',description:'Stagger foes with a crushing blow, throw a timed charge and absorb damage.',skills:['forgeblow','cinderbomb','ironward'],color:'#dda970'},
};
export const CLASS_IDS=Object.keys(CLASSES);
export const SLOT_IDS=['cleave','slam','cry'];
export const SKILLS={
 cleave:{name:'Cleave',description:'Sweep a wide arc in front of you.',cost:20,cooldown:6,windup:.23,active:.15,recovery:.30,damage:42,range:3.4,arc:3.1,color:0xe8c988},
 slam:{name:'Ground Slam',description:'Strike all nearby foes and interrupt ordinary enemies.',cost:30,cooldown:9,windup:.5,active:.18,recovery:.34,damage:32,range:3.5,arc:Math.PI*2,color:0xd1ad70},
 cry:{name:'Battle Cry',description:'Gain 35% damage for 6 seconds; stagger nearby ordinary enemies.',cost:25,cooldown:12,windup:.18,active:.1,recovery:.18,damage:0,range:5,arc:Math.PI*2,color:0xc3c992},
 firebolt:{name:'Firebolt',description:'Launch a fireball up to 11 m. It bursts on the first target or obstacle.',cost:18,cooldown:3.8,windup:.3,active:.1,recovery:.24,damage:38,range:11,arc:.3,effect:'projectile',speed:13,splash:1.15,color:0xffa34f},
 frostnova:{name:'Frost Nova',description:'A 3.8 m frost burst slows enemies by 55% for 4 seconds. The Warden resists half the slow.',cost:28,cooldown:9,windup:.32,active:.15,recovery:.3,damage:24,range:3.8,arc:Math.PI*2,effect:'frost',color:0x92e1ef},
 blink:{name:'Blink',description:'Blink up to 4.5 m in your facing direction with brief protection. Cannot cross obstacles or water.',cost:20,cooldown:10,windup:.12,active:.1,recovery:.16,damage:0,range:4.5,arc:0,effect:'blink',color:0xb8a1ff},
 shadowcut:{name:'Shadow Cut',description:'Lunge 1.5 m and slash. Deal 50% extra damage when striking an enemy from behind.',cost:18,cooldown:4.5,windup:.13,active:.16,recovery:.18,damage:40,range:2.5,arc:1.9,effect:'lunge',color:0xc7eee3},
 venom:{name:'Venom Knives',description:'Throw three knives up to 9 m. The weapon bonus applies once per target per volley. Poison deals 24 damage over 4 seconds; it refreshes, never stacks.',cost:24,cooldown:7,windup:.2,active:.1,recovery:.25,damage:14,range:9,arc:.5,effect:'projectile',speed:16,poison:true,color:0x8bdb8c},
 smoke:{name:'Smoke Veil',description:'For 4 seconds, move faster and take 50% less damage. Enemies can still see and attack you.',cost:25,cooldown:12,windup:.15,active:.1,recovery:.15,damage:0,range:2.4,arc:Math.PI*2,effect:'smoke',color:0x9bbdc2},
 forgeblow:{name:'Forge Blow',description:'A heavy narrow strike. Stagger ordinary enemies for 1.4 seconds; the Warden cannot be interrupted.',cost:26,cooldown:6,windup:.48,active:.17,recovery:.34,damage:60,range:2.7,arc:1.5,effect:'crush',color:0xe6b46e},
 cinderbomb:{name:'Cinder Bomb',description:'Aim at the ground to choose a landing point up to 5.5 m away. Touch targets a nearby foe. After 1.1 seconds it explodes in a 2.6 m circle. Obstacles stop the throw.',cost:28,cooldown:8,windup:.3,active:.1,recovery:.28,damage:52,range:5.5,arc:0,effect:'bomb',color:0xffbc65},
 ironward:{name:'Iron Ward',description:'Absorb up to 50 damage for 6 seconds. Remaining protection is shown above the skill bar.',cost:24,cooldown:12,windup:.23,active:.1,recovery:.2,damage:0,range:1.1,arc:Math.PI*2,effect:'ward',color:0xf0ce8e},
};
// A class-specific basic attack, not a fourth cooldown skill or equipment slot.
export const ARCANE_BOLT={name:'Arcane Bolt',damage:18,range:9,arc:.2,cost:9,windup:.24,active:.10,recovery:.40,effect:'projectile',projectile:'arcane',speed:16,color:0x9bcaff};
export const projectileInfo=kind=>kind==='arcane'?ARCANE_BOLT:SKILLS[kind];
export const classInfo=id=>CLASSES[id]||CLASSES.warrior;
export const skillForSlot=(classId,slot)=>classInfo(classId).skills[SLOT_IDS.indexOf(slot)];
export const skillIcon=id=>new URL(`../icons/${id}.webp`,import.meta.url).href;
export const skillDetails=id=>{const s=SKILLS[id];return `${s.name} · ${s.cost} stamina · ${s.cooldown}s cooldown${s.damage?` · ${s.damage} base damage`:''}. ${s.description}`;};
