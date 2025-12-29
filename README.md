# My Supabase Project

我的 Supabase 项目，包含 Supabase 实例的连接信息和 Edge Functions 源代码。

**项目ID**: hdwuwrozyaldnrdqzwwz
**状态**: ✅ 已配置完成 (Node.js版本)
**生成时间**: 2025-12-29
**运行环境**: Node.js v25.2.1 + npm v11.6.2

## 项目结构

```
mysupabase/
├── .env                           # 环境变量配置 (已创建)
├── env_config.txt                 # 环境配置备份
├── package.json                   # Node.js项目配置
├── package-lock.json              # 依赖锁定文件
├── index.js                       # 项目主入口
├── supabase-client.js             # Supabase客户端连接
├── supabase/                      # Supabase 相关文件
│   └── functions/                 # Edge Functions 源代码
│       └── example-function/     # 示例 Edge Function
│           └── index.ts
├── database_schema.json           # 数据库schema信息
├── download_supabase_data.py      # Python下载脚本 (已废弃)
├── python-requirements.txt        # Python依赖备份
├── venv/                          # Python虚拟环境 (保留)
├── supabase.tar.gz               # Supabase CLI安装包
└── README.md                      # 项目说明
```

## 已完成的配置

### ✅ 环境配置
- 已创建 `.env` 文件，包含所有必要的连接信息
- 包含 SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL

### ✅ Node.js 环境
- 已初始化 Node.js 项目 (package.json)
- 已安装核心依赖: `@supabase/supabase-js`, `dotenv`
- 已配置项目脚本和入口点

### ✅ Supabase CLI
- 已下载并安装 Supabase CLI (版本 2.67.1)
- CLI 位于 `~/bin/supabase`

### ✅ 数据库连接
- 已通过 Node.js SDK 测试连接
- 已生成数据库schema信息 (database_schema.json)
- 当前状态: 无用户表，0个存储桶 (新项目)

### ✅ Edge Functions
- 已创建示例 Edge Function: `supabase/functions/example-function/index.ts`
- 包含基本的 HTTP 处理逻辑

## 使用方法

### 安装依赖
```bash
npm install
```

### 测试连接
```bash
# 使用npm脚本
npm run test-connection

# 或直接运行
node supabase-client.js
```

### 在代码中使用
```javascript
const { supabase, getSupabaseClient } = require('./supabase-client');

// 使用默认客户端
const { data, error } = await supabase
  .from('your_table')
  .select('*');

// 使用自定义客户端
const client = getSupabaseClient();
```

### 本地开发 Edge Functions
```bash
# 启动本地 Supabase 服务
~/bin/supabase start

# 部署函数
~/bin/supabase functions deploy example-function
```

### 项目脚本
```bash
# 测试连接
npm run test-connection

# 启动项目
npm start

# 开发模式
npm run dev
```

## 连接信息

```
项目 URL: https://hdwuwrozyaldnrdqzwwz.supabase.co
项目引用: hdwuwrozyaldnrdqzwwz
状态: 活跃
```

## 依赖说明

### Node.js 依赖
- **@supabase/supabase-js**: Supabase JavaScript客户端库
- **dotenv**: 环境变量加载库

### 历史依赖 (Python)
原项目使用Python依赖，现已迁移到Node.js：
- supabase>=2.0.0 → @supabase/supabase-js
- python-dotenv>=1.0.0 → dotenv
- requests>=2.28.0 → 内置 fetch API
- pydantic>=2.0.0 → TypeScript类型 (可选)
- httpx>=0.24.0 → 内置 fetch API

## 注意事项

1. **安全**: `.env` 文件已创建但会被 Git 忽略，包含敏感信息请妥善保管
2. **权限**: 当前使用 service role key，具有完全数据库权限
3. **Edge Functions**: 示例函数已创建，可以在此基础上开发
4. **数据库**: 当前项目为空，可以开始创建表和数据
5. **环境切换**: 已从Python迁移到Node.js，更适合现代JavaScript/TypeScript开发

## 下一步操作

1. 在 Supabase Dashboard 中创建数据库表
2. 开发自定义 Edge Functions (使用TypeScript)
3. 配置存储桶和文件上传
4. 设置认证和授权规则
5. 考虑添加 TypeScript 支持

## 迁移说明

项目已从Python环境成功迁移到Node.js环境：

- ✅ Python依赖已清除
- ✅ Node.js项目已初始化
- ✅ Supabase Node.js客户端已配置
- ✅ 连接测试通过
- ✅ 示例代码已更新

---

*此项目通过自动化脚本生成，包含 Supabase 实例的基本配置和示例代码。现使用 Node.js 运行环境。*

## Getting started

### Install the CLI

Available via [NPM](https://www.npmjs.com) as dev dependency. To install:

```bash
npm i supabase --save-dev
```

When installing with yarn 4, you need to disable experimental fetch with the following nodejs config.

```
NODE_OPTIONS=--no-experimental-fetch yarn add supabase
```

> **Note**
For Bun versions below v1.0.17, you must add `supabase` as a [trusted dependency](https://bun.sh/guides/install/trusted) before running `bun add -D supabase`.

<details>
  <summary><b>macOS</b></summary>

  Available via [Homebrew](https://brew.sh). To install:

  ```sh
  brew install supabase/tap/supabase
  ```

  To install the beta release channel:
  
  ```sh
  brew install supabase/tap/supabase-beta
  brew link --overwrite supabase-beta
  ```
  
  To upgrade:

  ```sh
  brew upgrade supabase
  ```
</details>

<details>
  <summary><b>Windows</b></summary>

  Available via [Scoop](https://scoop.sh). To install:

  ```powershell
  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
  scoop install supabase
  ```

  To upgrade:

  ```powershell
  scoop update supabase
  ```
</details>

<details>
  <summary><b>Linux</b></summary>

  Available via [Homebrew](https://brew.sh) and Linux packages.

  #### via Homebrew

  To install:

  ```sh
  brew install supabase/tap/supabase
  ```

  To upgrade:

  ```sh
  brew upgrade supabase
  ```

  #### via Linux packages

  Linux packages are provided in [Releases](https://github.com/supabase/cli/releases). To install, download the `.apk`/`.deb`/`.rpm`/`.pkg.tar.zst` file depending on your package manager and run the respective commands.

  ```sh
  sudo apk add --allow-untrusted <...>.apk
  ```

  ```sh
  sudo dpkg -i <...>.deb
  ```

  ```sh
  sudo rpm -i <...>.rpm
  ```

  ```sh
  sudo pacman -U <...>.pkg.tar.zst
  ```
</details>

<details>
  <summary><b>Other Platforms</b></summary>

  You can also install the CLI via [go modules](https://go.dev/ref/mod#go-install) without the help of package managers.

  ```sh
  go install github.com/supabase/cli@latest
  ```

  Add a symlink to the binary in `$PATH` for easier access:

  ```sh
  ln -s "$(go env GOPATH)/bin/cli" /usr/bin/supabase
  ```

  This works on other non-standard Linux distros.
</details>

<details>
  <summary><b>Community Maintained Packages</b></summary>

  Available via [pkgx](https://pkgx.sh/). Package script [here](https://github.com/pkgxdev/pantry/blob/main/projects/supabase.com/cli/package.yml).
  To install in your working directory:

  ```bash
  pkgx install supabase
  ```

  Available via [Nixpkgs](https://nixos.org/). Package script [here](https://github.com/NixOS/nixpkgs/blob/master/pkgs/development/tools/supabase-cli/default.nix).
</details>

### Run the CLI

```bash
supabase bootstrap
```

Or using npx:

```bash
npx supabase bootstrap
```

The bootstrap command will guide you through the process of setting up a Supabase project using one of the [starter](https://github.com/supabase-community/supabase-samples/blob/main/samples.json) templates.

## Docs

Command & config reference can be found [here](https://supabase.com/docs/reference/cli/about).

## Breaking changes

We follow semantic versioning for changes that directly impact CLI commands, flags, and configurations.

However, due to dependencies on other service images, we cannot guarantee that schema migrations, seed.sql, and generated types will always work for the same CLI major version. If you need such guarantees, we encourage you to pin a specific version of CLI in package.json.

## Developing

To run from source:

```sh
# Go >= 1.22
go run . help
```
