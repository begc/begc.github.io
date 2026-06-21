---

layout: '../../layouts/MarkdownPost.astro'
title: 'Hive搭建'
pubDate: 2023-04-03
description: 'hive 搭建学习'
author: 'zhourj'
cover:
    url: 'https://p.ipic.vip/9y4lc6.jpg'
    square: 'https://p.ipic.vip/9y4lc6.jpg'
    alt: 'cover'
tags: ["Centos", "linux","节点搭建"] 
theme: 'light'
featured: true

---
# HIVE 搭建学习

## 搭建前必须启动hadoop与mapreduce服务，并已经安装好mysql

1、Hive 搭建一共分为三种，hive本身有一个derby数据库，但基本上没人用，所以以如下的方式操作，一个是以mysql数据库存元数据来进行，另外一种是远程连接的形式搭建。

![](https://p.ipic.vip/outfjh.png)

![](https://p.ipic.vip/tlunkg.png)

# Hive远程数据库模式安装

### 安装hive的步骤：

##### 1、解压安装

##### 2、修改环境变量

```xml
        vi /etc/profile
        export HIVE_HOME=/opt/bigdata/hive-2.3.9
        将bin目录添加到PATH路径中
```

##### 3、修改配置文件，进入到/opt/bigdata/hive-2.3.9/conf

```xml
    //修改文件名称，必须修改，文件名称必须是hive-site.xml
        mv hive-default.xml.template hive-site.xml
    //增加配置：
            进入到文件之后，将文件原有的配置删除，但是保留最后一行，
            从<configuration></configuration>，将光标移动到<configuration>这一行，
            在vi的末行模式中输入以下命令
            :.,$-1d
    //增加如下配置信息：
            <property>
                <name>hive.metastore.warehouse.dir</name>
                <value>/user/hive/warehouse</value>
            </property>
            <property>
                <name>javax.jdo.option.ConnectionURL</name>
                <value>jdbc:mysql://node01:3306/hive_remote?characterEncoding=utf-8&serverTimezone=GMT%2B8&createDatabaseIfNotExist=true&useSSL=false</value>
            </property>
            <property>
                <name>javax.jdo.option.ConnectionDriverName</name>
                <value>com.mysql.cj.jdbc.Driver</value>
            </property>
            <property>
                <name>javax.jdo.option.ConnectionUserName</name>
                <value>root</value>
            </property>
            <property>
                <name>javax.jdo.option.ConnectionPassword</name>
                <value>XXXX</value>
            </property>
```

##### 4、添加MySQL的驱动包拷贝到lib目录

##### 5、执行初始化元数据数据库的步骤

```xml
       schematool -dbType mysql -initSchema
```

##### 6、执行hive启动对应的服务

##### 7、执行相应的hive SQL的基本操作

![](https://p.ipic.vip/9of62g.png)

# hive远程元数据服务模式安装：

##### 1、选择两台虚拟机，node03作为服务端，node04作为客户端

##### 2、分别在Node03和node04上解压hive的安装包，或者在从node02上远程拷贝hive的安装包到Node03和node04

##### 3、node03修改hive-site.xml配置：

```xml
    <property>
        <name>hive.metastore.warehouse.dir</name>
        <value>/user/hive_remote/warehouse</value>
    </property>
    <property>
        <name>javax.jdo.option.ConnectionURL</name>
        <value>jdbc:mysql://node01:3306/hive_remote?characterEncoding=utf-8&serverTimezone=GMT%2B8&createDatabaseIfNotExist=true&useSSL=false</value>
    </property>
    <property>
        <name>javax.jdo.option.ConnectionDriverName</name>
        <value>com.mysql.cj.jdbc.Driver</value>
    </property>
    <property>
        <name>javax.jdo.option.ConnectionUserName</name>
        <value>root</value>
    </property>
    <property>
        <name>javax.jdo.option.ConnectionPassword</name>
        <value>XXXX</value>
    </property>
```

##### 4、node04修改hive-site.xml配置：

```xml
    <property>
        <name>hive.metastore.warehouse.dir</name>
        <value>/user/hive_remote/warehouse</value>
    </property>
    <property>
        <name>hive.metastore.uris</name>
        <value>thrift://node03:9083</value>
    </property>
```

##### 5、在node03服务端执行元数据库的初始化操作，schematool -dbType mysql -initSchema

##### 6、在node03上执行hive --service metastore,启动hive的元数据服务，是阻塞式窗口

##### 7、在node04上执行hive，进入到hive的cli窗口
