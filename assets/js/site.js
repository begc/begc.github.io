(function () {
  var posts = Array.isArray(window.BLOG_POSTS) ? window.BLOG_POSTS.slice() : [];
  posts.sort(function (a, b) {
    return String(b.date || "").localeCompare(String(a.date || "")) || String(a.title).localeCompare(String(b.title));
  });

  var state = {
    toastTimer: null
  };

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function stableImageSrc(src) {
    var value = String(src || "").trim();
    if (/^https:\/\/(?:p\.ipic\.vip|s2\.loli\.net|pic\.lookcos\.cn)\//.test(value)) {
      return "assets/img/article-image-unavailable.svg";
    }
    return value;
  }

  function postUrl(post) {
    return "posts/" + encodeURIComponent(post.slug) + "/";
  }

  function tagUrl(tag) {
    return "posts.html?tag=" + encodeURIComponent(tag);
  }

  function formatDate(date) {
    if (!date) return "";
    return date.replace(/-/g, ".");
  }

  function allTags() {
    var map = {};
    posts.forEach(function (post) {
      (post.tags || []).forEach(function (tag) {
        map[tag] = (map[tag] || 0) + 1;
      });
    });
    return Object.keys(map).sort(function (a, b) {
      return map[b] - map[a] || a.localeCompare(b);
    }).map(function (name) {
      return { name: name, count: map[name] };
    });
  }

  function groupByCategory() {
    var map = {};
    posts.forEach(function (post) {
      var key = post.category || "技术笔记";
      if (!map[key]) map[key] = [];
      map[key].push(post);
    });
    return Object.keys(map).sort(function (a, b) {
      return map[b].length - map[a].length || a.localeCompare(b);
    }).map(function (name) {
      return { name: name, posts: map[name] };
    });
  }

  function renderIcon(name) {
    return '<i data-lucide="' + name + '" aria-hidden="true"></i>';
  }

  function iconSvg(name) {
    var icons = {
      "arrow-left": '<path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path>',
      "book-open": '<path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>',
      github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.1-1.3-.3-2.6-1.2-3.6.2-1.2.2-2.4-.1-3.6 0 0-1-.3-3.5 1.3a12.3 12.3 0 0 0-6.4 0C6.3 1.1 5.3 1.4 5.3 1.4c-.3 1.2-.3 2.4-.1 3.6A5.4 5.4 0 0 0 4 8.6C4 12 7 14 10 14.1a4.8 4.8 0 0 0-1 3.5v4"></path><path d="M9 18c-4.5 2-5-2-7-2"></path>',
      "layers-3": '<path d="m12 2 10 5-10 5L2 7z"></path><path d="m2 17 10 5 10-5"></path><path d="m2 12 10 5 10-5"></path>',
      menu: '<path d="M4 12h16"></path><path d="M4 6h16"></path><path d="M4 18h16"></path>',
      search: '<path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle>',
      "share-2": '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="m8.6 13.5 6.8 4"></path><path d="m15.4 6.5-6.8 4"></path>'
    };
    if (!icons[name]) return "";
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[name] + "</svg>";
  }

  function renderTags(tags, limit) {
    return (tags || []).slice(0, limit || tags.length).map(function (tag) {
      return '<span class="tag-pill">' + escapeHtml(tag) + "</span>";
    }).join("");
  }

  function renderPostCard(post) {
    var tags = renderTags(post.tags, 3);
    return [
      '<a class="post-card reveal" href="' + postUrl(post) + '">',
      '  <span class="post-card-media"><img src="' + escapeHtml(post.cover) + '" alt="' + escapeHtml(post.title) + '" loading="lazy" decoding="async"/></span>',
      '  <span class="post-card-body">',
      '    <span class="post-card-meta"><span>' + escapeHtml(formatDate(post.date)) + '</span><span class="dot"></span><span>' + escapeHtml(post.category) + '</span><span class="dot"></span><span>' + post.readMinutes + ' min</span></span>',
      '    <span class="post-card-title">' + escapeHtml(post.title) + '</span>',
      '    <span class="post-card-desc">' + escapeHtml(post.description) + '</span>',
      '    <span class="post-card-tags">' + tags + '</span>',
      '  </span>',
      '</a>'
    ].join("");
  }

  function renderPostRow(post) {
    return [
      '<a class="post-row reveal" href="' + postUrl(post) + '">',
      '  <img src="' + escapeHtml(post.cover) + '" alt="' + escapeHtml(post.title) + '" loading="lazy" decoding="async"/>',
      '  <span>',
      '    <span class="post-card-meta"><span>' + escapeHtml(formatDate(post.date)) + '</span><span class="dot"></span><span>' + escapeHtml(post.category) + '</span></span>',
      '    <span class="post-row-title">' + escapeHtml(post.title) + '</span>',
      '    <span class="post-row-desc">' + escapeHtml(post.description) + '</span>',
      '  </span>',
      '</a>'
    ].join("");
  }

  function setupNav() {
    var toggle = $("[data-nav-toggle]");
    if (toggle) {
      toggle.addEventListener("click", function () {
        var open = !document.body.classList.contains("nav-open");
        document.body.classList.toggle("nav-open", open);
        toggle.setAttribute("aria-expanded", String(open));
      });
    }

    var page = document.body.getAttribute("data-page");
    $all(".nav-link").forEach(function (link) {
      if (link.getAttribute("data-page") === page) link.classList.add("is-active");
    });
  }

  function setupReveal() {
    setupMotionSurfaces();
    var nodes = $all(".reveal");
    if (!nodes.length) return;
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (node) { node.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    nodes.forEach(function (node, index) {
      node.style.transitionDelay = Math.min(index * 35, 180) + "ms";
      observer.observe(node);
    });
  }

  function setupMotionSurfaces(root) {
    var scope = root || document;
    $all(".section-head, .page-hero, .filter-bar, .timeline-item, .about-panel .signal-item, .post-nav-item", scope).forEach(function (node) {
      node.classList.add("reveal");
    });
  }

  function setupPointerGlow(root) {
    var scope = root || document;
    $all(".post-card, .post-row, .topic-item, .signal-item, .about-panel, .timeline, .side-panel, .post-nav-item", scope).forEach(function (node) {
      if (node.dataset.pointerGlowReady) return;
      node.dataset.pointerGlowReady = "true";
      node.addEventListener("pointermove", function (event) {
        var rect = node.getBoundingClientRect();
        node.style.setProperty("--mx", (event.clientX - rect.left) + "px");
        node.style.setProperty("--my", (event.clientY - rect.top) + "px");
      });
      node.addEventListener("pointerleave", function () {
        node.style.removeProperty("--mx");
        node.style.removeProperty("--my");
      });
    });
  }

  function showToast(message) {
    var toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 1800);
  }

  function setupHeroMotion() {
    var hero = $(".hero-hit-area");
    if (!hero) return;
    var leaveTimer = null;

    function openHero() {
      clearTimeout(leaveTimer);
      hero.classList.add("is-opening");
    }

    function closeHero() {
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(function () {
        hero.classList.remove("is-opening");
      }, 900);
    }

    function moveHero(event) {
      var rect = hero.getBoundingClientRect();
      var x = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100));
      var y = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100));
      hero.style.setProperty("--hero-x", x.toFixed(2));
      hero.style.setProperty("--hero-y", y.toFixed(2));
      openHero();
    }

    hero.addEventListener("pointerenter", openHero);
    hero.addEventListener("pointermove", moveHero);
    hero.addEventListener("focus", openHero);
    hero.addEventListener("pointerleave", closeHero);
    hero.addEventListener("blur", closeHero);
  }

  function setupShare() {
    $all("[data-share]").forEach(function (button) {
      button.addEventListener("click", function () {
        var value = button.getAttribute("data-share") || location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).then(function () {
            showToast("链接已复制");
          }).catch(function () {
            showToast("复制失败，请手动复制");
          });
          return;
        }
        showToast("当前浏览器不支持自动复制");
      });
    });
  }

  function setupReadProgress() {
    var bar = $(".read-progress");
    var body = $(".article-body");
    if (!bar || !body) return;
    function update() {
      var total = Math.max(1, body.offsetHeight - window.innerHeight + 160);
      var pct = Math.max(0, Math.min(100, -body.getBoundingClientRect().top / total * 100));
      bar.style.width = pct + "%";
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function updateLucide() {
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
      return;
    }
    $all("[data-lucide]").forEach(function (node) {
      var svg = iconSvg(node.getAttribute("data-lucide"));
      if (svg) node.outerHTML = svg;
    });
  }

  function setupImageStates(root) {
    $all("img", root || document).forEach(function (img) {
      function markLoaded() {
        img.classList.add("is-loaded");
      }

      function markFailed() {
        img.classList.add("is-failed");
        var holder = img.closest("figure") || img.parentElement;
        if (!holder || holder.querySelector(".image-fallback")) return;
        var note = document.createElement("span");
        note.className = "image-fallback";
        note.textContent = "原图暂不可用";
        holder.appendChild(note);
      }

      if (img.complete && img.naturalWidth > 0) markLoaded();
      img.addEventListener("load", markLoaded, { once: true });
      img.addEventListener("error", markFailed, { once: true });
    });
  }

  function renderHome() {
    var latest = posts.filter(function (post) { return post.category !== "观察记录"; });
    var feature = latest[0] || posts[0];
    var hero = $(".home-hero");
    if (hero && feature) {
      hero.style.setProperty("--hero-image", "url('" + feature.cover.replace(/'/g, "\\'") + "')");
      var meta = $(".hero-feature-meta", hero);
      var title = $(".hero-feature-title", hero);
      var link = $(".hero-feature-link", hero);
      if (meta) meta.innerHTML = escapeHtml(formatDate(feature.date)) + '<span class="dot"></span>' + escapeHtml(feature.category);
      if (title) title.textContent = feature.title;
      if (link) link.href = postUrl(feature);
    }

    var featuredEl = $("#featuredPosts");
    if (featuredEl) featuredEl.innerHTML = latest.slice(0, 6).map(renderPostCard).join("");

    var recentEl = $("#recentPosts");
    if (recentEl) recentEl.innerHTML = posts.slice(0, 5).map(renderPostRow).join("");

    var topicEl = $("#topicGrid");
    if (topicEl) {
      topicEl.innerHTML = groupByCategory().map(function (group) {
        var first = group.posts[0];
        return [
          '<a class="topic-item reveal" href="posts.html?category=' + encodeURIComponent(group.name) + '">',
          '  <span class="topic-name">' + escapeHtml(group.name) + '</span>',
          '  <span class="topic-count">' + group.posts.length + ' 篇文章</span>',
          '  <p class="topic-copy">' + escapeHtml(first.description) + '</p>',
          '</a>'
        ].join("");
      }).join("");
    }

    var statPosts = $("#statPosts");
    var statTags = $("#statTags");
    var statCategories = $("#statCategories");
    if (statPosts) statPosts.textContent = posts.length;
    if (statTags) statTags.textContent = allTags().length;
    if (statCategories) statCategories.textContent = groupByCategory().length;
    setupPointerGlow();
  }

  function renderPostsPage() {
    var list = $("#postsList");
    var filters = $("#tagFilters");
    var search = $("#postSearch");
    if (!list) return;

    var params = new URLSearchParams(location.search);
    var activeTag = params.get("tag") || "";
    var activeCategory = params.get("category") || "";

    function paintFilters() {
      if (!filters) return;
      var items = ['<a class="tag-pill' + (!activeTag && !activeCategory ? " is-active" : "") + '" href="posts.html">全部</a>'];
      groupByCategory().forEach(function (group) {
        items.push('<a class="tag-pill' + (activeCategory === group.name ? " is-active" : "") + '" href="posts.html?category=' + encodeURIComponent(group.name) + '">' + escapeHtml(group.name) + " · " + group.posts.length + "</a>");
      });
      allTags().slice(0, 14).forEach(function (tag) {
        items.push('<a class="tag-pill' + (activeTag === tag.name ? " is-active" : "") + '" href="' + tagUrl(tag.name) + '">' + escapeHtml(tag.name) + " · " + tag.count + "</a>");
      });
      filters.innerHTML = items.join("");
    }

    function paintList() {
      var q = search ? search.value.trim().toLowerCase() : "";
      var filtered = posts.filter(function (post) {
        var haystack = [post.title, post.description, post.category, (post.tags || []).join(" ")].join(" ").toLowerCase();
        if (q && haystack.indexOf(q) === -1) return false;
        if (activeTag && (post.tags || []).indexOf(activeTag) === -1) return false;
        if (activeCategory && post.category !== activeCategory) return false;
        return true;
      });
      list.innerHTML = filtered.length
        ? filtered.map(renderPostCard).join("")
        : '<div class="empty-state">没有匹配的文章</div>';
      setupPointerGlow(list);
      setupReveal();
      updateLucide();
    }

    if (search) search.addEventListener("input", paintList);
    paintFilters();
    paintList();
  }

  function renderTagsPage() {
    var topicGrid = $("#allTopics");
    var tagGrid = $("#allTags");
    if (topicGrid) {
      topicGrid.innerHTML = groupByCategory().map(function (group) {
        return [
          '<a class="topic-item reveal" href="posts.html?category=' + encodeURIComponent(group.name) + '">',
          '  <span class="topic-name">' + escapeHtml(group.name) + '</span>',
          '  <span class="topic-count">' + group.posts.length + ' 篇文章</span>',
          '  <p class="topic-copy">' + escapeHtml(group.posts.map(function (post) { return post.title; }).slice(0, 2).join(" / ")) + '</p>',
          '</a>'
        ].join("");
      }).join("");
    }
    if (tagGrid) {
      tagGrid.innerHTML = allTags().map(function (tag) {
        return '<a class="tag-pill reveal" href="' + tagUrl(tag.name) + '">' + escapeHtml(tag.name) + ' · ' + tag.count + '</a>';
      }).join("");
    }
    setupPointerGlow();
  }

  function stripFrontmatter(markdown) {
    return markdown.replace(/^\s*---\n[\s\S]*?\n---\n?/, "");
  }

  function normalizeHeading(value) {
    return String(value || "").replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+/g, "").toLowerCase();
  }

  function stripDuplicateTitle(markdown, title) {
    var trimmed = markdown.replace(/^\s+/, "");
    var match = trimmed.match(/^#\s+(.+)\n?/);
    if (!match) return markdown;
    var h1 = normalizeHeading(match[1]);
    var postTitle = normalizeHeading(title);
    if (!h1 || !postTitle || (h1 !== postTitle && postTitle.indexOf(h1) === -1 && h1.indexOf(postTitle) === -1)) {
      return markdown;
    }
    return trimmed.slice(match[0].length).replace(/^\s+/, "");
  }

  function inlineMarkdown(value) {
    var text = escapeHtml(value);
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_, alt, src) {
      return '<img src="' + escapeHtml(stableImageSrc(src)) + '" alt="' + escapeHtml(alt.trim()) + '" loading="lazy" decoding="async"/>';
    });
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
      return '<a href="' + escapeHtml(href.trim()) + '" target="_blank" rel="noopener">' + escapeHtml(label.trim()) + "</a>";
    });
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return text;
  }

  function parseTable(rows) {
    if (rows.length < 2 || !/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(rows[1])) {
      return null;
    }
    function cells(row) {
      return row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (cell) {
        return cell.trim();
      });
    }
    var header = cells(rows[0]);
    var body = rows.slice(2).map(cells);
    return '<div class="table-scroll"><table><thead><tr>' + header.map(function (cell) {
      return "<th>" + inlineMarkdown(cell) + "</th>";
    }).join("") + "</tr></thead><tbody>" + body.map(function (row) {
      return "<tr>" + row.map(function (cell) {
        return "<td>" + inlineMarkdown(cell) + "</td>";
      }).join("") + "</tr>";
    }).join("") + "</tbody></table></div>";
  }

  function simpleMarkdown(markdown) {
    var lines = markdown.replace(/\r\n/g, "\n").split("\n");
    var html = [];
    var paragraph = [];
    var list = null;
    var blockquote = [];
    var table = [];
    var inCode = false;
    var codeLang = "";
    var codeLines = [];

    function flushParagraph() {
      if (!paragraph.length) return;
      html.push("<p>" + inlineMarkdown(paragraph.join(" ")) + "</p>");
      paragraph = [];
    }
    function flushList() {
      if (!list) return;
      html.push("<" + list.type + ">" + list.items.map(function (item) {
        return "<li>" + inlineMarkdown(item) + "</li>";
      }).join("") + "</" + list.type + ">");
      list = null;
    }
    function flushBlockquote() {
      if (!blockquote.length) return;
      html.push("<blockquote><p>" + inlineMarkdown(blockquote.join(" ")) + "</p></blockquote>");
      blockquote = [];
    }
    function flushTable() {
      if (!table.length) return;
      var parsed = parseTable(table);
      if (parsed) {
        html.push(parsed);
      } else {
        table.forEach(function (row) { paragraph.push(row); });
      }
      table = [];
    }
    function flushAll() {
      flushTable();
      flushBlockquote();
      flushList();
      flushParagraph();
    }

    lines.forEach(function (line) {
      var codeMatch = line.match(/^```(.*)$/);
      if (codeMatch) {
        if (inCode) {
          html.push('<pre data-lang="' + escapeHtml(codeLang || "code") + '"><code>' + escapeHtml(codeLines.join("\n")) + "</code></pre>");
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

      var heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushAll();
        var level = heading[1].length;
        html.push("<h" + level + ">" + inlineMarkdown(heading[2].trim()) + "</h" + level + ">");
        return;
      }

      if (/^---+$/.test(line.trim())) {
        flushAll();
        html.push("<hr/>");
        return;
      }

      var quote = line.match(/^>\s?(.*)$/);
      if (quote) {
        flushList();
        flushParagraph();
        blockquote.push(quote[1]);
        return;
      }
      flushBlockquote();

      var unordered = line.match(/^\s*[-*]\s+(.+)$/);
      var ordered = line.match(/^\s*\d+[.)、]\s+(.+)$/);
      if (unordered || ordered) {
        flushParagraph();
        var type = unordered ? "ul" : "ol";
        if (!list || list.type !== type) flushList();
        if (!list) list = { type: type, items: [] };
        list.items.push((unordered || ordered)[1]);
        return;
      }
      flushList();

      paragraph.push(line.trim());
    });
    if (inCode) {
      html.push('<pre data-lang="' + escapeHtml(codeLang || "code") + '"><code>' + escapeHtml(codeLines.join("\n")) + "</code></pre>");
    }
    flushAll();
    return html.join("\n");
  }

  function slugify(value, index) {
    var base = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/<[^>]+>/g, "")
      .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return base || "section-" + index;
  }

  function enhanceMarkdown(root) {
    var headings = $all("h1, h2, h3, h4, h5, h6", root);
    var used = {};
    headings.forEach(function (heading, index) {
      var id = heading.id || slugify(heading.textContent, index + 1);
      if (used[id]) {
        used[id] += 1;
        id = id + "-" + used[id];
      } else {
        used[id] = 1;
      }
      heading.id = id;
    });

    $all("pre code", root).forEach(function (code) {
      var pre = code.parentElement;
      var cls = code.className || "";
      var lang = (cls.match(/language-([^\s]+)/) || [])[1] || "";
      if (pre && lang) pre.setAttribute("data-lang", lang);
    });

    $all("img", root).forEach(function (img) {
      if (!img.parentElement) return;
      var alt = (img.getAttribute("alt") || "").replace(/\|.*$/, "").trim();
      img.setAttribute("src", stableImageSrc(img.getAttribute("src")));
      img.setAttribute("alt", alt || "文章配图");
      img.setAttribute("loading", "lazy");
      img.setAttribute("decoding", img.getAttribute("decoding") || "async");
    });

    $all("p", root).forEach(function (parent) {
      if (!parent.parentNode || parent.textContent.trim()) return;
      var images = $all("img", parent);
      if (!images.length) return;
      images.forEach(function (img) {
        var alt = (img.getAttribute("alt") || "").replace(/\|.*$/, "").trim();
        var figure = document.createElement("figure");
        parent.parentNode.insertBefore(figure, parent);
        figure.appendChild(img);
        if (alt && alt !== "文章配图") {
          var caption = document.createElement("figcaption");
          caption.textContent = alt;
          figure.appendChild(caption);
        }
      });
      parent.remove();
    });
    setupImageStates(root);
    $all("table", root).forEach(function (table) {
      if (table.parentElement && table.parentElement.classList.contains("table-scroll")) return;
      var wrap = document.createElement("div");
      wrap.className = "table-scroll";
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  function buildToc(root) {
    var toc = $("#toc");
    if (!toc) return;
    var headings = $all("h2, h3, h4", root);
    if (!headings.length) {
      toc.innerHTML = '<span class="toc-empty">暂无目录</span>';
      return;
    }
    toc.innerHTML = headings.map(function (heading) {
      var depth = Number(heading.tagName.slice(1));
      return '<a class="depth-' + depth + '" href="#' + heading.id + '">' + escapeHtml(heading.textContent) + '</a>';
    }).join("");
    var links = $all("a", toc);
    function update() {
      var y = window.scrollY + 96;
      var active = "";
      headings.forEach(function (heading) {
        if (heading.offsetTop <= y) active = heading.id;
      });
      links.forEach(function (link) {
        link.classList.toggle("is-active", link.getAttribute("href") === "#" + active);
      });
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function renderArticleMeta(post) {
    var meta = $("#articleMeta");
    if (!meta) return;
    meta.innerHTML = [
      '<span>' + escapeHtml(post.author || "begc") + '</span>',
      '<span class="dot"></span>',
      '<span>' + escapeHtml(formatDate(post.date)) + '</span>',
      '<span class="dot"></span>',
      '<span>' + post.readMinutes + ' min read</span>',
      '<span class="dot"></span>',
      '<span>' + escapeHtml(post.category) + '</span>'
    ].join("");
  }

  function renderArticleNav(post) {
    var nav = $("#postNav");
    if (!nav) return;
    var index = posts.findIndex(function (item) { return item.slug === post.slug; });
    var prev = posts[index + 1];
    var next = posts[index - 1];
    nav.innerHTML = [
      prev ? '<a class="post-nav-item prev" href="' + postUrl(prev) + '"><span class="post-nav-dir">上一篇</span><span class="post-nav-title">' + escapeHtml(prev.title) + '</span></a>' : '<span class="post-nav-item prev"><span class="post-nav-dir">上一篇</span><span class="post-nav-title">已经是最早一篇</span></span>',
      next ? '<a class="post-nav-item next" href="' + postUrl(next) + '"><span class="post-nav-dir">下一篇</span><span class="post-nav-title">' + escapeHtml(next.title) + '</span></a>' : '<span class="post-nav-item next"><span class="post-nav-dir">下一篇</span><span class="post-nav-title">已经是最新一篇</span></span>'
    ].join("");
  }

  async function renderPostPage() {
    var root = $("#articleBody");
    if (!root) return;
    var params = new URLSearchParams(location.search);
    var slug = params.get("slug") || "kafka-build";
    var post = posts.find(function (item) { return item.slug === slug; }) || posts[0];
    if (!post) return;

    document.title = post.title + " · begc.github.io";
    var title = $("#articleTitle");
    var desc = $("#articleDescription");
    var tag = $("#articleTag");
    var cover = $("#articleCover");
    var sideTags = $("#sideTags");
    if (title) title.textContent = post.title;
    if (desc) desc.textContent = post.description || "";
    if (tag) tag.textContent = (post.tags || []).slice(0, 2).join(" · ") || post.category;
    if (cover) {
      cover.innerHTML = '<img src="' + escapeHtml(post.cover) + '" alt="' + escapeHtml(post.title) + '" loading="eager" decoding="async"/>';
      setupImageStates(cover);
    }
    if (sideTags) {
      sideTags.innerHTML = (post.tags || []).map(function (tagName) {
        return '<a class="tag-pill" href="' + tagUrl(tagName) + '">' + escapeHtml(tagName) + '</a>';
      }).join("");
    }
    renderArticleMeta(post);
    renderArticleNav(post);

    try {
      var rawMarkdown = window.BLOG_CONTENT && window.BLOG_CONTENT[post.slug];
      if (!rawMarkdown && window.fetch) {
        var response = await fetch(post.file);
        if (!response.ok) throw new Error("HTTP " + response.status);
        rawMarkdown = await response.text();
      }
      if (!rawMarkdown) throw new Error("Markdown content missing");
      var markdown = stripDuplicateTitle(stripFrontmatter(rawMarkdown), post.title);
      root.innerHTML = window.marked && window.marked.parse
        ? window.marked.parse(markdown, { gfm: true, breaks: false })
        : simpleMarkdown(markdown);
      enhanceMarkdown(root);
      buildToc(root);
      setupReadProgress();
      setupPointerGlow();
      setupReveal();
      updateLucide();
    } catch (error) {
      root.innerHTML = '<div class="empty-state">文章加载失败。请通过本地服务器或静态托管访问本站。</div>';
    }
  }

  function renderAboutPage() {
    var count = $("#aboutPostCount");
    var tags = $("#aboutTagCount");
    if (count) count.textContent = posts.length;
    if (tags) tags.textContent = allTags().length;
    setupPointerGlow();
  }

  function boot() {
    setupNav();
    setupHeroMotion();
    setupShare();
    var page = document.body.getAttribute("data-page");
    if (page === "home") renderHome();
    if (page === "posts") renderPostsPage();
    if (page === "tags") renderTagsPage();
    if (page === "post") renderPostPage();
    if (page === "about") renderAboutPage();
    setupPointerGlow();
    setupReveal();
    setupImageStates(document);
    updateLucide();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
