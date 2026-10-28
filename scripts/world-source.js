import * as THREE from 'three';

/* 原创微缩世界。仅在首页世界区域接近可视区时加载；离开页面完整释放资源。 */
function mount(stage,options={}){
 const canvas=stage.querySelector('canvas'),poster=stage.querySelector('[data-world-poster]');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0xeff0f1,0);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-12,12,7.5,-7.5,.1,100);
 const ambient=new THREE.HemisphereLight(0xffffff,0x929296,2.3);scene.add(ambient);
 const sun=new THREE.DirectionalLight(0xffffff,3.2);sun.position.set(-6,12,7);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-14,right:14,top:12,bottom:-12,near:1,far:40});sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;sun.shadow.radius=4;scene.add(sun);
 const rim=new THREE.DirectionalLight(0xffffff,1.1);rim.position.set(8,6,-8);scene.add(rim);
 const materials={},geometries=new Set(),textures=new Set(),controller=new AbortController(),signal=controller.signal;
 const material=(name,color,roughness=.7,metalness=0)=>materials[name]||(materials[name]=new THREE.MeshStandardMaterial({color,roughness,metalness}));
 const white=material('white',0xf6f6f6),paper=material('paper',0xffffff),gray=material('gray',0xb3b4b6),silver=material('silver',0xd5d6d8,.3,.25),dark=material('dark',0x242426),rubber=material('rubber',0x111113),road=material('road',0x454547),medium=material('medium',0x767679),chalk=material('chalk',0xeeeeee);
 const own=g=>{geometries.add(g);return g;};
 const box=(w,h,d,mat,x=0,y=0,z=0,parent=scene)=>{const mesh=new THREE.Mesh(own(new THREE.BoxGeometry(w,h,d)),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const cylinder=(r1,r2,h,mat,x,y,z,parent=scene,segments=32)=>{const mesh=new THREE.Mesh(own(new THREE.CylinderGeometry(r1,r2,h,segments)),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const sphere=(r,mat,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(own(new THREE.SphereGeometry(r,24,16)),mat);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;};
 function roundSlab(w,d,r,h,mat,x=0,y=0,z=0,parent=scene){const s=new THREE.Shape();const a=-w/2,b=-d/2;s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+d-r);s.quadraticCurveTo(a+w,b+d,a+w-r,b+d);s.lineTo(a+r,b+d);s.quadraticCurveTo(a,b+d,a,b+d-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);const g=own(new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelSize:.07,bevelThickness:.07,bevelSegments:3,steps:1}));g.rotateX(-Math.PI/2);const mesh=new THREE.Mesh(g,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function labelTexture(lines,bg='#222224',fg='#eeeeee',font=36){const c=document.createElement('canvas');c.width=512;c.height=256;const context=c.getContext('2d');context.fillStyle=bg;context.fillRect(0,0,512,256);context.fillStyle=fg;context.font=`${font}px Arial, sans-serif`;context.textBaseline='middle';lines.forEach((text,i)=>context.fillText(text,35,58+i*55));const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);return texture;}
 function display(w,h,lines,x,y,z,parent,bg,fg,font){const mat=new THREE.MeshBasicMaterial({map:labelTexture(lines,bg,fg,font)});materials['screen'+Object.keys(materials).length]=mat;const plane=new THREE.Mesh(own(new THREE.PlaneGeometry(w,h)),mat);plane.position.set(x,y,z);parent.add(plane);return plane;}
 const floor=box(80,.15,80,material('floor',0xeff0f1),0,-.85,0);floor.castShadow=false;
 roundSlab(17.7,11.8,.75,.4,white,0,-.57,0);
 box(2,.035,10.7,road,0,-.03,0);box(16.5,.035,1.65,road,0,-.025,.15);
 for(let z=-4.8;z<=5;z+=1.05){if(Math.abs(z-.15)<1.2)continue;box(.055,.01,.42,chalk,0,.001,z);}
 for(let x=-7.6;x<8;x+=1.1){if(Math.abs(x)<1.5)continue;box(.45,.01,.055,chalk,x,.001,.15);}
 for(const x of [-.69,.69])box(.045,.015,10.8,gray,x,-.003,0);
 for(const z of [-.48,.79])box(16.5,.015,.04,gray,0,-.003,z);
 for(const x of [-7.9,7.9])for(let z=-4.7;z<5;z+=1.15)box(.32,.07,.65,gray,x,.015,z);
 const stations=[
  {id:'articles',name:'文章站',icon:'book',x:-4.7,z:-2.4,y:2.8},
  {id:'library',name:'学习库',icon:'library',x:-4.7,z:3.2,y:2.45},
  {id:'music',name:'音乐角',icon:'music',x:4.6,z:-2.5,y:1.65},
  {id:'about',name:'关于我',icon:'person',x:4.65,z:3.1,y:2.7}
 ];
 const stationGroups=stations.map(station=>{const g=new THREE.Group();g.position.set(station.x,0,station.z);scene.add(g);roundSlab(3.8,2.75,.2,.28,paper,0,.01,0,g);return g;});
 // 写作站：显示真实博客名的电脑、键盘和一杯咖啡。
 const writing=stationGroups[0];box(2.4,1.5,.17,dark,0,1.75,-.23,writing);display(2.12,1.2,['ZEPHYR / NOTES','> keep_creating()','_'],0,1.75,-.132,writing,'#222224','#eeeeee',30);box(.19,.65,.19,silver,0,.78,-.25,writing);box(.95,.08,.6,silver,0,.45,-.25,writing);box(1.8,.1,.65,gray,-.1,.39,.67,writing);
 for(let row=0;row<3;row++)for(let key=0;key<10;key++)box(.12,.025,.12,paper,-.85+key*.17,.46,.45+row*.19,writing);
 cylinder(.2,.2,.44,paper,1.37,.56,.55,writing);cylinder(.164,.164,.012,dark,1.37,.787,.55,writing);const mugHandle=new THREE.Mesh(own(new THREE.TorusGeometry(.14,.037,8,24)),white);mugHandle.position.set(1.59,.61,.55);writing.add(mugHandle);
 // 学习库：三个层次的书脊、页边和书架，全部使用几何体构建。
 const library=stationGroups[1];box(3,.12,1.25,gray,0,.43,0,library);box(3,.12,1.25,gray,0,1.3,0,library);box(.13,1.7,1.25,white,-1.45,1.05,0,library);box(.13,1.7,1.25,white,1.45,1.05,0,library);box(3,.12,1.25,white,0,1.93,0,library);
 for(let row=0;row<2;row++)for(let i=0;i<9;i++){const height=.52+(i%3)*.085,mat=[dark,paper,gray,medium][(i+row)%4],x=-1.24+i*.31,y=.52+row*.87+height/2;const book=box(.22,height,.78,mat,x,y,.06,library);book.rotation.z=i===8?-.12:0;box(.17,.014,.68,chalk,x,y+height/2+.005,.06,library);box(.13,.035,.015,mat===dark?gray:dark,x,y+.08,.46,library);}
 // 音乐角：唱片、同心唱纹、唱臂与音箱。
 const music=stationGroups[2];roundSlab(2.8,1.85,.12,.15,gray,0,.3,0,music);const record=new THREE.Group();record.position.set(-.3,.54,0);music.add(record);cylinder(.79,.79,.065,rubber,0,0,0,record,64);cylinder(.24,.24,.071,paper,0,.006,0,record);cylinder(.035,.035,.09,dark,0,.02,0,record,16);
 for(const r of [.34,.43,.52,.61,.70]){const groove=new THREE.Mesh(own(new THREE.TorusGeometry(r,.006,4,64)),medium);groove.rotation.x=Math.PI/2;groove.position.y=.035;record.add(groove);}const recordLabel=display(.27,.12,['Z'],0,.047,.06,record,'#eeeeee','#222222',72);recordLabel.rotation.x=-Math.PI/2;
 cylinder(.08,.08,.22,dark,.86,.6,-.53,music);const arm=box(.075,.075,1.05,silver,.66,.7,-.08,music);arm.rotation.y=-.36;box(.12,.12,.21,dark,.48,.64,.41,music);
 for(const x of [-1.43,1.43]){box(.46,.78,.63,dark,x,.68,-.5,music);const speaker=cylinder(.13,.13,.022,medium,x,.73,-.17,music);speaker.rotation.x=Math.PI/2;}
 // 关于我：黑白环结雕塑和名字牌。
 const about=stationGroups[3];cylinder(.85,.85,.42,dark,0,.53,0,about);const knot=new THREE.Mesh(own(new THREE.TorusKnotGeometry(.58,.16,100,12)),silver);knot.position.set(0,1.58,0);knot.castShadow=true;about.add(knot);display(1.08,.4,['ZEPHYR'],0,.54,.865,about,'#242426','#ffffff',54);
 for(const [x,z,scale] of [[-7,-4.3,.9],[-7,4.55,.75],[7.1,4.5,.85],[7.2,-4.3,.9],[2.2,-4.4,.6],[-2.2,4.6,.55]]){
  const tree=new THREE.Group();tree.position.set(x,0,z);tree.scale.setScalar(scale);scene.add(tree);cylinder(.075,.1,.95,medium,0,.42,0,tree,8);const crown=new THREE.Mesh(own(new THREE.IcosahedronGeometry(.62,1)),x<0?white:gray);crown.position.y=1.25;crown.castShadow=true;tree.add(crown);cylinder(.3,.35,.14,gray,0,.04,0,tree,12);
 }
 for(const [x,z] of [[-1.65,-4.5],[1.65,4.1]]){cylinder(.04,.04,1.65,medium,x,.79,z,scene,8);box(.55,.09,.28,dark,x+.2,1.65,z);box(.45,.02,.21,paper,x+.2,1.59,z);}
 // 可以真正驾驶的小车，前向为本地 -Z。
 const car=new THREE.Group();scene.add(car);car.position.set(0,0,2.6);
 roundSlab(.93,1.58,.15,.2,white,0,.24,0,car);box(.8,.34,.77,dark,0,.61,.12,car);roundSlab(.86,.78,.12,.07,paper,0,.77,.12,car);box(.79,.13,.36,gray,0,.49,-.54,car);box(.83,.15,.25,gray,0,.43,.65,car);
 for(const x of [-.31,.31]){box(.19,.07,.027,paper,x,.43,-.83,car);box(.16,.055,.027,medium,x,.43,.82,car);}
 const wheels=[];for(const x of [-.49,.49])for(const z of [-.49,.49]){const w=cylinder(.22,.22,.16,rubber,x,.22,z,car,24);w.rotation.z=Math.PI/2;wheels.push(w);const rim=cylinder(.095,.095,.172,silver,x,.22,z,car,16);rim.rotation.z=Math.PI/2;}
 const tinyPlate=display(.37,.12,['Z-01'],0,.3,.846,car,'#eee','#222',64);tinyPlate.material.side=THREE.DoubleSide;
 const destinationRing=new THREE.Mesh(own(new THREE.RingGeometry(.2,.27,32)),new THREE.MeshBasicMaterial({color:0x777777,side:THREE.DoubleSide,transparent:true,opacity:.65}));destinationRing.rotation.x=-Math.PI/2;destinationRing.position.y=.04;destinationRing.visible=false;scene.add(destinationRing);materials.destination=destinationRing.material;
 const labelRoot=stage.querySelector('[data-world-points]'),points=[];
 for(const station of stations){const button=document.createElement('button');button.type='button';button.className='world-point';button.dataset.worldStation=station.id;button.innerHTML=window.BlogTemplates.icon(station.icon)+'<span>'+station.name+'</span>';button.setAttribute('aria-label','在小世界打开'+station.name);labelRoot.append(button);points.push(button);button.addEventListener('click',()=>options.onOpen(station.id),{signal});}
 const status=stage.querySelector('[data-world-location]'),enter=stage.querySelector('[data-world-enter]'),pause=stage.querySelector('[data-world-pause]');
 let width=1,height=1,visible=true,paused=!!options.reduced,disposed=false,frame=0,lastTime=0,speed=0,angle=0,azimuth=.58,polar=.82,target=null,nearest=null,drag=null,recordTime=0;
 const keys=new Set(),pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3(),projection=new THREE.Vector3();
 const on=(node,type,listener,extra={})=>node.addEventListener(type,listener,{...extra,signal});
 function positionCamera(){const radius=25;camera.position.set(Math.sin(azimuth)*Math.sin(polar)*radius,Math.cos(polar)*radius,Math.cos(azimuth)*Math.sin(polar)*radius);camera.lookAt(0,.2,0);camera.updateMatrixWorld();}
 function resize(){if(disposed)return;const rect=stage.getBoundingClientRect();width=rect.width;height=rect.height;renderer.setSize(width,height,false);const aspect=width/height,span=aspect<1.25?21/aspect:15.2;camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();positionCamera();draw();}
 function updateLabels(){stations.forEach((station,i)=>{projection.set(station.x,station.y,station.z).project(camera);points[i].style.left=((projection.x*.5+.5)*width).toFixed(1)+'px';points[i].style.top=((-projection.y*.5+.5)*height).toFixed(1)+'px';points[i].hidden=projection.z< -1||projection.z>1;});}
 function draw(){if(disposed)return;renderer.render(scene,camera);updateLabels();}
 function proximity(){let found=null,distance=2.65;for(const station of stations){const d=Math.hypot(car.position.x-station.x,car.position.z-station.z);if(d<distance){distance=d;found=station;}}if(found?.id!==nearest?.id){nearest=found;status.textContent=found?'已到达'+found.name+' · 按 Enter 打开':'点击地面，或用方向键出发。';enter.hidden=!found;if(found)enter.innerHTML='打开'+found.name+' '+window.BlogTemplates.icon('upRight');points.forEach((point,i)=>point.classList.toggle('is-near',stations[i]===found));}}
 function activeInput(){return keys.size>0||target||Math.abs(speed)>.005;}
 function tick(now){frame=0;if(disposed||!visible)return;const dt=lastTime?Math.min((now-lastTime)/1000,.04):1/60;lastTime=now;const oldX=car.position.x,oldZ=car.position.z;
  const up=keys.has('up'),down=keys.has('down'),left=keys.has('left'),right=keys.has('right');
  if(up||down||left||right)target=null;
  if(target){const dx=target.x-car.position.x,dz=target.z-car.position.z,distance=Math.hypot(dx,dz);if(distance<.2){target=null;speed*=.5;destinationRing.visible=false;}else{const desired=Math.atan2(-dx,-dz);const difference=Math.atan2(Math.sin(desired-angle),Math.cos(desired-angle));angle+=difference*Math.min(1,dt*6);speed+=(Math.min(3.5,distance*2.1)-speed)*Math.min(1,dt*3.8);}}
  else{speed+=(up?5.7:down?-4.2:0)*dt;if(!up&&!down)speed*=Math.pow(.055,dt);speed=THREE.MathUtils.clamp(speed,-2.2,4);const steering=(left?1:0)-(right?1:0);angle+=steering*dt*(1.9+Math.min(Math.abs(speed),2)*.45)*(speed<-.1?-1:1);}
  car.position.x-=Math.sin(angle)*speed*dt;car.position.z-=Math.cos(angle)*speed*dt;
  let collided=false;for(const station of stations){if(Math.abs(car.position.x-station.x)<2.0&&Math.abs(car.position.z-station.z)<1.51){collided=true;break;}}
  if(collided||Math.abs(car.position.x)>8.1||Math.abs(car.position.z)>5.1){car.position.x=oldX;car.position.z=oldZ;speed=0;if(target){target=null;destinationRing.visible=false;}}
  car.rotation.y=angle;wheels.forEach(w=>w.rotation.x+=speed*dt*3.5);
  if(!paused){recordTime+=dt;record.rotation.y=recordTime*.33;knot.rotation.y=recordTime*.22;knot.rotation.z=Math.sin(recordTime*.3)*.12;}
  proximity();draw();if(!paused||activeInput())frame=requestAnimationFrame(tick);
 }
 function requestTick(){if(visible&&!disposed&&!frame){lastTime=0;frame=requestAnimationFrame(tick);}}
 function setVisible(value){visible=!!value;if(!visible){cancelAnimationFrame(frame);frame=0;lastTime=0;keys.clear();speed=0;target=null;destinationRing.visible=false;stage.querySelectorAll('[data-drive]').forEach(button=>button.classList.remove('is-pressed'));}else{draw();if(!paused||activeInput())requestTick();}}
 function setPaused(value){paused=!!value;pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'继续小世界动画':'暂停小世界动画');pause.innerHTML=window.BlogTemplates.icon(paused?'play':'pause');if(!paused)requestTick();else if(!activeInput()){cancelAnimationFrame(frame);frame=0;draw();}}
 function reset(){keys.clear();target=null;destinationRing.visible=false;speed=0;angle=0;car.rotation.y=0;car.position.set(0,0,2.6);azimuth=.58;polar=.82;positionCamera();proximity();draw();if(!paused)requestTick();}
 const keyMap={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right',W:'up',S:'down',A:'left',D:'right'};
 on(canvas,'keydown',event=>{if(keyMap[event.key]){event.preventDefault();keys.add(keyMap[event.key]);requestTick();}else if(event.key==='Enter'&&nearest){event.preventDefault();options.onOpen(nearest.id);}});
 on(canvas,'keyup',event=>{if(keyMap[event.key]){event.preventDefault();keys.delete(keyMap[event.key]);}});on(canvas,'blur',()=>{keys.clear();});
 on(canvas,'pointerdown',event=>{if(event.button!==0)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);drag={x:event.clientX,y:event.clientY,previousX:event.clientX,previousY:event.clientY,moved:false};});
 on(canvas,'pointermove',event=>{if(!drag)return;const dx=event.clientX-drag.previousX,dy=event.clientY-drag.previousY;if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>6)drag.moved=true;if(drag.moved){azimuth-=dx*.006;polar=THREE.MathUtils.clamp(polar+dy*.0035,.4,1.15);positionCamera();draw();}drag.previousX=event.clientX;drag.previousY=event.clientY;});
 on(canvas,'pointerup',event=>{if(!drag)return;if(!drag.moved){const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);if(raycaster.ray.intersectPlane(plane,hit)&&Math.abs(hit.x)<8.05&&Math.abs(hit.z)<5.05){target={x:hit.x,z:hit.z};destinationRing.position.set(hit.x,.04,hit.z);destinationRing.visible=true;requestTick();}}drag=null;});on(canvas,'pointercancel',()=>drag=null);on(canvas,'dblclick',reset);
 stage.querySelectorAll('[data-drive]').forEach(button=>{let keyboardUsed=false,pulse;const press=()=>{keys.add(button.dataset.drive);button.classList.add('is-pressed');requestTick();};const release=()=>{keys.delete(button.dataset.drive);button.classList.remove('is-pressed');};on(button,'pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);press();});on(button,'pointerup',release);on(button,'pointercancel',release);on(button,'lostpointercapture',release);on(button,'keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();keyboardUsed=true;press();}});on(button,'keyup',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();release();setTimeout(()=>keyboardUsed=false,0);}});on(button,'click',event=>{if(event.detail===0&&!keyboardUsed){press();clearTimeout(pulse);pulse=setTimeout(release,250);}});on(button,'blur',release);on(signal,'abort',()=>clearTimeout(pulse));});
 on(enter,'click',()=>{if(nearest)options.onOpen(nearest.id);});on(pause,'click',()=>setPaused(!paused));on(stage.querySelector('[data-world-reset]'),'click',reset);
 on(window,'blur',()=>{keys.clear();stage.querySelectorAll('[data-drive]').forEach(button=>button.classList.remove('is-pressed'));});
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);positionCamera();resize();setPaused(paused);proximity();poster.hidden=true;stage.dataset.worldReady='true';
 const api={setVisible,setPaused,reset,get webgl(){return true;},get position(){return {x:car.position.x,z:car.position.z,angle};},get paused(){return paused;},get running(){return !!frame;},get station(){return nearest?.id||null;},dispose(){if(disposed)return;disposed=true;controller.abort();resizeObserver.disconnect();cancelAnimationFrame(frame);geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());Object.values(materials).forEach(m=>m.dispose());sun.shadow.map?.dispose();renderer.dispose();renderer.forceContextLoss();labelRoot.replaceChildren();delete stage.dataset.worldReady;}};
 return api;
}
window.ZephyrWorldEngine={mount};
