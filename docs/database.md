# 数据库

LogoPress 使用已链接的 Supabase 项目 `nizvigrplhvbvafwvcmy`。`SPEC.md` 是业务范围来源；本文件仅说明数据库实现。

## 范围

当前模型覆盖：

- 商品、分类、规格/选项、变体、图片与资料；
- 按数量分层的基础价格和附加费用，以及公开、登录会员、指定角色三种价格可见范围；
- 企业账户、成员、后台角色和权限；
- 企业专属价格表和企业审核记录；
- 多商品询单、选项与价格快照、服务需求、附件、状态、负责人和沟通记录；
- 报价及其版本、报价明细、调整项和客户确认；
- 页面、博客、案例、FAQ 和资源内容，以及站点资料、可用语言和导航。

供应商归属、库存、支付、订单履约和物流不在当前模型中。

## 关系模型

重复业务数据均使用子表或关联表：商品媒体、分类词条、选项与选项值、变体组合、价格条件与阶梯、附加费用条件与阶梯、询单项目/选项/服务/附件/沟通，以及报价版本和明细。`jsonb` 只用于商品和内容条目的非结构化扩展元数据。

主要表组：

- 账户与权限：`profiles`、`organizations`、`organization_members`、`roles`、`permissions`、`user_roles`；
- 企业价格与审核：`organization_price_books`、`organization_review_events`；
- 商品目录：`products`、`taxonomy_terms`、`product_specifications`、`media_assets`、`product_compliance_records`、`product_option_groups`、`product_option_values`、`product_variants`；
- 价格：`price_books`、`product_price_grids`、`product_price_tiers`、`product_upcharge_grids`、`product_upcharge_tiers`；
- 询单与报价：`inquiries`、`inquiry_items`、`inquiry_attachments`、`inquiry_communications`、`quotes`、`quote_versions`、`quote_items`、`quote_responses`；
- 内容：`content_entries` 及其翻译、媒体、分类和商品关联表。
- 站点配置：`site_settings`、`site_locales`、`navigation_menus`、`navigation_items`、`navigation_item_translations`。

数量区间使用数据库约束防止同一价格网格出现重叠。询单和报价明细保留名称、选项与价格快照，避免商品后续修改影响历史记录。

## 安全边界

所有本次新增的 `public` 表均启用 RLS，并显式授予 Data API 权限：

- 匿名用户只读已发布商品、内容及对其可见的价格；
- 登录用户可访问自己的资料、所属企业和有权访问的询单；
- 价格表通过 `public`、`authenticated` 或 `role` 可见范围控制；
- 企业专属价格表仅对该企业的有效成员和价格管理员可见；
- 后台写入按 `catalog.manage`、`pricing.manage`、`members.manage`、`inquiries.manage`、`content.manage` 权限隔离；
- 私有授权函数位于未暴露的 `app_private` schema，并固定 `search_path`。

首个 `super_admin` 角色必须由可信服务端流程分配。不要用可由用户修改的 Auth metadata 做授权，也不要在浏览器使用 `service_role`。

## Storage

- `product-media`：公开读取；仅目录或内容管理员可写；
- `inquiry-attachments`：私有；单文件上限 25 MiB，客户对象路径以 `{auth.uid()}/` 开头，询单参与者按 RLS 读取。

应用先上传私有文件，再写入 `inquiry_attachments` 元数据。更新同一路径时，Storage 同时需要 `INSERT`、`SELECT` 和 `UPDATE` 权限。

## 开发预览商品

开发环境保留少量来自当前商品库的已发布商品、主图、分类、规格、可用服务和公开美元阶梯价，用于目录、详情和询单流程的真实预览测试。预览主图存放于 `product-media`；该数据通过迁移写入，商品编号保留来源标识；完整商品库导入由后续独立流程管理。

## 迁移流程

项目采用 `supabase/migrations/` 的 imperative migrations：

1. `supabase migration list --linked`
2. `supabase db push --linked --dry-run`
3. 审查后执行 `supabase db push --linked`
4. 读回 `supabase_migrations.schema_migrations`、表/外键/RLS/策略和 Storage bucket；运行 `supabase db advisors --linked --type all`

不得通过 Dashboard 临时修改正式结构；变更必须新增迁移。不得提交数据库密码、访问令牌或 `service_role` key。
