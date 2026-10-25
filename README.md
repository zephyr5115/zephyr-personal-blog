# Zephyr · 黑白个人博客

为 Zephyr 制作的个人博客展示网站。纯 HTML、CSS 和 JavaScript，直接打开即可浏览，也可免费部署到 GitHub Pages。

## 本地打开

双击 `index.html`，或在 VS Code 中用 Live Server 打开。无需安装 npm 依赖。

页面包括：首页、文章列表、文章阅读、学习库、关于我，以及 404 页面。手机和电脑均可使用。底部悬浮导航用于站内切换；Ctrl+K 打开全站快捷搜索。

## 已接入的个人内容

- 昵称：Zephyr；CSDN：ZephyrHY；GitHub：zephyr5115。
- 头像使用该 GitHub 账号的真实公开头像，本地保存并以灰度显示。该账号目前是默认图案头像，可直接替换 `assets/avatar.png`。
- 学习库：https://zhiyu-learning-library.stormyeagle129.chatgpt.site/
- 根据公开 CSDN RSS 收录 6 篇真实文章的标题、日期、摘要与原文链接。2026-10-25 获取。
- HTML5 笔记已收录完整正文；其余 5 篇明确标注为摘要，点击按钮在 CSDN 阅读全文。未编造文章正文、个人经历、阅读量或关注数。

文章数据是静态快照，发布后不会自动同步 CSDN。更新方法见下文。

## 音乐和交互

内置两首为本项目合成的原创环境音轨 Quiet Pages / After the Code，各 48 秒，没有引用第三方音乐录音。支持播放、暂停、上下首、音量、静音、进度拖动与本地歌曲选择。不会自动播放。浏览时通过站内链接切换页面，音乐继续播放；刷新或新开标签页会重新加载。

本地歌曲只在浏览器中通过临时 URL 播放，不会上传。主题、收藏和音量使用浏览器 localStorage 保存，因此不同设备不会自动同步。

首页头像卡片的“小实验”会按需启动 WebGL 三维雕塑，可以拖动、暂停、重置；关闭即暂停，支持系统“减少动态效果”设置。文章支持分类、搜索、收藏、目录、代码复制和专注阅读。

## 文件结构和修改方法

| 位置 | 用途 |
| --- | --- |
| `content/site.json` | 名称、头像、个人链接、音乐列表和部署网址 |
| `content/posts.json` | 文章元数据、原文链接、正文和封面 |
| `js/templates.js` | 各页面的 HTML 模板 |
| `js/main.js` | 路由、播放器、收藏、搜索等交互 |
| `css/style.css` | 黑白主题与响应式布局 |
| `assets/` | 本地头像、原创封面、音乐与动画库 |
| `scripts/build.mjs` | 将内容和模板生成静态 HTML |
| `scripts/deploy.ps1` | 通过本机 Git Credential Manager 发布 GitHub Pages |

修改 `content/site.json` 或 `content/posts.json` 后，需要安装 Node.js，然后在项目文件夹运行：

```powershell
node scripts/build.mjs
```

不需要执行 npm install。生成的 HTML 已包含首页及阅读内容，JavaScript 提供进一步的导航与交互。其他文章可用 `article.html?id=文章ID` 直接访问。

新增文章时复制现有记录，填写唯一 `id`、`title`、`url`、`date`、`category`、`tags`、`excerpt`、`cover` 等字段。本站有全文时设置 `fullText: true` 并在 `html` 中放置经过清理的正文；只有摘要时设置 `fullText: false` 和空 `html`。不要直接插入第三方脚本。分类可使用“前端”“Python”“后端”“AI”。

## GitHub Pages 部署

此项目配置的仓库名为 `zephyr-personal-blog`，预期网址为 https://zephyr5115.github.io/zephyr-personal-blog/ 。这是配置目标；是否已经上线以实际访问与部署结果为准。

### 由脚本发布

需要 Git、Git Credential Manager、Node.js，并使用 zephyr5115 登录 GitHub。不要把密码或令牌写进网页、脚本或聊天。

```powershell
git credential-manager github login --device --username zephyr5115 --no-ui
node scripts/build.mjs
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1
```

按登录命令提供的 GitHub 地址输入一次性设备代码，在 GitHub 完成授权。脚本从本机凭据管理器读取凭据到内存，核对账号，再创建专用公开仓库、普通推送 main 分支，并把 Pages 发布源设置为 main 的根目录。它不会强制推送，也不会覆盖同名仓库中未知的已有内容。

### 在 GitHub 网页操作

1. 用 zephyr5115 新建公开仓库 `zephyr-personal-blog`。
2. 将本项目全部文件上传到仓库根目录，确保 `index.html` 在根目录，并包含 `.nojekyll`。
3. 打开 Settings → Pages，在 Build and deployment 选择 Deploy from a branch，分支为 main，文件夹为 `/ (root)`，保存。
4. 等待部署完成，打开 Pages 显示的网址。后续普通推送 main 会触发更新。

如果更改仓库名或改用自定义域名，请同步修改 `content/site.json` 的 `siteUrl`，重新构建。网站资源使用相对路径，已验证项目子目录、带文章参数的页面刷新和静态演示页。

## 来源与许可

设计参考和依赖详情见 [REFERENCES.md](REFERENCES.md)。Motion 14.6.0 在本地提供，MIT 许可证随附在 `assets/vendor/MOTION-LICENSE.txt`。页面、SVG 封面与音轨由本项目实现。个人文章、头像和提供的九宫格素材仍归相应权利人所有；本站没有把它们声明为公共素材。

## 验证

已用 Edge/Playwright 检查：47 项交互、5 个页面 × 5 个屏幕宽度（320、390、768、1024、1440 像素）、GitHub Pages 项目子路径与页面刷新。音频验证了真实播放状态、进度、切歌、音量和站内持续播放；三维验证了 WebGL 启动及拖动后的图像变化。人工查看了桌面和手机截图。验证记录见交付目录中的 `zephyr-blog-validation.md`。
