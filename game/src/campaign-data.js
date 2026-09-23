// Original campaign content; also used by the journal and deterministic tests.
export const REGIONS = [
  {name:'Hearthstead Approach',short:'Hearthstead',quest:'A Light at the Gate',description:'Borin has kept the last lanterns burning. Break the shard beyond the old gate and silence every guardian so the road can open again.',shard:'Hearth Shard',gold:35,xp:40,color:0xffba70},
  {name:'Thornwood Reach',short:'Thornwood',quest:'Roots of Corruption',description:'The forest has swallowed the patrol road. Its wolves answer to a second shard. Cut out the corruption and clear the way to the ancient causeway.',shard:'Rootbound Shard',gold:50,xp:60,color:0x9acfa5},
  {name:'Ashen Causeway',short:'Causeway',quest:'The Last Seal',description:'Hollow raiders guard the final seal among the standing stones. Destroy the third shard and its defenders to reach the Warden’s court.',shard:'Ashen Shard',gold:70,xp:80,color:0xc6b4ed},
  {name:'Warden’s Court',short:'The Court',quest:'The Fallen Warden',description:'The keeper of the March has become its jailer. Evade his axe sweep and leave the violet circle before his ground slam. Defeat him to free the road.',shard:null,gold:120,xp:150,color:0xd49af0},
];
export const emptyEncounter = (region=0)=>({claimed:[],drops:[],shardReward:false,world:{shardHp:region===3?0:250,exploded:region===3}});
export const freshCampaign = ()=>({region:0,cleared:[false,false,false,false],regions:[null,null,null,null]});
export const ENCOUNTER_VERSION=2;
export const guardianCount=(region,version=ENCOUNTER_VERSION)=>region===3?1:version===1?8:16;
// IDs 1–8 belong to the original guards and shard waves. Never renumber them:
// saved kills and uncollected rewards refer to these IDs.
export const FIELD_PATROLS=[
 {id:9,kind:'wolf',x:-40,z:14},{id:10,kind:'wolf',x:-33,z:22},
 {id:11,kind:'raider',x:-35,z:-13},{id:12,kind:'wolf',x:41,z:12},
 {id:13,kind:'wolf',x:34,z:22},{id:14,kind:'raider',x:37,z:-13},
 {id:15,kind:'wolf',x:-9,z:43},{id:16,kind:'wolf',x:9,z:43},
];
export const encounterComplete = (encounter,region,version=ENCOUNTER_VERSION)=>encounter.world.exploded&&encounter.claimed.length===guardianCount(region,version);
