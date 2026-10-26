/* 独立于音频元素的页面体验。离开首页时释放三维场景和所有本页监听。 */
(function(){
 'use strict';
 const root=new URL('../',document.currentScript.src),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let cleanup=()=>{},worldScript;
 function loadWorld(){
  if(window.ZephyrWorldEngine)return Promise.resolve();
  if(!worldScript)worldScript=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('js/world.js',root).href;script.onload=resolve;script.onerror=reject;document.head.append(script);});
  return worldScript;
 }
 function bind(){
  cleanup();const controller=new AbortController(),signal=controller.signal,observers=[],animations=[];let scene=null,sceneVisible=false,dead=false;
  const on=(node,type,listener,options={})=>node?.addEventListener(type,listener,{...options,signal});
  document.querySelectorAll('[data-depth-card]').forEach(card=>{
   if(reduced.matches||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
   let frame=0;on(card,'pointermove',event=>{const x=event.clientX,y=event.clientY;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const r=card.getBoundingClientRect();const dx=(x-r.left)/r.width,dy=(y-r.top)/r.height;card.style.setProperty('--depth-x',((.5-dy)*11).toFixed(2)+'deg');card.style.setProperty('--depth-y',((dx-.5)*13).toFixed(2)+'deg');card.style.setProperty('--shine-x',(dx*100).toFixed(1)+'%');card.style.setProperty('--shine-y',(dy*100).toFixed(1)+'%');});});
   on(card,'pointerleave',()=>{cancelAnimationFrame(frame);card.style.setProperty('--depth-x','0deg');card.style.setProperty('--depth-y','0deg');});on(signal,'abort',()=>cancelAnimationFrame(frame));
  });
  const card=document.querySelector('[data-identity-card]'),flip=document.querySelector('[data-flip-card]');
  on(flip,'click',()=>{const isFlipped=card.classList.toggle('is-flipped');flip.setAttribute('aria-pressed',String(isFlipped));card.querySelector('.identity-front').inert=isFlipped;card.querySelector('.identity-back').inert=!isFlipped;});
  document.querySelectorAll('[data-scroll-to]').forEach(button=>on(button,'click',()=>{const destination=document.getElementById(button.dataset.scrollTo);destination?.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});}));
  const counters=[...document.querySelectorAll('[data-count]')];
  if(!reduced.matches&&window.Motion&&counters.length){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;const node=entry.target,target=Number(node.dataset.count),pad=node.closest('.writing-count')?2:1;node.setAttribute('aria-label',String(target));animations.push(Motion.animate(0,target,{duration:1.15,ease:[.22,1,.36,1],onUpdate:value=>{node.textContent=String(Math.round(value)).padStart(pad,'0');}}));observer.unobserve(node);}),{threshold:.5});counters.forEach(node=>observer.observe(node));observers.push(observer);}
  const stage=document.querySelector('[data-world-stage]');
  if(stage){
   const open=action=>{if(action==='music'){document.querySelector('.world-destinations [data-open-music]')?.click();return;}document.querySelector('.world-destinations [data-route="'+action+'"]')?.click();};
   let loading=false;
   const start=async()=>{if(scene||loading||dead)return;loading=true;try{await loadWorld();if(dead||!stage.isConnected)return;scene=window.ZephyrWorldEngine.mount(stage,{reduced:reduced.matches,onOpen:open});scene.setVisible(sceneVisible);window.ZephyrWorld=scene;}catch(error){if(dead)return;stage.classList.add('is-unavailable');stage.querySelector('[data-world-loading]').textContent='小世界暂时休息，下面的入口仍然为你开放。';}finally{loading=false;}};
   const observer=new IntersectionObserver(entries=>{sceneVisible=entries[0].isIntersecting;if(sceneVisible)start();scene?.setVisible(sceneVisible);},{rootMargin:'180px 0px',threshold:0});observer.observe(stage);observers.push(observer);
   on(document,'visibilitychange',()=>scene?.setVisible(sceneVisible&&!document.hidden));
   on(reduced,'change',()=>{if(scene){scene.setPaused(reduced.matches);}});
  }
  cleanup=()=>{dead=true;controller.abort();observers.forEach(observer=>observer.disconnect());animations.forEach(animation=>animation.stop());if(scene){scene.dispose();if(window.ZephyrWorld===scene)window.ZephyrWorld=null;}};
 }
 document.addEventListener('zephyr:page',bind);bind();
}());
