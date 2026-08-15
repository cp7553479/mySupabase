# LogoPress

LogoPress 是使用 Next.js App Router 构建的定制商品 B2B 网站，包含商品目录、配置询单、会员认证、统一会员价和内容展示的首期实现。

## 本地开发

需要 Node.js 20.19、22.12 或 24.0 以上版本。

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` 只填写本地所需的公开 Supabase 配置，不提交真实密钥。

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

项目结构、本地约定和质量门槛见 [`docs/`](docs/README.md)。Supabase CLI 是唯一远端迁移部署入口。
