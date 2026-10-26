(function(){
 'use strict';
 const scriptURL=new URL(document.currentScript.src),rootURL=new URL('../',scriptURL),T=window.BlogTemplates,C=window.BLOG_CONFIG,P=window.BLOG_POSTS;
 const ctx={config:C,posts:P,root:rootURL.href},app=document.getElementById('app'),audio=document.getElementById('site-audio');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),motion=window.Motion;
 const state={view:'home',id:P[0].id,category:'全部',query:'',track:0,customTrack:null,sceneLoaded:false,scenePaused:reduced.matches};
 let toastTimer,localAudioURL,filterTimer,revealObserver,articleObserver;
 const saved=key=>{try{return localStorage.getItem(key);}catch(error){return null;}};
 const save=(key,value)=>{try{localStorage.setItem(key,value);}catch(error){}};
 let bookmarks=new Set();try{bookmarks=new Set(JSON.parse(saved('zephyr-blog-bookmarks')||'[]'));}catch(error){}
 const routeFiles={home:'index.html',articles:'articles.html',article:'article.html',library:'library.html',about:'about.html'};
 const asset=relative=>new URL(relative,rootURL).href;
 function toast(text){const node=document.querySelector('[data-toast]');node.textContent=text;node.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.hidden=true,3000);}
 function parseRoute(locationURL=new URL(location.href)){
  const hash=new URLSearchParams(locationURL.hash.slice(1)),file=locationURL.pathname.split('/').pop()||'index.html';
  const view=hash.get('view')||Object.keys(routeFiles).find(key=>routeFiles[key]===file)||(file==='404.html'?'404':'home');
  return {view,id:hash.get('id')||locationURL.searchParams.get('id')||P[0].id,query:hash.get('q')||locationURL.searchParams.get('q')||'',category:hash.get('category')||locationURL.searchParams.get('category')||'全部'};
 }
 function updateNav(){document.querySelectorAll('[data-route]').forEach(link=>{const view=link.dataset.route;if(link.closest('nav')){if(view===(state.view==='article'?'articles':state.view))link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}});}
 function routeURL(view,id,query=''){const url=new URL(routeFiles[view]||'404.html',rootURL);if(view==='article')url.searchParams.set('id',id);if(query)url.searchParams.set('q',query);return url;}
 function navigate(view,id,options={}){
  const target=routeURL(view,id,options.query||'');if(options.category)target.searchParams.set('category',options.category);
  if(!options.replace){try{history.replaceState({...history.state,scroll:scrollY},'',location.href);}catch(error){}}
  const historyFunction=options.replace?'replaceState':'pushState';
  try{history[historyFunction]({scroll:0},'',target.href);}catch(error){const local=new URL(location.href);local.hash='view='+encodeURIComponent(view)+(view==='article'?'&id='+encodeURIComponent(id):'')+(options.query?'&q='+encodeURIComponent(options.query):'')+(options.category?'&category='+encodeURIComponent(options.category):'');history[historyFunction]({scroll:0},'',local.href);}
  render(parseRoute(),true);window.scrollTo({top:0,behavior:'instant'});
 }
 function render(route,focus=false){
  if(revealObserver)revealObserver.disconnect();if(articleObserver)articleObserver.disconnect();
  Object.assign(state,route);document.body.classList.remove('focus-reading');document.body.dataset.view=state.view;
  const renderer=T[state.view]||T.notFound;
  app.innerHTML=state.view==='article'?T.article(ctx,state.id):renderer(ctx);
  document.getElementById('footer-root').innerHTML=T.footer(ctx);
  const current=P.find(post=>post.id===state.id);
  const title=state.view==='article'?(current?current.title:'文章未找到'):({home:'首页',articles:'文章',library:'学习库',about:'关于我'}[state.view]||'页面未找到');
  document.title=title+' · Zephyr 的个人博客';
  updateNav();updateBookmarks();bindPage();updatePlayerUI();updateClock();startReveal();updateProgress();
  document.dispatchEvent(new CustomEvent('zephyr:page',{detail:{view:state.view}}));if(focus)app.focus({preventScroll:true});
 }
 function bindPage(){
  const search=document.querySelector('[data-article-search]');
  if(search){search.value=state.query;document.querySelectorAll('button[data-category]').forEach(button=>button.addEventListener('click',()=>{state.category=button.dataset.category;filterPosts();}));search.addEventListener('input',()=>{state.query=search.value;clearTimeout(filterTimer);filterTimer=setTimeout(filterPosts,90);});document.querySelectorAll('[data-reset-filters]').forEach(button=>button.addEventListener('click',()=>{state.query='';state.category='全部';search.value='';filterPosts();search.focus();}));filterPosts(false);}
  document.querySelectorAll('[data-tilt]').forEach(card=>{
   if(!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
   card.addEventListener('pointermove',event=>{if(reduced.matches)return;const r=card.getBoundingClientRect();card.style.setProperty('--rx',((.5-(event.clientY-r.top)/r.height)*3).toFixed(2)+'deg');card.style.setProperty('--ry',(((event.clientX-r.left)/r.width-.5)*4).toFixed(2)+'deg');});
   card.addEventListener('pointerleave',()=>{card.style.setProperty('--rx','0deg');card.style.setProperty('--ry','0deg');});
  });
  document.querySelectorAll('.article-body pre').forEach(pre=>{const button=document.createElement('button');button.type='button';button.className='code-copy';button.textContent='复制';button.setAttribute('data-copy-code','');pre.append(button);});
 }
 function updateFilterURL(){const url=new URL(location.href);if(location.protocol==='file:'){const hash=new URLSearchParams(url.hash.slice(1));hash.set('view','articles');state.query?hash.set('q',state.query):hash.delete('q');state.category!=='全部'?hash.set('category',state.category):hash.delete('category');url.hash=hash.toString();}else{state.query?url.searchParams.set('q',state.query):url.searchParams.delete('q');state.category!=='全部'?url.searchParams.set('category',state.category):url.searchParams.delete('category');}try{history.replaceState({...history.state},'',url.href);}catch(error){}}
 function filterPosts(animate=true){
  if(!['全部','前端','Python','后端','AI','已收藏'].includes(state.category))state.category='全部';
  const keywords=state.query.trim().toLowerCase().split(/\s+/).filter(Boolean);let count=0;const visible=[];
  document.querySelectorAll('[data-post-card]').forEach(card=>{const match=(state.category==='全部'||(state.category==='已收藏'?bookmarks.has(card.dataset.postId):card.dataset.category===state.category))&&keywords.every(word=>card.dataset.search.toLowerCase().includes(word));card.hidden=!match;if(match){count++;visible.push(card);}});
  document.querySelectorAll('button[data-category]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.category===state.category)));
  document.querySelector('[data-result-count]').textContent='找到 '+count+' 篇文章';document.querySelector('[data-post-grid]').hidden=count===0;document.querySelector('[data-empty-posts]').hidden=count!==0;
  document.querySelector('.article-result-line [data-reset-filters]').hidden=!state.query&&state.category==='全部';updateFilterURL();
  if(animate&&motion&&!reduced.matches&&visible.length)motion.animate(visible,{opacity:[.5,1],y:[7,0]},{duration:.25,delay:motion.stagger(.025)});
 }
 function updateBookmarks(){document.querySelectorAll('[data-bookmark]').forEach(button=>{const isSaved=bookmarks.has(button.dataset.bookmark);button.setAttribute('aria-pressed',String(isSaved));const post=P.find(item=>item.id===button.dataset.bookmark);button.setAttribute('aria-label',(isSaved?'取消收藏文章：':'收藏文章：')+(post?post.title:''));});}
 function toggleBookmark(id){bookmarks.has(id)?bookmarks.delete(id):bookmarks.add(id);save('zephyr-blog-bookmarks',JSON.stringify([...bookmarks]));updateBookmarks();if(state.view==='articles'&&state.category==='已收藏')filterPosts(false);toast(bookmarks.has(id)?'已加入收藏，下次可以从文章页找到。':'已取消收藏。');}
 function startReveal(){
  const elements=[...app.querySelectorAll('[data-reveal]')];
  if(!motion||reduced.matches||!('IntersectionObserver'in window))return;
  revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){motion.animate(entry.target,{opacity:[0,1],y:[18,0],filter:['blur(5px)','blur(0px)']},{duration:.65,ease:[.22,1,.36,1]});revealObserver.unobserve(entry.target);}}),{threshold:.08});elements.forEach(element=>revealObserver.observe(element));
 }
 function updateProgress(){const progress=document.querySelector('[data-reading-progress]');if(progress){const distance=document.documentElement.scrollHeight-innerHeight;progress.style.width=(distance>0?Math.min(100,scrollY/distance*100):0)+'%';}}
 window.addEventListener('scroll',updateProgress,{passive:true});
 function updateThemeButton(){const dark=document.documentElement.dataset.theme==='dark';document.querySelectorAll('[data-theme-toggle]').forEach(button=>{button.innerHTML=T.icon(dark?'sun':'moon');button.setAttribute('aria-label',dark?'切换到浅色模式':'切换到深色模式');button.setAttribute('aria-pressed',String(dark));});}
 function toggleTheme(event){const apply=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;save('zephyr-blog-theme',next);document.querySelector('meta[name="theme-color"]').content=next==='dark'?'#111112':'#fafaf8';updateThemeButton();};if(document.startViewTransition&&!reduced.matches){document.startViewTransition(apply);}else apply();}
 function updateClock(){const now=new Date(),clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);document.querySelectorAll('[data-clock]').forEach(node=>{node.textContent=clock;node.dateTime=now.toISOString();});const dateText=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',weekday:'short',day:'2-digit',month:'short'}).format(now).toUpperCase();document.querySelectorAll('[data-clock-date]').forEach(node=>node.textContent=dateText+' / BEIJING');const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'numeric',hour12:false}).format(now)),m=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',minute:'numeric'}).format(now)),s=now.getSeconds();document.querySelectorAll('.clock-hand.hour').forEach(node=>node.style.transform=`rotate(${h*30+m*.5}deg)`);document.querySelectorAll('.clock-hand.minute').forEach(node=>node.style.transform=`rotate(${m*6+s*.1}deg)`);document.querySelectorAll('.clock-hand.second').forEach(node=>node.style.transform=`rotate(${s*6}deg)`);}
 setInterval(()=>{if(!document.hidden)updateClock();},1000);

 // 单个全站音频元素不随页面内容替换，因此站内跳转不会中断播放。
 const tracks=C.music.map(track=>({...track,src:asset(track.src)}));
 const seek=document.getElementById('music-seek'),volume=document.getElementById('music-volume');
 let lastVolume=.45;const savedVolume=Number(saved('zephyr-blog-volume'));if(saved('zephyr-blog-volume')!==null&&Number.isFinite(savedVolume))lastVolume=Math.max(0,Math.min(1,savedVolume));audio.volume=lastVolume;volume.value=String(lastVolume);
 const currentTrack=()=>state.customTrack||tracks[state.track];
 function formatTime(seconds){const number=Number.isFinite(seconds)?Math.max(0,Math.floor(seconds)):0;return Math.floor(number/60)+':'+String(number%60).padStart(2,'0');}
 function updatePlayerUI(){const track=currentTrack(),playing=!audio.paused&&!audio.ended;document.body.classList.toggle('is-playing',playing);document.querySelectorAll('[data-track-title]').forEach(node=>node.textContent=track.title);document.querySelectorAll('[data-track-subtitle]').forEach(node=>node.textContent=track.subtitle);document.querySelectorAll('[data-music-toggle]').forEach(button=>{button.innerHTML=T.icon(playing?'pause':'play');button.setAttribute('aria-label',playing?'暂停音乐':'播放音乐');});document.querySelectorAll('[data-playback-label]').forEach(node=>node.textContent=playing?'正在播放':'点击播放');document.querySelector('[data-mini-player]').hidden=!playing;document.querySelectorAll('.playlist-item').forEach((button,index)=>button.setAttribute('aria-current',String(!state.customTrack&&index===state.track)));document.querySelector('[data-mute]').innerHTML=T.icon(audio.muted||audio.volume===0?'mute':'volume');document.querySelector('[data-mute]').setAttribute('aria-label',audio.muted||audio.volume===0?'取消静音':'静音');updateAudioProgress();}
 function updateAudioProgress(){const duration=Number.isFinite(audio.duration)?audio.duration:(currentTrack().duration||0);seek.max=String(duration||1);if(document.activeElement!==seek)seek.value=String(audio.currentTime||0);document.querySelector('[data-current-time]').textContent=formatTime(audio.currentTime);document.querySelector('[data-duration]').textContent=formatTime(duration);seek.setAttribute('aria-valuetext',formatTime(audio.currentTime)+' / '+formatTime(duration));}
 function loadTrack(index,autoplay=false){state.customTrack=null;state.track=(index+tracks.length)%tracks.length;audio.src=tracks[state.track].src;audio.load();updatePlayerUI();if(autoplay)playAudio();}
 async function playAudio(){try{await audio.play();updatePlayerUI();}catch(error){toast('浏览器暂时未能播放，请再点击一次播放按钮。');updatePlayerUI();}}
 function toggleAudio(){audio.paused?playAudio():audio.pause();}
 function changeTrack(delta){loadTrack(state.track+delta,!audio.paused);}
 document.querySelector('[data-playlist]').innerHTML=tracks.map((track,index)=>`<button class="playlist-item" type="button" data-play-track="${index}" aria-current="${index===0}"><span class="playlist-index">0${index+1}</span><span>${T.e(track.title)}<small>${T.e(track.subtitle)}</small></span>${T.icon('play')}</button>`).join('');
 audio.addEventListener('play',updatePlayerUI);audio.addEventListener('pause',updatePlayerUI);audio.addEventListener('ended',()=>loadTrack(state.track+1,true));audio.addEventListener('loadedmetadata',updateAudioProgress);audio.addEventListener('timeupdate',updateAudioProgress);audio.addEventListener('volumechange',updatePlayerUI);audio.addEventListener('error',()=>{if(audio.currentSrc)toast('音频没有加载成功，可以选择本地音乐继续播放。');});
 seek.addEventListener('input',()=>{if(Number.isFinite(audio.duration))audio.currentTime=Number(seek.value);updateAudioProgress();});volume.addEventListener('input',()=>{audio.volume=Number(volume.value);audio.muted=false;save('zephyr-blog-volume',volume.value);updatePlayerUI();});
 document.getElementById('local-music').addEventListener('change',event=>{const file=event.target.files[0];if(!file)return;if(!file.type.startsWith('audio/')&&!/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)){toast('请选择一个音频文件。');return;}if(localAudioURL)URL.revokeObjectURL(localAudioURL);localAudioURL=URL.createObjectURL(file);state.customTrack={title:file.name.replace(/\.[^.]+$/,''),subtitle:'本地音乐 · 仅在当前浏览器播放',src:localAudioURL};audio.src=localAudioURL;audio.load();updatePlayerUI();playAudio();});
 loadTrack(0,false);

 const searchDialog=document.getElementById('search-dialog'),searchInput=document.getElementById('command-search'),commandResults=document.querySelector('[data-command-results]');
 function commandMarkup(){const query=searchInput.value.trim().toLowerCase(),matches=P.filter(post=>(post.title+' '+post.excerpt+' '+post.tags.join(' ')).toLowerCase().includes(query));const quick=[{title:'返回首页',subtitle:'从这里重新开始',action:'home',icon:'home'},{title:'我的学习库',subtitle:'打开你的数字花园',action:'library-external',icon:'library'},{title:'音乐播放器',subtitle:'给阅读配一点声音',action:'music',icon:'headphones'},{title:'立体小实验',subtitle:'拖动旋转，换个角度看',action:'scene',icon:'cube'},{title:'切换黑白主题',subtitle:'换一个舒适的阅读背景',action:'theme',icon:'sun'}].filter(item=>!query||(item.title+' '+item.subtitle).toLowerCase().includes(query));commandResults.innerHTML=(matches.length?'<p class="command-section-label">ARTICLES</p>'+matches.map(post=>`<button class="command-item" type="button" data-command-article="${post.id}">${T.icon('file')}<span>${T.e(post.title)}<small>${T.e(post.category)} · ${post.date}</small></span><span class="command-type">文章</span></button>`).join(''):'')+(quick.length?'<p class="command-section-label">QUICK ACTIONS</p>'+quick.map(item=>`<button class="command-item" type="button" data-command-action="${item.action}">${T.icon(item.icon)}<span>${T.e(item.title)}<small>${T.e(item.subtitle)}</small></span></button>`).join(''):'')+(!matches.length&&!quick.length?'<p class="command-empty">没有找到结果，试试 HTML、Python 或 AI。</p>':'');}
 function openSearch(){searchInput.value='';commandMarkup();searchDialog.showModal();searchInput.focus();}
 searchInput.addEventListener('input',commandMarkup);
 searchDialog.addEventListener('keydown',event=>{if(!['ArrowDown','ArrowUp','Enter'].includes(event.key))return;const items=[...commandResults.querySelectorAll('button')];if(!items.length)return;let index=items.indexOf(document.activeElement);if(event.key==='Enter'&&document.activeElement===searchInput){event.preventDefault();items[0].click();}else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();index=index<0?(event.key==='ArrowDown'?0:items.length-1):(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[index].focus();}});
 const openDialog=id=>{const dialog=document.getElementById(id);if(!dialog.open)dialog.showModal();};
 document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}));
 document.addEventListener('keydown',event=>{const editable=event.target instanceof Element&&event.target.closest('input,textarea,[contenteditable=true]');if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();searchDialog.open?searchDialog.close():openSearch();}else if(event.key==='/'&&!editable&&!document.querySelector('dialog[open]')){event.preventDefault();openSearch();}});

 // 真正的三维实验按需加载，首页阅读不持续消耗 WebGL。
 const sceneDialog=document.getElementById('scene-dialog');
 async function openScene(){sceneDialog.showModal();if(!state.sceneLoaded){state.sceneLoaded=true;const script=document.createElement('script');script.src=asset('js/scene.js');script.onerror=()=>{document.querySelector('[data-scene-status]').textContent='当前展示静态作品，实时场景未能启动。';};document.body.appendChild(script);}else if(window.OrbitScene)window.OrbitScene.setPaused(state.scenePaused);}
 window.addEventListener('orbit-ready',event=>{document.querySelector('[data-scene-preview]').hidden=event.detail.webgl;if(!event.detail.webgl){document.querySelector('[data-scene-status]').textContent='当前浏览器展示静态作品。';document.querySelector('[data-scene-pause]').disabled=true;document.querySelector('[data-scene-reset]').disabled=true;}else{window.OrbitScene.setMode('chrome');window.OrbitScene.setPaused(state.scenePaused||!sceneDialog.open);document.querySelector('[data-scene-pause]').textContent=state.scenePaused?'继续':'暂停';}});
 sceneDialog.addEventListener('close',()=>{if(window.OrbitScene)window.OrbitScene.setPaused(true);});

 async function copy(text){try{await navigator.clipboard.writeText(text);return true;}catch(error){const area=document.createElement('textarea');area.value=text;area.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(area);area.select();let success=false;try{success=document.execCommand('copy');}catch(error){}area.remove();return success;}}
 document.addEventListener('click',async event=>{
  const target=event.target instanceof Element?event.target:null;if(!target)return;
  const routeLink=target.closest('a[data-route]');if(routeLink&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&event.button===0){event.preventDefault();const linkURL=new URL(routeLink.href);navigate(routeLink.dataset.route,linkURL.searchParams.get('id')||P[0].id,{query:linkURL.searchParams.get('q')||'',category:linkURL.searchParams.get('category')||''});return;}
  const toc=target.closest('[data-toc-link]');if(toc){event.preventDefault();let id=toc.getAttribute('href').slice(1);try{id=decodeURIComponent(id);}catch(error){}const heading=document.getElementById(id);if(heading)heading.scrollIntoView({behavior:reduced.matches?'instant':'smooth'});return;}
  const bookmark=target.closest('[data-bookmark]');if(bookmark){toggleBookmark(bookmark.dataset.bookmark);return;}
  if(target.closest('[data-theme-toggle]')){toggleTheme(event);return;}
  if(target.closest('[data-open-search]')){openSearch();return;}
  if(target.closest('[data-open-music]')){openDialog('music-dialog');return;}
  if(target.closest('[data-music-toggle]')){toggleAudio();return;}
  if(target.closest('[data-next-track]')){changeTrack(1);return;}
  if(target.closest('[data-previous-track]')){changeTrack(-1);return;}
  const playlist=target.closest('[data-play-track]');if(playlist){loadTrack(Number(playlist.dataset.playTrack),true);return;}
  if(target.closest('[data-mute]')){if(audio.muted||audio.volume===0){audio.muted=false;if(audio.volume===0){audio.volume=.45;volume.value='.45';save('zephyr-blog-volume','.45');}}else audio.muted=true;updatePlayerUI();return;}
  const close=target.closest('[data-close-dialog]');if(close){document.getElementById(close.dataset.closeDialog).close();return;}
  const commandPost=target.closest('[data-command-article]');if(commandPost){searchDialog.close();navigate('article',commandPost.dataset.commandArticle);return;}
  const command=target.closest('[data-command-action]');if(command){searchDialog.close();const action=command.dataset.commandAction;if(action==='home')navigate('home');if(action==='library-external')window.open(C.library,'_blank','noopener,noreferrer');if(action==='music')openDialog('music-dialog');if(action==='scene')openScene();if(action==='theme')toggleTheme(event);return;}
  if(target.closest('[data-open-scene]')){openScene();return;}
  if(target.closest('[data-scene-pause]')){state.scenePaused=!state.scenePaused;if(window.OrbitScene)window.OrbitScene.setPaused(state.scenePaused);const button=document.querySelector('[data-scene-pause]');button.textContent=state.scenePaused?'继续':'暂停';button.setAttribute('aria-pressed',String(state.scenePaused));return;}
  if(target.closest('[data-scene-reset]')){if(window.OrbitScene)window.OrbitScene.reset();return;}
  const share=target.closest('[data-share-article]');if(share){toast(await copy(share.dataset.shareArticle)?'原文链接已复制。':'浏览器未允许复制，请从原文页面复制地址。');return;}
  if(target.closest('[data-focus-mode]')){const enabled=document.body.classList.toggle('focus-reading');target.closest('[data-focus-mode]').setAttribute('aria-pressed',String(enabled));return;}
  const code=target.closest('[data-copy-code]');if(code){const clone=code.closest('pre').cloneNode(true);clone.querySelectorAll('button').forEach(button=>button.remove());toast(await copy(clone.textContent.trim())?'代码已复制。':'请选中代码后按 Ctrl+C。');return;}
 });
 window.addEventListener('popstate',()=>{render(parseRoute(),true);window.scrollTo({top:history.state?.scroll||0,behavior:'instant'});});
 if(motion&&matchMedia('(hover:hover) and (pointer:fine)').matches){const dock=document.querySelector('.dock'),items=[...dock.querySelectorAll('[data-dock-item]')];dock.addEventListener('pointermove',event=>{if(reduced.matches)return;items.forEach(item=>{const r=item.getBoundingClientRect(),distance=Math.abs(event.clientX-(r.left+r.width/2)),strength=Math.max(0,1-distance/100);motion.animate(item,{scale:1+strength*.24,y:-strength*5},{type:'spring',stiffness:350,damping:25});});});dock.addEventListener('pointerleave',()=>items.forEach(item=>motion.animate(item,{scale:1,y:0},{type:'spring',stiffness:350,damping:25})));}
 updateThemeButton();render(parseRoute());
}());
