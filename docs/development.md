# 开发与质量基线

本项目的基础框架只提供应用运行、质量检查、测试和环境变量约定；业务功能以已确认的 `SPEC.md` 为准。

## 本地运行

1. 使用 Node.js 20.19、22.12 或 24.0 以上版本并执行 `npm install`。
2. 如后续开发需要 Supabase，复制 `.env.example` 为 `.env.local` 并只填写本地值；当前基础页面无需环境变量。
3. 首次执行端到端测试前运行 `npx playwright install chromium`。
4. 执行 `npm run dev` 启动开发服务器；执行 `npm run verify` 运行完整质量门槛。

## 质量门槛

- 每次变更至少运行 `npm run format:check`、`npm run lint`、`npm run type-check` 和 `npm run test:unit`。
- 涉及页面、路由或用户交互时，还必须运行 `npm run test:e2e`。当前健康检查只验证首页、页面标题和基础标题可见。
- 业务功能完成时，应为关键业务规则补充单元/组件测试，并按已确认的用户主路径补充端到端测试；不得用未实现流程的占位断言代替。
- 合并或发布前必须通过 `npm run verify`，即格式、Lint、类型、全部测试和生产构建均成功；不得保留 `.only`、无说明的跳过测试或真实密钥。
- 单元测试使用可控替身；公开页面端到端测试使用当前已链接 Supabase 项目中的预览数据。涉及登录、写入或权限变更的端到端测试必须使用独立测试账号与可清理数据。

## 目录约定

- `src/app/`：路由、布局和页面入口。
- `src/components/`：跨页面复用的界面组件；shadcn/ui 组件放在 `src/components/ui/`。
- `src/features/`：按业务能力组织的模块。
- `src/lib/`：与具体页面无关的工具、服务边界和客户端配置。
- `src/db/`：仅服务端数据库访问边界与未来 Drizzle 映射；禁止从客户端组件导入。
- `tests/unit/`：单元或组件测试。
- `tests/e2e/`：端到端测试。

## 数据库迁移

Supabase CLI 是唯一远端迁移部署入口。当前任务没有生成 Drizzle 迁移；未来若使用 Drizzle 生成 SQL，必须经审查纳入 `supabase/migrations/` 并由 Supabase CLI 部署，不能维护第二套迁移历史。

## Supabase 认证

- 本地认证使用 `.env.local` 中的公开 Supabase URL 与 Publishable Key。
- 部署时，在 Supabase Auth 中配置正式站点地址，并允许 `/auth/confirm` 作为邮件确认回调地址。
- 邮件确认模板使用 `/auth/confirm?token_hash={{ .TokenHash }}&type=email`，由应用完成会话交换后返回账户页。

## Cloudflare Workers

- Next.js 通过 `@opennextjs/cloudflare` 构建为 Workers 运行时；`wrangler.jsonc` 定义 Worker 名称、静态资源和兼容性配置。
- `npm run preview` 在本地运行与线上一致的 Workers 预览；`npm run deploy` 由 Cloudflare GitHub 集成在生产分支合并后执行。
- `.open-next/`、`.dev.vars` 和本机环境变量不提交。线上变量由 Cloudflare 管理，Supabase 生产密钥仅放在服务端变量中。
