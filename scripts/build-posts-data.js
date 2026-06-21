const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const postsDir = path.join(root, "content/posts");
const outDir = path.join(root, "assets/js");

const fallbackCovers = [
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80"
];

const coverBySlug = {
  "kafka-build": fallbackCovers[0],
  "nacosAccessPolicy": fallbackCovers[1],
  "memoryOverflowTroubleshooting": fallbackCovers[2],
  "hivetheorystudy": fallbackCovers[3],
  "install-mysql8-arch": fallbackCovers[4],
  "Hive-build": fallbackCovers[5],
  "hadoopMapReduceTheoryStudy": fallbackCovers[6],
  "mapreduce-build": fallbackCovers[7],
  "centos-iptablesconfig": fallbackCovers[8],
  "hadoop-build": fallbackCovers[9],
  "hadoopTheoryStudy": fallbackCovers[10],
  "centos-init-config": fallbackCovers[11],
  "golang": fallbackCovers[8],
  "apple-introduces-the-new-homepod-with-breakthrough-sound-and-intelligence": fallbackCovers[12]
};

function stableCover(slug, cover) {
  if (cover && /^https:\/\/images\.unsplash\.com\//.test(cover)) return cover;
  if (coverBySlug[slug]) return coverBySlug[slug];
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return fallbackCovers[hash % fallbackCovers.length];
}

function stableMarkdownImages(markdown) {
  return String(markdown || "").replace(
    /https:\/\/(?:(?:p\.ipic\.vip|s2\.loli\.net|pic\.lookcos\.cn)\/|www\.apple\.com\.cn\/newsroom\/)[^\s)'"<>]+/g,
    "assets/img/article-image-unavailable.svg"
  );
}

function clean(value) {
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
    return value.slice(1, -1);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^\[.*\]$/.test(value)) {
    try {
      return JSON.parse(value.replace(/'/g, '"'));
    } catch (_) {
      return value;
    }
  }
  return value;
}

function parseFrontmatter(text) {
  const match = text.match(/^\s*---\n([\s\S]*?)\n---\n?/);
  if (!match) return [{}, text];
  const raw = match[1];
  const body = text.slice(match[0].length);
  const data = {};
  const lines = raw.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const value = m[2].trim();
    if (value === "") {
      const nested = {};
      while (i + 1 < lines.length && /^\s+/.test(lines[i + 1])) {
        i += 1;
        const nm = lines[i].trim().match(/^([A-Za-z0-9_]+):\s*(.*)$/);
        if (nm) nested[nm[1]] = clean(nm[2].trim());
      }
      data[key] = nested;
    } else {
      data[key] = clean(value);
    }
  }
  return [data, body];
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[#>*_`|\-]/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstHeading(markdown) {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

function estimateReadMinutes(markdown) {
  const chars = stripMarkdown(markdown).replace(/\s/g, "").length;
  return Math.max(1, Math.ceil(chars / 450));
}

function categoryFor(tags, title) {
  const value = `${title} ${(tags || []).join(" ")}`.toLowerCase();
  if (/hadoop|mapreduce|hive|kafka|大数据/.test(value)) return "大数据工程";
  if (/centos|linux|mysql|iptables|nacos/.test(value)) return "Linux 运维";
  if (/golang|go|源码/.test(value)) return "源码阅读";
  if (/apple|homepod|新闻稿/.test(value)) return "观察记录";
  return "技术笔记";
}

const files = fs.readdirSync(postsDir).filter((file) => file.endsWith(".md")).sort();
const content = {};
const posts = files.map((file) => {
  const text = fs.readFileSync(path.join(postsDir, file), "utf8");
  const [frontmatter, body] = parseFrontmatter(text);
  const slug = file.replace(/\.md$/, "");
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [];
  const title = frontmatter.title || firstHeading(body) || slug;
  const description = frontmatter.description || stripMarkdown(body).slice(0, 100);
  const cover = stableCover(slug, frontmatter.cover && frontmatter.cover.url ? frontmatter.cover.url : "");

  content[slug] = stableMarkdownImages(text);

  return {
    slug,
    file: `content/posts/${file}`,
    title,
    description,
    date: frontmatter.pubDate || "",
    author: frontmatter.author || "begc",
    tags,
    category: categoryFor(tags, title),
    cover,
    featured: Boolean(frontmatter.featured),
    readMinutes: estimateReadMinutes(body)
  };
}).sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.title.localeCompare(b.title));

fs.writeFileSync(path.join(outDir, "posts-data.js"), `window.BLOG_POSTS = ${JSON.stringify(posts, null, 2)};\n`);
fs.writeFileSync(path.join(outDir, "posts-content.js"), `window.BLOG_CONTENT = ${JSON.stringify(content, null, 2)};\n`);
console.log(`Generated ${posts.length} posts.`);
