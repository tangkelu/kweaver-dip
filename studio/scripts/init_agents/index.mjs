import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// 基础常量定义
const STATE_DIR = process.env.OPENCLAW_STATE_DIR || path.join(os.homedir(), ".openclaw");

// 各个 Agent 的专属人设配置字典
const AGENT_PERSONAS = {
  coordinator: `
# 你的角色
你是纯粹的自然语言意图提取器。不要以人类身份对话。

# 工作流
阅读用户的输入，直接输出一个严格的 JSON 对象，用来指示当前任务应该交由哪个底层数字员工处理：
  {
  "target_agent": "plan_agent", 
  "target_de": "de_finance" // 如果用户提到具体业务智能体（如财务），必须提取其 ID
}

- 如果用户要求“定时”、“提醒”或“建立计划”，主要目标是 "plan_agent"。
- 如果需求涉及具体业务（如查账、写码），必须在 "target_de" 中指明对应的智能体 ID（de_finance, skill_agent 等）。

如果你认为用户在闲聊，输出 {"target_agent": "chit_chat"}；如果用户报错找不到人或意图不明，输出 {"target_agent": "unknown"}。

# 核心纪律
请务必只输出合法的 JSON，不要附加任何解释！不要寒暄！不要自己去查库或写代码！
`.trim(),

  skill_agent: `
# 你的角色
高级技能开发工程师。负责听懂人类新业务需求，从零编写或修改原子技能 (Skills)。

# 工作流
1. 理解需求与 API 文档。
2. 使用skill-creator技能创建用户所需的技能。
3. 局部验收通过后回复人类。
4. 创建的技能放到你的workspace中的skill-factory目录中
`.trim()
};

const AGENT_CONFIGS = [
  {
    id: "coordinator",
    name: "总管路由智能体",
    workspace: path.join(STATE_DIR, "workspace-coordinator"),
    sandbox: { mode: "all", workspaceAccess: "ro" },
    tools: {
      allow: ["read"],
      deny: ["group:runtime", "group:automation", "group:sessions"]
    }
  },
  {
    id: "skill_agent",
    name: "高阶技能开发者",
    workspace: path.join(STATE_DIR, "workspace-skill_agent"),
  }
];

async function initOpenClawConfig() {
  console.log("🛠️ 开始校准 openclaw.json 中的 Agent 配置...");
  const configPath = path.join(STATE_DIR, "openclaw.json");
  if (!fs.existsSync(configPath)) {
    console.warn("⚠️ 未找到 openclaw.json，跳过配置修改。");
    return;
  }

  const raw = fs.readFileSync(configPath, "utf8");
  let cfg;
  try {
    cfg = JSON.parse(raw);
  } catch (err) {
    console.error("❌ openclaw.json 格式损坏，无法解析:", err);
    return;
  }

  cfg.agents = cfg.agents || {};
  cfg.agents.list = cfg.agents.list || [];

  let modifiedCount = 0;
  for (const newAgent of AGENT_CONFIGS) {
    const existingIndex = cfg.agents.list.findIndex(a => a.id === newAgent.id);
    if (existingIndex >= 0) {
      // 深度合并（如果原配置有 defaults 等其他属性则保留，这里只强写我们关心的配置）
      cfg.agents.list[existingIndex] = {
        ...cfg.agents.list[existingIndex],
        name: newAgent.name,
        workspace: newAgent.workspace,
        sandbox: newAgent.sandbox,
        tools: newAgent.tools,
      };
      console.log(`[覆盖] 更新现有的 ${newAgent.id} 配置参数`);
    } else {
      // 追加新的 
      cfg.agents.list.push(newAgent);
      console.log(`[新增] 在配置文件中注册 ${newAgent.id}`);
    }
    modifiedCount++;
  }

  if (modifiedCount > 0) {
    // 开启 Gateway HTTP Endpoints 用于数字员工访问
    cfg.gateway = cfg.gateway || {};
    cfg.gateway.http = cfg.gateway.http || {};
    cfg.gateway.http.endpoints = cfg.gateway.http.endpoints || {};
    cfg.gateway.http.endpoints.chatCompletions = { enabled: true };
    
    console.log("[配置] 开启 Gateway HTTP Endpoints (chatCompletions)");

    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), "utf8");
    console.log(`✅ openclaw.json 成功写入 ${modifiedCount} 个核心数字员工的配置保障！\n`);
  }
}

async function initPersonas() {
  console.log("🦞 初始化 OpenClaw 数字员工专属人设库...");
  console.log("根状态目录: " + STATE_DIR + "\\n");

  for (const [agentId, soulContent] of Object.entries(AGENT_PERSONAS)) {
    // 解析出对应的工作区路径，譬如 ~/.openclaw/workspace-coordinator
    const workspacePath = path.join(STATE_DIR, "workspace-" + agentId);
    const soulPath = path.join(workspacePath, "SOUL.md");

    try {
      // 1. 确保目标工作区存在
      if (!fs.existsSync(workspacePath)) {
        fs.mkdirSync(workspacePath, { recursive: true });
        console.log("[创建] " + agentId + " 专属工作区目录 -> " + workspacePath);
      }

      // 2. 覆盖或写入 SOUL.md 人设配置
      fs.writeFileSync(soulPath, soulContent, "utf8");
      console.log("[写入] " + agentId + " 成功注入人设灵魂 -> " + soulPath);
    } catch (err) {
      console.error(`[失败] ${agentId} 初始化报错:`, err.message);
    }
  }

  console.log(`\n✅ 所有底层数字员工的 SOUL.md 初始化及 openclaw.json 权限注入均已完毕！`);
  console.log(`请确保您的 Gateway 后台监控已经重新加载配置！`);
}

/**
 * 重点：同步全局鉴权配置到各个隔离 Agent 的私有目录中
 * 这是解决 isolated agent 报 "No API key found" 的核心修复
 */
async function syncAuthProfiles() {
  console.log("🔐 从 main agent 提取鉴权并同步到隔离 Agent 账户中...");
  const mainAuthPath = path.join(STATE_DIR, "agents", "main", "agent", "auth-profiles.json");
  if (!fs.existsSync(mainAuthPath)) {
    console.warn("⚠️ 未找到 main agent 的 auth-profiles.json，尝试 fallback 到 openclaw.json...");
    // Fallback logic if main agent missing (already implemented previously)
    const configPath = path.join(STATE_DIR, "openclaw.json");
    if (!fs.existsSync(configPath)) {
      console.warn("⚠️ 未找到 openclaw.json，无法提取鉴权。");
      return;
    }
    // ... (rest of the openclaw.json fallback if needed, but primary is main agent)
  }

  for (const agent of AGENT_CONFIGS) {
    if (agent.id === 'main') continue; // skip main itself

    const agentDir = path.join(STATE_DIR, "agents", agent.id, "agent");
    const agentAuthPath = path.join(agentDir, "auth-profiles.json");

    try {
      if (!fs.existsSync(agentDir)) {
        fs.mkdirSync(agentDir, { recursive: true });
      }
      fs.copyFileSync(mainAuthPath, agentAuthPath);
      console.log(`[同步] 已将 main 鉴权复制给 ${agent.id} -> ${agentAuthPath}`);
    } catch (err) {
      console.error(`[失败] ${agent.id} 鉴权同步失败:`, err.message);
    }
  }
}

async function main() {
  await initOpenClawConfig();
  await syncAuthProfiles();
  await initPersonas();
}

main().catch((err) => {
  console.error("致命错误:", err);
  process.exit(1);
});
