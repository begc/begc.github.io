---
layout: '../../layouts/MarkdownPost.astro'
title: 'Docker 搭建 MySQL 8'
pubDate: 2026-03-16
description: '记录我用 Docker 搭建 MySQL 8 的步骤，包括网络、数据卷、连接验证和常见问题。'
tags: ["Docker","MySQL","Linux"]
theme: 'light'
featured: false
---
# Docker 搭建 MySQL 8
## 计划
1. 拉取镜像与创建网络：准备一个独立 Docker 网络，方便后续扩展与隔离。
2. 启动容器：映射端口、设置根密码、选择字符集/时区、配置数据卷持久化。
3. 验证容器与初始化数据库：用 docker exec 或本机客户端测试连接。
4. 外部客户端连接说明：提供主机、端口、用户、常见连接错误的排查。
5. 安全和常见问题：密码、端口占用、版本兼容、时区与字符集。

```bash
# 创建一个专用网络（可选但推荐）
docker network create mynet

# 拉取 MySQL 8.0（推荐）
docker pull mysql:8.0

# 如需 MySQL 5.7（兼容旧系统/驱动）
docker pull mysql:5.7

```
步骤 2：启动容器（持久化数据、开放 3306、设置密码/字符集/时区）
下面命令会：
- 将宿主机的 ./mysql-data 作为数据卷挂载，数据持久化
- 设置 root 密码为 CHANGE_ME_STRONG_PASSWORD （请改成你自己的强密码）
- 开放 3306 端口到宿主机，供外部客户端连接
- 设置时区为 Asia/Shanghai
- 设置默认字符集为 utf8mb4 与相应排序规则

```bash
# MySQL 8.0 推荐启动方式
docker run -d \
  --name mysql8 \
  --hostname mysql8 \
  --network mynet \
  -p 3306:3306 \
  -v $(pwd)/mysql-data:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD="CHANGE_ME_STRONG_PASSWORD" \
  -e TZ="Asia/Shanghai" \
  mysql:8.0 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_0900_ai_ci \
  --default-time-zone="+08:00"

```
如果你使用 MySQL 5.7，请用下面命令（5.7 的 utf8mb4 排序规则用 utf8mb4_general_ci）：
```bash
# MySQL 5.7 启动方式
docker run -d \
  --name mysql57 \
  --hostname mysql57 \
  --network mynet \
  -p 3306:3306 \
  -v $(pwd)/mysql-data:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD="CHANGE_ME_STRONG_PASSWORD" \
  -e TZ="Asia/Shanghai" \
  mysql:5.7 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_general_ci \
  --default-time-zone="+08:00"

```
步骤 3：验证容器运行与初始化数据库
```bash
# 查看日志直到出现 "port: 3306  MySQL Community Server - GPL"
docker logs -f mysql8

# 在容器内用 root 登录测试
docker exec -it mysql8 mysql -uroot -p
# 输入你设置的密码：CHANGE_ME_STRONG_PASSWORD

# 创建一个测试数据库与用户（外部客户端更安全地使用非 root 用户）
# 在 mysql 提示符中执行：
CREATE DATABASE demo DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'demo_user'@'%' IDENTIFIED BY 'DemoUserPass!';
GRANT ALL PRIVILEGES ON demo.* TO 'demo_user'@'%';
FLUSH PRIVILEGES;

```
步骤 5：常见问题与安全建议
- 端口占用：
- 如果本机已有 MySQL 服务占用了 3306，改用其他端口映射，例如‎\`-p 13306:3306\`，连接时端口填 13306。
- 防火墙：
- 云服务器需开放 3306（或你映射的端口）。本地 macOS/Windows/Linux 通常本机连接无障碍；跨网络连接需检查防火墙与安全组。
- 用户权限：
- 避免在外部客户端使用 root；为每个应用创建最小权限用户。示例已创建 demo_user 并授权到 demo 库。
- 密码安全：
- 使用强密码；不要把密码硬编码在代码仓库或共享文档中。生产环境可用环境变量管理或秘密管理服务（如 Vault）。
- •版本兼容：
- 老项目/驱动可能与 MySQL 8.0 的默认认证插件不兼容（caching_sha2_password）。可将用户改为 mysql_native_password：
- 或改用 MySQL 5.7。
- 字符集与 Emoji：
- utf8mb4 支持 Emoji；确保你的表/列也使用 utf8mb4。
- 持久化位置：
- 数据卷挂载到‎\`./mysql-data\`，如需改路径请调整‎\`-v\`。备份时直接备份该目录或用‎\`mysqldump\`。
