# LogoPress

LogoPress 是使用 Next.js App Router 构建的定制商品 B2B 网站。当前仓库仅完成工程基础设施；业务页面、认证和数据访问将在后续任务中实现。

## 本地开发

需要 Node.js 20.19、22.12 或 24.0 以上版本。

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` 只填写本地所需配置，不提交真实密钥。基础页面无需配置 Supabase 即可构建和运行。

## 质量检查

首次运行端到端测试前安装 Chromium：

```bash
npx playwright install chromium
```

常用命令：

```bash
npm run format:check
npm run lint
npm run type-check
npm run test:unit
npm run test:e2e
npm test
npm run build
npm run verify
```

项目结构、本地约定和质量门槛见 [`docs/`](docs/README.md)。Supabase CLI 是唯一远端迁移部署入口；本基础任务未生成 Drizzle 迁移，也未连接远端数据库。
