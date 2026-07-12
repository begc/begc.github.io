---
layout: '../../layouts/MarkdownPost.astro'
title: 'LangChain 第三课：大模型本地调用'
pubDate: 2026-04-29
description: '记录 Ollama 本地模型、Embedding 模型和 One API 网关的调用方式。'
cover:
    url: 'assets/img/posts/langchain-03-local-models/image_g.png'
    square: 'assets/img/posts/langchain-03-local-models/image_g.png'
    alt: 'LangChain 第三课：大模型本地调用'
tags: ["LangChain","Ollama","本地模型"]
theme: 'light'
featured: false
---
# LangChain 第三课：大模型本地调用
## 本地大模型
### 使用Ollama调用本地大模型
```text
!pip install -U langchain-ollama

llm = ChatOllama(
    model="deepseek-r1:1.5b",
    base_url="http://localhost:11434"
)
llm.invoke("你是谁？")


# 输入结果
AIMessage(content='<think>\n\n</think>\n\n您好！我是由中国的深度求索（DeepSeek）公司开发的智能助手DeepSeek-R1。如您有任何任何问题，我会尽我所能为您提供帮助。', additional_kwargs={}, response_metadata={'model': 'deepseek-r1:1.5b', 'created_at': '2025-08-02T10:06:42.112931Z', 'message': {'role': 'assistant', 'content': ''}, 'done_reason': 'stop', 'done': True, 'total_duration': 705510000, 'load_duration': 41543250, 'prompt_eval_count': 6, 'prompt_eval_duration': 118753375, 'eval_count': 40, 'eval_duration': 544556959}, id='run--48bb60cb-f752-496f-836f-21d1ed0a2629-0')



# 通过openai借口
llm.invoke("你是谁？")
#%%
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model = "deepseek-r1:1.5b",
    base_url="http://localhost:11434/v1",  # 注意地址不同，要带v1
    api_key="123"
)
llm.invoke("你是谁？")

```
### Ollama向量化模型
```python
from langchain_ollama import OllamaEmbeddings

embeddings = OllamaEmbeddings(
    model="nomic-embed-text:latest",
    base_url="http://localhost:11434/"
)

result = embeddings.embed_query("今天天气怎么样？")
print(len(result))


# 结果
768
```
## ONE-API网关
> https://github.com/songquanpeng/one-api   https://github.com/MartialBE/one-hub

docker安装，建议sqlite
```bash
# 使用 SQLite 的部署命令：注意-v后面改为自己的路径
docker run --name one-api -d --restart always -p 3000:3000 -e TZ=Asia/Shanghai -v /path/to/one-api ghcr.io/songquanpeng/one-api

# 使用 MySQL 的部署命令，在上面的基础上添加 `-e SQL_DSN="root:YOUR_PASSWORD@tcp(localhost:3306)/oneapi"`，请自行修改数据库连接参数，不清楚如何修改请参见下面环境变量一节。
# 例如：
docker run --name one-api -d --restart always -p 3000:3000 -e SQL_DSN="root:YOUR_PASSWORD@tcp(localhost:3306)/oneapi" -e TZ=Asia/Shanghai -v /home/ubuntu/data/one-api:/data justsong/one-api

```

![文章配图](assets/img/posts/langchain-03-local-models/image_g.png)
