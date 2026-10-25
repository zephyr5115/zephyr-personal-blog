import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(fs.readFileSync(path.join(project,'content/site.json'),'utf8'));
const posts=JSON.parse(fs.readFileSync(path.join(project,'content/posts.json'),'utf8'));
fs.writeFileSync(path.join(project,'js/data.js'),'/* 已核对的 CSDN 公开文章快照。 */\nwindow.BLOG_CONFIG='+JSON.stringify(config,null,2)+';\nwindow.BLOG_POSTS='+JSON.stringify(posts,null,2)+';\n');
const context=vm.createContext({});context.window=context;
vm.runInContext(fs.readFileSync(path.join(project,'js/templates.js'),'utf8'),context);
const T=context.BlogTemplates,ctx={config,posts,root:''},I=T.icon,E=T.e;
function shell(content,title,view){return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
 <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
 <meta name="description" content="${E(config.description)}"><meta name="theme-color" content="#fafaf8">
 <meta property="og:title" content="${E(title)} · Zephyr"><meta property="og:description" content="${E(config.description)}"><meta property="og:type" content="website">
 <title>${E(title)} · Zephyr 的个人博客</title><link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
 <script src="js/theme.js"></script><link rel="stylesheet" href="css/style.css">
 <script src="assets/vendor/motion.js" defer></script><script src="js/data.js" defer></script><script src="js/templates.js" defer></script><script src="js/main.js" defer></script>
</head>
<body data-initial-view="${view}">
 <a class="skip-link" href="#app">跳到主要内容</a>
 <header class="site-header"><div class="container header-inner"><a class="brand" href="index.html" data-route="home" aria-label="Zephyr 个人博客首页"><img src="assets/avatar.png" alt="" width="30" height="30"><span class="brand-name">zephyr<b>.</b><span class="brand-small">NOTES ON LEARNING & LIFE</span></span></a><nav class="top-nav" aria-label="顶部导航"><a href="articles.html" data-route="articles">文章</a><a href="library.html" data-route="library">学习库</a><a href="about.html" data-route="about">关于我</a></nav><div class="header-tools"><button class="header-search" type="button" data-open-search aria-label="搜索文章或打开快捷入口">${I('search')}<kbd>Ctrl K</kbd></button><button class="icon-button" type="button" data-theme-toggle aria-label="切换到深色模式" aria-pressed="false">${I('moon')}</button></div></div></header>
 <main id="app" tabindex="-1">${content}</main>
 <div id="footer-root">${T.footer(ctx)}</div>
 <div class="dock-wrap"><nav class="dock" aria-label="主导航">${[['home','index.html','home','首页'],['articles','articles.html','book','文章'],['library','library.html','library','学习库'],['about','about.html','person','关于我']].map(([key,href,icon,label])=>`<a class="dock-item" href="${href}" data-route="${key}" data-dock-item aria-label="${label}">${I(icon)}<span>${label}</span></a>`).join('')}<span class="dock-separator" aria-hidden="true"></span><button class="dock-item" type="button" data-open-music data-dock-item aria-label="打开音乐播放器">${I('music')}<span>音乐</span></button><button class="dock-item" type="button" data-open-search data-dock-item aria-label="搜索文章">${I('search')}<span>搜索</span></button></nav></div>
 <aside class="mini-player" aria-label="正在播放的音乐" data-mini-player hidden><span class="equalizer" aria-hidden="true"><i></i><i></i><i></i><i></i></span><button class="mini-player-copy" type="button" data-open-music><strong data-track-title>Quiet Pages</strong><span>OPEN MUSIC PLAYER</span></button><button class="round-play" type="button" data-music-toggle aria-label="暂停音乐">${I('pause')}</button></aside>
 <audio id="site-audio" preload="metadata"></audio>
 <dialog class="dialog-base search-dialog" id="search-dialog" aria-label="搜索文章与快捷入口"><div class="command-input-row">${I('search')}<input type="search" id="command-search" placeholder="搜索文章，或者去一个地方…" aria-label="搜索文章与快捷入口" autocomplete="off"><button class="escape-key" type="button" data-close-dialog="search-dialog" aria-label="关闭搜索">ESC</button></div><div class="command-results" data-command-results></div><div class="command-footer"><span>↑ ↓ 选择 · Enter 打开</span><span>Ctrl / ⌘ + K</span></div></dialog>
 <dialog class="dialog-base music-dialog" id="music-dialog" aria-labelledby="music-heading"><div class="dialog-topbar"><p class="eyebrow">A SOUNDTRACK FOR SMALL MOMENTS</p><button class="icon-button" type="button" data-close-dialog="music-dialog" aria-label="关闭音乐播放器">${I('close')}</button></div><div class="music-dialog-content"><div class="record record-large" aria-hidden="true"><span>Z</span></div><div class="music-panel-info"><h2 id="music-heading" data-track-title>Quiet Pages</h2><p data-track-subtitle>原创氛围音乐 · 安静翻页</p><div class="player-progress"><label class="sr-only" for="music-seek">播放进度</label><input type="range" min="0" max="48" step="0.1" value="0" id="music-seek"><div class="player-time"><span data-current-time>0:00</span><span data-duration>0:48</span></div></div><div class="main-player-controls"><button type="button" data-previous-track aria-label="上一首">${I('prev')}</button><button class="player-big-play" type="button" data-music-toggle aria-label="播放音乐">${I('play')}</button><button type="button" data-next-track aria-label="下一首">${I('next')}</button></div><div class="player-volume"><button type="button" data-mute aria-label="静音">${I('volume')}</button><label class="sr-only" for="music-volume">音量</label><input type="range" min="0" max="1" step="0.01" value="0.45" id="music-volume"></div></div></div><div class="playlist"><div class="playlist-label"><span>THE LITTLE PLAYLIST</span><label class="local-music-label">${I('file')} 播放本地音乐<input class="sr-only" type="file" id="local-music" accept="audio/*"></label></div><div data-playlist></div></div><p class="music-disclaimer">两段音轨为本站原创氛围音乐。你也可以选择本地音乐，仅在当前浏览器播放，不会上传。</p></dialog>
 <dialog class="dialog-base scene-dialog" id="scene-dialog" aria-label="立体实验空间"><div class="scene-top"><p class="eyebrow">ZEPHYR / A LITTLE EXPERIMENT</p><button class="icon-button" type="button" data-close-dialog="scene-dialog" aria-label="关闭立体实验">${I('close')}</button></div><div class="scene-container"><canvas id="orbit-canvas" aria-label="可拖动旋转的黑白镜面雕塑"></canvas><div class="scene-preview" data-scene-preview><img src="assets/sculpture.png" alt="黑白镜面雕塑预览"></div></div><div class="scene-bottom"><span data-scene-status>拖动旋转 · 双击回到初始视角</span><div><button class="scene-control" type="button" data-scene-pause aria-pressed="false">暂停</button><button class="scene-control" type="button" data-scene-reset>重置</button></div></div></dialog>
 <div class="toast" role="status" data-toast hidden></div>
 <noscript><div class="container"><p>启用 JavaScript 可使用搜索、播放器和动画；页面链接和已展示文章仍可直接访问。</p></div></noscript>
</body></html>`;}
for(const [file,title,view,content] of [['index.html','首页','home',T.home(ctx)],['articles.html','文章','articles',T.articles(ctx)],['article.html','阅读文章','article',T.article(ctx,posts[0].id)],['library.html','学习库','library',T.library(ctx)],['about.html','关于我','about',T.about(ctx)],['404.html','页面未找到','404',T.notFound(ctx)]])fs.writeFileSync(path.join(project,file),shell(content,title,view));
fs.writeFileSync(path.join(project,'.nojekyll'),'');
fs.writeFileSync(path.join(project,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: '+config.siteUrl+'sitemap.xml\n');
fs.writeFileSync(path.join(project,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['','articles.html','library.html','about.html',...posts.map(post=>'article.html?id='+post.id)].map(file=>'<url><loc>'+config.siteUrl+file+'</loc></url>').join('')+'</urlset>');
console.log(JSON.stringify({pages:6,posts:posts.length,siteUrl:config.siteUrl}));
