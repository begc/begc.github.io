---
layout: '../../layouts/MarkdownPost.astro'
title: 'HADOOP理论学习'
pubDate: 2023-03-08
description: '学习搭建hadoop_hdfs'
cover:
    url: 'https://p.ipic.vip/i7jtoj.png'
    square: 'https://p.ipic.vip/i7jtoj.png'
    alt: 'cover'
tags: ["源码研究", "hadoop","理论学习"]
theme: 'light'
featured: false
---
# HADOOP_HDFS 理论知识学习

## 通过之前的hadoop 搭建，结合今天所整理的理论学习，可以更加深入的理解hadoop_hdfs的精髓。

### 一、大数据的本质是分治思想！！！

#### 我有一万个元素(比如单词或元素)需要存储，如果查找某一个元素，最简单的遍历方式是什么？如果说我期望的复杂度是 O(4)呢？

- 如果是从头查到尾，我们需要 O(n)的时间复杂度来查询。
  
![|inline](https://p.ipic.vip/avdtgw.png)

- 通过分治思想，将 10000 个元素取模，就可以达到 O(4)的复杂度。
  
![通过取模，直接复杂度变为 O(4)|inline](https://p.ipic.vip/jp8ozv.png)
  
  #### 有一个非常大的文本文件，里面有很多很多的行，只有两行一样，它们出现在未知的位置，需要查找到它们。单机，而且可用的内存很少，也就几十兆。

- 假设 IO 的速度是 500M 每秒，1T 的文件读取要 30 分钟，如果要循环遍历，消耗的时间会非常多，分治思想只需要 2 次 IO。(注意，内存寻址的时间是 IO 寻址的 10 万倍)

- 将1TB 的文件中的每一行读出来，并把每行的hashcode取模，模的大小可以自定义，假设为 2000，就会分成 2000 的小文件，这样可以保证相同的行一定可以去到相同的文件中。之后 2000 个小文件放到内存中排序，最差结果是搜到最后一行能够确定，一共用了 2 次 IO。
  
![取模分治思想|inline](https://p.ipic.vip/x2t4im.png)
  
  #### 如果大文件存储的不是字符串，而是数字。

- 如果是数字，再用hashCode，就不成立了，会打乱原有的值，所以有没有其他的方法呢？

- 同样是读取每一行文件，进行判断 if(readLine() > 0 && <=100) 放到 0 号，以此类推，可以得到一个外部有序，内部无序的文件，再次对内部文件排序，得到一个有序数组，同样是两次 IO。
  
![|inline](https://p.ipic.vip/7rx9e9.png)

- 还可以不读取每一行文件，每次读取 50M 大小的文件，可以得到一个内部有序，外部无序的文件，立马就应该想到归并算法，只需要在内存中，维护三个变量，一次开启IO，进行排序就可以。
  
![|inline](https://p.ipic.vip/3nx2e6.png)
![归并排序演示|inline](https://p.ipic.vip/1vc1xc.png)
  
  #### 受限于单机 IO 的瓶颈，开启多集群大数据时代。
  
  ![|inline](https://p.ipic.vip/xuxemc.png)
  
  ### 总结：大数据的整体思想，分而治之，并行计算，计算向数据移动，数据本地话读取。
  
  #### 如何理解计算向数据移动？

- 分布式计算中task处理数据，task可以理解成是处理数据的计算逻辑，将task优先发送到数据所在的节点，这就是计算向数据移动。
  
  ### 二、HADOOP时间简史

- 《The Google File System 》 2003年 

- 《MapReduce: Simplified Data Processing on Large Clusters》 2004年 

- 《Bigtable: A Distributed Storage System for Structured Data》 2006年

- Hadoop由 Apache Software Foundation 于 2005 年秋天作为Lucene的子项目Nutch的一部分正式引入。

- 2006 年 3 月份，Map/Reduce 和 Nutch Distributed File System (NDFS) 分别被纳入称为 Hadoop 的项目中。

- Cloudera公司在2008年开始提供基于Hadoop的软件和服务。

- 2016年10月hadoop-2.6.5

- 2017年12月hadoop-3.0.0

- hadoop.apache.org
  
  ### 三、HADOOP项目以及生态
  
  The project includes these modules:

- Hadoop Common

- Hadoop Distributed File System (HDFS™)

- Hadoop YARN

- Hadoop MapReduce
  Other Hadoop-related projects at Apache include:

- Ambari™

- Avro™

- Cassandra™

- Chukwa™

- HBase™

- Hive™

- Mahout™

- Pig™

- Spark™

- Tez™

- ZooKeeper™

### 四、分布式文件系统这么多，为什么还需要自己开发一个hdfs文件系统？

- 从以下几点开始分析
  
  - 存储模型
  
  - 架构设计
  
  - 角色功能
  
  - 元数据持久化
  
  - 安全模式
  
  - 副本放置策略
  
  - 读写流程
  
  - 安全策略
    
    #### 存储模型

- 文件线性按字节切割成块(block)，具有offset，id

- 文件与文件的block大小可以不一样

- 一个文件除最后一个block，其他block大小一致

- block的大小依据硬件的I/O特性调整

- block被分散存放在集群的节点中，具有location

- Block具有副本(replication)，没有主从概念(几个副本代表存几个)，副本不能出现在同一个节点

- 副本是满足可靠性和性能的关键

- 文件上传可以指定block大小和副本数，上传后只能修改副本数

- 一次写入多次读取，不支持修改

- 支持追加数据
  
![|inline](https://p.ipic.vip/kuauf8.jpg)
  副本为 2，存放 1，3；副本为 3，存放 2，4，5。
  
  #### 架构设计

- HDFS是一个主从(Master/Slaves)架构

- 由一个NameNode和一些DataNode组成

- 面向文件包含：文件数据(data)和文件元数据(metadata)

- NameNode负责存储和管理文件元数据，并维护了一个层次型的文件目录树（文件元数据指的是文件的属性，类似于文件的大小，分布在哪个block块上）

- DataNode负责存储文件数据(block块)，并提供block的读写

- DataNode与NameNode维持心跳，并汇报自己持有的block信息

- Client和NameNode交互文件元数据和DataNode交互文件block数据
  
![|inline](https://p.ipic.vip/7c0nsh.jpg)
  
  #### 角色功能

- NameNode
  
  - 完全基于内存存储文件元数据、目录结构、文件block的映射
  - 需要持久化方案保证数据可靠性
  - 提供副本放置策略

- DataNode
  
  - 基于本地磁盘存储block(文件的形式)
  
  - 并保存block的校验和数据保证block的可靠性
  
  - 与NameNode保持心跳，汇报block列表状态
    
    #### 元数据持久化

- 任何对文件系统元数据产生修改的操作，Namenode都会使用一种称为EditLog的事务日志记录下来

- 使用FsImage存储内存所有的元数据状态

- 使用本地磁盘保存EditLog和FsImage

- EditLog具有完整性，数据丢失少，但恢复速度慢，并有体积膨胀风险

- FsImage具有恢复速度快，体积与内存数据相当，但不能实时保存，数据丢失多

- NameNode使用了FsImage+EditLog整合的方案：

- 滚动将增量的EditLog更新到FsImage，以保证更近时点的FsImage和更小的EditLog体积

- EditLog 相当于日志，FsImage可理解为镜像
  
  #### 安全模式

- HDFS搭建时会格式化，格式化操作会产生一个空的FsImage

- 当Namenode启动时，它从硬盘中读取Editlog和FsImage

- 将所有Editlog中的事务作用在内存中的FsImage上

- 并将这个新版本的FsImage从内存中保存到本地磁盘上

- 然后删除旧的Editlog，因为这个旧的Editlog的事务都已经作用在FsImage上了

- Namenode启动后会进入一个称为安全模式的特殊状态。

- 处于安全模式的Namenode是不会进行数据块的复制的。

- Namenode从所有的 Datanode接收心跳信号和块状态报告。

- 每当Namenode检测确认某个数据块的副本数目达到这个最小值，那么该数据块就会被认为是副本安全(safely replicated)的。

- 在一定百分比（这个参数可配置）的数据块被Namenode检测确认是安全之后（加上一个额外的30秒等待时间），Namenode将退出安全模式状态。

- 接下来它会确定还有哪些数据块的副本没有达到指定数目，并将这些数据块复制到其他Datanode上。
  
  #### HDFS中的SNN

- SecondaryNameNode（SNN）

- 在非Ha模式下，SNN一般是独立的节点，周期完成对NN的EditLog向FsImage合并，减少EditLog大小，减少NN启动时间

- 根据配置文件设置的时间间隔fs.checkpoint.period  默认3600秒

- 根据配置文件设置edits log大小 fs.checkpoint.size 规定edits文件的最大值默认是64MB
  
![|inline](https://p.ipic.vip/xvwhdd.jpg)
  
  #### BLOCK 的副本放置策略

- 第一个副本：放置在上传文件的DN；如果是集群外提交，则随机挑选一台磁盘不太满，CPU不太忙的节点。

- 第二个副本：放置在于第一个副本不同的 机架的节点上。

- 第三个副本：与第二个副本相同机架的节点。

- 更多副本：随机节点。
  **此处要注意，第二次放副本就已经放到了另外一台服务器上。**
  
  #### HDFS 写流程

- Client和NN连接创建文件元数据

- NN判定元数据是否有效

- NN处发副本放置策略，返回一个有序的DN列表

- Client和DN建立Pipeline连接

- Client将块切分成packet（64KB），并使用chunk（512B）+chucksum（4B）填充

- Client将packet放入发送队列dataqueue中，并向第一个DN发送

- 第一个DN收到packet后本地保存并发送给第二个DN

- 第二个DN收到packet后本地保存并发送给第三个DN

- 这一个过程中，上游节点同时发送下一个packet

- 生活中类比工厂的流水线：结论：流式其实也是变种的并行计算

- Hdfs使用这种传输方式，副本数对于client是透明的

- 当block传输完成，DN们各自向NN汇报，同时client继续传输下一个block
  所以，client的传输和block的汇报也是并行的。

![|inline](https://p.ipic.vip/n89ms7.jpg)
  
  #### HDFS读流程

- 为了降低整体的带宽消耗和读取延时，HDFS会尽量让读取程序读取离它最近的副本。

- 如果在读取程序的同一个机架上有一个副本，那么就读取该副本。

- 如果一个HDFS集群跨越多个数据中心，那么客户端也将首先读本地数据中心的副本。

- 语义：下载一个文件：
  
  - Client和NN交互文件元数据获取fileBlockLocation
  - NN会按距离策略排序返回
  - Client尝试下载block并校验数据完整性

- 语义：下载一个文件其实是获取文件的所有的block元数据，那么子集获取某些block应该成立
  
  - **Hdfs支持client给出文件的offset自定义连接哪些block的DN，自定义获取数据**
  - **这个是支持计算层的分治、并行计算的核心**

### 五、HDFS数据的一致性怎么理解？

1.HDFS 元数据的一致性


客户端上传文件时，每一个数据块都会有一条元数据来唯一标识这个文件块，HDFS 通过fsimage和editslog记录这些元数据。
fsimages是namenode中元数据完整的镜像，保存了最新的元数据检查点，在HDFS启动时加载fsimage的信息，包含了整个HDFS文件系统的所有目录和文件的信息。
editslog记录客户端对HDFS的增加、删除、重命名、追加等操作。editlog主要是在NameNode已经启动情况下对HDFS进行的各种更新操作进行记录，HDFS客户端执行所有的写操作都会被记录到editlog中。
为了避免edit log文件过大，以及缩短Namenode启动时恢复元数据的时间，我们需要定期地将edit log文件合并到fsimage文件。

在edits logs满之前对内存和fsimage的数据做同步，只需要合并edits logs和fsimage上的数据即可，然后edits logs上的数据即可清除。而当edits logs满之后，文件的上传不能中断，所以将会往一个新的文件edits.new上写数据，而老的edits logs的合并操作将由secondNameNode来完成，在HA模式下，合并过程则由StandBy状态的NameNode来进行。

以上，HDFS通过Fsimage，editlog在集群启动时将集群的状态恢复到关闭前的状态来保证元数据的一致性。


2.HDFS文件数据的一致性


HDFS通过checksum、租约机制、一致性模型来保证文件数据的一致性。

checksum大致原理是HDFS会针对写入的数据进行校验，在读取数据是验证校验，如果两者不一致说明block数据有问题，会修复该block然后返回block数据。

租约机制大致原理是防止多个用户同时写同一个文件。当向HDFS中写入数据时需要获取namenode的租约，保证一个文件同时只有一个用户在操作。

一致性模型中HDFS 为了性能牺牲了一些 Posix 要求保证文件系统读写数据可见，也就是数据写入后不保证立即可见，但保证最终可见。


### 六、HDFS 高可用方案

#### 思路

- 主从集群：结构相对简单，主与从协作

- 主：单点，数据一致好掌握

- 问题：

- 单点故障，集群整体不可用

- 压力过大，内存受限
  
  #### 解决方案

- 单点故障：
  
  - 高可用方案：HA（High Available）
  - 多个NN，主备切换，主

- 压力过大，内存受限：
  
  - 联帮机制： Federation（元数据分片）
  - 多个NN，管理不同的元数据

- HADOOP 2.x 只支持HA的一主一备
  
![|inline](https://p.ipic.vip/uryjlf.jpg)
  
  #### CAP 原则

- Consistency：一致性

- Availability：可用性

- Partition  tolerance：分区容忍性
  ![](https://p.ipic.vip/yzfa67.jpg)

- Paxos 算法
  
  - Paxos算法是莱斯利·兰伯特于1990年提出的一种基于消息传递的一致性算法。
  - 这个算法被认为是类似算法中最有效的。
  - 该算法覆盖全部场景的一致性。
  - 每种技术会根据自己技术的特征选择简化算法实现。
  - 传递：NN之间通过一个可靠的传输技术，最终数据能同步就可以
  - 我们一般假设网络等因素是稳定的
  - 类似一种带存储能力的消息队列
    -分布式节点是否明确

- 节点权重是否明确

- 强一致性破坏可用性

- 过半通过可以中和一致性和可用性

- 最简单的自我协调实现：主从

- 主的选举：明确节点数量和权重

- 主从的职能：
  
  - 主：增删改查
  - 从：查询，增删改传递给主
  - 主与从：过半数同步数据

##### HA方案:

- 多台NN主备模式，Active和Standby状态

- Active对外提供服务，Standby节点不提供服务，只有Actice节点挂掉才提供服务。

- 增加journalnode角色(>3台)，负责同步NN的editlog，不断拉取 Active 的editlogs数据，达到实时性。只能是最终一致性。

- **增加zkfc角色(与NN同台)，通过zookeeper集群协调NN的主从选举和切换，FailoverControllerActive(以下简称 FCA)负责监控 NN，如果 NN 挂掉，挂掉的 FCA 释放锁，Standby 节点的 FCA 抢锁，之后会有第三只手伸向挂掉的节点，确认是否为真的挂掉，如果真的挂掉，则将 Standby 改为 Active。 如果是 FCA 挂掉，Standby 节点抢到锁， FCA 会伸向 Active 节点降级为 Standby，将自己升为 Active。如果是网络不通，Zookeeper 与 FCA 连接不上，但是 FCA 可以和 NN 连接，此时无解，概率极低！应该拉一条网线把 FCA 连接到另一台节点进行监控保障**。

- 事件回调机制

- DN同时向NNs汇报block清单
  
  ##### HDFS- Federation解决方案：

- NN的压力过大，内存受限问题:

- 元数据分治，复用DN存储

- 元数据访问隔离性

- DN目录隔离block
  
![|inline](https://p.ipic.vip/xvbfnx.jpg)
  备注：可以自己开发一个文件系统，通过加前缀，区分不同项目组的元信息，达到复用与隔离的作用。
