# init_agents

`studio/scripts/init_agents/index.mjs` 用于初始化 OpenClaw 内置智能体的运行环境。

当前脚本负责四件事：

1. 从 `studio/built-in` 读取内置智能体定义
2. 将内置智能体写入 `openclaw.json`
3. 将 `SOUL.md` 和 `IDENTITY.md` 同步到智能体 workspace
4. 同步鉴权文件，并复制和开启 `extensions` 目录下的全部插件

## 目录约定

脚本只扫描 `studio/built-in/*/metadata.json`。

每个内置智能体目录至少包含：

```text
studio/built-in/<agent-name>/
  metadata.json
  SOUL.md
  IDENTITY.md
```

其中：

- `metadata.json` 是运行态配置入口
- `SOUL.md` 会被同步到目标 workspace
- `IDENTITY.md` 会被同步到目标 workspace

## metadata 约束

当前脚本会校验以下字段：

- `type` 必须为 `"agent"`
- `is_builtin` 必须为 `true`
- `id` 必须为非空字符串
- `name` 必须为非空字符串

最小示例：

```json
{
  "type": "agent",
  "id": "__internal_skill_agent__",
  "name": "SkillAgent",
  "is_builtin": true
}
```

如果需要把 `sandbox`、`tools` 一并写入 `openclaw.json`，可以直接放在 `metadata.json` 中，脚本会原样读取。

## workspace 规则

脚本会将内置智能体 workspace 解析为：

```text
<OPENCLAW_WORKSPACE_DIR>/<metadata.id>
```

如果未设置 `OPENCLAW_WORKSPACE_DIR`，默认使用：

```text
<OPENCLAW_STATE_DIR>/<metadata.id>
```

其中 `OPENCLAW_STATE_DIR` 默认是 `~/.openclaw`。

## openclaw.json 写入规则

脚本会读取：

```text
<OPENCLAW_STATE_DIR>/openclaw.json
```

然后将 `built-in` 中的 agent 逐个 upsert 到：

```json
{
  "agents": {
    "list": []
  }
}
```

同时强制开启：

- `gateway.http.endpoints.chatCompletions`
- `gateway.http.endpoints.responses`
- `plugins.entries` 中来自本地 `extensions` 目录的全部插件

## 鉴权同步规则

脚本会尝试将：

```text
<OPENCLAW_STATE_DIR>/agents/main/agent/auth-profiles.json
```

复制到每个内置智能体的：

```text
<OPENCLAW_STATE_DIR>/agents/<agent-id>/agent/auth-profiles.json
```

如果主账号鉴权文件不存在，当前实现只打印 warning，不做进一步 fallback。

## 运行方式

方式 1：进入 `studio` 目录后执行：

```bash
npm run init:agents
```

方式 2：在仓库根目录执行：

```bash
npm --prefix studio run init:agents
```

## 环境变量

脚本当前会读取以下环境变量：

- `OPENCLAW_STATE_DIR`
- `OPENCLAW_BUILT_IN_DIR`
- `OPENCLAW_WORKSPACE_DIR`
- `OPENCLAW_EXTENSIONS_DIR`

说明：

- `OPENCLAW_STATE_DIR`
  - OpenClaw 状态目录
  - 默认值：`~/.openclaw`
  - 用于定位 `openclaw.json`、`agents/main/agent/auth-profiles.json`、`plugins/`
- `OPENCLAW_BUILT_IN_DIR`
  - 内置智能体定义目录
  - 默认值：`studio/built-in`
  - 当前用于读取 `metadata.json`、`SOUL.md`、`IDENTITY.md`
- `OPENCLAW_WORKSPACE_DIR`
  - 内置智能体 workspace 根目录
  - 默认值：`<OPENCLAW_STATE_DIR>`
  - 每个 agent 的实际 workspace 为 `<OPENCLAW_WORKSPACE_DIR>/<agent-id>`
- `OPENCLAW_EXTENSIONS_DIR`
  - 本地扩展目录
  - 默认值：`studio/extensions`
  - 当前用于复制并开启该目录下的全部插件

## 带环境变量执行

示例 1：指定状态目录

```bash
OPENCLAW_STATE_DIR=/data/openclaw \
npm --prefix studio run init:agents
```

示例 2：同时指定状态目录、built-in 目录和 workspace 根目录

```bash
OPENCLAW_STATE_DIR=/data/openclaw \
OPENCLAW_BUILT_IN_DIR=/Users/yannan/docker-apps/dip-studio/studio/built-in \
OPENCLAW_WORKSPACE_DIR=/data/openclaw/workspace \
npm --prefix studio run init:agents
```

示例 3：同时指定扩展目录

```bash
OPENCLAW_STATE_DIR=/data/openclaw \
OPENCLAW_BUILT_IN_DIR=/Users/yannan/docker-apps/dip-studio/studio/built-in \
OPENCLAW_WORKSPACE_DIR=/data/openclaw/workspace \
OPENCLAW_EXTENSIONS_DIR=/Users/yannan/docker-apps/dip-studio/studio/extensions \
npm --prefix studio run init:agents
```

如果你使用 `package.json` script 或 CI，也可以先导出变量再执行：

```bash
export OPENCLAW_STATE_DIR=/data/openclaw
export OPENCLAW_BUILT_IN_DIR=/Users/yannan/docker-apps/dip-studio/studio/built-in
export OPENCLAW_WORKSPACE_DIR=/data/openclaw/workspace
export OPENCLAW_EXTENSIONS_DIR=/Users/yannan/docker-apps/dip-studio/studio/extensions

npm --prefix studio run init:agents
```

## 当前限制

- 脚本只处理 `built-in` 目录中的内置智能体
- 脚本只复制 `extensions` 目录下的一级子目录作为插件
- 没有 `metadata.json` 的目录会被忽略
- `metadata.json` 不合法会直接报错退出
- `sandbox` 和 `tools` 不做默认补全，由 `metadata.json` 自己决定
