const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "assets/img/covers");

const covers = [
  ["langgraph-06-multi-agent", "1506744038136-46273834b3fb"],
  ["langgraph-05-agent-workflow", "1519681393784-d120267933ba"],
  ["langgraph-04-graph", "1425913397330-cf8af2ff40a1"],
  ["langgraph-03-mcp", "1493246507139-91e8fad9978e"],
  ["kafka-build", "1500530855697-b586d89ba3ee"],
  ["langgraph-02-memory", "1501785888041-af3ef285b470"],
  ["langgraph-01-introduction", "1469474968028-56623f02e42e"],
  ["langchain-04-fastgpt-rag-service", "1470770841072-f978cf4d019e"],
  ["langchain-03-local-models", "1441974231531-c6227db76b6e"],
  ["nacosAccessPolicy", "1433086966358-54859d0ed716"],
  ["langchain-02-rag-practice", "1472214103451-9374bd1c798e"],
  ["langchain-01-basics-and-embedding", "1509316785289-025f5b846b35"],
  ["flink-performance-tuning", "1500534623283-312aade485b7"],
  ["docker-mysql8", "1506260408121-e353d10b87c7"],
  ["memoryOverflowTroubleshooting", "1475924156734-496f6cac6ec1"],
  ["qingdao-three-day-trip", "1507525428034-b723cf961d3e"],
  ["hivetheorystudy", "1480497490787-505ec076689f"],
  ["Hive-build", "1470770903676-69b98201ea1c"],
  ["install-mysql8-arch", "1447752875215-b2761acb3c5d"],
  ["hadoopMapReduceTheoryStudy", "1418065460487-3e41a6c84dc5"],
  ["mapreduce-build", "1519904981063-b0cf448d479e"],
  ["centos-iptablesconfig", "1513836279014-a89f7a76ae86"],
  ["hadoopTheoryStudy", "1443632864897-14973fa006cf"],
  ["hadoop-build", "1473448912268-2022ce9509d8"],
  ["centos-init-config", "1483347756197-71ef80e95f73"],
  ["golang", "1475113548554-5a36f1f523d6"]
];

const force = process.argv.includes("--force");
const requestedSlugs = new Set(process.argv.slice(2).filter((argument) => argument !== "--force"));
const selectedCovers = requestedSlugs.size
  ? covers.filter(([slug]) => requestedSlugs.has(slug))
  : covers;

function imageUrl(photoId) {
  return `https://images.unsplash.com/photo-${photoId}?fm=jpg&fit=crop&w=1600&h=900&q=82`;
}

async function download(slug, photoId) {
  const output = path.join(outputDir, slug + ".jpg");
  if (!force && fs.existsSync(output) && fs.statSync(output).size >= 20_000) {
    console.log(`Using existing ${slug}.jpg`);
    return 0;
  }
  const response = await fetch(imageUrl(photoId), {
    headers: { "User-Agent": "RuiJie-Notes-Cover-Downloader/1.0" }
  });
  if (!response.ok) throw new Error(`${slug}: HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) throw new Error(`${slug}: unexpected content type ${contentType}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length < 20_000) throw new Error(`${slug}: downloaded image is unexpectedly small`);
  fs.writeFileSync(output, data);
  return data.length;
}

async function main() {
  if (requestedSlugs.size && selectedCovers.length !== requestedSlugs.size) {
    const known = new Set(covers.map(([slug]) => slug));
    const unknown = Array.from(requestedSlugs).filter((slug) => !known.has(slug));
    throw new Error(`Unknown cover slug: ${unknown.join(", ")}`);
  }
  fs.mkdirSync(outputDir, { recursive: true });
  let totalBytes = 0;
  let downloaded = 0;
  for (const [slug, photoId] of selectedCovers) {
    const bytes = await download(slug, photoId);
    totalBytes += bytes;
    if (bytes > 0) {
      downloaded += 1;
      console.log(`Downloaded ${slug}.jpg`);
    }
  }
  console.log(`Downloaded ${downloaded} new landscape covers; ${selectedCovers.length - downloaded} already existed (${(totalBytes / 1048576).toFixed(1)} MiB new data).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
