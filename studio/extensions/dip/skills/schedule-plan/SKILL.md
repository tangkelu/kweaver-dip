---
name: schedule-plan
version: "1.1.0"
description: 定时计划协议。仅当用户请求创建定时计划、定时任务等自动化安排时生效；包含 ORA 拆解、PLAN.md 持久化、物理搬移归档规则以及任务消息首条指令规范。须与 archive-protocol 技能一并遵守。
metadata:
  {
    "openclaw": {}
  }
---

# 定时计划协议

**仅当**用户请求「创建定时计划 / 定时任务 / 提醒 / 自动化安排 / 周期任务 / 延迟任务」时生效。

## 【核心规则：必须全量归档】

**所有生成的成果性内容（无论是单个文件还是整个目录/文件夹），在任务完成后必须彻底搬移（Move）至归档区。**

工作区（Workspace）仅作为临时加工场，任务结束后的合规状态是：**工作区不留任何生成物，全部进入 `archives/`。**

**与归档的关系**：定时计划必须遵守 `archive-protocol` 技能中的全局归档规则（含路径双轨制、写入校验以及**物理搬移**逻辑）。

## 【先确认 PLAN，再创建定时任务】

生成并写入 `PLAN.md` 后，必须按 `archive-protocol` 调用 `archive` 工具将其**搬移**至归档区。**后续所有的确认、回读、修改动作，都必须直接针对归档后的路径执行。**

必须执行的交互顺序：

1. 将 归档区内的 `PLAN.md` 中的关键内容摘要给用户（或明确告知路径并请用户阅读），并**主动询问**：是否确认按此执行、是否有修改意见。
2. 若用户提出修改：**直接编辑** 归档区内的 `PLAN.md`（不再在工作区保留副本），再重复上一步，直至用户满意。
3. 仅在用户**明确确认**后（例如明确表示「确认」「可以创建定时任务了」「按这个建 Cron」等），才创建定时任务；此时任务 message 仍须遵守下文【任务消息首要指令】。

## 【已创建计划的修改】

若定时任务已存在，或用户要求变更已落地的计划，**必须**先同步更新归档区内的 `archives/{ARCHIVE_ID}/PLAN.md` 中与该 `Task_ID` 对应的条目，再按需调整调度参数。禁止仅在对话中达成新口径而 `PLAN.md` 仍为旧内容。

## 【需求理解规则】

当用户需求较笼统时，必须：直接给出一个预设基准方案，并提供 2-3 个结构化选项，最后追加：`其他：[由用户补充]`。禁止让用户做开放式命题作文。

## 【ORA 拆解】

在用户确认计划细节后，必须展示：

- **O (Objective)**: 解决什么痛点，如何体现 `SOUL.md` 价值观。
- **R (Result)**: 成功判定标准、交付物、可见成果。
- **A (Action)**: 触发频率、执行逻辑、失败处理、输出物归档方式。

## 【任务消息首要指令】

在实际创建定时任务时，任务 message 中的首要指令必须是：

`从路径 归档区内的 PLAN.md 中读取 Task_ID: {{TASK_UUID}} 的详细计划并按步骤执行`

## 【PLAN.md 持久化】

必须包含：`Task_ID`, `Role_Context`, `Archive_Path`, `Status`, `Objective`, `Result`, `Action_Steps`。

`Action_Steps` 的第 1 条必须是：

`1. [读取本文件指令]：从路径 归档区内的 PLAN.md 中读取 Task_ID: {{TASK_UUID}} 的详细计划并按步骤执行`

【Cron】
创建 Cron 任务时，强制参数：
1. `sessionTarget` 必须是 "isolated"
2. `payload.kind` 必须是 "agentTurn"
3. `delivery.bestEffort` 必须是 true

## 【PLAN.md 模板】

### [Task_ID: {{TASK_UUID}}] {{Task_Name}}

- **Role_Context**: {{Current_Persona}} (Aligned with `SOUL.md` & `IDENTITY.md`)
- **Status**: Active

#### ORA Detail

- **Objective**: {{O_content}}
- **Result**: {{R_content}}
- **Action_Steps**:
  1. **[读取本文件指令]**：从路径 归档区内的 PLAN.md 中读取 `Task_ID: {{TASK_UUID}}` 的详细计划并按步骤执行。
  2. **[上下文校验]**：确认当前上下文已对齐 `SOUL.md` 与 `IDENTITY.md`。
  3. **[执行动作]**：根据读取到的详细步骤执行业务逻辑。
  4. **[归档校验]**：验证输出物已存入 归档区内的 目录。

## 【执行顺序（计划任务）】

1. 与用户对齐 ORA 要点后，在工作区编写 `PLAN.md` 并调用 `archive` 工具将其**搬移**至 归档区内的 PLAN.md。
2. **暂停创建定时任务**：引导用户阅读归档区内的 `PLAN.md`，征询确认。
3. 若需修订：**直接对 归档区内的 `PLAN.md` 执行 edit/replace 操作**。
4. 用户明确确认后，再创建定时任务；任务 message 的首条指令须指向归档后的 `PLAN.md`。
5. 任何其它产出物（包括文件和文件夹）通过 `archive` 工具归档并做回读校验；**归档后工作区不留存任何原始生成物**。
