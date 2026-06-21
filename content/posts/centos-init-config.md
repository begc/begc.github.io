---

layout: '../../layouts/MarkdownPost.astro'
title: 'Centos9 Stream 开局配置'
pubDate: 2023-03-06
description: '体验 CentOs9以及进行基础配置'
author: 'zhourj'
cover:
    url: 'https://s2.loli.net/2023/03/06/wEurLNpQ52Ml71v.png'
    square: 'https://s2.loli.net/2023/03/06/wEurLNpQ52Ml71v.png'
    alt: 'cover'
tags: ["Centos", "linux","节点搭建"] 
theme: 'light'
featured: true

---

## 1、 使用国内镜像源

### 使用的设备为 parallels desktop, centos stream9,

### mac 笔记本arm架构可用

进入  /etc/yum.repos.d/centos.repo

备份源配置 mv /etc/yum.repos.d/centos.repo /etc/yum.repos.d/centos.repo.backup

阿里源配置

```xml
# CentOS-Base.repo
#
# The mirror system uses the connecting IP address of the client and the
# update status of each mirror to pick mirrors that are updated to and
# geographically close to the client.  You should use this for CentOS updates
# unless you are manually picking other mirrors.
#
# If the mirrorlist= does not work for you, as a fall back you can try the 
# remarked out baseurl= line instead.
#
#

[base]
name=CentOS-$releasever - Base - mirrors.aliyun.com
#failovermethod=priority
baseurl=https://mirrors.aliyun.com/centos-stream/$stream/BaseOS/$basearch/os/
        http://mirrors.aliyuncs.com/centos-stream/$stream/BaseOS/$basearch/os/
        http://mirrors.cloud.aliyuncs.com/centos-stream/$stream/BaseOS/$basearch/os/
gpgcheck=1
gpgkey=https://mirrors.aliyun.com/centos-stream/RPM-GPG-KEY-CentOS-Official

#additional packages that may be useful
#[extras]
#name=CentOS-$releasever - Extras - mirrors.aliyun.com
#failovermethod=priority
#baseurl=https://mirrors.aliyun.com/centos-stream/$stream/extras/$basearch/os/
#        http://mirrors.aliyuncs.com/centos-stream/$stream/extras/$basearch/os/
#        http://mirrors.cloud.aliyuncs.com/centos-stream/$stream/extras/$basearch/os/
#gpgcheck=1
#gpgkey=https://mirrors.aliyun.com/centos-stream/RPM-GPG-KEY-CentOS-Official

#additional packages that extend functionality of existing packages
[centosplus]
name=CentOS-$releasever - Plus - mirrors.aliyun.com
#failovermethod=priority
baseurl=https://mirrors.aliyun.com/centos-stream/$stream/centosplus/$basearch/os/
        http://mirrors.aliyuncs.com/centos-stream/$stream/centosplus/$basearch/os/
        http://mirrors.cloud.aliyuncs.com/centos-stream/$stream/centosplus/$basearch/os/
gpgcheck=1
enabled=0
gpgkey=https://mirrors.aliyun.com/centos-stream/RPM-GPG-KEY-CentOS-Official

[PowerTools]
name=CentOS-$releasever - PowerTools - mirrors.aliyun.com
#failovermethod=priority
baseurl=https://mirrors.aliyun.com/centos-stream/$stream/PowerTools/$basearch/os/
        http://mirrors.aliyuncs.com/centos-stream/$stream/PowerTools/$basearch/os/
        http://mirrors.cloud.aliyuncs.com/centos-stream/$stream/PowerTools/$basearch/os/
gpgcheck=1
enabled=0
gpgkey=https://mirrors.aliyun.com/centos-stream/RPM-GPG-KEY-CentOS-Official


[AppStream]
name=CentOS-$releasever - AppStream - mirrors.aliyun.com
#failovermethod=priority
baseurl=https://mirrors.aliyun.com/centos-stream/$stream/AppStream/$basearch/os/
        http://mirrors.aliyuncs.com/centos-stream/$stream/AppStream/$basearch/os/
        http://mirrors.cloud.aliyuncs.com/centos-stream/$stream/AppStream/$basearch/os/
gpgcheck=1
gpgkey=https://mirrors.aliyun.com/centos-stream/RPM-GPG-KEY-CentOS-Official



rpm -e --nodeps `rpm -qa|grep centos`
rpm -ivh --nodeps --force https://mirrors.aliyun.com/centos-stream/9-stream/BaseOS/x86_64/os/Packages/centos-stream-release-9.0-12.el9.noarch.rpm
rpm -ivh --nodeps --force https://mirrors.aliyun.com/centos-stream/9-stream/BaseOS/x86_64/os/Packages/centos-gpg-keys-9.0-12.el9.noarch.rpm
rpm -ivh --nodeps --force https://mirrors.aliyun.com/centos-stream/9-stream/BaseOS/x86_64/os/Packages/centos-stream-repos-9.0-12.el9.noarch.rpm
dnf clean all
```

## 2、更新源信息

```xml
yum makecache && yum update
```

## 3、配置网卡

```txt
# 查看网卡配置
cat /etc/NetworkManager/system-connections/ens160.nmconnection
[[connection]
id=enp0s5
uuid=4bef2a4e-a532-330a-8b3c-61e2ebce0883
type=ethernet
autoconnect-priority=-999
interface-name=enp0s5
timestamp=1672036689
onboot=yes
[ethernet]

[ipv4]
address1=10.211.55.101/24,10.211.55.1
dns=8.8.8.8
method=manual
[ipv6]
addr-gen-mode=eui64
method=auto

[proxy]

nmcli c reload                         # 重新加载配置文件
nmcli c up ens160                      # 重启ens160网卡
```

## 4、测试网络

```xml
# 测试网络
[root@chenby ~]# ping www.oiox.cn -4
PING  (117.161.38.205) 56(84) bytes of data.
64 bytes from 117.161.38.205 (117.161.38.205): icmp_seq=1 ttl=55 time=6.84 ms
64 bytes from 117.161.38.205 (117.161.38.205): icmp_seq=2 ttl=55 time=6.44 ms
64 bytes from 117.161.38.205 (117.161.38.205): icmp_seq=3 ttl=55 time=7.12 ms

---  ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2003ms
rtt min/avg/max/mdev = 6.441/6.800/7.117/0.277 ms
[root@bogon ~]# ping www.oiox.cn -6
PING www.oiox.cn(js-ipv6 (2409:8c10:c00:1404:3b::)) 56 data bytes
64 bytes from js-ipv6 (2409:8c10:c00:1404:3b::): icmp_seq=1 ttl=56 time=5.94 ms
64 bytes from js-ipv6 (2409:8c10:c00:1404:3b::): icmp_seq=2 ttl=56 time=6.11 ms
64 bytes from js-ipv6 (2409:8c10:c00:1404:3b::): icmp_seq=3 ttl=56 time=6.01 ms

--- www.oiox.cn ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2002ms
rtt min/avg/max/mdev = 5.941/6.020/6.107/0.067 ms
```

## 5、设置主机名和映射关系

```xml
查看当前主机名 hostnamectl

sudo nmcli g hostname
sudo nmcli g hostname host.myfreax.com
sudo systemctl restart systemd-hostnamed
或者
vim /etc/hostname
node01
vi /etc/hosts
192.168.0.120 node01
如果是多服务器搭建集群，也需更改对应ip地址与hostname
rebbot
```

## 6、关闭防火墙

```xml
查看防火墙状态
systemctl status firewalld
firewall-cmd --state

开启防火墙
systemctl start firewalld
关闭防火墙
systemctl stop firewalld
重启防火墙
systemctl restart firewalld
永久关闭防火墙
systemctl disable firewalld
```

## 7、关闭seLINUX

```xml
vim /etc/selinux/config 
selinux  disabled
or
确认grubby软件包是否已经安装

# rpm -q grubby

要永久禁用 SELinux：

配置您的引导加载程序以添加selinux=0到内核​​命令行：

# grubby --update-kernel ALL --args selinux=0

重新启动系统：

# reboot

确认

重启后，getenforce命令确认返回结果为Disabled
```

## 8、时间同步

```xml
 首先进到/etc/chrony.conf里面，添加如下两行，如图二所示

server 210.72.145.44 iburst
server ntp.aliyun.com iburst

重新加载文件，同步时间，就能看到时间是正常的了

systemctl restart chronyd.service	
chronyc sources -y
```

## 9、安装 JDK

```xml
事先查看是否自带jdk
通过命令查看系统已安装的jdk
rpm -qa | grep java  或 rpm -qa | grep jdk 命令来查询出系统自带的jdk（蓝框的四个就是系统自带的）注：其余的不要删
rpm -e --nodeps   后面跟系统自带的jdk名    这个命令来删除系统自带的jdk，
安装jdk
rpm -i   jdk-8u181-linux-x64.rpm    
        *有一些软件只认：/usr/java/default
    vi /etc/profile     
        export  JAVA_HOME=/usr/java/default
        export PATH=$PATH:$JAVA_HOME/bin
    source /etc/profile   |  .    /etc/profile
```

## 10、配置 ssh 免密（还需查询）

```xml
1、确认本机sshd的配置文件（需要root权限）
    vi /etc/ssh/sshd_config
2、AuthorizedKeysFile .ssh/authorized_keys  去掉#键
3、systemctl restart sshd（如果修改了的话，需要重新启动）
4、成公钥和私钥 （这里不需要root权限，使用的账户执行）
    ssh-keygen -t rsa （我直接Enter，简单粗暴）
5、默认在 ~/.ssh目录生成两个文件：
    id_rsa ：私钥
    id_rsa.pub ：公钥
6、导入本机
    cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
7、导入要免密码登录的服务器
    首先将公钥复制到服务器，scp ~/.ssh/id_rsa.pub xxx@host:/home/id_rsa.pub
    然后，将公钥导入到认证文件(这一步的操作在服务器上进行)
    cat /home/id_rsa.pub >> ~/.ssh/authorized_keys
8、在服务器上更改权限 (很重要，如果不这么设置，就是不让你免密登录)
    chmod 700 ~/.ssh
    chmod 600 ~/.ssh/authorized_keys

每一台机器：ssh localhost   >> 为了拿到.ssh
node01~node02:
		cd /home/god/.ssh
		ssh-keygen -t rsa -P '' -f  ./id_rsa
node01:
		ssh-copy-id -i id_rsa node01
		ssh-copy-id -i id_rsa node02
		ssh-copy-id -i id_rsa node03
		ssh-copy-id -i id_rsa node04
node02
		cd /home/god/.ssh
		ssh-copy-id -i id_rsa node01
		ssh-copy-id -i id_rsa node02
		ssh-copy-id -i id_rsa node03
		ssh-copy-id -i id_rsa node04
node03
		cd /home/god/.ssh
		ssh-copy-id -i id_rsa node01
		ssh-copy-id -i id_rsa node02
		ssh-copy-id -i id_rsa node03
		ssh-copy-id -i id_rsa node04
node04
		cd /home/god/.ssh
		ssh-copy-id -i id_rsa node01
		ssh-copy-id -i id_rsa node02
		ssh-copy-id -i id_rsa node03
		ssh-copy-id -i id_rsa node04
```
