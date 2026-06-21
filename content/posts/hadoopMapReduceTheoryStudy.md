---
layout: '../../layouts/MarkdownPost.astro'
title: 'HADOOP_MapReduce理论学习'
pubDate: 2023-03-30
description: ' 通过搭建 MapReduce，学习 MapReduce 架构与源码'
cover:
    url: 'https://p.ipic.vip/nfbxie.jpg'
    square: 'https://p.ipic.vip/nfbxie.jpg'
    alt: 'cover'
tags: ["hadoop","理论学习","源码研究"]
theme: 'light'
featured: false
---
# MapReduce理论学习

## 一、为什么叫mapreduce?

- Map:
  
  - 映射、变换、过滤
  
  - 1进 N 出

- Reduce:
  
  - 分解，缩小，归纳
  
  - 1组进 N 出

- KEY,VALUE
  
  - 键值对的键划分数据分组

![|inline](https://p.ipic.vip/npofu2.png)

## 二、MapReduce 的架构

![|inline](https://p.ipic.vip/vrz0un.png)

数据以一条记录为单位，经过map方法映射成kv，相同的key为一组，这一组数据调用一次reduce方法，在方法内迭代计算着一组数据。大量的数据集一般用迭代器模式。

![|inline](https://p.ipic.vip/9ay0be.jpg)
```xml
1.切片会格式化出记录，以记录为单位调用map方法。

2.map 的输出会映射成kv，kv 会参与分区计算，拿着key，算出 p分区号，K,V,P。

3.内存缓冲区溢写磁盘时：做一个二次排序；分区有序，且分区内key有序，未来相同的一组key会相邻的排在一起。

4.mapTask的输出是一个文件，存在本地的文件系统中。

5.reduce的归并排序其实可以和reduce方法的计算同时发生，尽量减少IO
因为有迭代器模式的支持~
```

## 三、mapreduce on yarn

![|inline](https://p.ipic.vip/vts2jg.jpg)

## 1.Yarn模型

container容器，不是docker！！！

虚的：对象：属性：NM,CPU,IO量，mem

物理的：JVM->操作系统进程
```xml

1.NM 会有线程监控container资源情况，超额，NM，直接 kill 掉。

2.cgroup内核级技术，在启动jvm时，由kernel约束死。
```

*可以整合docker。*

## 2.Yarn 实现

**ResourceManager:主，负责整体资源的管理。**

**NodeManager:从，向 RM 汇报心跳，提交自己的资源情况。**

MR运行  MapReduce On Yarn
```xml
1.MR-CLI(切片清单/配置/jar/上传到 HDFS)

    访问 RM申请 AppMaster

2.RM选择一台不忙的节点通知 NM启动一个 Container，在里面反射一个 MRAppMaster

3.启动 AppMaster，从 HDFS上下载切片清单，向 RM申请资源

4.由 RM 根据自己掌握的资源情况得到一个确定清单，通知 NM来启动Container

5.Container启动后会反向注册到已经启动的 MRAppMaster进程

6.MRAppMaster(曾经的 JobTracker阉割版不带资源管理)最终将任务Task发送给 Container(消息)

7.container会反射相应的Task 类作为对象，调用方法执行，其结果就是我们业务逻辑代码的执行

8.计算框架都有失败重试的机制
```

结论：问题及总结

1.单点故障（曾经是全局的，JT 挂了，整个计算层没有了调度）

    1)Yarn：每一个 app由一个自己的AppMaster调度！(计算程序级别)
    2)Yarn 支持失败重试！！

2.压力过大    
    
    1)Yarn 每个计算程序都自有AppMaster，每个 AppMaster 只负责自己的计算程序的任务调度，轻量了.
    2)AppMasters是在不同节点中启动的，默认有了负载的光环

3.集成了【资源管理和任务调度】，两者耦合
    
    因为 Yarn 只是资源管理，不负责具体的任务调度,是公立的，只要计算框架继承了yarn 的 AppMaster，大家都可以使用一个统一视图的资源层~~

# 四、总结感悟

从 1.x 到 2.x

    JT、TT 是常服务

2.x 之后没有了这些服务

    相对的：MR 的 CLI，【调度】，任务，这些都是临时服务了。。。。

# 五、源码分析

源码的分析：（目的）  更好的理解你学的技术的细节 以及原理
    资源层yarn
    what？why？how？
    3个环节 <-  分布式计算  <- 追求：
                    计算向数据移动    
                    并行度、分治
                    数据本地化读取

## Client

![|inline](https://p.ipic.vip/w6x3cz.png)  

 没有计算发生         很重要：支撑了计算向数据移动和计算的并行度         

```xml
1，Checking the input and output specifications of the job.         

2，Computing the InputSplits for the job.  // split  ->并行度和计算向数据移动就可以实现了         

3，Setup the requisite accounting information for the DistributedCache of the job, if necessary.         

4，Copying the job's jar and configuration to the map-reduce system directory on the distributed file-system.         

5，Submitting the job to the JobTracker and optionally monitoring it's status
```

MR框架默认的输入格式化类： 
```xml
TextInputFormat < FileInputFormat < InputFormat  getSplits()

minSize = 1

maxSize = Long.Max

blockSize = file

splitSize = Math.max(minSize, Math.min(maxSize, blockSize));  //默认split大小等于block大小,切片split是一个窗口机制：（调大split改小，调小split改大）如果我想得到一个比block大的split：
```

```java
if ((blkLocations[i].getOffset() <= offset < blkLocations[i].getOffset() + blkLocations[i].getLength()))
        split：解耦 存储层和计算层
            1，file
            2，offset
            3，length
            4，hosts    //支撑的计算向数据移动
```

![|inline](https://p.ipic.vip/ishfu0.png)

## MapTask
### intput
```xml
input ->  map  -> output

input:(split+format)  通用的知识，未来的spark底层也是来自于我们的输入格式化类给我们实际返回的记录读取器对象

TextInputFormat->LineRecordreader

split: file , offset , length

init():

in = fs.open(file).seek(offset)

除了第一个切片对应的map，之后的map都在init环节，从切片包含的数据中，让出第一行，并把切片的起始更新为切片的第二行。换言之，前一个map会多读取一行，来弥补hdfs把数据切割的问题~！

nextKeyValue():

1.读取数据中的一条记录对key，value赋值

2.返回布尔值
    
    getCurrentKey():
    getCurrentValue():
```

![|inline](https://p.ipic.vip/28nyh9.png)

### output：
```xml
NewOutputCollector

partitioner

collector

MapOutputBuffer:
    *：
    map输出的KV会序列化成字节数组，算出P，最中是3元组：K,V,P
    buffer是使用的环形缓冲区：

1.本质还是线性字节数组

2.赤道，两端方向放KV,索引

3.索引：是固定宽度：16B：4个int

    a)P
    b)KS
    c)VS
    d)VL

4.如果数据填充到阈值：80%，启动线程：快速排序80%数据，同时map输出的线程向剩余的空间写快速排序的过程：是比较key排序，但是移动的是索引

5.最终，溢写时只要按照排序的索引，卸下的文件中的数据就是有序的
注意：排序是二次排序（索引里有P，排序先比较索引的P决定顺序，然后在比较相同P中的Key的顺序）

分区有序  ： 最后reduce拉取是按照分区的

分区内key有序： 因为reduce计算是按分组计算，分组的语义（相同的key排在了一起）

6.调优：combiner

    1，其实就是一个map里的reduce
    按组统计
    2，发生在哪个时间点：
        a)内存溢写数据之前排序之后溢写的io变少~！
        b)最终map输出结束，过程中，buffer溢写出多个小文件（内部有序）minSpillsForCombine = 3
        map最终会把溢写出来的小文件合并成一个大文件：
        避免小文件的碎片化对未来reduce拉取数据造成的随机读写也会触发combine
    3，combine注意必须幂等
    例子：
        1，求和计算
        1，平均数计算
        80：数值和，个数和
         init():
         spillper = 0.8
         sortmb = 100M
         sorter = QuickSort
        comparator = job.getOutputKeyComparator();
        1，优先取用户覆盖的自定义排序比较器
        2，保底，取key这个类型自身的比较器
        combiner ？reduce
         minSpillsForCombine = 3
    SpillThread
         sortAndSpill()
         if (combinerRunner == null)
```

## ReduceTask

**input ->  reduce  -> output**
        
        map:run:    while (context.nextKeyValue())
                    一条记录调用一次map
        reduce:run:    while (context.nextKey())
                    一组数据调用一次reduce

### doc：
```xml
1.shuffle：洗牌（相同的key被拉取到一个分区），拉取数据
2.sort：整个MR框架中只有map端是无序到有序的过程，用的是快速排序
reduce这里的所谓的sort其实你可以想成就是一个对着map排好序的一堆小文件做归并排序
grouping comparator
1970-1-22 33    bj
1970-1-8  23    sh
排序比较啥：年，月，温度，，且温度倒序
分组比较器：年，月
3，reduce：
```

### run：
```xml
rIter = shuffle。。//reduce拉取回属于自己的数据，并包装成迭代器~！真@迭代器
file(磁盘上)-> open -> readline -> hasNext() next()
时时刻刻想：我们做的是大数据计算，数据可能撑爆内存~！
comparator = job.getOutputValueGroupingComparator();
1，取用户设置的分组比较器
2，取getOutputKeyComparator();
    1，优先取用户覆盖的自定义排序比较器
    2，保底，取key这个类型自身的比较器
    #：分组比较器可不可以复用排序比较器
        什么叫做排序比较器：返回值：-1,0,1
        什么叫做分组比较器：返回值：布尔值，false/true
        排序比较器可不可以做分组比较器：可以的
```

```xml
mapTask reduceTask
1，取用户自定义的分组比较器
    1，用户定义的排序比较器     2，用户定义的排序比较器
    2，取key自身的排序比较器    3，取key自身的排序比较器
组合方式：
    1）不设置排序和分组比较器：
        map：取key自身的排序比较器
        reduce：取key自身的排序比较器
    2）设置了排序
        map：用户定义的排序比较器
        reduce：用户定义的排序比较器
    3）设置了分组
        map：取key自身的排序比较器
        reduce：取用户自定义的分组比较器
    4）设置了排序和分组
        map：用户定义的排序比较器
        reduce：取用户自定义的分组比较器
做减法：结论，框架很灵活，给了我们各种加工数据排序和分组的方式
```

```java
ReduceContextImpl
            input = rIter  真@迭代器
            hasMore = true
            nextKeyIsSame = false
            iterable = ValueIterable
            iterator = ValueIterator

            ValueIterable
                iterator()
                    return iterator;
            ValueIterator    假@迭代器  嵌套迭代器
                hasNext()
                    return firstValue || nextKeyIsSame;
                next()
                    nextKeyValue();

            nextKey()
                nextKeyValue()

            nextKeyValue()
                1，通过input取数据，对key和value赋值
                2，返回布尔值
                3，多取一条记录判断更新nextKeyIsSame
                    窥探下一条记录是不是还是一组的！

            getCurrentKey()
                return key

            getValues()
                return iterable;
```

```xml
**：
1.reduceTask拉取回的数据被包装成一个迭代器

2.reduce方法被调用的时候，并没有把一组数据真的加载到内存而是传递一个迭代器-values

3.在reduce方法中使用这个迭代器的时候：
    hasNext方法判断nextKeyIsSame：下一条是不是还是一组next方法：负责调取nextKeyValue方法，从reduceTask级别的迭代器中取记录，并同时更新nextKeyIsSame
```
*以上的设计艺术：充分利用了迭代器模式：规避了内存数据OOM的问题
且：之前不是说了框架是排序的所以真假迭代器他们只需要协作，一次I/O就可以线性处理完每一组数据~！*
