---

layout: '../../layouts/MarkdownPost.astro'
title: 'nacos 访问策略'
pubDate: 2023-05-10
description: 'nacos 访问策略配置'
author: 'zhourj'
cover:
    url: 'https://p.ipic.vip/m0spsd.jpg'
    square: 'https://p.ipic.vip/m0spsd.jpg'
    alt: 'cover'
tags: ["Centos", "linux","节点搭建"] 
theme: 'light'
featured: true

---
#  nacos 访问策略讲解（centos7）

### 1、在安装 nacos的工作节点上(10.80.139.32)，切换至root用户，如果已经是root用户，则不需要更改。

**(1)** **su  root**  会需要输入密码(输入密码不会显示密码，正确后回车自动切换至root用户)

**(2)** **cd  ~**

###  2、备份iptables

**(1)**    **cp /etc/sysconfig/iptables /var/tmp**

**(2)**   如果没有配置过，该目录下没有**iptables**文件

**(3)**   查看当前iptables 规则

- iptables --list

**(4)**   添加已经建立tcp连接，就开放网络访问

- **iptables -I INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT**

**(5)**  拒绝所有ip访问8848端口

- **iptables -I INPUT -s  0.0.0.0/0 -p tcp --dport 8848 -j DROP**

**(6)**  添加允许访问8848端口的ip

-  **iptables -I INPUT -s 10.80.139.32~38 -p tcp --dport 8848 -j ACCEPT**

**(7)**   如果后续需要新加ip访问主机8848端口

- **iptables -I INPUT -s  xx.xx.xxx.xx   -p tcp --dport  8848  -j  ACCEPT**

**(8)**   保存iptables规则（推荐用第三种方式）

- 有可能遇到无法保存的情况：

​						① 自动恢复

​						② 安装iptables-services

​						③ sudo yum install iptables-services

​						④ sudo systemctl start iptables

​						⑤ sudo systemctl enable iptables

​						⑥ 策略文件保存及自动恢复。

​						⑦ sudo service iptables save，自动保存到/etc/sysconfig/iptables

​			只要iptables服务启动，就会自动从上述文件目录加载策略文件

**(9)**    重启iptables规则（推荐用第二种方式）

- **sudo systemctl start iptables**

**(10)**  查看配置后的网络策略

- **ip tables --list**

**(11)**   删除一条规则 

-  **查看所有规则**
-  **iptables -D INPUT 7**    删除第七条规则

### 参数详解

-I 是插入放在最前面

-A 是添加放在最后面

-s 访问来源ip

-p 网络协议 如tcp、udp协议

--dport 限制端口

-j 过滤包后的动作 如ACCEPT、DROP

