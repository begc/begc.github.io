---
layout: '../../layouts/MarkdownPost.astro'
title: 'KAFKA组件搭建'
pubDate: 2023-05-11
description: '学习搭建KAFKA'
cover:
    url: 'https://p.ipic.vip/g094hk.jpg'
    square: 'https://p.ipic.vip/g094hk.jpg'
    alt: 'cover'
tags: ["linux","节点搭建"]
theme: 'light'
featured: false
---
#  kafka组件搭建（需要zookeeper版本）

## 1、先安装好zookeeper，在我的hadoop安装中有所教学。

##  2、解压到安装目录中。

##  3、进入到conf/server/properties文件中。

![注意修改参数](https://p.ipic.vip/jfc4hq.png)

![](https://p.ipic.vip/yqw8mu.png)

![](https://p.ipic.vip/cho4og.png)

注意：broker.id依次增长，listeners需要根据集群节点写入。

##  4、如果启动报错，报useg1gc错误，则去到bin/kafka-run-class.sh文件，将useg1gc去掉。

![去掉后](https://p.ipic.vip/fcowsu.png)

