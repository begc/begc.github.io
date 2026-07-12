---
layout: '../../layouts/MarkdownPost.astro'
title: 'LangGraph 第一课：初识 LangGraph'
pubDate: 2026-05-21
description: '从 State、Node 和 Edge 开始，记录我第一次搭建 LangGraph 工作流的过程。'
tags: ["LangGraph","工作流","大模型"]
theme: 'light'
featured: false
---
# LangGraph 第一课：初识 LangGraph
langraph学习
## 1、初步认识LangGraph
### Langchain利用model
```python
# 将OpenAI的key拿到
import os
from config.load_key import load_key

if not os.environ.get("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = load_key("OPENAI_API_KEY")
from langchain.chat_models import init_chat_model

model = init_chat_model("gpt-3.5-turbo-ca", model_provider="openai", base_url="https://api.chatanywhere.tech/v1")
model.invoke("你是谁？你能帮我解决什么问题？")
```
### LangGraph生成model
```python
from langgraph.prebuilt import create_react_agent

agent = create_react_agent(
    model=model,
    tools = [],
    prompt = "You are a helpful assistant.")
agent.invoke({"message": [{"role": "user", "content": "你是谁？你能帮我解决什么问题？"}]})
```
### LangGraph调用工具
```python
from langchain.tools import tool
@tool
def get_current_time():
    """获取当前时间"""
    from datetime import datetime
    return datetime.today().strftime("%Y-%m-%d %H:%M:%S")

agent = create_react_agent(
    model=model,
    tools=[get_current_time],
    prompt="You are a helpful assistant."
)

response = agent.invoke({"message": [{"role": "user", "content": "现在几点了？"}]})
print(response)

```
### LangGraph通过ChatOpenAI调用
```python
from langchain_community.chat_models import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-3.5-turbo-ca",
    base_url="https://api.chatanywhere.tech/v1"
)
result = llm.invoke("你是谁？你能帮我解决什么问题？")
print(result)


agent = create_react_agent(
    model=llm,
    tools=[],
    prompt="You are a helpful assistant."
)
agent.invoke({"message": [{"role": "user", "content": "你是谁？你能帮我解决什么问题？"}]})


for chunk in agent.stream({"message": [{"role": "user", "content": "你是谁？你能帮我解决什么问题？"}]},
                          stream_mode="messages"
                          ):
    print(chunk)
    print("\n")

(AIMessageChunk(content='', additional_kwargs={}, response_metadata={}, id='run--6153b8f7-d26f-4b99-89e3-7054aebff14b'), {'langgraph_step': 1, 'langgraph_node': 'agent', 'langgraph_triggers': ('branch:to:agent',), 'langgraph_path': ('__pregel_pull', 'agent'), 'langgraph_checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'ls_provider': 'openai', 'ls_model_type': 'chat', 'ls_model_name': 'gpt-3.5-turbo-ca', 'ls_temperature': 0.7})


(AIMessageChunk(content='Hello', additional_kwargs={}, response_metadata={}, id='run--6153b8f7-d26f-4b99-89e3-7054aebff14b'), {'langgraph_step': 1, 'langgraph_node': 'agent', 'langgraph_triggers': ('branch:to:agent',), 'langgraph_path': ('__pregel_pull', 'agent'), 'langgraph_checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'ls_provider': 'openai', 'ls_model_type': 'chat', 'ls_model_name': 'gpt-3.5-turbo-ca', 'ls_temperature': 0.7})


(AIMessageChunk(content='!', additional_kwargs={}, response_metadata={}, id='run--6153b8f7-d26f-4b99-89e3-7054aebff14b'), {'langgraph_step': 1, 'langgraph_node': 'agent', 'langgraph_triggers': ('branch:to:agent',), 'langgraph_path': ('__pregel_pull', 'agent'), 'langgraph_checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'ls_provider': 'openai', 'ls_model_type': 'chat', 'ls_model_name': 'gpt-3.5-turbo-ca', 'ls_temperature': 0.7})


(AIMessageChunk(content=' How', additional_kwargs={}, response_metadata={}, id='run--6153b8f7-d26f-4b99-89e3-7054aebff14b'), {'langgraph_step': 1, 'langgraph_node': 'agent', 'langgraph_triggers': ('branch:to:agent',), 'langgraph_path': ('__pregel_pull', 'agent'), 'langgraph_checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'ls_provider': 'openai', 'ls_model_type': 'chat', 'ls_model_name': 'gpt-3.5-turbo-ca', 'ls_temperature': 0.7})


(AIMessageChunk(content=' can', additional_kwargs={}, response_metadata={}, id='run--6153b8f7-d26f-4b99-89e3-7054aebff14b'), {'langgraph_step': 1, 'langgraph_node': 'agent', 'langgraph_triggers': ('branch:to:agent',), 'langgraph_path': ('__pregel_pull', 'agent'), 'langgraph_checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'ls_provider': 'openai', 'ls_model_type': 'chat', 'ls_model_name': 'gpt-3.5-turbo-ca', 'ls_temperature': 0.7})


(AIMessageChunk(content=' I', additional_kwargs={}, response_metadata={}, id='run--6153b8f7-d26f-4b99-89e3-7054aebff14b'), {'langgraph_step': 1, 'langgraph_node': 'agent', 'langgraph_triggers': ('branch:to:agent',), 'langgraph_path': ('__pregel_pull', 'agent'), 'langgraph_checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'ls_provider': 'openai', 'ls_model_type': 'chat', 'ls_model_name': 'gpt-3.5-turbo-ca', 'ls_temperature': 0.7})


(AIMessageChunk(content=' assist', additional_kwargs={}, response_metadata={}, id='run--6153b8f7-d26f-4b99-89e3-7054aebff14b'), {'langgraph_step': 1, 'langgraph_node': 'agent', 'langgraph_triggers': ('branch:to:agent',), 'langgraph_path': ('__pregel_pull', 'agent'), 'langgraph_checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'ls_provider': 'openai', 'ls_model_type': 'chat', 'ls_model_name': 'gpt-3.5-turbo-ca', 'ls_temperature': 0.7})


(AIMessageChunk(content=' you', additional_kwargs={}, response_metadata={}, id='run--6153b8f7-d26f-4b99-89e3-7054aebff14b'), {'langgraph_step': 1, 'langgraph_node': 'agent', 'langgraph_triggers': ('branch:to:agent',), 'langgraph_path': ('__pregel_pull', 'agent'), 'langgraph_checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'ls_provider': 'openai', 'ls_model_type': 'chat', 'ls_model_name': 'gpt-3.5-turbo-ca', 'ls_temperature': 0.7})


(AIMessageChunk(content=' today', additional_kwargs={}, response_metadata={}, id='run--6153b8f7-d26f-4b99-89e3-7054aebff14b'), {'langgraph_step': 1, 'langgraph_node': 'agent', 'langgraph_triggers': ('branch:to:agent',), 'langgraph_path': ('__pregel_pull', 'agent'), 'langgraph_checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'ls_provider': 'openai', 'ls_model_type': 'chat', 'ls_model_name': 'gpt-3.5-turbo-ca', 'ls_temperature': 0.7})


(AIMessageChunk(content='?', additional_kwargs={}, response_metadata={}, id='run--6153b8f7-d26f-4b99-89e3-7054aebff14b'), {'langgraph_step': 1, 'langgraph_node': 'agent', 'langgraph_triggers': ('branch:to:agent',), 'langgraph_path': ('__pregel_pull', 'agent'), 'langgraph_checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'ls_provider': 'openai', 'ls_model_type': 'chat', 'ls_model_name': 'gpt-3.5-turbo-ca', 'ls_temperature': 0.7})


(AIMessageChunk(content='', additional_kwargs={}, response_metadata={'finish_reason': 'stop'}, id='run--6153b8f7-d26f-4b99-89e3-7054aebff14b'), {'langgraph_step': 1, 'langgraph_node': 'agent', 'langgraph_triggers': ('branch:to:agent',), 'langgraph_path': ('__pregel_pull', 'agent'), 'langgraph_checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'checkpoint_ns': 'agent:79181662-b465-3ef4-0cbc-c562e79a4b22', 'ls_provider': 'openai', 'ls_model_type': 'chat', 'ls_model_name': 'gpt-3.5-turbo-ca', 'ls_temperature': 0.7})

```
> 注意这里的stream_mode一共有三种模式

updates：流式输出每个工具调用的每个步骤
messages：流式输出大语言模型回复的token
values：一次性拿到所有的chunk，默认形式
custom：自定义输出，在工具内部使用get_stream_writer获取输入流，添加自定义的内容
### LangGraph工具调用
1. 客户端定义工具类，实现工具的功能
2. 客户端请求大语言模型，带上问题及工具描述
3. 大语言模型综合判断问题，并决定是否调用工具
4. 如果大语言模型判断需要使用工具，就会向客户端返回一个带有tool_calls工具调用信息的AiMessage
5. 客户端根据工具调用信息，调用工具，并将结果返回给语言大模型
6. 大语言模型根据工具调用的结果，生成最终的回答
