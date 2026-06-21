---
layout: '../../layouts/MarkdownPost.astro'
title: 'HADOOP_MapReduce搭建'
pubDate: 2023-03-29
description: '学习搭建hadoop_mapreduce'
cover:
    url: 'https://p.ipic.vip/9r3rkq.jpg'
    square: 'https://p.ipic.vip/9r3rkq.jpg'
    alt: 'cover'
tags: ["hadoop","节点搭建"]
theme: 'light'
featured: false
---
# MapReduce搭建   2023-03-29 14:43
## 根据 HA hadoop 之后继续学习。
|节点\角色|NN|JN|ZKFC|ZK|DN|RM|NM|NN|
|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|
| node01 |  | * | * | |  |   | | * |
| node02 | * | * | * | * | * | |* |
| node03 |   | * |   | *  | *  | * | * |
| node04 |   |  |   | *  | *  | * | * |

通过官网 [yarn 上的配置文件](https://apache.github.io/hadoop/hadoop-yarn/hadoop-yarn-site/ResourceManagerHA.html)
```xml
mapred-site.xml  >  mapreduce on yarn 
	<property>
			<name>mapreduce.framework.name</name>
			<value>yarn</value>
    </property>

yarn-site.xml
	//shuffle  洗牌  M  -shuffle>  R
	<property>
			<name>yarn.nodemanager.aux-services</name>
			<value>mapreduce_shuffle</value>
	</property>

	<property>
		   <name>yarn.resourcemanager.ha.enabled</name>
		   <value>true</value>
	</property>
	<property>
		   <name>yarn.resourcemanager.zk-address</name>
		   <value>node02:2181,node03:2181,node04:2181</value>
  </property>

	<property>
		   <name>yarn.resourcemanager.cluster-id</name>
		   <value>mashibing</value>
	</property>

	<property>
		   <name>yarn.resourcemanager.ha.rm-ids</name>
		   <value>rm1,rm2</value>
	</property>
	<property>
		   <name>yarn.resourcemanager.hostname.rm1</name>
		   <value>node03</value>
	</property>
	<property>
		   <name>yarn.resourcemanager.hostname.rm2</name>
		   <value>node04</value>
	</property>
```
## 配置好之后去集群配置
用root用户启动
```xml
		node01：
			cd $HADOOP_HOME/etc/hadoop
			cp mapred-site.xml.template   mapred-site.xml	
			vi mapred-site.xml
			vi yarn-site.xml
			scp mapred-site.xml yarn-site.xml    node02:`pwd`
			scp mapred-site.xml yarn-site.xml    node03:`pwd`
			scp mapred-site.xml yarn-site.xml    node04:`pwd`
			vi slaves  //可以不用管，搭建hdfs时候已经改过了。。。
			start-yarn.sh
		node03~04:
			yarn-daemon.sh start resourcemanager
		http://node03:8088
		http://node04:8088
```
![启动后显示如上图|inline](https://p.ipic.vip/qon3o9.png)

![此为 standby节点|inline](https://p.ipic.vip/py50hp.png)
## MR 官方案例使用：wc
	实战：MR ON YARN 的运行方式：
```xml 	hdfs dfs -mkdir -p   /data/wc/input
hdfs dfs -D dfs.blocksize=1048576  -put data.txt  /data/wc/input
		cd  $HADOOP_HOME
		cd share/hadoop/mapreduce
		hadoop jar  hadoop-mapreduce-examples-2.6.5.jar   wordcount   /data/wc/input   /data/wc/output
			1)webui:
			2)cli:
		hdfs dfs -ls /data/wc/output
			-rw-r--r--   2 root supergroup          0 2019-06-22 11:37 /data/wc/output/_SUCCESS  //标志成功的文件
			-rw-r--r--   2 root supergroup     788922 2019-06-22 11:37 /data/wc/output/part-r-00000  //数据文件
				part-r-00000
				part-m-00000
					r/m :  map+reduce   r   / map  m
		hdfs dfs -cat  /data/wc/output/part-r-00000
		hdfs dfs -get  /data/wc/output/part-r-00000  ./
```
![运行后结果为上图|inline](https://p.ipic.vip/u0nm1f.png)
## MR 提交方式

	1.开发-> jar  -> 上传到集群中的某一个节点 -> hadoop jar  ooxx.jar  ooxx  in out
	2.嵌入【linux，windows】（非hadoop jar）的集群方式  on yarn
		集群：M、R
		client -> RM -> AppMaster
		mapreduce.framework.name -> yarn   //决定了集群运行
		conf.set("mapreduce.app-submission.cross-platform","true");
		job.setJar("C:\\Users\\Administrator\\IdeaProjects\\msbhadoop\\target\\hadoop-hdfs-1.0-0.1.jar");
			//^推送jar包到hdfs
	3. local，单机  自测
		mapreduce.framework.name -> local
		conf.set("mapreduce.app-submission.cross-platform","true"); //windows上必须配
		1.在win的系统中部署我们的hadoop：
			C:\usr\hadoop-2.6.5\hadoop-2.6.5
		2.在我给你的资料中\hadoop-install\soft\bin  文件覆盖到 你部署的bin目录下还要将hadoop.dll  复制到  c:\windwos\system32\
		3.设置环境变量：HADOOP_HOME  C:\usr\hadoop-2.6.5\hadoop-2.6.5 
	
		IDE -> 集成开发： 
			hadoop最好的平台是linux
			部署hadoop，bin

	参数个性化：
	GenericOptionsParser parser = new GenericOptionsParser(conf, args);  //工具类帮我们把-D 等等的属性直接set到conf，会留下commandOptions
        String[] othargs = parser.getRemainingArgs();

![|inline](https://p.ipic.vip/ewgul3.png)

![|inline](https://p.ipic.vip/6oux1x.png)

![|inline](https://p.ipic.vip/dq0xou.png)


