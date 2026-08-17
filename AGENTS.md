# Logopress系统

## 技术栈

- Next.js
- shadcn/ui
- Supabase
- Drizzle ORM（数据库对象定义、类型安全查询与迁移生成）
- 部署平台：Cloudflare Workers

## 工程规范

- 任何开发工作，先探索现状、依赖和风险，再列出目标、实施范围、涉及文件或数据、验证方式及预期交付；取得用户确认后开始实施。
- 开始开发前，先向用户了解真实需求与预期结果，围绕可行方案、范围和取舍进行讨论，形成共识后再执行。
- 先理解用户的真实目标、业务价值和验收结果，再决定是否实现、修改或输出；不为无实际价值的中间产物增加功能、文件或输出。
- 保持模块职责、数据边界和依赖方向清晰。优先实现完整且简单的单一模块；仅在出现独立职责、明确复用需求或真实复杂度时再拆分，避免预设式抽象和过度分散。
- 全程保持严格类型安全。类型和接口应来自实际 schema、API、运行结果或测试证据；不以 `any`、猜测性的 fallback 类型、静默类型转换或兼容分支掩盖未知数据。接口不明确时，先查阅来源、编写聚焦测试或运行验证，再实现。
- 设计要支持合理扩展，但只为已经确认的变化点预留边界；不要为假设中的未来需求增加层级、配置或通用框架。
- 以测试驱动关键行为：能明确预期时先写或更新测试；不确定行为、返回值或类型时先用最小验证确认事实。完成前按变更范围运行相应检查，默认执行 `npm run verify`。
- 注释说明模块职责、公开接口、业务约束、非显而易见的设计原因和外部依赖；不要重复代码本身已经表达的内容。每个可复用模块应让读者无需追踪实现即可理解其用途和使用边界。
- 多 Agent 协作只用于可独立验证的工作。开始前明确任务范围、输入输出、文件所有权和验证方式；同一文件或同一决策只能有一个执行者负责写入，集成者负责最终审查与验证。
- 交付时只报告与用户目标有关的结果、验证证据、风险或阻塞；不输出无关日志、过程噪声或未经证实的结论。
- 日志记录关键业务状态变化、系统边界调用和异常定位节点。
- 文件素材使用 Supabase Storage，并按访问权限划分公开素材与私有客户附件。
- 文件路径按资源用途与访问权限分层归类，目录名称清晰表达所属业务和使用边界。
- 使用oracle/image-cli生成图片，每一次任务都先用oracle。
- 实现某个功能之前先搜索若有现成的库，则优先使用现成的开源库
- 涉及参考案例或视觉素材的界面改动，先用 Browser 在相同视口截图对比参考页面与本地运行页面；根据视觉差异迭代，并以最终本地截图作为验收证据。


## 项目文档

- `SPEC.md`：项目需求文档。创建或管理需求时，使用 `managing-specs` Skill；需求变更时先更新此文件，获得用户确认后再执行。
- `docs/`：开发者文档目录，用于架构、数据库、API/集成及部署/运维等稳定技术说明。任何需求变更时，检查相关开发文档并同步更新。
- `.tasks/`：任务文档目录。创建、修改、完成或查看任务状态时，使用 `managing-tasks` Skill；用户要求开发计划时，在此创建或更新分阶段计划；执行任务前和确认进度时查阅对应任务文件。

## Supabase Cli

项目ID(--project-ref): `nizvigrplhvbvafwvcmy`
Project Url: https://nizvigrplhvbvafwvcmy.supabase.co

业务: 定制商品 B2B 目录、企业会员、询单、报价及内容管理

## Lark-cli

执行 `lark-cli` 时，每条命令必须显式指定 profile：默认使用 `--profile logopress`；仅在读取 Base `DWhSbv6isaDp9Nsr8OqcpWxCn2e` 时改用 `--profile wholegift`。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
