const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
const pose=(rightArm,leftArm,rightForearm,leftForearm,body=[0,0,0,0])=>({rightArm,leftArm,rightForearm,leftForearm,body});
const guard=[-.5,0,.16],fore=[-.28,0,0];

// Named preparation/contact poses. The existing model's windup, active and
// recovery windows determine their timing; these values never decide a hit.
function keys(id,a){
 switch(a.kind){
  case 'cleave':return[pose([-1.35,-.85,-.38],guard,[-.55,0,0],fore,[-.035,-.36,-.04,.035]),pose([-.72,.95,.30],[-.35,-.12,.30],[-.08,0,0],fore,[.08,.40,.035,.055])];
  case 'slam':return[pose([-2.32,-.10,-.10],[-1.9,.1,.18],[-.28,0,0],[-.65,0,0],[-.10,0,0,.045]),pose([.35,.03,-.1],[-.35,-.08,.25],[-.03,0,0],[-.20,0,0],[.23,0,0,.17])];
  case 'cry':return[pose([-1.0,-.15,-.25],[-.9,.15,.3],[-.75,0,0],[-.85,0,0],[-.04,0,0,.045]),pose([-1.9,-.1,.42],[-1.55,.12,-.62],[-.2,0,0],[-.12,0,0],[-.09,0,0,0])];
  case 'firebolt':return[pose([-.18,0,-.10],[-1.05,.25,.25],fore,[-1.05,0,0],[-.04,.14,0,.015]),pose([-.2,0,-.1],[-1.47,-.12,.06],fore,[-.08,0,0],[.09,-.1,0,.035])];
  case 'frostnova':return[pose([-.75,-.1,-.40],[-.85,.1,.42],[-.75,0,0],[-.95,0,0],[.04,0,0,.06]),pose([-1.15,-.15,.75],[-1.15,.15,-.75],[-.08,0,0],[-.08,0,0],[-.05,0,0,.025])];
  case 'blink':return[pose([-.7,-.3,-.3],[-.95,.3,.25],[-.65,0,0],[-.85,0,0],[.12,0,0,.09]),pose([-.6,0,-.5],[-.7,0,.5],fore,fore,[.18,0,0,.10])];
  case 'shadowcut':return[pose([-1.15,-.65,-.18],[-.5,.2,.25],[-.7,0,0],[-.55,0,0],[.14,-.3,-.05,.10]),pose([-.60,.48,.14],[-.30,-.1,.48],[-.05,0,0],fore,[.24,.20,.045,.15])];
  case 'venom':return[pose([-.4,0,-.12],[-1.2,.6,.40],fore,[-.95,0,0],[.04,.24,0,.04]),pose([-.35,0,-.18],[-1.48,-.25,.06],fore,[-.05,0,0],[.13,-.20,0,.06])];
  case 'smoke':return[pose([-.42,0,-.20],[-1.0,.24,.20],fore,[-.9,0,0],[.06,.10,0,.045]),pose([-.65,0,-.30],[-.15,-.1,.30],fore,[-.12,0,0],[.22,-.10,0,.18])];
  case 'forgeblow':return[pose([-2.4,-.1,-.12],[-1.95,.15,.24],[-.30,0,0],[-.65,0,0],[-.075,-.09,0,.07]),pose([.32,.08,-.08],[-.35,-.12,.27],[-.05,0,0],[-.18,0,0],[.25,.08,0,.18])];
  case 'cinderbomb':return[pose([-.28,0,-.20],[-2.15,.20,.30],fore,[-.65,0,0],[-.06,.18,0,.03]),pose([-.35,0,-.25],[-1.18,-.15,.12],fore,[-.03,0,0],[.16,-.12,0,.065])];
  case 'ironward':return[pose([-.85,-.3,-.26],[-1.0,.3,.26],[-.75,0,0],[-.8,0,0],[.045,0,0,.055]),pose([-.8,-.12,-.50],[-.85,.12,.50],[-.50,0,0],[-.55,0,0],[.085,0,0,.11])];
 }
 if(id==='mage')return[pose([-.18,0,-.08],[-1.0,.20,.22],fore,[-.95,0,0],[-.025,.10,0,.01]),pose([-.20,0,-.08],[-1.40,-.10,.08],fore,[-.10,0,0],[.065,-.07,0,.025])];
 if(a.weapon==='spear')return[pose([.20,-.15,-.1],[-.65,.18,.30],[-.30,0,0],[-.65,0,0],[.025,-.20,0,.03]),pose([-.20,.10,-.03],[-.65,-.12,.24],[-.05,0,0],[-.15,0,0],[.14,.14,0,.06])];
 if(a.weapon==='axe'||a.combo===3)return[pose([-2.18,-.32,-.20],[-1.0,.12,.3],[-.3,0,0],[-.6,0,0],[-.07,-.22,0,.035]),pose([-.80,.4,.12],[-.65,-.12,.34],[-.04,0,0],fore,[.17,.22,.025,.085])];
 const reverse=a.combo===2,s=reverse?-1:1,ninja=id==='ninja';
 return[pose([ninja?-1.1:-1.4,-.55*s,-.26*s],guard,[-.6,0,0],fore,[-.025,-.25*s,-.025*s,.025]),pose([ninja?-1.05:-.8,.65*s,.24*s],[-.4,-.1*s,.32],[-.06,0,0],fore,[ninja?.17:.095,.28*s,.025*s,ninja?.08:.045])];
}

export function heroActionPose(id,a){
 if(!a)return null;
 const [pre,hit]=keys(id,a),windup=Math.max(.001,a.windup),active=Math.max(.001,a.active),recovery=Math.max(.001,a.recovery),age=Math.max(0,a.age);
 // Projectiles, buffs and movement skills fire once at the windup boundary.
 // Complete their release there, rather than throwing after the effect exists.
 const release=['projectile','frost','ward','smoke','blink','bomb','lunge'].includes(a.effect)||a.kind==='cry',lift=ease(age/windup),cut=release?ease((age/windup-.65)/.35):ease((age-windup)/active),settle=ease((age-windup-active)/recovery),weight=lift*(1-settle),result={weight,phase:age<windup?'windup':age<windup+active?'active':'recovery'};
 for(const key of Object.keys(pre))result[key]=pre[key].map((v,i)=>v+(hit[key][i]-v)*cut);
 if(a.kind==='basic'&&id==='dwarf'){result.body[0]*=1.2;result.body[1]*=.8;result.body[3]+=.025;result.leftArm[2]+=.12;result.rightForearm[0]*=.8;}
 return result;
}
