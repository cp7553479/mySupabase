# Supabase 数据库表说明

## 规则

始终使用 Supabase CLI 操作本项目实例。

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

### `feishuBitable_Mapping`
飞书多维表格映射表，存储数据库表与飞书表格的映射关系

### `inquiries`
外贸ERP询单表，用于存储客户询单信息

### `logistics_check`
物流检查表，存储物流检查记录

### `pi_product_details`
PI产品明细表，存储形式发票中的产品明细

### `product`
产品表，存储外贸ERP商品信息。包含`Product_Number`字段（格式：LP+数字）和`WG商品编号`字段（格式：WG+数字，线索索引编号）

### `product_asi`
ASI产品表。通过`Product_Number`字段（格式：LP+数字）与`product`表关联

### `product_asi_upcharge`
ASI产品附加费用子表。一个`product_asi`可对应多个upcharge项，通过外键关联

### `product_asi_full_view`
视图，用于下载符合ASI上传产品模板的查询结果

### `PO`
采购订单表，存储采购订单信息

### `PO_details`
采购订单明细表，存储采购订单的产品明细

### `vendor_products`
供应商产品表，存储供应商提供的产品信息

### `vendors`
供应商表，存储供应商基本信息

## 表关系

- `product` ↔ `product_asi`: 通过`Product_Number`字段（LP+数字格式）一对一关联
- `product_asi` → `product_asi_upcharge`: 一对多，一个产品可对应多个附加费用项
- `product_asi_full_view`: 视图，用于ASI产品模板导出查询
