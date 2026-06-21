# 发布到公网

## 当前默认方案：GitHub Pages

本站已按 GitHub Pages 用户站点准备，默认公网地址：

```txt
https://begc.github.io/
```

这本身就是 GitHub Pages 提供的免费域名。如果你的 GitHub 用户名仍然是 `begc`，仓库名需要是：

```txt
begc.github.io
```

站点展示名已经改成 `RuiJie Notes`，不会在页面标题里继续显示 `begc.github.io`。

GitHub Pages 适合这个项目，因为本站是纯静态文件，不需要服务器、数据库或后端。

## 发布前构建

新增或修改文章后，在项目根目录运行：

```sh
node scripts/build-public-site.js
```

它会同步生成：

- `assets/js/posts-data.js`
- `assets/js/posts-content.js`
- `posts/<slug>/index.html`
- `sitemap.xml`
- `robots.txt`
- `.nojekyll`

如果部署在 GitHub Pages，仓库里的 `.github/workflows/pages.yml` 会在 push 到 `main` 后自动运行这个命令，不需要你手动到服务器上构建。

## 推到 GitHub

当前本地仓库还没有 remote。创建 GitHub 仓库后执行：

```sh
git remote add origin https://github.com/begc/begc.github.io.git
git add .
git commit -m "Prepare GitHub Pages public blog"
git push -u origin main
```

然后进入 GitHub 仓库：

```txt
Settings -> Pages -> Build and deployment
```

选择：

```txt
Source: GitHub Actions
```

发布后打开：

```txt
https://begc.github.io/
```

## 免费域名选择

### 方案 A：GitHub Pages 免费域名

```txt
begc.github.io
```

优点：最稳定、最省事、无需申请。缺点：看起来像 GitHub 子域。

### 方案 B：is-a.dev 免费子域

如果想让 URL 里也不出现 `begc`，可以申请：

```txt
ruijie.is-a.dev
```

流程是到 `is-a-dev/register` 仓库提交 PR。申请通过后，在 GitHub Pages 的 Custom domain 填：

```txt
ruijie.is-a.dev
```

并在仓库变量里设置：

```txt
SITE_ORIGIN=https://ruijie.is-a.dev
SITE_NAME=RuiJie Notes
```

变量位置：

```txt
Settings -> Secrets and variables -> Actions -> Variables
```

然后重新运行 Actions 或 push 一次。构建脚本会自动把 sitemap、canonical、分享链接切到新域名。

### 方案 C：JS.ORG 免费子域

如果你愿意把博客包装成开源项目，也可以申请：

```txt
begc.js.org
```

它同样需要提交 PR 和配置 DNS，审核比 `github.io` 麻烦。

### 方案 D：EU.org 免费域名

`eu.org` 可以申请类似独立二级域的免费域名，但审核不稳定、等待时间可能很长。个人博客可以尝试，但不建议作为第一上线方案。

## 其他免费部署平台

除了 GitHub Pages，也可以部署到：

- Cloudflare Pages：免费，适合绑定自定义域名，国内访问体验有时比 GitHub Pages 更稳。
- Netlify：免费，配置简单。
- Vercel：免费，静态站也能部署，但更偏应用项目。

当前项目不需要专门改框架，构建命令都是：

```sh
node scripts/build-public-site.js
```

输出目录就是项目根目录。

## 让别人搜索到

项目已经生成：

- `robots.txt`
- `sitemap.xml`
- 每篇文章的静态 HTML 页面
- canonical URL
- Open Graph / Twitter 分享信息
- BlogPosting JSON-LD 结构化数据

发布后建议到 Google Search Console 添加站点，并提交：

```txt
https://begc.github.io/sitemap.xml
```

搜索引擎收录不是即时的，提交 sitemap 只是帮助发现页面，不能保证立刻排名。

## 新文章放在哪里

文章放在：

```txt
content/posts/
```

每篇文章一个 Markdown 文件，例如：

```txt
content/posts/my-new-note.md
```

push 到 GitHub 后，Actions 会自动生成文章列表、静态文章页和 sitemap。文章会自动出现在：

- 首页最近更新
- 文章归档
- 标签/专题筛选
- `posts/<slug>/`
- `sitemap.xml`

如果 `featured: true`，还会进入首页精选。
