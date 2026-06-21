---
layout: '../../layouts/MarkdownPost.astro'
title: 'Centos7 iptables 设置策略'
pubDate: 2023-03-20
description: ' 通过对iptables的策略设置进行指定ip地址或指定端口的访问'
author: 'zhourj'
cover:
    url: 'https://p.ipic.vip/7txbi0.jpg'
    square: 'https://p.ipic.vip/7txbi0.jpg'
    alt: 'cover'
tags: ["源码研究", "Centos", "linux"] 
theme: 'light'
featured: true
---
# Centos7 学习补充知识(持续更新)
## Centos7 系列配置iptables
### 1、常用配置实例
```xml
1.1 开放网段 和指定端口
iptables -A INPUT -p tcp --dport 22 -s 172.18.35.0/24 

1.2 开放某个端口给任意服务器。 （不指定-s, 代表所有）
iptables -I INPUT -p tcp --dport 7180 -j ACCEPT

1.3 开放给某个服务器101.124.103.10访问端口范围
iptables -I INPUT -p tcp -s 101.124.103.10  --dport 1024:65535 -j ACCEPT

1.4 开放指定网段内IP白名单（不限端口、协议）
iptables -A INPUT -p all -s 10.124.103.0/24 -j ACCEPT

1.5 只允许来自174.140.3.190的ip访问服务器上216.99.1.216的80端口
iptables -A FORWARD -s 174.140.3.190 -d 216.99.1.216 -p tcp -m tcp --dport 80 -j ACCEPT 
iptables -A FORWARD -d 216.99.1.216 -p tcp -m tcp --dport 80 -j DROP

1.6 先关闭所有的80端口
iptables -I INPUT -p tcp --dport 80 -j DROP 

1.7 开启ip段192.168.1.0/24端的80口
iptables -I INPUT -s 192.168.1.0/24 -p tcp --dport 80 -j ACCEPT

1.8 开启ip段211.123.16.123/24端ip段的80口
iptables -I INPUT -s 211.123.16.123/24 -p tcp --dport 80 -j ACCEPT

1.9 允许所有的输入通过防火墙,以防远程连接断开
iptables -P INPUT ACCEPT

2.0 清空所有默认规则
iptables -F

2.1 清空所有默认规则
iptables -X

2.2 清空所有自定义规则
iptables -Z

2.3 将所有计数器归0
iptables -Z

2.4 允许来自于lo接口（本地访问）的数据包
iptables -A INPUT -i lo -j ACCEPT

2.5 开放22端口(SSH)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

2.6 表示开放80端口(HTTP)
iptables -A INPUT -p tcp --dport 80 -j ACCEPT

2.7 开放443端口(HTTPS)
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

2.8 允许接受本机请求之后的返回数据。ESTABLISHED表示已建立的连接状态。RELATED表示该封包与本机发出的封包有关
iptables -A INPUT -m state --state  RELATED,ESTABLISHED -j ACCEPT

2.9 所有被丢弃的包都会被记录到/var/log/iptables.log文件中，且每条记录会以"iptables denied"作为前缀
iptables -A INPUT  -p tcp -j LOG --log-prefix "iptables denied"

3.0 其他入站一律丢弃
iptables -P INPUT DROP

3.1 其他入站一律丢弃
iptables -P OUTPUT ACCEPT

3.2 所有出站一律通过
iptables -P FORWARD DROP

3.3 添加可信任ip：192.168.0.1，接受其所有TCP请求
iptables -A INPUT -p tcp -s 192.168.0.1 -j ACCEPT

3.4 封停一个IP：192.168.0.1
iptables -A INPUT -s 192.168.0.1 -j DROP


参数详解
-I 是插入放在最前面
-A 是添加放在最后面
-s 访问来源ip
-p 网络协议 如tcp、udp协议
--dport 限制端口
-j 过滤包后的动作 如ACCEPT、DROP
```
### 2、配置信息保存与恢复
配置iptables后对当前有效。但是重启防火墙后，  配置策略又变成修改前。
```xml
手动保存到下述文件
sudo iptables-save > /etc/sysconfig/iptables

手动从指定文件恢复防火墙
sudo iptables-restore -n < /etc/sysconfig/iptables

自动恢复
安装iptables-services
sudo yum install iptables-services
sudo systemctl start iptables
sudo systemctl enable iptables
												  
策略文件保存及自动恢复。
sudo service iptables save，自动保存到/etc/sysconfig/iptables
只要iptables服务启动，就会自动从上述文件目录加载策略文件
```
### 3、删除一条规则

```xml
iptables -L INPUT --line-numbers
iptables -D INPUT 7
```


