const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceDir = path.resolve(process.argv[2] || "");

const articles = [
  {
    source: "qing-dao-you-wan-gong-lue-jian-dan.md",
    slug: "qingdao-three-day-trip",
    title: "青岛三日游玩记录",
    date: "2026-03-06",
    description: "我在青岛玩了三天，记录一下走过的路线、景点和需要注意的地方。",
    tags: ["旅行", "青岛", "生活记录"]
  },
  {
    source: "dockerda-jian-mysql8.md",
    slug: "docker-mysql8",
    title: "Docker 搭建 MySQL 8",
    date: "2026-03-16",
    description: "记录我用 Docker 搭建 MySQL 8 的步骤，包括网络、数据卷、连接验证和常见问题。",
    tags: ["Docker", "MySQL", "Linux"]
  },
  {
    source: "flinkdiao-you-xue-xi.md",
    slug: "flink-performance-tuning",
    title: "Flink 调优学习",
    date: "2026-03-27",
    description: "整理我学习 Flink 调优时记录的资源配置、算子优化、反压和排查方法。",
    tags: ["Flink", "大数据", "性能调优"]
  },
  {
    source: "langchaindi-ke-_chu-shi-langchainji-embeddingm.md",
    slug: "langchain-01-basics-and-embedding",
    title: "LangChain 第一课：初识 LangChain 与 Embedding",
    date: "2026-04-07",
    description: "记录我从环境搭建开始学习 LangChain、提示词、链式调用、工具和 Embedding 的过程。",
    tags: ["LangChain", "Embedding", "大模型"]
  },
  {
    source: "langchaindi-er-ke-_da-mo-xing-ragshi-zhan.md",
    slug: "langchain-02-rag-practice",
    title: "LangChain 第二课：大模型 RAG 实战",
    date: "2026-04-18",
    description: "用实际资料跑一遍 RAG，从文档切分、向量化到检索问答。",
    tags: ["LangChain", "RAG", "向量检索"]
  },
  {
    source: "langchaindi-san-ke-_da-mo-xing-ben-di-diao-yong.md",
    slug: "langchain-03-local-models",
    title: "LangChain 第三课：大模型本地调用",
    date: "2026-04-29",
    description: "记录 Ollama 本地模型、Embedding 模型和 One API 网关的调用方式。",
    tags: ["LangChain", "Ollama", "本地模型"]
  },
  {
    source: "langchaindi-si-ke-_fastgptkuai-su-gou-jian-rag.md",
    slug: "langchain-04-fastgpt-rag-service",
    title: "LangChain 第四课：FastGPT 构建 RAG 与网络服务",
    date: "2026-05-10",
    description: "记录我用 Docker 部署 FastGPT，并搭建 RAG 与网络服务的过程。",
    tags: ["LangChain", "FastGPT", "RAG"]
  },
  {
    source: "langgraphdi-ke-_chu-shi-langgraph.md",
    slug: "langgraph-01-introduction",
    title: "LangGraph 第一课：初识 LangGraph",
    date: "2026-05-21",
    description: "从 State、Node 和 Edge 开始，记录我第一次搭建 LangGraph 工作流的过程。",
    tags: ["LangGraph", "工作流", "大模型"]
  },
  {
    source: "langgraphdi-er-ke-_bao-cun-li-shi-ji-lu.md",
    slug: "langgraph-02-memory",
    title: "LangGraph 第二课：保存历史记录",
    date: "2026-06-01",
    description: "整理 LangGraph 的短期记忆、长期存储、消息裁剪和人工干预。",
    tags: ["LangGraph", "Memory", "Checkpoint"]
  },
  {
    source: "langgraphdi-san-ke-_jie-ru-mcp.md",
    slug: "langgraph-03-mcp",
    title: "LangGraph 第三课：接入 MCP",
    date: "2026-06-12",
    description: "记录我在 Cline、阿里云百炼和代码中接入 MCP 的几种方式。",
    tags: ["LangGraph", "MCP", "工具调用"]
  },
  {
    source: "langgraphdi-si-ke-_shen-ru-li-jie-graph.md",
    slug: "langgraph-04-graph",
    title: "LangGraph 第四课：深入理解 Graph",
    date: "2026-06-23",
    description: "继续拆解 Graph、State、Node、Edge、条件分支和子图的用法。",
    tags: ["LangGraph", "Graph", "状态管理"]
  },
  {
    source: "langgraphdi-wu-ke-_kuai-su-da-jian-zhi-neng-ti.md",
    slug: "langgraph-05-agent-workflow",
    title: "LangGraph 第五课：快速搭建智能体",
    date: "2026-07-02",
    description: "记录流式输出、工具调用、人工审批和智能体流程的搭建。",
    tags: ["LangGraph", "Agent", "智能体"]
  },
  {
    source: "langgraphdi-liu-ke-_gou-jian-agentzhi-neng-ti.md",
    slug: "langgraph-06-multi-agent",
    title: "LangGraph 第六课：构建多 Agent 智能体",
    date: "2026-07-11",
    description: "记录一个由 supervisor 分发任务、多个 Agent 协作处理的智能体结构。",
    tags: ["LangGraph", "Multi-Agent", "智能体"]
  }
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function yamlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function stripAnytypeFrontmatter(markdown) {
  return markdown.replace(/^\s*---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function inferCodeLanguage(lines, startIndex) {
  const sample = lines.slice(startIndex, startIndex + 14).join("\n").trim();
  if (!sample) return "text";
  if (/^(?:\{|\[)\s*[\s\S]*"[^"\n]+"\s*:/.test(sample)) return "json";
  if (/^(?:services|version|volumes|networks):\s*$/m.test(sample)) return "yaml";
  if (/^(?:docker|brew|pip|conda|mkdir|curl|cd\s|export\s|source\s|jupyter|mysql\s|bin\/|\.\/)/m.test(sample)) return "bash";
  if (/^(?:SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|ALTER TABLE)\b/im.test(sample)) return "sql";
  if (/\b(?:public class|private static|StreamExecutionEnvironment|DataStream<|@Override)\b/.test(sample)) return "java";
  if (/^(?:from\s+\S+\s+import|import\s+\S+|def\s+\w+|class\s+\w+|async\s+def|@\w+|if\s+.+:)/m.test(sample)) return "python";
  return "text";
}

function sanitizeForPublication(markdown) {
  return markdown
    .replace(/\\_/g, "_")
    .replace(/\/Users\/zhouruijie\/Documents\/one-api/g, "/path/to/one-api")
    .replace(/\/Users\/zhouruijie\/PycharmProjects\/LangChainStudy\/src\/mcp\/mcp_server\.py/g, "/path/to/mcp_server.py")
    .replace(/\/opt\/homebrew\/anaconda3\/envs\/langchain_env\/bin\/python \/Users\/zhouruijie\/PycharmProjects\/LangChainStudy\/src\/mcp\/mcp_client\.py/g, "python /path/to/mcp_client.py")
    .replace(/("AMAP_MAPS_API_KEY"\s*:\s*")[^"]+("?)/g, "$1YOUR_AMAP_API_KEY$2")
    .replace(/StrongRootPass!/g, "CHANGE_ME_STRONG_PASSWORD")
    .replace(/root:123456@/g, "root:YOUR_PASSWORD@");
}

function normalizeBody(markdown, title) {
  const lines = sanitizeForPublication(stripAnytypeFrontmatter(markdown))
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const normalized = [];
  let inFence = false;
  let firstHeading = false;

  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index];
    const fence = line.match(/^```\s*(.*)$/);
    if (fence) {
      if (!inFence) {
        const language = fence[1].trim() || inferCodeLanguage(lines, index + 1);
        normalized.push("```" + language);
      } else {
        normalized.push("```");
      }
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      normalized.push(line.replace(/[ \t]+$/, ""));
      continue;
    }

    line = line.replace(/^[\u2000-\u200b\s]+(?=[-*]\s)/, "");
    line = line.replace(/[ \t]+$/, "");
    if (/^!\[[^\]]*]\([^)]+\)$/.test(line.trim())) {
      if (normalized.length && normalized[normalized.length - 1] !== "") normalized.push("");
      normalized.push(line.trim());
      normalized.push("");
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      if (!firstHeading) {
        normalized.push("# " + title);
        firstHeading = true;
      } else {
        const level = Math.min(6, heading[1].length + 1);
        normalized.push("#".repeat(level) + " " + heading[2].trim());
      }
      continue;
    }
    normalized.push(line);
  }

  return normalized.join("\n").replace(/^\s+|\s+$/g, "") + "\n";
}

function rewriteAndCopyAssets(markdown, slug) {
  const assetPattern = /files\/([^)\s]+)/g;
  const names = Array.from(markdown.matchAll(assetPattern), (match) => match[1]);
  const uniqueNames = Array.from(new Set(names));
  const targetDir = path.join(root, "assets/img/posts", slug);
  const copied = [];

  for (const name of uniqueNames) {
    const safeName = path.basename(name);
    if (safeName !== name) fail(`Unsafe asset path in ${slug}: ${name}`);
    const sourceAsset = path.join(sourceDir, "files", safeName);
    if (!fs.existsSync(sourceAsset)) fail(`Missing asset for ${slug}: ${safeName}`);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(sourceAsset, path.join(targetDir, safeName));
    copied.push(safeName);
  }

  const withImageAlts = markdown.replace(/!\[[^\]]*]\(files\/([^)\s]+)\)/g, (_, name) => {
    const asset = path.basename(name);
    const knownAlts = {
      "short-vs-long.png": "短期记忆与长期记忆",
      "async_io.svg": "异步 IO 原理",
      "approve-or-reject-png-filename-utf-8approve-or.png": "人工审批流程"
    };
    return `![${knownAlts[asset] || "文章配图"}](files/${asset})`;
  });
  const rewritten = withImageAlts.replace(assetPattern, (_, name) => {
    return `assets/img/posts/${slug}/${path.basename(name)}`;
  });
  return { markdown: rewritten, copied };
}

function firstImage(slug, assets) {
  const image = assets.find((name) => /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(name));
  return image ? `assets/img/posts/${slug}/${image}` : "";
}

function frontmatter(article, cover) {
  const lines = [
    "---",
    "layout: '../../layouts/MarkdownPost.astro'",
    `title: ${yamlString(article.title)}`,
    `pubDate: ${article.date}`,
    `description: ${yamlString(article.description)}`
  ];
  if (cover) {
    lines.push("cover:");
    lines.push(`    url: ${yamlString(cover)}`);
    lines.push(`    square: ${yamlString(cover)}`);
    lines.push(`    alt: ${yamlString(article.title)}`);
  }
  lines.push(`tags: ${JSON.stringify(article.tags)}`);
  lines.push("theme: 'light'");
  lines.push("featured: false");
  lines.push("---");
  return lines.join("\n") + "\n";
}

if (!process.argv[2]) fail("Usage: node scripts/import-anytype-export.js <export-directory>");
if (!fs.existsSync(sourceDir)) fail(`Anytype export does not exist: ${sourceDir}`);

const sourceMarkdown = fs.readdirSync(sourceDir).filter((file) => file.endsWith(".md")).sort();
const configured = articles.map((article) => article.source).sort();
const unconfigured = sourceMarkdown.filter((file) => !configured.includes(file));
const missingSources = configured.filter((file) => !sourceMarkdown.includes(file));
if (unconfigured.length || missingSources.length) {
  fail(`Import map does not match export. Unconfigured: ${unconfigured.join(", ") || "none"}; missing: ${missingSources.join(", ") || "none"}`);
}

let copiedAssets = 0;
for (const article of articles) {
  const source = fs.readFileSync(path.join(sourceDir, article.source), "utf8");
  const normalized = normalizeBody(source, article.title);
  const imported = rewriteAndCopyAssets(normalized, article.slug);
  const cover = firstImage(article.slug, imported.copied);
  const output = frontmatter(article, cover) + imported.markdown;
  fs.writeFileSync(path.join(root, "content/posts", article.slug + ".md"), output);
  copiedAssets += imported.copied.length;
}

console.log(`Imported ${articles.length} articles and ${copiedAssets} assets from Anytype.`);
