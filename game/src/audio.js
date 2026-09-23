// Procedural feedback only. Audio starts/resumes from a real user gesture.
export function createAudio(){
 let ctx=null,muted=false;
 function unlock(){try{ctx??=new (window.AudioContext||window.webkitAudioContext)();ctx.resume().catch(()=>{});}catch{}}
 function play(type){if(!ctx||muted||ctx.state!=='running')return;
  const sounds={swing:[170,.10,'triangle'],heavySwing:[115,.17,'triangle'],hit:[85,.11,'square'],heavyHit:[66,.18,'triangle'],quest:[520,.65,'sine'],hurt:[62,.20,'sawtooth'],dodge:[340,.08,'sine'],cry:[180,.35,'triangle'],explosion:[45,.65,'sawtooth'],equip:[440,.10,'sine'],death:[55,.7,'triangle']};
  const [frequency,duration,wave]=sounds[type]||sounds.hit,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=wave;osc.frequency.setValueAtTime(frequency,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(20,frequency*.35),ctx.currentTime+duration);
  gain.gain.setValueAtTime(.035,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration);osc.onended=()=>{osc.disconnect();gain.disconnect();};
 }
 return{unlock,play,setMuted(value){muted=value;}};
}
