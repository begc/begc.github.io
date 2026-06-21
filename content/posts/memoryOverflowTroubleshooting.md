---

layout: '../../layouts/MarkdownPost.astro'
title: '内存溢出排查步骤'
pubDate: 2023-05-10
description: '内存溢出排查'
author: 'zhourj'
cover:
    url: 'https://p.ipic.vip/97dh40.jpg'
    square: 'https://p.ipic.vip/97dh40.jpg'
    alt: 'cover'
tags: ["Centos", "linux","理论研究"] 
theme: 'light'
featured: true

---

# 报错现象

###  1、作业报错

![taskmanager报错](https://p.ipic.vip/knpb8b.png)

# 排查

###  1、登录flink dashboard界面排查每个节点taskmanager内存信息

![排查taskmanager节点信息](https://p.ipic.vip/u6njq9.png)

###  2、查看每个节点taskmanager服务

- 使用systemctl status flink-taskmanager查看服务运行状态，并拿到进程号pid

![进程号pid](https://p.ipic.vip/3fdh1d.png)

###  3、查看节点taskmanager内存堆空间占用情况

**/opt/rdx/jdk/bin/jmap -heap 17150**

注意：命令目录/opt/rdx/jdk/bin/jmap需替换成项目上jdk实际安装目录，17150为上一步查看的服务进程号

![](https://p.ipic.vip/drhmjk.png)

查看G1 Old Generation老年代的使用空间情况

###  4、查看每个节点taskmanager进程对象占用情况

**/opt/rdx/jdk/bin/jmap -histo:live 17150 | head -20**

注意：命令目录/opt/rdx/jdk/bin/jmap需替换成项目上jdk实际安装目录，17150为上一步查看的服务进程号，head -20是列出占用最大的前20个对象

![](https://p.ipic.vip/5az3co.png)

其中对象占用单位为bytes。

###  5、查看每个节点taskmanager full gc的次数

**/opt/rdx/jdk/bin/jstat -gcutil 17150 10000**

注意：命令目录/opt/rdx/jdk/bin/jmap需替换成项目上jdk实际安装目录，17150为上一步查看的服务进程号，10000为10秒刷新一次；

重点关注FGC列（显示发生Full GC事件的次数）

![查看full gc](https://p.ipic.vip/niutuo.png)

