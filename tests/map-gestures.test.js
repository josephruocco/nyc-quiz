const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..')+'/';
function harness(name){
 const src=fs.readFileSync(root+name+'.template.html','utf8');
 const start=src.indexOf(name==='fill-the-map'?'let drag = null;':'const SLOP = 4;');
 const end=src.indexOf(name==='pinpoint'?'// Not window':name==='subway'?'// Keep the prompt':'new ResizeObserver',start);
 assert(start>0&&end>start);
 const listeners={}; const nodes=new Map();
 const scope={console,Math,Set,matchMedia:()=>({matches:true}),requestAnimationFrame:f=>f(),
   cv:{addEventListener:(type,f)=>(listeners[type]??=[]).push(f),setPointerCapture:()=>{},classList:{add(){},remove(){}},getBoundingClientRect:()=>({left:0,top:0})},
   el:id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,textContent:''});return nodes.get(id);}};
 vm.createContext(scope);
 vm.runInContext(`let pending=null,pendingPt=null,markerDrag=false,answered=false,TOUCH=true,hover=null,panX=0,panY=0,placements=0,zoomCalls=[]; const route={r:'A'}; function routesAt(){return [{route}]} function px(p){return p} function toLonLat(p){return p} function place(){placements++} function draw(){} function clampPan(){} function zoomAt(...args){zoomCalls.push(args)}`+src.slice(start,end),scope);
 const fire=(type,props={})=>{for(const f of listeners[type]||[])f({pointerId:1,pointerType:'touch',button:0,clientX:100,clientY:100,preventDefault(){},...props});};
 return {fire,read:code=>vm.runInContext(code,scope),nodes};
}
for(const name of ['pinpoint','subway','fill-the-map']){
 const h=harness(name),{fire,read}=h;
 fire('pointerdown'); fire('pointerdown',{pointerId:2,clientX:200});
 fire('touchstart',{touches:[{clientX:100,clientY:100},{clientX:200,clientY:100}]});
 fire('pointermove',{pointerId:2,clientX:300});
 fire('touchmove',{touches:[{clientX:100,clientY:100},{clientX:300,clientY:100}]});
 assert.equal(read('zoomCalls[0][0]'),2,name+': pinch zooms immediately');
 assert.equal(read('panX'),50,name+': pinch center translation applied once');
 fire('pointerup',{pointerId:2}); fire('pointermove',{clientX:130});fire('pointerup');
 assert.equal(read('pending'),null,name+': pinch must not drop marker');
 assert.equal(read('pendingPt'),null,name+': pinch must not select line');
 assert.equal(read('placements'),0,name+': pinch cannot score');
 fire('pointerdown');fire('pointercancel');fire('pointerup');
 assert.equal(read('pending'),null,name+': canceled pointer cannot place a marker');
 if(name!=='fill-the-map'){
  fire('pointerdown');fire('pointerup');
  assert.equal(read(name==='pinpoint'?'pending !== null':'pendingPt !== null'),true,name+': tap previews a selection');
  assert.equal(read('placements'),0,name+': tap waits for confirmation');
  if(name==='pinpoint') {
   fire('pointerdown',{clientX:125}); fire('pointermove',{clientX:135}); fire('pointerup',{clientX:135});
   assert.equal(read('pending[0]'),110,'marker preserves finger offset while dragging');
  }
 }
 console.log(name+': pinch, translation, cancellation, and tap confirmation pass');
}
