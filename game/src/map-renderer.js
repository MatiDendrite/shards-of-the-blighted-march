import {MAP_EXTENT,mapView,project,mapLayout} from './cartography.js';
import {TOWN} from './world-map.js';

// Shared, bounded cache: tiny HUD maps never redraw hundreds of scenery objects.
const layers=new Map();
function terrain(region){
 if(layers.has(region))return layers.get(region);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
 const c=canvas.getContext('2d'),layout=mapLayout(region),scale=1024/(MAP_EXTENT*2);
 c.fillStyle=['#283e32','#203e32','#514638','#343847'][region];c.fillRect(0,0,1024,1024);
 c.save();c.translate(512,512);c.scale(scale,scale);
 c.strokeStyle='#c5b48866';c.lineWidth=.18;c.strokeRect(-60,-60,120,120);
 for(const l of layout.landmarks){c.fillStyle=l.kind==='town'?'#75826855':l.kind==='shard'?'#9982ae22':'#b0b27c15';c.beginPath();c.arc(l.x,l.z,l.radius||l.r||11,0,Math.PI*2);c.fill();}
 c.fillStyle='#6d7f5855';c.fillRect(TOWN.x-TOWN.halfWidth,TOWN.z-TOWN.halfDepth,TOWN.halfWidth*2,TOWN.halfDepth*2);
 c.lineJoin=c.lineCap='round';
 for(const [width,color] of [[2.5,'#302e25'],[1.7,'#ac9670']]){c.lineWidth=width;c.strokeStyle=color;for(const path of layout.roads){c.beginPath();path.forEach(([x,z],i)=>i?c.lineTo(x,z):c.moveTo(x,z));c.stroke();}}
 c.fillStyle='#b1a182';c.beginPath();c.arc(0,8,4.5,0,Math.PI*2);c.fill();
 for(const p of layout.props){
  c.save();c.translate(p.x,p.z);c.rotate(-p.rotation);c.scale(p.sx,p.sz);c.lineWidth=.14;
  if(p.kind==='house'||p.kind==='stall'){
   const house=p.kind==='house',w=house?5.8:3.4,d=house?6.4:2.2;
   c.fillStyle='#151e19aa';c.fillRect(-w/2+.5,-d/2+.7,w,d);
   c.fillStyle=house?'#b4926b':'#84967b';c.fillRect(-w/2,-d/2,w,d);
   c.strokeStyle='#e3c598';c.strokeRect(-w/2,-d/2,w,d);c.beginPath();c.moveTo(0,-d/2);c.lineTo(0,d/2);c.stroke();
  }else if(p.kind==='pine'||p.kind==='hornbeam'){
   c.fillStyle=p.kind==='hornbeam'?'#4e6946':['#182e24','#142d23','#343c2a','#232f32'][region];c.beginPath();c.arc(0,0,p.kind==='hornbeam'?2.5:1.5,0,Math.PI*2);c.fill();c.strokeStyle='#72815a55';c.stroke();
  }else if(p.kind==='garden'){c.fillStyle='#a9aa88';c.fillRect(-1.95,-.45,3.9,.9);
  }else if(p.kind==='standard'){c.fillStyle='#b88760';c.fillRect(-.4,-.35,.8,.7);
  }else if(p.kind==='stone'){
   c.fillStyle='#929180';c.beginPath();c.moveTo(-.8,-.4);c.lineTo(.2,-.8);c.lineTo(.85,.2);c.lineTo(.3,.7);c.lineTo(-.7,.5);c.closePath();c.fill();
  }else if(p.kind==='gate'){
   c.fillStyle='#c3b698';c.fillRect(-2.5,-.5,1,1);c.fillRect(1.5,-.5,1,1);c.fillStyle='#c3b69877';c.fillRect(-1.5,-.2,3,.4);
  }else if(p.kind==='well'){
   c.fillStyle='#ddd1ad';c.beginPath();c.arc(0,0,1.2,0,Math.PI*2);c.fill();c.fillStyle='#476f7b';c.beginPath();c.arc(0,0,.65,0,Math.PI*2);c.fill();
  }else if(p.kind==='lantern'){c.fillStyle='#e7c977';c.beginPath();c.arc(0,0,.28,0,Math.PI*2);c.fill();}
  c.restore();
 }
 c.restore();
 const result={canvas,layout};if(layers.size>=2)layers.delete(layers.keys().next().value);layers.set(region,result);return result;
}
export function drawMap(canvas,{region,combat,progress,view=mapView(),detailed=false}){
 const c=canvas.getContext('2d'),size=canvas.width,{canvas:base,layout}=terrain(region),tiny=!detailed;
 const span=base.width/view.zoom,sx=(view.x+MAP_EXTENT)/(MAP_EXTENT*2)*base.width-span/2,sy=(view.z+MAP_EXTENT)/(MAP_EXTENT*2)*base.height-span/2;
 c.clearRect(0,0,size,size);c.drawImage(base,sx,sy,span,span,0,0,size,size);
 const unit=detailed?Math.max(1,size/(canvas.clientWidth||size)):.65,at=(x,z)=>project(x,z,size,view);
 function marker(x,z,color,symbol,r=7){
  const [a,b]=at(x,z);r*=unit;c.save();c.translate(a,b);c.fillStyle=color;c.strokeStyle='#101c19';c.lineWidth=2*unit;
  c.beginPath();if(symbol==='diamond'){c.moveTo(0,-r);c.lineTo(r,0);c.lineTo(0,r);c.lineTo(-r,0);c.closePath();}else c.arc(0,0,r,0,Math.PI*2);c.fill();c.stroke();
  if(symbol&&symbol!=='diamond'&&!tiny){c.font=`bold ${10*unit}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#16211b';c.fillText(symbol,0,.4*unit);}c.restore();
 }
 if(detailed){
  c.font=`${Math.round(12*unit)}px Georgia`;c.textAlign='center';c.textBaseline='middle';
  for(const l of layout.landmarks){if(l.kind==='ruin'&&layout.locations.some(p=>p.id==='objective'&&Math.hypot(p.x-l.x,p.z-l.z)<14))continue;
   const [a,b]=at(l.x,l.z),y=b+(l.kind==='town'?23:10)*unit;
   if(a<65*unit||a>size-65*unit||y<28*unit||y>size-25*unit)continue;
   c.lineWidth=4*unit;c.strokeStyle='#18231de6';c.strokeText(l.name,a,y);c.fillStyle='#eadfbd';c.fillText(l.name,a,y);
  }
 }
 for(const d of progress.data.drops)marker(d.x,d.z,'#e2c17b','+',4);
 for(const e of combat.enemies)if(e.hp>0)marker(e.x,e.z,e.kind==='boss'?'#f08e79':'#e58371',e.kind==='boss'?'!':null,e.kind==='boss'?9:3.5);
 for(const n of layout.locations){if(n.symbol)marker(n.x,n.z,'#cee0af',n.symbol,7);if(n.id==='exit')marker(n.x,n.z,'#f0cf7c','↑',8);if(n.id==='return')marker(n.x,n.z,'#80cddd','↓',8);}
 if(combat.shard.hp>0)marker(combat.shard.x,combat.shard.z,'#d4a6ef','diamond',8);
 const [px,py]=at(combat.player.x,combat.player.z);
 c.save();c.translate(px,py);c.rotate(Math.PI-combat.player.angle);c.scale(unit,unit);c.fillStyle='#fff6dc';c.strokeStyle='#14221b';c.lineWidth=2;
 c.beginPath();c.moveTo(0,-10);c.lineTo(7,7);c.lineTo(0,4);c.lineTo(-7,7);c.closePath();c.fill();c.stroke();c.restore();
 c.strokeStyle='#c1aa79';c.lineWidth=1;c.strokeRect(.5,.5,size-1,size-1);
 if(detailed){
  c.fillStyle='#14211de6';c.fillRect(size-36*unit,7*unit,29*unit,30*unit);c.font=`bold ${14*unit}px Georgia`;c.textAlign='center';c.fillStyle='#f0dba9';c.fillText('N',size-21*unit,28*unit);
  const length=10*size*view.zoom/(MAP_EXTENT*2);c.fillStyle='#14211de6';c.fillRect(8*unit,size-38*unit,length+16*unit,30*unit);c.strokeStyle='#eadfbd';c.lineWidth=2*unit;c.beginPath();c.moveTo(16*unit,size-16*unit);c.lineTo(16*unit+length,size-16*unit);c.stroke();c.font=`${10*unit}px Arial`;c.textAlign='left';c.fillStyle='#eadfbd';c.fillText('10 m',16*unit,size-23*unit);
 }
}
