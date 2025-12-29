# Supabase 数据库表说明

## ⚠️ 重要规则

**始终使用 Supabase CLI 来对本项目的 Supabase 实例进行操作。**

所有数据库操作、schema 查询、函数部署等都必须通过 `supabase` CLI 命令执行，禁止使用其他方式（如直接连接数据库、使用第三方工具等）。

## 项目结构

本项目 Supabase 实例结构如下：

**项目ID**: `hdwuwrozyaldnrdqzwwz`

**主要组件**:
- **数据库**: PostgreSQL (public schema)
- **Edge Functions**: 8个生产级函数（位于 `supabase/functions/`）
- **存储**: Supabase Storage
- **认证**: Supabase Auth

**业务领域**: 外贸ERP系统，包含客户管理、订单处理、产品管理、询单处理、采购管理、供应商管理等核心业务模块。

**集成服务**:
- 飞书多维表格双向同步
- DeepSeek AI 邮件内容提取
- 产品图片处理
- Webhook 事件处理

## 数据库表结构

以下是 public schema 下各表的说明：

### `Customer`
（暂无描述）

### `Customer Company`
（暂无描述）

### `Emails`
（暂无描述）

### `PI`
（暂无描述）

### `email_accounts`
（暂无描述）

### `email_templates`
（暂无描述）

### `events`
（暂无描述）

### `feishuBitable_Mapping`
（暂无描述）

### `inquiries`
外贸ERP询单表，用于存储客户询单信息

### `logistics_check`
（暂无描述）

### `orders`
（暂无描述）

### `pi_product_details`
（暂无描述）

### `product`
产品表，存储外贸ERP商品信息

### `product_asi`
Product for asi

### `product_asi_upcharge`
This is a duplicate of product_asi

### `product_details`
This is a detail of product

### `purchase_order_details`
（暂无描述）

### `purchase_orders`
（暂无描述）

### `vendor_products`
（暂无描述）

### `vendors`
（暂无描述）

---
*此文档由 Supabase CLI 查询生成，最后更新时间: 2025-12-29*
