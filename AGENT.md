# Supabase 数据库表说明

## 规则

始终使用 Supabase CLI 操作本项目实例。禁止直接连接数据库或使用第三方工具。

项目ID: `hdwuwrozyaldnrdqzwwz`

业务: 外贸ERP系统（客户、订单、产品、询单、采购、供应商管理）

## 数据库表

### `Customer`
客户表，存储客户基本信息

### `Customer Company`
客户公司表，存储客户关联的公司信息

### `Emails`
邮件表，存储邮件收发记录

### `PI`
形式发票（Proforma Invoice）表，存储PI单据信息

### `email_accounts`
邮箱账户表，存储用于收发邮件的邮箱账户配置

### `email_templates`
邮件模板表，存储邮件模板内容

### `events`
事件表，存储系统事件和操作日志

### `feishuBitable_Mapping`
飞书多维表格映射表，存储数据库表与飞书表格的映射关系

### `inquiries`
外贸ERP询单表，用于存储客户询单信息

### `logistics_check`
物流检查表，存储物流检查记录

### `orders`
订单表，存储客户订单信息

### `pi_product_details`
PI产品明细表，存储形式发票中的产品明细

### `product`
产品表，存储外贸ERP商品信息

### `product_asi`
Product for asi

### `product_asi_upcharge`
This is a duplicate of product_asi

### `product_details`
This is a detail of product

### `purchase_order_details`
采购订单明细表，存储采购订单的产品明细

### `purchase_orders`
采购订单表，存储采购订单信息

### `vendor_products`
供应商产品表，存储供应商提供的产品信息

### `vendors`
供应商表，存储供应商基本信息
