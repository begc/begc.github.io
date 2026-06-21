const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const siteOrigin = (process.env.SITE_ORIGIN || "https://begc.github.io").replace(/\/+$/, "");
const siteName = process.env.SITE_NAME || "RuiJie Notes";
const version = "20260619-11";

execFileSync(process.execPath, [path.join(root, "scripts/build-posts-data.js")], {
  cwd: root,
  stdio: "inherit"
});

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function write(file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function absoluteUrl(pathname) {
  return siteOrigin + "/" + String(pathname || "").replace(/^\/+/, "");
}

function postUrl(post) {
  return absoluteUrl("posts/" + encodeURIComponent(post.slug) + "/");
}

function loadWindowData(file, key) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(read(file), context, { filename: file });
  return context.window[key];
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^\s*---\n[\s\S]*?\n---\n?/, "");
}

function normalizeHeading(value) {
  return String(value || "").replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+/g, "").toLowerCase();
}

function stripDuplicateTitle(markdown, title) {
  const trimmed = markdown.replace(/^\s+/, "");
  const match = trimmed.match(/^#\s+(.+)\n?/);
  if (!match) return markdown;
  const h1 = normalizeHeading(match[1]);
  const postTitle = normalizeHeading(title);
  if (!h1 || !postTitle || (h1 !== postTitle && !postTitle.includes(h1) && !h1.includes(postTitle))) {
    return markdown;
  }
  return trimmed.slice(match[0].length).replace(/^\s+/, "");
}

function stableImageSrc(src, depthPrefix) {
  const value = String(src || "").trim();
  if (/^https:\/\/(?:p\.ipic\.vip|s2\.loli\.net|pic\.lookcos\.cn)\//.test(value)) {
    return depthPrefix + "assets/img/article-image-unavailable.svg";
  }
  if (/^https?:\/\//.test(value) || value.startsWith("/")) return value;
  return depthPrefix + value.replace(/^\.?\//, "");
}

function slugify(value, index) {
  const base = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "section-" + index;
}

function inlineMarkdown(value, depthPrefix) {
  let text = escapeHtml(value);
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    return '<img src="' + escapeAttr(stableImageSrc(src, depthPrefix)) + '" alt="' + escapeAttr(alt.trim()) + '" loading="lazy" decoding="async"/>';
  });
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const rawHref = href.trim();
    const target = /^https?:\/\//.test(rawHref) ? ' target="_blank" rel="noopener"' : "";
    return '<a href="' + escapeAttr(rawHref) + '"' + target + ">" + escapeHtml(label.trim()) + "</a>";
  });
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return text;
}

function parseTable(rows, depthPrefix) {
  if (rows.length < 2 || !/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(rows[1])) {
    return null;
  }
  function cells(row) {
    return row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  }
  const header = cells(rows[0]);
  const body = rows.slice(2).map(cells);
  return '<div class="table-scroll"><table><thead><tr>' + header.map((cell) => {
    return "<th>" + inlineMarkdown(cell, depthPrefix) + "</th>";
  }).join("") + "</tr></thead><tbody>" + body.map((row) => {
    return "<tr>" + row.map((cell) => {
      return "<td>" + inlineMarkdown(cell, depthPrefix) + "</td>";
    }).join("") + "</tr>";
  }).join("") + "</tbody></table></div>";
}

function simpleMarkdown(markdown, depthPrefix) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let list = null;
  let blockquote = [];
  let table = [];
  let inCode = false;
  let codeLang = "";
  let codeLines = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push("<p>" + inlineMarkdown(paragraph.join(" "), depthPrefix) + "</p>");
    paragraph = [];
  }
  function flushList() {
    if (!list) return;
    html.push("<" + list.type + ">" + list.items.map((item) => {
      return "<li>" + inlineMarkdown(item, depthPrefix) + "</li>";
    }).join("") + "</" + list.type + ">");
    list = null;
  }
  function flushBlockquote() {
    if (!blockquote.length) return;
    html.push("<blockquote><p>" + inlineMarkdown(blockquote.join(" "), depthPrefix) + "</p></blockquote>");
    blockquote = [];
  }
  function flushTable() {
    if (!table.length) return;
    const parsed = parseTable(table, depthPrefix);
    if (parsed) {
      html.push(parsed);
    } else {
      table.forEach((row) => paragraph.push(row));
    }
    table = [];
  }
  function flushAll() {
    flushTable();
    flushBlockquote();
    flushList();
    flushParagraph();
  }

  lines.forEach((line) => {
    const codeMatch = line.match(/^```(.*)$/);
    if (codeMatch) {
      if (inCode) {
        html.push('<pre data-lang="' + escapeAttr(codeLang || "code") + '"><code>' + escapeHtml(codeLines.join("\n")) + "</code></pre>");
        inCode = false;
        codeLang = "";
        codeLines = [];
      } else {
        flushAll();
        inCode = true;
        codeLang = codeMatch[1].trim();
        codeLines = [];
      }
      return;
    }
    if (inCode) {
      codeLines.push(line);
      return;
    }

    if (!line.trim()) {
      flushAll();
      return;
    }

    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushBlockquote();
      flushList();
      flushParagraph();
      table.push(line);
      return;
    }
    flushTable();

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      const label = inlineMarkdown(heading[2].trim(), depthPrefix);
      const id = slugify(heading[2].trim(), html.length + 1);
      html.push("<h" + level + ' id="' + escapeAttr(id) + '">' + label + "</h" + level + ">");
      return;
    }

    if (/^---+$/.test(line.trim())) {
      flushAll();
      html.push("<hr/>");
      return;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushList();
      flushParagraph();
      blockquote.push(quote[1]);
      return;
    }
    flushBlockquote();

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)、]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const type = unordered ? "ul" : "ol";
      if (!list || list.type !== type) flushList();
      if (!list) list = { type, items: [] };
      list.items.push((unordered || ordered)[1]);
      return;
    }
    flushList();

    paragraph.push(line.trim());
  });

  if (inCode) {
    html.push('<pre data-lang="' + escapeAttr(codeLang || "code") + '"><code>' + escapeHtml(codeLines.join("\n")) + "</code></pre>");
  }
  flushAll();
  return html.join("\n");
}

function renderTags(tags) {
  return (tags || []).map((tag) => {
    return '<a class="tag-pill" href="../../posts.html?tag=' + encodeURIComponent(tag) + '">' + escapeHtml(tag) + "</a>";
  }).join("");
}

function renderToc(articleHtml) {
  const matches = Array.from(articleHtml.matchAll(/<h([2-4]) id="([^"]+)">([\s\S]*?)<\/h\1>/g));
  if (!matches.length) return '<span class="toc-empty">暂无目录</span>';
  return matches.map((match) => {
    const depth = Number(match[1]);
    const id = match[2];
    const label = match[3].replace(/<[^>]+>/g, "");
    return '<a class="depth-' + depth + '" href="#' + escapeAttr(id) + '">' + escapeHtml(label) + "</a>";
  }).join("");
}

function formatDate(date) {
  return String(date || "").replace(/-/g, ".");
}

function renderPostPage(post, markdown) {
  const depth = "../../";
  const description = post.description || "begc.github.io 技术文章";
  const title = post.title + " · " + siteName;
  const url = postUrl(post);
  const image = post.cover || absoluteUrl("assets/img/article-image-unavailable.svg");
  const articleHtml = simpleMarkdown(stripDuplicateTitle(stripFrontmatter(markdown), post.title), depth);
  const tocHtml = renderToc(articleHtml);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Person", name: post.author || "begc" },
    publisher: { "@type": "Person", name: "begc" },
    mainEntityOfPage: url,
    image
  };

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="description" content="${escapeAttr(description)}"/>
  <meta name="author" content="${escapeAttr(post.author || "begc")}"/>
  <meta name="robots" content="index,follow,max-image-preview:large"/>
  <link rel="canonical" href="${escapeAttr(url)}"/>
  <meta property="og:type" content="article"/>
  <meta property="og:site_name" content="${siteName}"/>
  <meta property="og:title" content="${escapeAttr(post.title)}"/>
  <meta property="og:description" content="${escapeAttr(description)}"/>
  <meta property="og:url" content="${escapeAttr(url)}"/>
  <meta property="og:image" content="${escapeAttr(image)}"/>
  <meta property="article:published_time" content="${escapeAttr(post.date)}"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${escapeAttr(post.title)}"/>
  <meta name="twitter:description" content="${escapeAttr(description)}"/>
  <meta name="twitter:image" content="${escapeAttr(image)}"/>
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin/>
  <link rel="stylesheet" href="../../assets/css/site.css?v=${version}"/>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body data-page="post">
  <a class="skip-link" href="#main">跳到正文</a>
  <div class="read-progress" aria-hidden="true"></div>
  <nav class="site-nav" aria-label="主导航">
    <div class="nav-inner">
      <a class="brand" href="../../index.html" aria-label="${siteName} 首页">
        <span class="brand-mark">bg</span>
        <span class="brand-text">
          <span class="brand-name">${siteName}</span>
          <span class="brand-sub">Big Data · Linux · Source</span>
        </span>
      </a>
      <button class="icon-button nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-label="打开菜单"><i data-lucide="menu"></i></button>
      <div class="nav-panel">
        <div class="nav-links">
          <a class="nav-link" data-page="home" href="../../index.html">首页</a>
          <a class="nav-link" data-page="posts" href="../../posts.html">文章</a>
          <a class="nav-link" data-page="tags" href="../../tags.html">专题</a>
          <a class="nav-link" data-page="about" href="../../about.html">关于</a>
        </div>
        <div class="nav-actions">
          <a class="icon-link" href="https://github.com/begc" target="_blank" rel="noopener" aria-label="GitHub"><i data-lucide="github"></i></a>
        </div>
      </div>
    </div>
  </nav>

  <main class="page-main" id="main">
    <div class="detail-shell">
      <aside class="toc-wrap">
        <span class="toc-label">目录</span>
        <nav class="toc" id="toc" aria-label="文章目录">${tocHtml}</nav>
      </aside>

      <article class="article">
        <header class="article-header reveal">
          <span class="eyebrow">${escapeHtml((post.tags || []).slice(0, 2).join(" · ") || post.category)}</span>
          <h1 class="article-title">${escapeHtml(post.title)}</h1>
          <p class="article-description">${escapeHtml(description)}</p>
          <div class="post-meta-line">
            <span>${escapeHtml(post.author || "begc")}</span>
            <span class="dot"></span>
            <span>${escapeHtml(formatDate(post.date))}</span>
            <span class="dot"></span>
            <span>${escapeHtml(post.readMinutes)} min read</span>
            <span class="dot"></span>
            <span>${escapeHtml(post.category)}</span>
          </div>
          <figure class="article-cover">
            <img src="${escapeAttr(image)}" alt="${escapeAttr(post.title)}" loading="eager" decoding="async"/>
          </figure>
        </header>

        <div class="markdown-body article-body reveal">
${articleHtml}
        </div>
      </article>

      <aside class="article-side">
        <div class="side-panel reveal">
          <p class="side-panel-title">标签</p>
          <div class="tag-list">${renderTags(post.tags)}</div>
        </div>
      </aside>

      <footer class="article-footer reveal">
        <a class="button" href="../../posts.html">返回文章列表</a>
        <button class="button" type="button" data-share="${escapeAttr(url)}">复制链接</button>
      </footer>
    </div>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <span>© 2026 ${siteName}</span>
      <div class="footer-links">
        <a href="../../index.html">首页</a>
        <a href="../../posts.html">文章</a>
        <a href="../../tags.html">专题</a>
      </div>
    </div>
  </footer>
  <div class="toast" id="toast" role="status"></div>
  <script src="../../assets/js/site.js?v=${version}"></script>
</body>
</html>
`;
}

function withSeoHead(file, options) {
  let html = read(file);
  html = html.replace(/https:\/\/RuiJie Notes/g, siteOrigin);
  const canonical = absoluteUrl(options.path);
  const robots = options.robots || "index,follow,max-image-preview:large";
  html = html.replace(/\n  <!-- PUBLIC SEO START -->[\s\S]*?  <!-- PUBLIC SEO END -->/g, "");
  html = html.replace(/\n  <meta name="robots" content="index,follow,max-image-preview:large"\/>/g, "");
  html = html.replace(/\n  <meta name="robots" content="noindex,follow"\/>/g, "");
  html = html.replace(/\n  <link rel="canonical" href="[^"]*"\/>/g, "");
  html = html.replace(/\n  <meta property="og:[^"]+" content="[^"]*"\/>/g, "");
  html = html.replace(/\n  <meta name="twitter:[^"]+" content="[^"]*"\/>/g, "");
  const insert = [
    '  <!-- PUBLIC SEO START -->',
    '  <meta name="robots" content="' + robots + '"/>',
    '  <link rel="canonical" href="' + canonical + '"/>',
    '  <meta property="og:type" content="website"/>',
    '  <meta property="og:site_name" content="' + siteName + '"/>',
    '  <meta property="og:title" content="' + escapeAttr(options.title) + '"/>',
    '  <meta property="og:description" content="' + escapeAttr(options.description) + '"/>',
    '  <meta property="og:url" content="' + canonical + '"/>',
    '  <meta name="twitter:card" content="summary"/>',
    '  <meta name="twitter:title" content="' + escapeAttr(options.title) + '"/>',
    '  <meta name="twitter:description" content="' + escapeAttr(options.description) + '"/>',
    '  <!-- PUBLIC SEO END -->'
  ].join("\n");
  html = html.replace(/  <meta name="description" content="[^"]*"\/>/, '  <meta name="description" content="' + escapeAttr(options.description) + '"/>\n' + insert);
  html = html.replace(/<title>.*?<\/title>/, "<title>" + escapeHtml(options.title) + "</title>");
  html = html.replace(/>begc\.(?:dev|github\.io)</g, ">" + siteName + "<");
  html = html.replace(/aria-label="begc\.(?:dev|github\.io) 首页"/g, 'aria-label="' + siteName + ' 首页"');
  html = html.replace(/content="begc\.(?:dev|github\.io) /g, 'content="' + siteName + " ");
  html = html.replace(/content="([^"]*) · begc\.(?:dev|github\.io)"/g, 'content="$1 · ' + siteName + '"');
  html = html.replace(/content="begc\.(?:dev|github\.io) · /g, 'content="' + siteName + " · ");
  html = html.replace(/20260619-10/g, version);
  write(file, html);
}

const posts = loadWindowData("assets/js/posts-data.js", "BLOG_POSTS");
const content = loadWindowData("assets/js/posts-content.js", "BLOG_CONTENT");

posts.forEach((post) => {
  const markdown = content[post.slug] || read(post.file);
  write("posts/" + post.slug + "/index.html", renderPostPage(post, markdown));
});

const staticPages = [
  {
    file: "index.html",
    path: "",
    title: siteName + " · 技术博客",
    description: siteName + " 是个人技术博客，记录大数据工程、Linux 运维、源码阅读和长期学习沉淀。"
  },
  {
    file: "posts.html",
    path: "posts.html",
    title: "文章 · " + siteName,
    description: siteName + " 技术文章归档，支持搜索、专题和标签筛选。"
  },
  {
    file: "tags.html",
    path: "tags.html",
    title: "专题 · " + siteName,
    description: siteName + " 专题地图，按大数据工程、Linux 运维、源码阅读和标签组织文章。"
  },
  {
    file: "about.html",
    path: "about.html",
    title: "关于 · " + siteName,
    description: siteName + " 关于页面，说明博客定位、技术内容和项目展示价值。"
  },
  {
    file: "post.html",
    path: "post.html",
    title: "文章 · " + siteName,
    description: siteName + " 技术文章详情页。",
    robots: "noindex,follow"
  }
];

staticPages.forEach((page) => withSeoHead(page.file, page));

let redirect = read("blog-post-detail-complete.html").replace(/begc\.(?:dev|github\.io)/g, siteName).replace(/20260619-10/g, version);
write("blog-post-detail-complete.html", redirect);

const sitemapUrls = [
  { loc: absoluteUrl(""), priority: "1.0", changefreq: "weekly" },
  { loc: absoluteUrl("posts.html"), priority: "0.8", changefreq: "weekly" },
  { loc: absoluteUrl("tags.html"), priority: "0.7", changefreq: "monthly" },
  { loc: absoluteUrl("about.html"), priority: "0.6", changefreq: "monthly" },
  ...posts.map((post) => ({
    loc: postUrl(post),
    lastmod: post.date,
    priority: "0.7",
    changefreq: "monthly"
  }))
];

write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((item) => `  <url>
    <loc>${escapeHtml(item.loc)}</loc>${item.lastmod ? "\n    <lastmod>" + escapeHtml(item.lastmod) + "</lastmod>" : ""}
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join("\n")}
</urlset>
`);

write("robots.txt", `User-agent: *
Allow: /

Sitemap: ${absoluteUrl("sitemap.xml")}
`);

write(".nojekyll", "");

console.log(`Built ${posts.length} static post pages for ${siteOrigin}`);
