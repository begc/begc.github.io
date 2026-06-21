# 如何新增文章

## 1. 新建 Markdown 文件

在 `content/posts/` 下面新建一个 `.md` 文件，文件名会作为文章 slug。

示例：`content/posts/my-new-note.md`

```md
---
title: '我的新文章'
pubDate: 2026-06-19
description: '这篇文章主要记录什么'
author: 'begc'
cover:
  url: 'https://images.unsplash.com/photo-xxxx?auto=format&fit=crop&w=1200&q=80'
  square: 'https://images.unsplash.com/photo-xxxx?auto=format&fit=crop&w=1200&q=80'
  alt: 'cover'
tags: ["linux", "排障"]
featured: false
---

# 我的新文章

正文内容写在这里。
```

## 2. 图片放哪里

优先用可靠的远程图片地址：

- 封面图：建议用 Unsplash / Pexels / 官方文档图片这类稳定来源。
- 正文截图：如果是自己的截图，建议上传到 GitHub 仓库、对象存储、Cloudflare R2、七牛云、又拍云、Vercel Blob 等稳定位置。
- 不建议继续用临时图床或旧图床，例如 `p.ipic.vip` 这类容易失效的地址。

如果旧正文图失效，页面会显示 `assets/img/article-image-unavailable.svg` 占位图，不会再请求旧图床。

## 3. 重新生成文章索引

本地预览前，在项目根目录运行：

```sh
node scripts/build-public-site.js
```

它会更新：

- `assets/js/posts-data.js`
- `assets/js/posts-content.js`
- `posts/<slug>/index.html`
- `sitemap.xml`
- `robots.txt`

## 4. 发布后会不会自动添加到页面

如果只是把 Markdown 文件放在本地，不会自动出现在公网。

如果你把改动 push 到 GitHub 的 `main` 分支，项目里的 GitHub Actions 会自动运行：

```sh
node scripts/build-public-site.js
```

然后自动发布到 GitHub Pages。也就是说，正常流程是：

1. 在 `content/posts/` 新增 Markdown。
2. 本地可选运行 `node scripts/build-public-site.js` 预览。
3. `git add . && git commit && git push`。
4. GitHub 自动构建，文章自动出现在首页、归档页、专题页、静态文章页和 sitemap。

文章是否上首页取决于 frontmatter 里的：

```md
featured: true
```

设为 `true` 会进入首页精选区域；所有文章都会进入文章归档和 sitemap。

## 5. 更新缓存版本

如果线上页面还在读旧内容，把 HTML 里的资源版本号往上加一版，例如：

```html
assets/js/posts-data.js?v=20260619-11
assets/js/site.js?v=20260619-11
assets/css/site.css?v=20260619-11
```

当前项目没有自动打包工具，所以这个版本号就是最直接的缓存刷新方式。
