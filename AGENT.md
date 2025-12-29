# Supabase 数据库表说明

## 项目目的

本项目用于管理 Supabase 实例，主要功能包括：

- **用户管理**: 认证、授权、资料管理
- **内容管理**: 文章、评论、分类等内容发布
- **文件存储**: 图片、文档等文件的上传和管理
- **消息通知**: 系统通知、私信、提醒功能
- **数据同步**: 与外部服务（如飞书）的双向数据同步
- **Edge Functions**: 服务器less函数处理业务逻辑

## 数据库表结构

以下是 public schema 下各表的详细说明：


### `profiles`
用户资料表，存储用户的基本信息、头像、昵称等

### `users`
用户账户表，存储用户认证信息和账户状态

### `posts`
文章/内容表，存储用户发布的内容和文章

### `comments`
评论表，存储对内容和文章的评论信息

### `notifications`
通知表，存储系统和用户的通知消息

### `settings`
设置表，存储应用和用户的配置信息

### `files`
文件表，存储上传文件的元数据和路径

### `logs`
日志表，记录系统操作和用户活动日志

### `messages`
消息表，存储聊天消息和私信内容

### `categories`
分类表，存储内容分类和标签信息


## 表关系说明

### 用户相关
- `users` ↔ `profiles`: 一对一关系，用户账户关联用户资料
- `users` → `notifications`: 一对多，用户接收多个通知
- `users` → `messages`: 用户发送和接收消息

### 内容相关
- `posts` → `comments`: 一对多，文章有多个评论
- `posts` → `categories`: 多对多，文章属于多个分类
- `comments` → `users`: 多对一，评论属于某个用户

### 文件和存储
- `files` → `posts`: 多对一，文件附件属于文章
- `files` → `users`: 多对一，文件属于上传者

## 常用查询示例

### 用户查询
```sql
-- 获取用户完整信息
SELECT u.*, p.* FROM users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.id = $1;

-- 用户统计
SELECT COUNT(*) as user_count FROM users WHERE active = true;
```

### 内容查询
```sql
-- 获取文章及其评论数
SELECT p.*, COUNT(c.id) as comment_count
FROM posts p
LEFT JOIN comments c ON p.id = c.post_id
GROUP BY p.id;

-- 按分类统计文章
SELECT c.name, COUNT(p.id) as post_count
FROM categories c
LEFT JOIN post_categories pc ON c.id = pc.category_id
LEFT JOIN posts p ON pc.post_id = p.id
GROUP BY c.id, c.name;
```

### 通知查询
```sql
-- 获取用户未读通知
SELECT * FROM notifications
WHERE user_id = $1 AND read_at IS NULL
ORDER BY created_at DESC;

-- 标记通知为已读
UPDATE notifications
SET read_at = NOW()
WHERE id = $1 AND user_id = $2;
```

## 业务规则

### 用户管理
- 用户注册后自动创建 profiles 记录
- 支持邮箱和第三方登录认证
- 用户可以修改自己的资料信息

### 内容发布
- 文章需要审核后才能发布
- 支持富文本编辑和多媒体内容
- 可以设置文章的可见性和权限

### 评论系统
- 支持嵌套评论（父子关系）
- 评论可以点赞和举报
- 作者可以删除自己的评论

### 文件管理
- 支持多种文件格式上传
- 文件大小和类型限制
- 支持CDN加速和备份

## 安全考虑

### Row Level Security (RLS)
- 所有表都启用 RLS 策略
- 用户只能访问自己的数据
- 管理员有特殊权限

### 数据验证
- API层数据验证
- 数据库约束检查
- 文件上传安全扫描

### 备份策略
- 定期自动备份
- 敏感数据加密存储
- 灾难恢复计划

## 性能优化

### 索引策略
- 主键和外键自动创建索引
- 常用查询字段添加索引
- 复合索引优化多条件查询

### 查询优化
- 使用分页查询避免大数据量
- 合理使用 JOIN 和子查询
- 缓存频繁访问的数据

### 监控告警
- 数据库性能监控
- 慢查询日志分析
- 异常情况自动告警

---
*此文档描述了 Supabase 实例的数据库结构和业务逻辑，最后更新时间: 2025-12-29*
