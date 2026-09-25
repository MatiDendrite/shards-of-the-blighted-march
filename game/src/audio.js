// Procedural sound: every effect is synthesised with Web Audio at play time,
// so nothing is downloaded. Audio starts/resumes from a real user gesture.
export function createAudio(){
 let ctx=null,muted=false,master=null,noise=null,ambience=null;
 function unlock(){try{ctx??=new (window.AudioContext||window.webkitAudioContext)();ctx.resume().catch(()=>{});setup();}catch{}}
 function setup(){
  if(master||!ctx)return;
  const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.ratio.value=4;compressor.connect(ctx.destination);
  master=ctx.createGain();master.gain.value=muted?0:.9;master.connect(compressor);
  // Two seconds of white noise feed every whoosh, crackle, splash and rumble.
  noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  ambience=createAmbience();
 }
 const now=()=>ctx.currentTime;
 function envelope(node,peak,attack,release,start=now()){const g=ctx.createGain();g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(peak,start+attack);g.gain.exponentialRampToValueAtTime(.0001,start+attack+release);node.connect(g);g.connect(master);return g;}
 function tone(freq,{type='sine',peak=.05,attack=.005,release=.2,to=null,delay=0,detune=0}={}){const t=now()+delay,o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(freq,t);o.detune.value=detune;if(to)o.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+attack+release);const g=envelope(o,peak,attack,release,t);o.start(t);o.stop(t+attack+release+.05);o.onended=()=>{o.disconnect();g.disconnect();};}
 function hiss({filter='bandpass',freq=1200,to=null,q=1,peak=.05,attack=.01,release=.25,delay=0,rate=1}={}){const t=now()+delay,src=ctx.createBufferSource(),f=ctx.createBiquadFilter();src.buffer=noise;src.playbackRate.value=rate;src.loop=true;f.type=filter;f.Q.value=q;f.frequency.setValueAtTime(freq,t);if(to)f.frequency.exponentialRampToValueAtTime(Math.max(30,to),t+attack+release);src.connect(f);const g=envelope(f,peak,attack,release,t);src.start(t,Math.random()*1.5);src.stop(t+attack+release+.05);src.onended=()=>{src.disconnect();f.disconnect();g.disconnect();};}
 const jitter=(v,r=.08)=>v*(1+(Math.random()*2-1)*r);
 const SOUNDS={
  swing:()=>hiss({freq:jitter(900),to:2600,q:1.4,peak:.06,attack:.03,release:.11}),
  heavySwing:()=>{hiss({freq:jitter(500),to:1500,q:1.1,peak:.08,attack:.05,release:.18});tone(90,{type:'triangle',peak:.03,release:.2,to:60});},
  hit:()=>{tone(jitter(140),{type:'triangle',peak:.09,release:.12,to:60});hiss({filter:'highpass',freq:2500,peak:.04,attack:.002,release:.05});},
  heavyHit:()=>{tone(jitter(90),{type:'triangle',peak:.13,release:.22,to:40});hiss({filter:'lowpass',freq:900,peak:.08,attack:.003,release:.16});},
  hurt:()=>{tone(jitter(220),{type:'sawtooth',peak:.05,release:.18,to:110});hiss({filter:'lowpass',freq:600,peak:.05,attack:.004,release:.12});},
  dodge:()=>hiss({freq:jitter(600),to:1800,q:.8,peak:.05,attack:.04,release:.14}),
  cry:()=>{for(const [f,d] of [[196,0],[247,.02],[294,.04]])tone(f,{type:'sawtooth',peak:.03,attack:.04,release:.5,delay:d,detune:8});hiss({filter:'lowpass',freq:700,peak:.03,attack:.05,release:.35});},
  explosion:()=>{tone(70,{type:'sine',peak:.2,attack:.005,release:.7,to:28});hiss({filter:'lowpass',freq:1800,to:120,peak:.16,attack:.005,release:.8});},
  equip:()=>{tone(1320,{peak:.03,release:.12});tone(1980,{peak:.02,release:.09,delay:.03});},
  quest:()=>[523,659,784,1047].forEach((f,i)=>tone(f,{type:'triangle',peak:.05,attack:.01,release:.5,delay:i*.11})),
  death:()=>{tone(330,{type:'triangle',peak:.05,attack:.02,release:.9,to:80});hiss({filter:'lowpass',freq:500,peak:.03,attack:.05,release:.6});},
  // Class abilities.
  fireCast:()=>{hiss({freq:500,to:1400,q:.7,peak:.07,attack:.05,release:.25});tone(110,{type:'sawtooth',peak:.02,release:.25,to:70});},
  fireBurst:()=>{tone(80,{peak:.14,release:.45,to:35});hiss({filter:'lowpass',freq:2400,to:300,peak:.12,attack:.003,release:.5});for(let i=0;i<5;i++)hiss({filter:'highpass',freq:3000,peak:.03,attack:.001,release:.03,delay:.05+i*.06});},
  frost:()=>{for(const [f,d] of [[1568,0],[2093,.03],[2637,.06],[3136,.1]])tone(jitter(f,.02),{peak:.025,attack:.003,release:.5,delay:d});hiss({filter:'highpass',freq:4000,peak:.05,attack:.01,release:.4});},
  blink:()=>{tone(300,{peak:.05,attack:.01,release:.18,to:1600});tone(900,{peak:.02,attack:.08,release:.2,delay:.08,to:300});},
  arcane:()=>tone(jitter(880,.04),{type:'triangle',peak:.03,attack:.004,release:.12,to:1320}),
  arcaneHit:()=>{tone(1320,{peak:.03,release:.1,to:660});hiss({filter:'highpass',freq:3500,peak:.02,attack:.001,release:.06});},
  venom:()=>hiss({filter:'highpass',freq:jitter(3000),peak:.04,attack:.005,release:.12}),
  venomHit:()=>{hiss({freq:1800,q:3,peak:.04,attack:.004,release:.14});tone(260,{peak:.02,release:.1,to:180});},
  smoke:()=>hiss({filter:'lowpass',freq:900,to:250,peak:.08,attack:.05,release:.7}),
  forge:()=>{tone(jitter(1760,.02),{peak:.04,attack:.002,release:.4});tone(2640,{peak:.02,attack:.002,release:.3});tone(90,{type:'triangle',peak:.1,release:.2,to:45});},
  fuse:()=>hiss({filter:'highpass',freq:5000,peak:.025,attack:.02,release:.9}),
  ward:()=>{for(const [f,d] of [[392,0],[587,.04],[784,.08]])tone(f,{type:'triangle',peak:.03,attack:.02,release:.8,delay:d});},
  absorb:()=>{tone(1175,{peak:.035,attack:.002,release:.3});tone(1568,{peak:.02,attack:.002,release:.25});},
  // Enemies.
  arrow:()=>{hiss({freq:jitter(2600),to:900,q:5,peak:.05,attack:.01,release:.35});tone(1400,{peak:.012,release:.25,to:700});},
  charge:()=>{tone(jitter(95),{type:'sawtooth',peak:.05,attack:.02,release:.25,to:60});hiss({filter:'lowpass',freq:500,peak:.05,attack:.02,release:.3});},
  slam:()=>{tone(55,{peak:.18,release:.55,to:25});hiss({filter:'lowpass',freq:700,to:90,peak:.12,attack:.004,release:.6});},
  // Fishing.
  cast:()=>{hiss({freq:900,to:2800,q:1.2,peak:.05,attack:.02,release:.3});for(let i=0;i<6;i++)tone(2200,{type:'square',peak:.006,attack:.001,release:.01,delay:.12+i*.035});},
  plop:()=>{tone(jitter(520),{peak:.05,attack:.002,release:.12,to:180});hiss({filter:'lowpass',freq:1400,peak:.03,attack:.002,release:.08});},
  splash:()=>{hiss({filter:'bandpass',freq:1200,q:.6,peak:.1,attack:.004,release:.4});tone(300,{peak:.04,release:.15,to:120});},
  eat:()=>{for(let i=0;i<3;i++)hiss({freq:1600,q:2,peak:.04,attack:.002,release:.05,delay:i*.12});},
  door:()=>{tone(180,{type:'sawtooth',peak:.015,attack:.05,release:.35,to:140});tone(90,{type:'triangle',peak:.05,attack:.002,release:.12,delay:.35,to:60});},
 };
 function play(type){if(!ctx||muted||ctx.state!=='running'||!master)return;(SOUNDS[type]||SOUNDS.hit)();}
 // Continuous beds: running water, wind and a hearth, each a filtered noise
 // loop whose level follows the world state every frame.
 function createAmbience(){
  const bed=(filter,freq,q=.7)=>{const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=noise;src.loop=true;f.type=filter;f.frequency.value=freq;f.Q.value=q;g.gain.value=0;src.connect(f);f.connect(g);g.connect(master);src.start();return{f,g};};
  return{water:bed('bandpass',700,.5),wind:bed('bandpass',380,.9),hearth:bed('lowpass',1500,.6),crackle:0};
 }
 function ambient({water=0,wind=.3,hearth=0,active=true}={}){
  if(!ambience||!ctx||ctx.state!=='running')return;const t=now(),k=active?1:.25,set=(bed,v)=>bed.g.gain.setTargetAtTime(v*k,t,.4);
  set(ambience.water,.045*water);set(ambience.wind,.018*wind*(.7+.3*Math.sin(t*.37)));set(ambience.hearth,.03*hearth);
  ambience.wind.f.frequency.setTargetAtTime(320+120*Math.sin(t*.23),t,1);
  if(hearth>0&&active&&Math.random()<.12)hiss({filter:'highpass',freq:2500+Math.random()*2500,peak:.02*hearth,attack:.001,release:.02+Math.random()*.03});
 }
 return{unlock,play,ambient,setMuted(value){muted=value;if(master)master.gain.setTargetAtTime(value?0:.9,now(),.05);}};
}
