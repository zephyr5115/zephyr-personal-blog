# Zephyr · 黑白个人宇宙 / 视频参考改版

为 Zephyr 制作的个人博客展示网站。纯 HTML、CSS 和 JavaScript，直接打开即可浏览，也可免费部署到 GitHub Pages。

2026-10-26 改版参考用户指定的视频，在同一作者的 Bilibili 公开版本实际播放并逐段核对画面。新增立体个人名片、Bento 卡片、真实数字动画与可驾驶的小世界，保留黑白主题和现有内容。设计依据与时间点见 [REFERENCES.md](REFERENCES.md)。

## 本地打开

双击 `index.html`，或在 VS Code 中用 Live Server 打开。无需安装 npm 依赖。

页面包括：首页、文章列表、文章阅读、学习库、关于我，以及 404 页面。手机和电脑均可使用。底部悬浮导航用于站内切换；Ctrl+K 打开全站快捷搜索。

## 已接入的个人内容

- 昵称：Zephyr；CSDN：ZephyrHY；GitHub：zephyr5115。
- 头像使用该 GitHub 账号的真实公开头像，本地保存并以灰度显示。该账号目前是默认图案头像，可直接替换 `assets/avatar.png`。
- 学习库：https://zhiyu-learning-library.stormyeagle129.chatgpt.site/
- 根据公开 CSDN RSS 收录 6 篇真实文章的标题、日期、摘要与原文链接。2026-10-25 获取。
- HTML5 笔记已收录完整正文；其余 5 篇明确标注为摘要，点击按钮在 CSDN 阅读全文。未编造文章正文、个人经历、阅读量或关注数。

文章数据是静态快照，发布后不会自动同步 CSDN。可以用下方的手动同步命令检查并添加新文章摘要。

## 音乐和交互

内置两首为本项目合成的原创环境音轨 Quiet Pages / After the Code，各 48 秒，没有引用第三方音乐录音。支持播放、暂停、上下首、音量、静音、进度拖动与本地歌曲选择。不会自动播放。浏览时通过站内链接切换页面，音乐继续播放；刷新或新开标签页会重新加载。

本地歌曲只在浏览器中通过临时 URL 播放，不会上传。主题、收藏和音量使用浏览器 localStorage 保存，因此不同设备不会自动同步。

首页名片可翻转查看个人链接，鼠标移动会改变卡片透视；鼠标停留或键盘操作时暂停漂浮，方便点击。Bento 卡片包含真实文章数、学习库、唱片播放器和北京时间；下方的主题分布来自已经收录的 6 篇文章，可以点击进入对应分类。

首页的小世界使用本地 Three.js r180 和原创几何模型实现真实 WebGL。使用方向键 / WASD 驾驶小车，靠近站点按 Enter 打开文章、学习库、音乐或关于我；可点击地面行驶，拖动调整视角。手机支持屏幕方向按钮，四个快捷入口始终可直接使用。场景按需加载，离开视野暂停连续绘制，离开首页释放显存，并尊重系统“减少动态效果”设置。无 WebGL 时保留预览和可用的导航入口。

关于页保留原有镜面雕塑实验。文章支持分类、搜索、收藏、目录、代码复制和专注阅读。

## 文件结构和修改方法

| 位置 | 用途 |
| --- | --- |
| `content/site.json` | 名称、头像、个人链接、音乐列表和部署网址 |
| `content/posts.json` | 文章元数据、原文链接、正文和封面 |
| `js/templates.js` | 各页面的 HTML 模板 |
| `js/main.js` | 路由、播放器、收藏、搜索等交互 |
| `js/experience.js` | 名片透视、翻面、计数及三维场景的加载和释放 |
| `js/world.js` | 已打包的 Three.js 和原创小世界，直接可运行 |
| `scripts/world-source.js` | 可编辑的三维世界源码 |
| `css/style.css` | 黑白主题与响应式布局 |
| `css/experience.css` | 新版首页、立体名片与三维世界布局 |
| `assets/` | 本地头像、原创封面、音乐与动画库 |
| `scripts/build.mjs` | 将内容和模板生成静态 HTML |
| `scripts/deploy.ps1` | 通过本机 Git Credential Manager 发布 GitHub Pages |

修改 `content/site.json` 或 `content/posts.json` 后，需要安装 Node.js，然后在项目文件夹运行：

```powershell
node scripts/build.mjs
```

不需要执行 npm install。生成的 HTML 已包含首页及阅读内容，JavaScript 提供进一步的导航与交互。其他文章可用 `article.html?id=文章ID` 直接访问。

只有修改 `scripts/world-source.js` 的三维模型或驾驶逻辑时，才需要额外运行以下开发命令。库版本已经固定在 `package.json` 中，普通内容编辑无需此步骤：

```powershell
npm install
npm run build:world
```

新增文章时复制现有记录，填写唯一 `id`、`title`、`url`、`date`、`category`、`tags`、`excerpt`、`cover` 等字段。本站有全文时设置 `fullText: true` 并在 `html` 中放置经过清理的正文；只有摘要时设置 `fullText: false` 和空 `html`。不要直接插入第三方脚本。分类可使用“前端”“Python”“后端”“AI”。

### 从 CSDN 添加新文章

在 VS Code 的 PowerShell 终端运行以下命令。第一条只预览新文章，确认后再运行第二条写入；第三条重新生成网站。已有文章的正文、分类、标签和封面不会被覆盖。新文章先放在“其他”分类、展示 RSS 摘要并链接 CSDN 原文；可在 `content/posts.json` 中自行调整分类和封面。同步器不删除已有文章，也不会自动上传或发布。

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync-csdn.ps1
powershell -ExecutionPolicy Bypass -File scripts/sync-csdn.ps1 -Apply
node scripts/build.mjs
```

检查网页无误后，再在 VS Code 源代码管理中提交并推送，GitHub Pages 才会更新。网络不可用或 RSS 格式异常时脚本会停止，保留原文件。

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

网站已有公开仓库后，在新电脑上应先 `git clone https://github.com/zephyr5115/zephyr-personal-blog.git`，再修改、构建、提交和普通推送。不要从新解压的非 Git 文件夹覆盖已有仓库。F:\html\Zephyr黑白博客 的工作副本会保留 Git 连接，方便在 VS Code 更新。

## 来源与许可

设计参考和依赖详情见 [REFERENCES.md](REFERENCES.md)。Motion 14.6.0 与 Three.js r180 均为本地资源，MIT 许可证分别随附在 `assets/vendor/MOTION-LICENSE.txt` 和 `assets/vendor/THREE-LICENSE.txt`。三维场景、页面、SVG 封面与音轨由本项目实现。个人文章、头像和提供的九宫格素材仍归相应权利人所有；本站没有把它们声明为公共素材。

## 验证

已用 Edge/Playwright 检查：21 项新增体验、47 项原有功能，以及 5 个页面 × 5 个屏幕宽度（320、390、768、1024、1440 像素）。新场景验证了小车真实位移、靠近站点后 Enter 跳转、触屏方向按钮、视角拖动、暂停/重置、离屏停止、路由切换释放资源及减少动态效果。原有音频和文章检查通过，并人工查看桌面和手机截图。
