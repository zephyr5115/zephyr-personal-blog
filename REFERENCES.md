# 设计参考与依赖

这套网站采用原创的黑白排版与组件实现，没有整体复制某个商业模板。参考网站用于观察布局、交互和阅读方式。

| 官方来源 | 本项目吸收的思路 |
| --- | --- |
| [Framer 博客模板](https://www.framer.com/marketplace/templates/categories/blogs/) | 大字号首屏、编辑式文章区、充足留白 |
| [Awwwards 作品集](https://www.awwwards.com/websites/portfolio/) | 个人身份展示、克制的动态反馈 |
| [Magic UI Dock](https://magicui.design/docs/components/dock) / [GitHub](https://github.com/magicuidesign/magicui) | 底部导航随指针弹性放大的交互模式 |
| [Aceternity Floating Dock](https://ui.aceternity.com/components/floating-dock) | 图标工具栏与悬停提示的组织方式 |
| [Cult UI](https://www.cult-ui.com/) | 小组件的细节、卡片分组与层次 |
| [Bootstrap Blog](https://getbootstrap.com/docs/5.3/examples/blog/) | 文章列表、栏目与阅读侧栏的基本信息结构 |
| [Motion 官方文档](https://motion.dev/docs/quick-start) / [源码](https://github.com/motiondivision/motion) | 实际使用 Motion 14.6.0 的页面显现动画、弹簧 Dock；原生 JavaScript 集成，无需 React |
| [Hugo 部署指南](https://gohugo.io/host-and-deploy/deploy-to-github-pages/) | 静态博客托管流程参考；本项目无需安装 Hugo |
| [GitHub Pages 官方教程](https://docs.github.com/en/pages/quickstart) | 采用免费静态托管与项目仓库地址 |
| [GitHub Pages REST API](https://docs.github.com/en/rest/pages/pages) | 脚本配置 main 分支根目录发布 |

用户给出的 Bilibili 教程 [BV1z1az6oEbF](https://www.bilibili.com/video/BV1z1az6oEbF/) 和 [BV1D21uYaEeR](https://www.bilibili.com/video/BV1D21uYaEeR/) 在当前环境未能完整读取，部署步骤以 GitHub 官方文档为准。抖音参考链接仅取得公开落地页标题，未读取完整视频，未声称复刻视频细节。

## 内容来源

- 用户博客：[ZephyrHY 的 CSDN](https://blog.csdn.net/ZephyrHY?type=blog)，[公开 RSS](https://blog.csdn.net/ZephyrHY/rss/list)。
- 文章标题、日期和摘要来自该公开 RSS；HTML5 正文来自用户公开原文。2026-10-25 获取。
- 头像来源：[zephyr5115 的 GitHub 公开头像](https://avatars.githubusercontent.com/u/219789993?v=4)，已保存本地并用 CSS 灰度显示。
- 个人学习库链接由用户确认提供。
- 九宫格演示使用用户先前提供的素材。

## 本地依赖

`assets/vendor/motion.js`：Motion 14.6.0 UMD，MIT License。官网与源码见上表，完整许可证随包提供。没有依赖 CDN 在线加载脚本或字体。
