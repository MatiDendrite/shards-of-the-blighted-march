// RAF timestamps can precede performance.now() sampled during a long boot.
// Use the first actual RAF as the origin; simulation/UI timers never go back.
export function createFrameClock(){
 let previous;
 return now=>{
  if(!Number.isFinite(now))return 0;
  const seconds=previous===undefined?0:Math.max(0,(now-previous)/1000);
  previous=previous===undefined?now:Math.max(previous,now);return seconds;
 };
}
