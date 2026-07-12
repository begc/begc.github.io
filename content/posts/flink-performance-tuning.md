---
layout: '../../layouts/MarkdownPost.astro'
title: 'Flink 调优学习'
pubDate: 2026-03-27
description: '整理我学习 Flink 调优时记录的资源配置、算子优化、反压和排查方法。'
cover:
    url: 'assets/img/posts/flink-performance-tuning/image_p.png'
    square: 'assets/img/posts/flink-performance-tuning/image_p.png'
    alt: 'Flink 调优学习'
tags: ["Flink","大数据","性能调优"]
theme: 'light'
featured: false
---
# Flink 调优学习

### 1、资源和代码优化
#### Slot配置资源
> 主要注意配置内存与CPU

Flink当中有TaskSlot的概念，一个Taskmanager中有多个TaskSlot，如果一个TaskManager中有三个TaskSlot,那么每个TaskSlot会占用整个内存中的三分之一，意味着subtask不会与其他作业的subtaskj竞争内存，taskslot的作用就是分离任务的托管内存，不会发生CPU隔离。
对于每个taskmanager 配置slot如下：
- StandAlone模式下，slot与cpu核数保持一致。
- Yarn模式下，会动态添加taskmanager，每个taskmanager的slot数会根据taskmanager.numberOfTaskSlots决定的，该参数默认为1，可申请小于container最大可申请的CPU核数（由参数yarn.scheduler.maximum-allocation-vcores决定，默认值为4），具体情况不宜涉及过大，会导致每个subtask抢占资源过小。

#### 指定合适的并行度
> 主要注意数据倾斜或者是数据消费慢的情况

- 数据源并行度：kafka的分区，几个分区设置几个并行度。
- 算子逻辑实现的复杂度：如果算子实现的复杂，需要提高并行度来提升吞吐量。
- 数据宿并行度：查看数据宿是否支持并行，如果支持，按照源的并行度来设置，或者是看是否能够承受住数据量的推送。
- 数据倾斜：通过调整并行度产生shuffle来解决数据倾斜问题，例如源两个并行度，宿三个并行度。
- 多次调整。

并行度的调整：算子层面 → 代码中的执行环境层面 → 客户端层面 → 系统层面(配置文件设置)，优先级依次减小
#### 启用共享资源组SlotSharingGroup

![文章配图](assets/img/posts/flink-performance-tuning/image_p.png)

针对于不同的算子，有的是cpu密集型处理，有的不是cpu密集型处理，将这两种算子放置在同一个task slot里面，提升运行速度，
在Flink中实现taskslot共享是通过SlotSharingGroup(Slot共享组，简称SSG)实现的,默认在Flink中有名称为“default”的默认SSG,所有算子操作都在当前这个SSG中，所以我们在执行Flink代码时会自动进行slot组共享。我们也可以在代码中手动指定某些算子操作的SSG组做到某些操作独占一个slot，指定方式如下：
```text
#手动指定slotSharingGroup
someStream.filter(...).slotSharingGroup("name");

```
不显式指定SSG时所有算子操作使用的是default slot group 。显式指定后对应的算子操作使用的指定的slot group,只有指定同一个共享组的算子操作才会开启slot共享，不同slot group 的算子操作是分配到不同的slot上执行的，**如果一个Flink 任务有多个共享组，那么该Flink任务所需的总slot个数就是每个共享组最大并行度的总和。**
#### 使用细粒度资源管理
Flink架构中，slot为运行的最小资源管理单位

![文章配图](assets/img/posts/flink-performance-tuning/image_e.png)

对于细粒度资源管理,Slot 资源请求包含用户指定的特定的资源配置文件。Flink 会遵从这些用户指定的资源请求并从 TaskManager 可用的资源中动态地切分出精确匹配的 slot。如上图所示，对于一个 slot，0.25Core 和 1GB 内存的资源申请，Flink 为它分配 slot 1。
对于没有指定资源配置的资源请求，Flink会自动决定资源配置。粗粒度资源管理当前被计算的资源来自 [TaskManager总资源](https://nightlies.apache.org/flink/flink-docs-master/zh/docs/deployment/memory/mem_setup_tm/) 和TaskManager的总 slot 数 [taskmanager.numberOfTaskSlots](https://nightlies.apache.org/flink/flink-docs-master/zh/docs/deployment/config/#taskmanager-numberoftaskslots)。 如上所示，TaskManager 的总资源是 1Core 和 4GB 内存，task 的 slot 数设置为2，*Slot 2* 被创建，并申请 0.5 Core和 2GB 的内存而没有指定资源配置。 在分配 Slot 1和 Slot 2后，在 TaskManager 留下 0.25 Core 和 1GB 的内存作为未使用资源。
**版本需在1.14及以后使用**
要使用细粒度资源，我们需要以下操作
1. 在flink-conf.yaml配置文件中配置 [cluster.fine-grained-resource-management.enabled](about:blank) 为true，早期Flink版本中没有此配置，如果配置上会有异常报错。
- **构建SlotSharingGroup对象实例并指定资源，通过slotSharingGroup(String name)方式附加到算子上。**

这种方式在创建SlotSharingGroup时指定共享组所需的资源，然后给算子通过 [slotSharingGroup(String name)](about:blank) 方式来设置Slot共享组的名称，但是最后需要通过StreamExecutionEnvironment.registerSlotSharingGroup（SlotSharingGroup ssg） 注册这些SSG对象。
```text
//创建SSG共享组对象指定资源配置
SlotSharingGroup ssgA = SlotSharingGroup.newBuilder("a")
  .setCpuCores(1.0)
  .setTaskHeapMemoryMB(10)
  .build();

//指定构建SSG共享组对象的字符串名称“a” ，使用当前SSG共享组资源，后续需要注册
someStream.filter(...).slotSharingGroup("a")

//通过env注册名称为“a”的SSG共享组对象
env.registerSlotSharingGroup(ssgA);

```
- **构建SlotSharingGroup对象实例并指定资源，通过slotshareinggroup (SlotSharingGroup ssg)附加到算子上。**

同样，这种方式也是在创建SlotSharingGroup对象时指定SSG共享组的资源情况，给算子指定SSG共享组时直接通过slotshareinggroup (SlotSharingGroup ssg)即可。
```text
//创建SSG共享组对象指定资源配置
SlotSharingGroup ssgB = SlotSharingGroup.newBuilder("b")
  .setCpuCores(0.5)
  .setTaskHeapMemoryMB(10)
  .build();
//直接指定SSG共享组对象名称来使用SSG共享组资源
DataStream<...> ds1 = someStream.filter(...).slotSharingGroup(ssgB)

```
> 每个共享组只能绑定一个指定的资源组，任何冲突将会导致 job 的编译的失败。

在构造 SlotSharingGroup 时，可以为 Slot 共享组设置以下资源:
- **CPU核数** 定义作业所需要的CPU核数， 该设置务必是明确配置的正值。
- **[Task堆内存](https://nightlies.apache.org/flink/flink-docs-master/zh/docs/deployment/memory/mem_setup_tm/#task-operator-heap-memory)** 定义作业所需要的堆内存，该设置务必是明确配置的正值。
- **[堆外内存](https://nightlies.apache.org/flink/flink-docs-master/zh/docs/deployment/memory/mem_setup_tm/#configure-off-heap-memory-direct-or-native)** 定义作业所需要的堆外内存，该设置可设置为0。
- **[管理内存](https://nightlies.apache.org/flink/flink-docs-master/zh/docs/deployment/memory/mem_setup_tm/#managed-memory)** 定义作业所需要的管理内存，可设置为0。
- **[外部资源](https://nightlies.apache.org/flink/flink-docs-master/zh/docs/deployment/advanced/external_resources/)** 定义需要的外部资源，可设置为空。

#### Flink使用异步IO
在与外部系统交互（用数据库中的数据扩充流数据）的时候，需要考虑与外部系统的通信延迟对整个流处理应用的影响。
简单地访问外部数据库的数据，比如使用  `MapFunction`，通常意味着**同步**交互：  `MapFunction`  向数据库发送一个请求然后一直等待，直到收到响应。在许多情况下，等待占据了函数运行的大部分时间。
与数据库异步交互是指一个并行函数实例可以并发地处理多个请求和接收多个响应。这样，函数在等待的时间可以发送其他请求和接收其他响应。至少等待的时间可以被多个请求摊分。大多数情况下，异步交互可以大幅度提高流处理的吞吐量。

![异步 IO 原理](assets/img/posts/flink-performance-tuning/async_io.svg)

> 先决条件

如上节所述，正确地实现数据库（或键/值存储）的异步 I/O 交互需要支持异步请求的数据库客户端。许多主流数据库都提供了这样的客户端。
如果没有这样的客户端，可以通过创建多个客户端并使用线程池处理同步调用的方法，将同步客户端转换为有限并发的客户端。然而，这种方法通常比正规的异步客户端效率低。
```python
// 这个例子使用 Java 8 的 Future 接口（与 Flink 的 Future 相同）实现了异步请求和回调。

/**
 * 实现 'AsyncFunction' 用于发送请求和设置回调。
 */
class AsyncDatabaseRequest extends RichAsyncFunction<String, Tuple2<String, String>> {

    /** 能够利用回调函数并发发送请求的数据库客户端 */
    private transient DatabaseClient client;

    @Override
    public void open(OpenContext openContext) throws Exception {
        client = new DatabaseClient(host, post, credentials);
    }

    @Override
    public void close() throws Exception {
        client.close();
    }

    @Override
    public void asyncInvoke(String key, final ResultFuture<Tuple2<String, String>> resultFuture) throws Exception {

        // 发送异步请求，接收 future 结果
        final Future<String> result = client.query(key);

        // 设置客户端完成请求后要执行的回调函数
        // 回调函数只是简单地把结果发给 future
        CompletableFuture.supplyAsync(new Supplier<String>() {

            @Override
            public String get() {
                try {
                    return result.get();
                } catch (InterruptedException | ExecutionException e) {
                    // 显示地处理异常。
                    return null;
                }
            }
        }).thenAccept( (String dbResult) -> {
            resultFuture.complete(Collections.singleton(new Tuple2<>(key, dbResult)));
        });
    }
}

// 创建初始 DataStream
DataStream<String> stream = ...;

// 应用异步 I/O 转换操作，不启用重试
DataStream<Tuple2<String, String>> resultStream =
    AsyncDataStream.unorderedWait(stream, new AsyncDatabaseRequest(), 1000, TimeUnit.MILLISECONDS, 100);

// 或 应用异步 I/O 转换操作并启用重试
// 通过工具类创建一个异步重试策略, 或用户实现自定义的策略
AsyncRetryStrategy asyncRetryStrategy =
	new AsyncRetryStrategies.FixedDelayRetryStrategyBuilder(3, 100L) // maxAttempts=3, fixedDelay=100ms
		.ifResult(RetryPredicates.EMPTY_RESULT_PREDICATE)
		.ifException(RetryPredicates.HAS_EXCEPTION_PREDICATE)
		.build();

// 应用异步 I/O 转换操作并启用重试
DataStream<Tuple2<String, String>> resultStream =
	AsyncDataStream.unorderedWaitWithRetry(stream, new AsyncDatabaseRequest(), 1000, TimeUnit.MILLISECONDS, 100, asyncRetryStrategy);
```
todo：需要去看学习代码！！！
#### 大状态中设置TTL
Flink程序运行时随着时间推移，Flink状态大小也会持续增长，默认状态存储在内存中，时间久了就会给内存带来很大压力，我们可以调用.clear()方法直接清除状态，如果业务逻辑不允许使用clear()方法直接清除状态，我们可以通过配置状态的"生存时间"（Time-to-Live，TTL）来限制状态在内存中存在的时间，当状态存在的时间超过设置的TTL时，系统将自动尽快清除该状态，避免状态一直占用内存空间。
```python
import org.apache.flink.api.common.state.StateTtlConfig;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.common.time.Time;

StateTtlConfig ttlConfig = StateTtlConfig
.newBuilder(Time.seconds(1))
.setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
.setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
.build();

ValueStateDescriptor<String> stateDescriptor = new ValueStateDescriptor<>("text state", String.class);
stateDescriptor.enableTimeToLive(ttlConfig);

```
以上设置TTL的方法解释如下：
- **newBuilder(...)方法**

该方法必须指定，需要传入一个时间，通过该方法来指定TTL状态生存时间。**生存时间TTL计时是以Flink系统处理时间为基础，不支持事件事件**。
- **setUpdateType(...)方法**

该方法可选，通过该方法来设置何时更新状态失效时间。默认值为StateTtlConfig.UpdateType.OnCreateAndWrite，表示仅在创建和写入状态时更新TTL。还可以设置为StateTtlConfig.UpdateType.OnReadAndWrite，表示所有读与写状态时更新TTL，这种方式只要对状态在TTL时间内进行读取，那么该状态生存时间就会一直更新延后。
- **setStateVisibility(…)**方法

该方法可选，该方法设置状态的可见性。默认值为StateTtlConfig.StateVisibility.NeverReturnExpired，表示状态数据过期就不会返回。还可以设置为StateTtlConfig.StateVisibility.ReturnExpiredIfNotCleanedUp,表示状态数据即使过期，只要Flink还没有清除该状态就返回。
#### 设置barrier对齐和非对齐
**当Flink应用程序有多个并行度或者Flink上下游算子并行度不一致时，barrier上下游传递时涉及到barrier广播和barrier对齐机制**。当上游数据向下游多个并行度中发送barrier时，需要对barrier进行广播，保证下游各个并行度barrier一致；当上游多个并行度向下游少量并行度传递barrier时，需要对brrier进行对齐，对齐是指下游每个并行度都要等到相同的barrier到达时才能进行 snapshot 快照状态的保存。
下图是Flink中barrier对齐机制的示意图：

![文章配图](assets/img/posts/flink-performance-tuning/image_v.png)

在barrier对齐机制中，下游barrier先到达分区会等待barrier未到达的分区以达到barrier对齐目的，这个对齐过程中就会涉及barrier先到达分区中数据的缓存，如果多个并行度中处理数据的速度不一致会导致下游任务堆积大量缓存数据，可能会造成Flink内存和磁盘负载压力，同时也使Flink 整体Checkpoint的时间延后变长，此外，在Flink中当数据流处理不过来时还会有反压机制（反压机制是指控制数据源的产生速度，避免数据积压），反压机制会限制数据流的流动，导致barrier在一些并行度中流速变慢，这样更近一步导致Checkpoint的时间延后的更长，导致恶性循环。
为了解决以上barrier对齐机制可能带来的问题，在Flink1.11后引入了barrier不对齐机制。下图是barrier不对齐机制的示意图：

![文章配图](assets/img/posts/flink-performance-tuning/image_6.png)

当流速快的barrier到达下游算子的input buffer后，Flink会将该barrier插入到该下游算子的output buffer的最前面，并将该barrier发送给后续的算子。同时当前算子会对自身进行checkpoint快照，包括当前的状态以及所有input buffers、output buffers以及流速慢的barrier之前的数据都会保存到状态后端中（**注意：在进行checkpoint快照时，流速慢的barrier会被移除，并不会继续流动下去**)，这样当Flink应用程序异常中断恢复到此次checkpoint时，未计算之前的状态、barrier不对齐对应的input buffers、output buffers 数据会重新恢复到各个流中并保证数据的一致性和准确。**值得注意的是barrier不对齐机制中需要向状态中保持更多的数据。**
通过上文对Flink barrier对齐和不对齐机制的了解，我们发现两者各有优缺点：
- **barrier对齐机制**

**优点**：状态后端需要保存的数据少。
**缺点**：缓存堆积数据、Flink内存和磁盘负载有压力、checkpoint时间延长。
- **barrier不对齐机制**

**优点**：多并行度中只要有一个并行度中barrier到达，就会触发checkpoint，加快checkpoint进行，不容易出现数据反压问题。
**缺点**：状态后端保存数据多，状态恢复时比较慢。
在Flink中对于简单数据处理作业建议使用轻量级的barrier对齐机制，对于一些计算复杂导致任务出现数据高反压、checkpoint超时难以完成的的作业场景建议使用barrier不对齐机制，这样可以加快checkpoint进行、有效缓解数据高反压带来的一系列连锁问题。
#### 设置合适的watermark
在Flink中，watermark是一种衡量事件时间进展的机制，watermark是一种特殊的数据记录，watermark本质就是一个时间戳，基于Flink接收到的事件时间（Event Time）计算得到，并且该时间标记会随着数据流往后流动，当Flink算子接收到Watermark(t)事件时，可以认为早于或等于t时刻的事件时间已经完全到达。
基于事件时间处理数据时定时器、流的关联、窗口触发都与watermark相关联，关于watermark的设置需要根据具体的业务数据延迟程度来决定，watermark延迟时间设置过大可能会导致内存使用过大或者窗口长时间不触发，这种情况下可以适当调小watermark大小，此外如果某个并行度中长时间没有数据到达，可以设置“WatermarkStrategy.xxx..withIdleness(Duration.ofSeconds(5))”来指定等待空闲时间自动推进watermark。
 ---

### 2、内存优化
#### Flink内存分布

![文章配图](assets/img/posts/flink-performance-tuning/27cf0341133c40b9886f0233637e68d4.jpg)


![文章配图](assets/img/posts/flink-performance-tuning/image_13.png)

上图是Flink内存模型，从图中可以看出Flink 进程总内存(Total Process Memory)包含了Flink总内存（Total Flink Memory）和JVM特定内存。Flink总内存又包括JVM堆内存（JVM Heap）、托管内存（Managed Memory） 、直接内存（Direct Memory）。下面分别介绍各个部分内存功能以及参数配置。
#### Flink堆内存（JVM Heap）
Flink堆内存即JVM堆内存（JVM Heap），分为两部分：Framework堆内存（Framework Heap）和Task堆内存（Task Heap）。**Framework主要用于Flink框架本身所需的内存空间**，而**Task堆内存则用于Flink算子、用户代码执行及状态数据存储，也称为TaskExecutor使用的内存**。这两种内存的主要区别在于资源分配方式：Framework堆内存不会分配给Slot，而Task堆内存会分配给Slot。
- **Framework堆内存（Framework Heap）**

Framework堆内存通过taskmanager.memory.framework.heap.size参数配置，默认值为128M
- **Task堆内存（Task Heap）**

Task堆内存通过taskmanager.memory.task.heap.size参数配置。该参数没有默认值，若未指定，系统会自动计算：用Flink总内存减去Framework堆内存（Framework Heap）、托管内存（Managed Memory）、Framework非堆内存（Framework Off-Heap）、Task非堆内存（Task Off-Heap）和Network内存后的剩余部分。
#### Flink非堆内存（Off-Heap Memory）
**非堆内存（也称为堆外内存）主要**包含托管内存（Managed Memory）和直接内存（Direct Memory）两部分。
**1) 托管内存（Managed Memory）**
托管内存是由Flink负责分配和管理的本地堆外内存。**它在流处理作业中用于RocksDBstateBackend状态存储，在批处理作业中用于排序、哈希表和中间结果缓存。**
托管内存有两个主要配置参数：
- taskmanager.memory.managed.fraction：默认值为0.4，在未明确指定托管内存大小时，系统会按照这个比例从总Flink内存中分配。
- taskmanager.memory.managed.size：没有默认值，通常采用比例方式动态分配，这样更灵活。

**2) 直接内存（Direct Memory）**
直接内存分为三个部分：Framework非堆内存、Task非堆内存和Network内存。**使用直接内存可以减轻GC压力，提高性能。**
**Framework 非堆内存（Framework Off-Heap）**
Framework 非堆内存是 TaskExecutor 的堆外内存，不会分配给 slot。通过参数 taskmanager.memory.framework.off-heap.size 配置，默认值为 128M。
**Task非堆内存（Task Off-Heap）**
Task 非堆内存通过 taskmanager.memory.task.off-heap.size 参数配置，默认值为 0，即默认不使用。
**Network**
Network 内存用于基于 Netty 的网络数据交换和本地缓存，包括 TaskManager 之间的 Shuffle、广播以及与外部组件的数据传输。Network 内存有以下三个配置参数：
- taskmanager.memory.network.min：网络缓存最小值，默认 64MB
- taskmanager.memory.network.max：网络缓存最大值，默认 1GB
- taskmanager.memory.network.fraction：网络缓存占 Flink 总内存（taskmanager.memory.flink.size）的比例，默认值 0.1。如果计算出的内存量超出最小值或最大值范围，将自动调整到相应的限制值

#### JVM 特定内存
JVM 特定内存是 JVM 堆外内存的一部分，不计入 Flink 总内存。它包括两部分：JVM 元空间（JVM Metaspace）和 JVM Overhead。JVM 元空间用于存储类的元数据，随加载的类增多而增大，默认值为 256M。JVM Overhead 用于其他 JVM 开销（如代码缓存、线程栈等），默认值为 TaskManager 分配内存的 0.1 倍，范围在 192M 到 1GB 之间。
#### Flink内存优化建议
关于Flink内存优化，以下是几点重要建议：
1. 我们可以通过参数设置来指定JobManager和TaskManager的内存大小。在Standalone部署模式下，使用jobmanager.memory.flink.size和taskmanager.memory.flink.size参数；在容器部署模式下（如K8s、Yarn），则使用jobmanager.memory.process.size和taskmanager.memory.process.size参数。由于JobManager主要负责管理TaskManager，其内存配置可以相对较小，重点应放在TaskManager内存配置上。
2. 在提交Flink任务时，应分配足够的内存资源以防止反压现象。除了基本运行所需内存外，还应预留一定的额外内存，这样可以加快状态恢复速度，并更高效地处理停机期间累积的数据。
3. 在调整Flink内存管理时，建议优先调整fraction比例参数，如网络缓存占比（taskmanager.memory.network.fraction）和托管内存占比（taskmanager.memory.managed.fraction）。前者可根据网络流量大小调节，后者则根据RocksDB状态大小调节。这种方式可以灵活地影响任务内存配额。需要注意的是，手动指定过多固定参数可能导致内存配额冲突，造成Flink程序部署失败。

### 3、CheckPoint和大状态优化
> Flink的checkpoint是一种实现容错和状态恢复的机制。Checkpoint会定期将Flink程序的状态保存到持久化存储系统中，通常是分布式文件系统，当Flink程序发生故障时，可以重新启动应用程序并从之前的状态中恢复，使得Flink程序能够回到故障发生前的一致状态。因此Flink中的checkpoint非常重要。

#### Checkpoint的监控
在Flink WebUI界面中提供了Flink Job的checkpoint监控信息。当Job结束后，这些信息仍然可用。如下图所示，有四个不同的选项卡（概览、历史记录、摘要信息、配置信息）可以显示checkpoint相关的信息**概览（Overview）选项卡**

![文章配图](assets/img/posts/flink-performance-tuning/9a7bed6033dd481aa2696af2a2c1fd03.jpg)

#### **概览（Overview）选项卡**
概览选项卡显示以下统计信息：
- Checkpoint统计
- Triggered：作业启动后触发的checkpoint总数
- In Progress：当前正在执行的checkpoint数量
- Completed：作业启动后成功完成的checkpoint总数
- Failed：作业启动后失败的checkpoint总数
- Restored：作业启动后的恢复操作次数，反映了任务重启的次数。注意：使用savepoint进行的初始任务提交也计入恢复次数。如果JobManager在恢复过程中丢失，该统计会重新计数
- Latest Completed Checkpoint：最近一次成功完成的checkpoint
- Latest Failed Checkpoint：最近一次失败的checkpoint
- Latest Savepoint：最近一次触发的savepoint及其存储路径
- Latest Restore：恢复操作的类型
- Restore from Checkpoint：从checkpoint恢复
- Restore from Savepoint：从savepoint恢复

**请注意，概览选项卡中的信息在JobManager丢失时无法保存，如果JobManager发生故障转移，这些信息将会被重置。**
#### **历史记录（History）选项卡**
Checkpoint 历史记录保存有关最近触发的 checkpoint 的统计信息，包括当前正在进行的 checkpoint。对于失败的checkpoint，指标会尽最大努力进行更新，但是可能不准确。checkpoint统计详细信息内容如下:
- ID：已触发 checkpoint 的 ID。每个 checkpoint 的 ID 都会递增，从 1 开始。
- Status：Checkpoint 的当前状态，可以是正在进行（In Progress）、已完成（Completed） 或失败（Failed））。
- Acknowledged：已确认完成的子任务数量与总任务数量。
- Trigger Time：在 JobManager 上发起 checkpoint 的时间。
- Latest Acknowledgement：JobManager 接收到任何 subtask 的最新确认的时间。
- End to End Duration：从触发时间戳到最后一次确认的持续时间，也就是checkpoint开始到完成所需总时间。完整 checkpoint 的端到端持续时间由确认 checkpoint 的最后一个 subtask 确定。
- Checkpointed Data Size: 在此次checkpoint的sync以及async阶段中持久化的数据量。如果启用了增量 checkpoint或者changelog，则此值可能会与全量checkpoint数据量产生区别。
- Full Checkpoint Data Size: 所有已确认的 subtask 的 checkpoint 的全量数据大小。
- Processed (persisted) in-flight data：在 checkpoint 对齐期间（从接收第一个和最后一个 checkpoint barrier 之间的时间）所有已确认的 subtask 处理/持久化 的大约字节数。如果启用了 unaligned checkpoint，持久化的字节数可能会大于0。

![文章配图](assets/img/posts/flink-performance-tuning/94950eb3f31b4bbdb90ff29ba0fc5a98.jpg)


Flink Web UI 提供了每次 checkpoint 各 subtask 的详细指标，帮助定位 checkpoint 在不同阶段的耗时及背压情况。下面对 Sync Duration、Async Duration、Alignment Duration、Start Delay 及 Unaligned Checkpoint 等指标进行说明。
#### **Subtask 检查点指标说明**
- **Sync Duration（同步时长）**
    指从 subtask 开始进入同步快照阶段到完成状态引用拷贝所花费的时间。该阶段会获取状态锁并阻塞该 subtask 上的所有其他活动（如记录处理、计时器触发等）
- **Async Duration（异步时长）**
    指从同步快照结束后到 checkpoint 数据完全写入外部存储所需的时间。在此阶段，数据处理和异步状态写入并行进行，不会影响算子正常执行。对于非对齐检查点，还包括持久化 in-flight 数据及等待最后一个 barrier 的时间
- **Alignment Duration（对齐时长）**
    指第一个 checkpoint barrier 到达当前算子与最后一个 barrier 到达之间的时间差。在此期间，已到达 barrier 的输入通道会阻塞并停止处理后续数据，直到所有上游通道的 barrier 都到齐后才开始快照
- **Start Delay（启动延迟）**
    指从 JobManager 侧创建 checkpoint barrier 到 subtask 收到第一个 barrier 的延迟时间，可用于衡量 barrier 在流图中传播的时延
- **Unaligned Checkpoint（非对齐检查点）**
    用于指示本次 checkpoint 是否以非对齐模式完成。当启用非对齐检查点或对齐等待超时后，Flink 会自动将 aligned checkpoint 转为 unaligned checkpoint，以消除背压场景下的 barrier 对齐等待

以上指标可帮助用户分析 checkpoint 在同步、异步、对齐及传播等各阶段的耗时表现，从而针对性地优化作业配置或消除瓶颈。

![文章配图](assets/img/posts/flink-performance-tuning/fc9ec57c3d9349939e5984223da76b2a.jpg)

默认情况下，Flink Web UI 会在 History 选项卡中保留最近 10 次 Checkpoint 的记录。
可以通过在 `flink-conf.yaml` 文件中设置 `web.checkpoints.history` 参数来修改保留的 Checkpoint 数量。
**配置示例**
```text
text# 将保留的历史 Checkpoint 记录数调整为 20 条
web.checkpoints.history: 20


```
修改完成后，重启 Flink 集群即可使配置生效。通过该配置，可根据业务需求灵活调整 Web UI 中保留的 Checkpoint 历史记录条数。
#### **摘要信息（Summary）选项卡**
摘要计算了所有已完成 checkpoint 的端到端持续时间、增量/全量Checkpoint 数据大小和 checkpoint alignment 期间缓冲的字节数的简单 min/average/maximum 统计信息。

![文章配图](assets/img/posts/flink-performance-tuning/8bbcd7403d52402cba0f55c737cb99d7.jpg)

**请注意：这些信息不会再JobManager中保存，如果JobManager故障转移，这些统计信息将重新计数。**
#### **配置信息（Configuration）选项卡**
Flink Web UI 的此选项卡展示了用户在作业或配置文件中指定的 checkpoint 相关参数。下面列出了各配置项的含义：
**用户指定的 Checkpoint 配置项说明**
- **Checkpointing Mode**：指定 checkpoint 的一致性保证模式。“恰好一次（Exactly Once）”确保每条记录在故障恢复后只处理一次；“至少一次（At least Once）”则允许记录在极端情况下被重复处理。
- **Interval**：触发 checkpoint 的时间间隔，Flink 会以此间隔周期性地发起 checkpoint。
- **Timeout**：checkpoint 必须在此时间内完成，否则 JobManager 会取消该 checkpoint 并立即触发新的 checkpoint。
- **Minimum Pause Between Checkpoints**：两次 checkpoint 之间的最小暂停时长。在一次 checkpoint 成功后，需要等待该时长后才会触发下一次 checkpoint，可能导致实际触发间隔超过配置的 Interval。
- **Maximum Concurrent Checkpoints**：允许同时进行的最大 checkpoint 数量，超过该数量时新的 checkpoint 需等待正在进行的 checkpoint 完成后才能启动。
- **Persist Checkpoints Externally**：是否将 checkpoint 持久化到外部存储。如果启用，还会额外展示外部化 checkpoint 的清理策略（取消作业时删除或保留）。

通过合理调整以上参数，可以在保证作业容错能力的同时，优化系统性能表现。

![文章配图](assets/img/posts/flink-performance-tuning/dd6b522dbf364269b79615b835efdbd3.jpg)

### CheckPoint的优化
#### **设置CheckpointStorage**
我们可以设置 Checkpoint 快照（Snapshot）的存储位置，可选择 JobManagerCheckpointStorage 或 FileSystemCheckpointStorage，分别表示存储在 JobManager 堆内存和文件系统。默认情况下，快照存储在 JobManager 的堆内存中，建议改为持久化于文件系统。
Flink设置Checkpoint storage检查点存储位置代码如下:
```text
//设置checkpoint storage存储为JobManagerStorage，默认堆内存存储状态大小为5M
env.getCheckpointConfig().setCheckpointStorage(new JobManagerCheckpointStorage(5*1024*1024));

//设置checkpoint storage存储为hdfs路径
env.getCheckpointConfig().setCheckpointStorage("hdfs://mycluster/flink/checkpoints");


```
对于JobManagerCheckpointStorage来说，默认每个单独的状态大小限制为5M ，可以手动指定该值，如果Flink是本地开发调试或者Flink状态非常少的场景可以使用JobManagerCheckpointStorage，实际生产中推荐使用FileSystemCheckpointStorage。
#### **设置CheckPoint的模式**
Exactly-once 语义通过精确恢复算子状态，保证端到端的数据一致性，避免丢数据或重复消费，但会带来额外的同步开销，从而降低吞吐和增加延迟。
At-least-once 语义则允许在故障恢复时发生重复，换取更高的吞吐量和更低的延迟，更适合对一致性要求不高、但时延或吞吐敏感的场景。
|          语意模式 |                                   保证 |                                                使用场景 |                                                性能影响 |
|:--------------|:-------------------------------------|:----------------------------------------------------|:----------------------------------------------------|
|  Exactly-Once |                         端到端一致性，不丢不重复 |                                      金融交易、计费等强一致性场景 |                                   同步开销大，吞吐通常较低，延迟较高 |
| At-Least-Once |                             可能重复但不丢失 |                                   实时监控、日志收集等可容忍重复场景 |                                       开销小，吞吐和时延表现更优 |

```text
//设置检查点模式为exactly-once
env.getCheckpointConfig().setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);

//设置检查点模式为at-least-once
env.getCheckpointConfig().setCheckpointingMode(CheckpointingMode.AT_LEAST_ONCE);
```
#### **设置CheckPoint的超时时间**
超时时间指定了每次Checkpoint执行过程中的上限时间范围，一旦Checkpoint执行时间超过该阈值，Flink将会中断Checkpoint过程，并按照超时处理。该指标可以通过setCheckpointTimeout方法设定，默认为10分钟。
```text
//设置Checkpoint 超时时间
env.getCheckpointConfig().setCheckpointTimeout(10*60*1000);
```
#### **设置CheckPoint之间的最小等待时间**
在 Web UI 中，如果发现某次 checkpoint 的完成时间持续超过配置的触发间隔，Flink 会在每次 checkpoint 完成后立即启动下一个 checkpoint，导致大量资源被持续占用在 checkpointing 上，影响算子处理进度和整体应用性能 。
***连续启动 Checkpoint 的场景***
Flink 默认在前一次 checkpoint 完成后就立刻发起下一次 checkpoint，当 checkpoint 完成时间超过基本间隔时，就会出现“紧接着不断启动 checkpoint”的现象 。这种情况会让算子不断处于 snapshot 状态，消耗过多计算和网络资源。
***设置最小等待时间***
为了避免资源被持续绑在 checkpointing 上，可定义两次 checkpoint 之间的最小等待时间。
- **代码方式**

```bash
// 在流处理环境中开启 checkpoint，并指定间隔
env.enableCheckpointing(1000);
// 设置两次 checkpoint 结束后最少等待 500 ms
env.getCheckpointConfig().setMinPauseBetweenCheckpoints(500);

```
这样，在一次 checkpoint 成功完成后，Flink 会至少等待指定时长再触发下一个 checkpoint 。
- **提交任务时设置参数**

在提交 Flink 作业时，可通过命令行或脚本向集群传入：
```bash
bash
bin/flink run \
    -Dexecution.checkpointing.min-pause=500 \
    -c your.main.Class \
    your-flink-job.jar

```
或者在 `flink-conf.yaml` 中添加：
```text
execution.checkpointing.min-pause: 500

```
> 注意：一旦指定 execution.checkpointing.min-pause 大于 0，Flink 将只允许 1 个 checkpoint 并发执行。

#### **设置CheckPoint并行度**
如果Flink集群的资源充足，checkpoint周期时间较短，也可以配置Flink 应用程序同时进行多个checkpoints同时进行。这种情况下会分配更多的资源到checkpointing。
Flink在默认情况下只有一个检查点可以运行，根据用户指定的数量可以同时触发多个Checkpoint，进而提升Checkpoint整体的效率。
```java
//设置checkpoint最大并行度，默认为1
env.getCheckpointConfig().setMaxConcurrentCheckpoints(1);

```
以上设置方式还可以在提交Flink任务的时候通过“execution.checkpointing.max-concurrent-checkpoints”参数进行设置。
如下是测试checkpoint并行执行的代码案例。该案例中读取自定义source中的数据并通过map处理，每条数据暂停处理0.5秒。案例代码如下：
```java
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

DataStreamSource<StationLog> source = env.addSource(new RichParallelSourceFunction<StationLog>() {
    Boolean flag = true;

    /**
     * 主要方法:启动一个Source，大部分情况下都需要在run方法中实现一个循环产生数据
     * 这里计划1s 产生1条基站数据，由于是并行，当前节点有几个core就会有几条数据
     */
    @Override
    public void run(SourceContext<StationLog> ctx) throws Exception {
        Random random = new Random();
        String[] callTypes = {"fail", "success", "busy", "barring"};
        while (flag) {
            String sid = "sid_" + random.nextInt(10);
            String callOut = "1811234" + (random.nextInt(9000) + 1000);
            String callIn = "1915678" + (random.nextInt(9000) + 1000);
            String callType = callTypes[random.nextInt(4)];
            Long callTime = System.currentTimeMillis();
            Long durations = Long.valueOf(random.nextInt(50) + "");
            ctx.collect(new StationLog(sid, callOut, callIn, callType, callTime, durations));
            Thread.sleep(1000);//1s 产生一个事件
        }

    }

    //当取消对应的Flink任务时被调用
    @Override
    public void cancel() {
        flag = false;
    }
});

//处理数据
SingleOutputStreamOperator<String> result =
        source.keyBy(stationLog -> stationLog.sid)
        .map(new RichMapFunction<StationLog, String>() {

    private ListState<String> listState;

    @Override
    public void open(Configuration parameters) throws Exception {
        ListStateDescriptor<String> stateDescriptor = new ListStateDescriptor<>("liststate", String.class);
        listState = getRuntimeContext().getListState(stateDescriptor);
    }

    @Override
    public String map(StationLog value) throws Exception {
        //100倍状态存储
        for(int i = 0 ;i<100 ;i++){
            listState.add(value.toString());
        }
        //每条数据都暂停处理 500ms
        Thread.sleep(500);

        return value.toString();
    }

});

result.print();

env.execute();

```
将以上代码打包并提交到Standalone集群执行，默认checkpoint并行度为1，此时Flink的CheckPoint会在上一次checkpoint执行完成后立即执行后续checkpoint；如果设置checkpoint多并行度，可以看到同时会有多个checkpoint同时进行。
> 使用默认checkpoint并行度为1

启动Standalone集群，并向集群中提交打包好的Flink任务，提交命令中设置并行度为8，checkpoint 周期为1s，checkpoint语义为exactly_once，checkpoint并行度使用默认的1。
```text
[root@node4 ~]# cd /software/flink-1.17.1/bin/
[root@node4 bin]# ./flink run -m node1:8081 \
-Dparallelism.default=8 \
-Dexecution.checkpointing.interval=1000 \
-Dexecution.checkpointing.mode=exactly_once \
-c com.mashibing.flinkjava.code.chapter12.CheckpointParalleCodeTest /root/flink-jar-test/FlinkJavaCode-1.0-SNAPSHOT-jar-with-dependencies.jar

```
可以看到Flink WebUI中checkpoint执行情况如下，可以看到虽然设置checkpoint的周期为1s，但是由于每个checkpoint中状态保存超过1s，所以每个checkpoint触发时间都是接着上个checkpoint执行完成后立即开始。

![文章配图](assets/img/posts/flink-performance-tuning/2f1268381c624838a72bfde3f43e48db.jpg)

> 设置checkpoint并行度为100

向Standalone集群中提交打包好的Flink任务，提交命令中设置并行度为8，checkpoint 周期为1s，checkpoint语义为exactly_once，checkpoint并行度为100。
```text
[root@node4 ~]# cd /software/flink-1.17.1/bin/
[root@node4 bin]# ./flink run -m node1:8081 \
-Dparallelism.default=8 \
-Dexecution.checkpointing.interval=1000 \
-Dexecution.checkpointing.mode=exactly_once \
-Dexecution.checkpointing.max-concurrent-checkpoints= 100 \
-c com.mashibing.flinkjava.code.chapter12.CheckpointParalleCodeTest /root/flink-jar-test/FlinkJavaCode-1.0-SNAPSHOT-jar-with-dependencies.jar

```
可以看到Flink WebUI中checkopint执行情况如下，checkpiont执行间隔为1s。

![文章配图](assets/img/posts/flink-performance-tuning/d691aab2bbbc41558c8e56ad5c3fe301.jpg)

通过以上对比可以看到设置并行执行checkpoint可以加快checkpoint执行效率。
#### **设置CheckPoint的失败次数**
checkpoint在执行过程中如果出现失败设置可以容忍的检查的失败数，超过这个数量则系统自动关闭和停止任务，没有默认值。
```text
//设置可容忍checkpoint失败次数,没有默认值值，设置为0，表示不容忍任何checkpoint失败
env.getCheckpointConfig().setTolerableCheckpointFailureNumber(0);

```
#### **设置CheckPoint清理策略**
当开启了checkpoint外部持久化存储时，可以通过如下两种方式决定在取消Flink作业时是否清空外部存储系统中的状态数据，如果不设置改参数，Flink取消任务时默认不清空checkpoint状态数据。
- RETAIN_ON_CANCELLATION：在Flink作业取消时保留检查点。在这种情况下，必须手动清除检查点状态。
- DELETE_ON_CANCELLATION：在Flink作业取消时删除检查点。只有作业失败时才会保存检查点状态。

```text
/**
 * 设置checkpoint的清理策略，当作业取消时，checkpoint数据的保留策略，默认值为RETAIN_ON_CANCELLATION
 * RETAIN_ON_CANCELLATION：当作业取消时，保留checkpoint数据
 * DELETE_ON_CANCELLATION：当作业取消时，删除checkpoint数据
 */
env.getCheckpointConfig().setExternalizedCheckpointCleanup(CheckpointConfig.ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION);
env.getCheckpointConfig().setExternalizedCheckpointCleanup(CheckpointConfig.ExternalizedCheckpointCleanup.DELETE_ON_CANCELLATION);

```
#### **设置增量Checkpoint**
Flink中一共有两种状态后端，一类是HashMapStateBackend,一类是EmbeddedRocksDBSatateBackend。
- **HashMapStateBackend**

HashMapStateBackend将状态数据以HashMap数据结构进行存储，默认将状态存储在JobManager内存中。通过用户指定checkpint持久化目录也可以将状态数据存储在外部持久化系统中。**这种状态后端每次进行checkpoint检查点时都是全量方式进行，适用于较小的状态数据集。**
- **EmbeddedRocksDBStateBackend**

EmbeddedRocksDBStateBackend 是 Flink 的一种基于 RocksDB 的状态后端。RocksDB 是一个高性能、持久化的键值存储引擎，它将状态数据存储在本地磁盘上，默认在TaskManager本地数据目录中。与 HashMapStateBackend全量存储状态不同，**RockDBStateBackend是目前唯一支持增量检查点的状态后端，可以保存非常大的状态。**
如果Flink任务checkpoint状态非常大，开启增量checkpoint应该是首要考虑因素，与完整的checkpoint相比，增量checkpoint可以显著减少checkpoint时间，因为增量checkpoint仅存储与先前完成的checkpoint不同的增量文件，而非全量数据备份。**在生产环境中建议使用RockDBStateBackend方式存储状态。**
代码中设置RockDBStateBackend的方式并开启增量checkpoint方式如下：
```java
//设置状态后端为RocksDBStateBackend，并指定增量checkpoint
env.setStateBackend(new EmbeddedRocksDBStateBackend(true));
env.getCheckpointConfig().setCheckpointStorage("your-checkpoint-dir");

```
在Flink代码中设置状态后端为new EmbeddedRocksDBStateBackend()默认是不开启增量checkpoint，加上true后支持增量checkpoint。也可以在Flink集群的flink-conf.yaml文件中配置state.backend.incremental为ture来开启增量checkpoint，或者在向集群中提交Flink任务时通过命令来设置。
下面通过一个案例来演示增量checkpoint保存。该案例中读取自定义source中的数据并通过map处理，每条数据暂停处理0.5秒。案例代码如下：
```java
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

DataStreamSource<StationLog> source = env.addSource(new RichParallelSourceFunction<StationLog>() {
    Boolean flag = true;

    /**
     * 主要方法:启动一个Source，大部分情况下都需要在run方法中实现一个循环产生数据
     * 这里计划1s 产生1条基站数据，由于是并行，当前节点有几个core就会有几条数据
     */
    @Override
    public void run(SourceContext<StationLog> ctx) throws Exception {
        Random random = new Random();
        String[] callTypes = {"fail", "success", "busy", "barring"};
        while (flag) {
            String sid = "sid_" + random.nextInt(10);
            String callOut = "1811234" + (random.nextInt(9000) + 1000);
            String callIn = "1915678" + (random.nextInt(9000) + 1000);
            String callType = callTypes[random.nextInt(4)];
            Long callTime = System.currentTimeMillis();
            Long durations = Long.valueOf(random.nextInt(50) + "");
            ctx.collect(new StationLog(sid, callOut, callIn, callType, callTime, durations));
            Thread.sleep(1000);//1s 产生一个事件
        }

    }

    //当取消对应的Flink任务时被调用
    @Override
    public void cancel() {
        flag = false;
    }
});

//处理数据
SingleOutputStreamOperator<String> result =
        source.keyBy(stationLog -> stationLog.sid)
                .map(new RichMapFunction<StationLog, String>() {

                    private ListState<String> listState;

                    @Override
                    public void open(Configuration parameters) throws Exception {
                        ListStateDescriptor<String> stateDescriptor = new ListStateDescriptor<>("liststate", String.class);
                        listState = getRuntimeContext().getListState(stateDescriptor);
                    }

                    @Override
                    public String map(StationLog value) throws Exception {
                        //100倍状态存储
                        for(int i = 0 ;i<100 ;i++){
                            listState.add(value.toString());
                        }
                        return value.toString();
                    }

                });

result.print();

env.execute();

```
如果不使用RocksDB 增量状态存储，可以看到checkpoint每次保存的都是全量状态。如果设置使用了RocksDB增量状态存储，可以看到checkpoint每次保存的都是增量状态。
#### **1) 使用全量checkpoint**
启动Standalone集群，并向集群中提交打包好的Flink任务，提交命令中设置并行度为8，checkpoint 周期为1s，状态后端使用rocksdb并设置状态保存在HDFS路径中，checkpoint语义为exactly_once。
```text
[root@node4 ~]# cd /software/flink-1.17.1/bin/
[root@node4 bin]# ./flink run -m node1:8081 \
-Dparallelism.default=8 \
-Dexecution.checkpointing.interval=1000 \
-Dstate.backend.type=rocksdb \
-Dstate.checkpoints.dir=hdfs://mycluster/rockDBState-dir \
-Dexecution.checkpointing.mode=exactly_once \
-c com.wubaibao.flinkjava.code.chapter12.CKWithRockDBStateBackend /root/flink-jar-test/FlinkJavaCode-1.0-SNAPSHOT-jar-with-dependencies.jar

```
可以看到Flink WebUI中checkpoint执行情况如下，checkpoint进行全量保存。

![文章配图](assets/img/posts/flink-performance-tuning/a551bade1ade4fb48002cb6b455d88eb.jpg)

#### **2) 设置RocksDB状态后端并开启增量checkpoint**
启动Standalone集群，并向集群中提交打包好的Flink任务，提交命令中设置并行度为8，checkpoint 周期为1s，状态后端使用rocksdb并设置状态保存在HDFS路径中，checkpoint语义为exactly_once，checkpoint进行增量保存。
```text
[root@node4 ~]# cd /software/flink-1.17.1/bin/
[root@node4 bin]# ./flink run -m node1:8081 \
-Dparallelism.default=8 \
-Dexecution.checkpointing.interval=1000 \
-Dstate.backend.type=rocksdb \
-Dstate.checkpoints.dir=hdfs://mycluster/rockDBState-dir \
-Dexecution.checkpointing.mode=exactly_once \
-Dstate.backend.incremental=true \
-c com.mashibing.flinkjava.code.chapter12.RocksDBCKTest /root/flink-jar-test/FlinkJavaCode-1.0-SNAPSHOT-jar-with-dependencies.jar

```
可以看到Flink WebUI中checkpoint执行情况如下，checkpoint进行增量保存。

![文章配图](assets/img/posts/flink-performance-tuning/02f5b2abb9074db6ac87eee0308d9b1c.jpg)

通过以上对比可以看出，使用RocksDB状态后端并设置checkpoint增量保存后，每次可以大大节省状态保存的大小。一旦启用了增量快照，网页上展示的 Full Checkpointed Data Size 只代表增量上传的数据量，而不是一次快照的完整数据量。
#### **开启非对齐checkpoint**
当Flink作业正运行在严重的背压下时，由于缓存中需要存储大量的数据可能会导致checkpoint周期非常长，这种情况下我们可以设置非对齐checkpoint(Unaligned checkpoint)。Flink从1.11版本开始支持 `Unaligned checkpoints`，非对齐checkpoint中 将In-flight 数据(例如，存储在缓冲区中的数据)作为 Checkpoint State的一部分，允许 Checkpoint Barrier 跨越这些缓冲区， Checkpoint 时长变得与当前吞吐量无关，从而减少checkpoint的时长。
可以通过两种方式来设置非对齐Checkpoint:代码中设置及flink-conf.yaml配置文件中设置。
**1) 代码中设置**
```java
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();// 启用非对齐 Checkpoint
env.getCheckpointConfig().enableUnalignedCheckpoints();

```
**2) flink-conf.yaml配置文件中设置**
```text
execution.checkpointing.unaligned: true

```
注意：非对齐checkpoints 会增加状态存储的IO，因此当状态存储的IO是整个checkpoint过程中真正的瓶颈时，不能使用非对齐checkpoint。
#### **开启Changelog**
Flink 默认的 RocksDB 增量快照虽然能减少每次完整快照的数据量，但在大规模作业中仍存在两大痛点：Compaction 后的旧文件需重复上传，以及只有在收到 barrier 后才开始快照，导致延迟波动。Flink 1.15 引入了 Changelog State Backend，通过细粒度的增量日志+独立物化，显著缩短 checkpoint 时长，同时也带来额外的 I/O、内存和恢复负担。
**RocksDB 增量快照的两大问题**
- 重复上传旧状态

RocksDB 为了空间和读性能定期 compaction，会生成新的 SST 文件，增量 checkpoint 必须将 compaction 后的全部状态文件（包括旧数据）再次上传，延长了异步上传时长，尤其在大任务中更易触发单 task 大量数据传输。
- Barrier 到达前不做快照

当前机制中，Task 只有在收到至少一个 checkpoint barrier 后才进行本地状态快照，这部分等待也会加入同步阶段时延。
**Changelog State Backend 核心机制**
1. **双轨写入**
- *State Table*：算子状态以表格形式保存在 TaskManager，本地定期将表格物化（Materialization）到外部存储，频率通常远低于 checkpoint 频率。
- *State Changelog*：以 Append-Only 的方式将每次状态变更写入内存日志，日志持续上传到持久化存储。
2. **Checkpoint 时仅同步 Changelog**

在一次 checkpoint 中，只需将未上传的 Changelog 增量强制 flush 至存储即可完成快照，其它数据已由定期物化负责。
** 3.   日志截断**
当 State Table 的物化版本到达存储后，Changelog 中对应的日志片段可被安全截断，避免日志无限增长。

![文章配图](assets/img/posts/flink-performance-tuning/49cb4383b2d64077b26cb47907520ab5.jpg)

**优势与额外开销**
**优势**
- 大幅降低每次 checkpoint 的同步和异步时长，实现接近 1s 的 99% checkpoint 目标 。
- 减少端到端延迟抖动，提高作业的稳定性和资源利用平滑度.

**额外开销**
- 在外部存储中创建更多文件：Changelog 持续写入产生大量小文件，增加存储管理和 I/O 负担。
- TaskManager 内存开销：维护增量日志需要额外内存资源。
- 恢复时重放日志：故障恢复除了加载最新表格，还需重放 Changelog，可能略增恢复延迟。

通过引入 Changelog State Backend，Flink 在大规模、低延迟场景下获得更稳定的 checkpoint 性能，且可与 unaligned checkpoint、buffer debloating 等机制协同，自动为不同业务模式选择最佳 checkpoint 方案。
Changelog State Backend机制可以在代码中进行设置开启，方式如下：
```java
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
env.enableChangelogStateBackend(true);

```
#### **开启checkpoint压缩**
Flink 为所有 checkpoints 和 savepoints 提供可选的压缩（默认：关闭）。 目前压缩仅支持使用 `[snappy 压缩算法](https://github.com/xerial/snappy-java)`，Flink未来版本会支持自定义压缩算法。 设置压缩后可以大大减少Flink存储状态的大小，压缩可以通过如下参数进行设置：
```java
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
//开启checkpoint/savepoint 压缩
env.getConfig().setUseSnapshotCompression(true);

```
> 注意：压缩选项对增量快照没有影响，因为增量快照使用的是 RocksDB 的内部格式，该格式始终使用开箱即用的 snappy 压缩。

### 4、RocksDB优化
RocksDB是Facebook开发并开源的高性能键值存储库，使用C++编写，适用于低延迟、高吞吐的大规模数据存储。在生产环境中，许多大型Flink流式应用的状态后端采用RocksDB，以可靠管理大规模状态。
RocksDB基于LSM树（Log-Structured Merge Tree）组织数据，并在3.0 版本后引入了列族（Column Families）概念。所有键值对均关联到相应列族，默认为“default”。
RocksDB架构的主要组件包括memtable、sstfile和logfile。写入时，数据首先插入内存中的memtable，以获得高性能写入；同时可追加到WAL（Write-Ahead Log）日志以确保可靠性。当memtable达到阈值后，其内容将刷新至磁盘上的sstfile，对应的WAL日志可被安全删除。底层定期合并多个sstfile文件，以减少磁盘文件数量并优化读取性能。读取时，系统依次在memtable、BlockCache（用于缓存SSTable块提升读取效率）和磁盘sstfile中查找数据，命中即返回。
#### RocksDB内存调优
RocksDB 状态后端在 Flink 中的内存使用默认由 Flink 托管，你只需通过调整 TaskManager 的托管内存即可解决大多数性能问题；只有在遇到写缓存频繁刷盘或读缓存命中率低等场景时，才需要针对 RocksDB 的底层参数进行细粒度调优。以下介绍默认托管机制、两个关键调优参数及如何手动管理内存。
#### RocksDB 内存托管与默认配置
Flink 在 `state.backend.rocksdb.memory.managed=true` 时，会将 RocksDB 的原生内存配额设置为 TaskManager 的托管内存大小（按每个 slot 计算）[1](https://nightlies.apache.org/flink/flink-docs-master/docs/ops/state/state_backends/).
TaskManager 的托管内存可通过 `taskmanager.memory.managed.size` 或 `taskmanager.memory.managed.fraction` 两个参数进行调整，以提升内存相关的性能表现[4](https://flink.apache.org/2021/01/18/using-rocksdb-state-backend-in-apache-flink-when-and-how/).
绝大多数 Flink 作业无需修改 RocksDB 底层参数，只需适当增加托管内存，即可改善写入频繁刷新或缓存未命中导致的性能瓶颈。
#### 高级内存调优参数
当发现 RocksDB 因写缓冲区不足导致频繁刷盘，或因读缓存未命中导致性能下降时，可通过以下参数重分配托管内存：
state.backend.rocksdb.memory.write-buffer-ratio
- 默认值 0.5，表示 50% 的托管内存分配给写路径（MemTable 写缓冲）

state.backend.rocksdb.memory.high-prio-pool-ratio
- 默认值 0.1，表示 10% 的 block cache 内存优先用于存放索引和 Bloom 过滤器，避免其被频繁驱逐造成性能波动

在提交 Flink 任务时，可通过 `-D` 选项覆盖以上参数。
#### 手动管理 RocksDB 内存
如需完全接管 RocksDB 的原生内存分配，先将 `state.backend.rocksdb.memory.managed` 设置为 `false`，然后自行配置：
- `state.backend.rocksdb.block.cache-size`（对应 RocksDB 的 `block_cache_size`）
- `state.backend.rocksdb.write-buffer-size`、 `state.backend.rocksdb.max-write-buffer-number` 等 MemTable 相关参数.

此时需确保 JVM 之外有足够内存可供 RocksDB 使用，否则可能引发内存不足或 OOM。
总体而言，Flink 已为 RocksDB 提供了开箱即用的托管内存机制，只有在特殊性能调优场景下，才建议启用手动内存管理并细调相关参数。
提交命令中设置并行度为8，checkpoint 周期为1s，状态后端使用rocksdb并设置状态保存在HDFS路径中，checkpoint语义为exactly_once，checkpoint进行增量保存，手动管理RocksDB内存，并设置写缓存区使用内存比例为0.6。
```text
[root@node4 ~]# cd /software/flink-1.17.1/bin/
[root@node4 bin]# ./flink run -m node1:8081 \
-Dparallelism.default=8 \
-Dexecution.checkpointing.interval=1000 \
-Dstate.backend.type=rocksdb \
-Dstate.checkpoints.dir=hdfs://mycluster/rockDBState-dir \
-Dexecution.checkpointing.mode=exactly_once \
-Dstate.backend.incremental=true \
-Dstate.backend.rocksdb.memory.managed=false \
-Dstate.backend.rocksdb.memory.write-buffer-ratio=0.6 \
-c com.mashibing.flinkjava.code.chapter12.RocksDBCKTest /root/flink-jar-test/FlinkJavaCode-1.0-SNAPSHOT-jar-with-dependencies.jar

```
#### RocksDB优化参数
在绝大多数场景下，通过增大 TaskManager 的托管内存即可显著提升 RocksDB 性能；仅在托管内存已满且仍出现读写瓶颈时，才建议关闭自动托管并手动调节以下 RocksDB 内存参数。
#### 优先增大 TaskManager 托管内存
Flink 默认由 `state.backend.rocksdb.memory.managed=true` 将 RocksDB 的缓存和写缓冲纳入 TaskManager 托管内存（默认为总 Flink 内存的 40%）
可通过调整 `taskmanager.memory.managed.size` 或 `taskmanager.memory.managed.fraction`（默认为 0.4）来为 RocksDB 分配更多托管内存，从而减少频繁刷新和缓存未命中导致的性能问题
#### RocksDB 手动内存调节参数
当托管内存无法进一步扩容且仍出现写端或读端瓶颈时，可将 `state.backend.rocksdb.memory.managed` 设置为 `false`，并结合以下参数细粒度分配内存。
- **state.backend.rocksdb.memory.write-buffer-ratio**

默认值 0.5，表示将可用内存的 50% 分配给写缓冲（MemTable）使用，限制写缓存最大内存消耗
- **state.backend.rocksdb.memory.high-prio-pool-ratio**

默认值 0.1，表示在 Block Cache 中保留 10% 内存用于索引和 Bloom 过滤器，以避免其频繁被驱逐影响查询性能
在提交任务时可通过 `-D` 选项覆盖上述参数，确保在关闭自动托管后 JVM 之外有足够内存供 RocksDB 使用
#### 高级选项：分区索引过滤
- **state.backend.rocksdb.memory.partitioned-index-filters**

默认值 `false`。开启后，RocksDB 会将索引 Block 和 Filter Block 进行多级分区索引，仅将顶级索引常驻内存，根据访问需求按需加载子分区，从而减少内存和 I/O 竞争。在内存受限场景下可将其设置为 `true`，测试中能带来约 10 倍的性能提升
总结来说，先通过增加 Flink 托管内存来解决大多数性能瓶颈；若仍不足，再关闭自动托管并结合写缓冲比例、高优先级缓存比例及分区索引过滤等参数进行精细调优。
以下是代码
```bash
./flink run-application -t yarn-application \
-Dparallelism.default=8 \
-Dexecution.checkpointing.interval=1000 \
-Dstate.backend.type=rocksdb \
-Dstate.checkpoints.dir=hdfs://mycluster/rockdb-state-dir \
-Dexecution.checkpointing.mode=exactly_once \
-Dstate.backend.incremental=true \
-Dstate.backend.rocksdb.memory.managed=false \
-Dstate.backend.rocksdb.memory.write-buffer-ratio=0.6 \
-Dstate.backend.rocksdb.memory.high-prio-pool-ratio=0.2 \
-Dstate.backend.rocksdb.memory.partitioned-index-filters=true \
-c com.wubaibao.flinkjava.code.chapter12.RocksDBCKTest /root/flink-jar-test/FlinkJavaCode-1.0-SNAPSHOT-jar-with-dependencies.jar

```
在极端性能需求场景下，除了增大 TaskManager 托管内存外，还可通过手动配置以下 RocksDB 底层参数来深入调优写入、缓存和后台 I/O 行为。
#### MemTable 管理相关参数
- **state.backend.rocksdb.writebuffer.count**（默认 2）

控制每个列族在内存中同时保留的 MemTable 最大数量。MemTable 达到上限后会被异步 Flush 到磁盘形成 SST 文件。
若状态列族多且内存充裕，可将此值调大（如 5），以减少 Flush 频次并提升吞吐。
- **state.backend.rocksdb.writebuffer.size**（默认 64M）

定义单个 MemTable 的内存容量上限。增大该值可在内存充足时承载更多写入数据，降低 Flush 触发频率，从而提高写入性能。
- **state.backend.rocksdb.writebuffer.number-to-merge**（默认 1）

指定在真正写入存储前，最少要合并多少个 immutable MemTable。默认值为 1，意味着每个 MemTable 填满后即触发 Flush。
调高至 2–3 可让多个 MemTable 合并后再写盘，减少写放大；但过大则可能增加合并延迟和内存峰值。
#### Block Cache 与块大小参数
- **state.backend.rocksdb.block.cache-size**（默认 8M）

设置 RocksDB BlockCache 的总容量。增大到 64–256M 可显著提升随机读性能，减少磁盘 I/O 压力。
- **state.backend.rocksdb.block.blocksize**（默认 4K）

定义 SST 文件中最小的数据块单位。
- 增大 BlockSize（如 64K 或 128K）可降低写入时的 block 切换开销，提升写入吞吐；
- 减小 BlockSize 则有利于更精细的缓存查找，提高随机读命中率。
    调优时应同步考虑 BlockCache 容量，保持缓存的块数足够支撑访问热点。

#### 后台线程与并发参数
- **state.backend.rocksdb.thread.num**（默认 2）

控制用于 Flush 和 Compaction 的后台线程数。
在多核机器或机械硬盘环境下，可适当提高到 4–8，以加快后台 I/O 处理；但线程数过多也可能与前端写入争抢资源，导致写入停顿。
总结
高级调优需根据写入吞吐、读取模式和集群资源做综合权衡：
- 写入密集时侧重增大 MemTable 大小/数量与合并阈值；
- 读取密集时侧重增大 BlockCache 与调整 BlockSize；
- I/O 背景负载高时增减后台线程数。

通过监控 Flink 提供的 RocksDB 指标（如 memtable 大小、block-cache 使用率、flush 延迟）来评估调整效果，并逐步收敛到最佳配置。
#### RocksDB参数使用
在Flink中设置以上RocksDB高级参数可以在代码中设置，也可以在提交任务时进行设置，在代码中设置时需要实现ConfigurableRocksDBOptionsFactory接口进行参数设置，相当于是硬编码且比较麻烦，建议在提交任务时通过指定对应参数进行设置，这种方式比较灵活方便。
```python
... ...
//设置状态后端为RocksDBStateBackend，并指定增量checkpoint
EmbeddedRocksDBStateBackend rocksDBStateBackend = new EmbeddedRocksDBStateBackend(true);
rocksDBStateBackend.setRocksDBOptions(new MyOptionsFactory());
env.setStateBackend(rocksDBStateBackend);
env.getCheckpointConfig().setCheckpointStorage("hdfs://mycluster/rockDBState-dir");
... ...
//MyOptionsFactory类实现
class MyOptionsFactory implements ConfigurableRocksDBOptionsFactory {

    @Override
    public DBOptions createDBOptions(DBOptions currentOptions,
                                     Collection<AutoCloseable> handlesToClose) {
        return currentOptions
                //数据自动刷盘
                .setAtomicFlush(true);
    }

    @Override
    public ColumnFamilyOptions createColumnOptions(ColumnFamilyOptions currentOptions,
                                                   Collection<AutoCloseable> handlesToClose) {
        return currentOptions
                //设置在内存中允许保留的 memtable 最大个数，默认2
                .setMaxWriteBufferNumber(2)
                //设置数据写入RocksDB时在内存中空间占用大小，默认64M
                .setWriteBufferSize(64*1024*1024L)
                //设置内存中writebuffer 进行合并的最小阈值，默认1
                .setMinWriteBufferNumberToMerge(1)
                .setTableFormatConfig(
                    new BlockBasedTableConfig()
                        //设置RocksDB中BlockCache大小的参数，默认8M
                        .setBlockCache(new LRUCache(8*1024*1024L))
                        //设置SST文件底层block大小，默认4kb
                        .setBlockSize(4*1024L)
                );
    }

    @Override
    public RocksDBOptionsFactory configure(ReadableConfig configuration) {
        //返回配置项
        return this;
    }
}

```
以上高级参数设置有一定门槛，并且在代码设置比较麻烦，Flink还提供通过setPredefinedOptions方法选择Flink中预定义选项，这些选项中自动设置好了底层的一些参数，大大降低了使用门槛。设置RocksDB使用Flink预定义选项方式如下:
```text
//设置状态后端为RocksDBStateBackend，并指定增量checkpoint
EmbeddedRocksDBStateBackend rocksDBStateBackend = new EmbeddedRocksDBStateBackend(true);
rocksDBStateBackend.setPredefinedOptions(PredefinedOptions.DEFAULT);
env.setStateBackend(rocksDBStateBackend);
        env.getCheckpointConfig().setCheckpointStorage("hdfs://mycluster/rockDBState-dir");

```
PredefinedOptions默认有四种选项：
1. DEFAULT：默认，没有额外参数优化，RocksDB只使用磁盘。
2. SPINNING_DISK_OPTIMIZED：RocksDB使用磁盘并设置一些优化参数。
3. SPINNING_DISK_OPTIMIZED_HIGH_MEM：RocksDB使用磁盘和内存并设置一些优化参数。
4. FLASH_SSD_OPTIMIZED：RocksDB使用固态磁盘并设置优化参数。

以上四种选项中，每一种Flink都设置了对应的优化参数，我们可以直接选择使用，当内存充足时，建议选择SPINNING_DISK_OPTIMIZED_HIGH_MEM方式。
- **提交任务时参数设置RocksDB高级参数**

```bash
./flink run-application -t yarn-application \
-Dparallelism.default=8 \
-Dexecution.checkpointing.interval=1000 \
-Dstate.backend.type=rocksdb \
-Dstate.checkpoints.dir=hdfs://mycluster/rockdb-state-dir \
-Dexecution.checkpointing.mode=exactly_once \
-Dstate.backend.incremental=true \
-Dstate.backend.rocksdb.memory.managed=false \
-Dstate.backend.rocksdb.writebuffer.count=2 \
-Dstate.backend.rocksdb.writebuffer.size=64M \
-Dstate.backend.rocksdb.writebuffer.number-to-merge=1 \
-Dstate.backend.rocksdb.block.cache-size=8M \
-Dstate.backend.rocksdb.block.blocksize=4kb \
-Dstate.backend.rocksdb.thread.num=2 \
-c com.mashibing.flinkjava.code.chapter12.RocksDBCKTest /root/flink-jar-test/FlinkJavaCode-1.0-SNAPSHOT-jar-with-dependencies.jar

```
