# 一、概述
bkn-creator 是 KWeaver BKN（Business Knowledge Network，业务知识网络）的全生命周期管理器。作为流程编排器，它负责用户意图识别、流程路由、阶段门禁控制、子技能编排与结果回执。
### 核心定位
- 角色：流程编排器 + 生命周期管理器
- 覆盖范围：新增、查找、更新、删除（CRUD）+ 提取
- 执行模式：渐进式执行，所有写操作必须经过用户确认
### 适用场景
<sheet token="Fsv1siAiJhDf9Pt8JficbDz3n1f_oBaE1Z"/>

---

## 二、流程路由体系
bkn-creator 采用两层路由架构：
### 第一层：流程路由识别
根据用户意图关键词，路由到对应子流程：
<sheet token="Fsv1siAiJhDf9Pt8JficbDz3n1f_cygxIX"/>

重要：流程路由确认通过前，禁止进入任何子流程的阶段化执行。
### 第二层：渐进式执行协议
所有 CRUD 流程统一遵循六阶段序列：
```plaintext
discover -> preview -> confirm -> execute -> verify -> report
```

- discover：识别目标与上下文
- preview：展示将执行内容（含影响面 / diff）
- confirm：等待明确确认
- execute：委托子技能执行
- verify：核验结果完整性
- report：向用户回执结果与下一步建议
---

## 三、五大子流程详解
### 新增流程（FLOW_CREATE）
从业务输入生成可推送的 BKN，完成绑定、推送与验证。
五阶段结构：
<sheet token="Fsv1siAiJhDf9Pt8JficbDz3n1f_pY7Auf"/>

关键特性：
- 支持三种输入路径：结构化文档（A）、部分信息（B）、委托建模顾问（C）
- 默认主视角：对象-属性-视图映射（ER 视角仅作为复杂关系场景的补充）
- 阶段四严格状态机：绑定证据 -> 绑定决议 -> 属性回灌 -> 映射门禁 -> 差异确认 -> 阶段确认
### 提取流程（FLOW_EXTRACT_TYPES）
从业务描述或文档中提取对象类与关系类候选清单。
流程特点：
- 先进行领域识别（基于 `DOMAIN_ROUTING.md` 评分制）
- 支持三个领域：`supply_chain`、`crm_sales`、`project_delivery`
- 未命中领域时走通用提取流程
- 输出分组：`explicit_objects` / `inferred_objects` / `pending_objects` / `rejected_candidates`
- 待确认对象必须先完成处理决策
### 查找流程（FLOW_READ）
定位并展示知识网络或其对象/关系结构，不执行写操作。
查询能力：
- 按名称关键词模糊查询
- 按 ID 精确查询
- 网络级 / 对象级 / 关系级结构展示
### 更新流程（FLOW_UPDATE）
在不破坏现有网络完整性的前提下，执行可追踪的变更。
执行策略：
- 小范围修改：对象/关系级更新
- 结构性变更：草案重生成 + 校验 + 推送
- 更新前必须展示影响面与 diff
### 删除流程（FLOW_DELETE）
安全执行删除操作，充分暴露影响面。
删除类型：
- 整网删除
- 局部删除（对象类/关系类）
---

## 四、领域识别机制
基于评分制的领域路由：
<sheet token="Fsv1siAiJhDf9Pt8JficbDz3n1f_OIlP09"/>

判定规则：
- 高置信命中：归一化得分 >= 20 且领先 >= 8
- 候选冲突：归一化得分 >= 12 且分差小于 8
- 未识别：走通用提取流程
---

## 五、子技能协作体系
bkn-creator Never 直接执行 CLI，所有执行均委托子技能：
<sheet token="Fsv1siAiJhDf9Pt8JficbDz3n1f_MH795a"/>

---

## 六、门禁与确认机制
### 明确确认判定规则
以下回复视为通过门禁：
- `确认` / `确认采用该视角` / `按这个视角继续` / `确认清单` / `可以进入下一阶段`
以下回复 Never 视为确认：
- `看一下` / `先这样` / `继续说` / `嗯` / 带 `?` 的问题
### 关键门禁点
<sheet token="Fsv1siAiJhDf9Pt8JficbDz3n1f_qDQyM5"/>

---

## 七、输出规范
### 用户回显模板
统一格式：
```plaintext
### <标题>（<阶段> | <类型>）
说明：
- <要点1>
- <要点2>
下一步：<动作或确认事项>
```

### 展示策略
- 默认仅输出摘要（数量、状态、风险、下一步）
- 同一轮仅允许一种主展示格式
- 用户明确请求时才输出详情（表格或 YAML/JSON）
### 字段显示词典
<sheet token="Fsv1siAiJhDf9Pt8JficbDz3n1f_JhxhFB"/>

---

## 八、典型使用场景
### 场景1：创建知识网络
用户：「根据这份 PRD 创建知识网络」
执行流程：
1. 流程路由识别为新增 -> 等待确认
1. 进入 FLOW_CREATE -> 建模意图澄清（视角确认 + 清单确认）
1. 生成 BKN 草案 -> 校验 -> 用户确认草案
1. 环境检查 -> 连通性确认
1. 数据视图绑定 -> 属性回灌 -> 完备性放行 -> 用户确认结果
1. 推送网络 -> 生成 HTML 报告
### 场景2：提取对象类
用户：「从这份文档提取对象类和关系类」
执行流程：
1. 流程路由识别为提取 -> 等待确认
1. 领域识别（评分制） -> 确认主领域
1. 执行提取 -> 校验命名与分组
1. 处理待确认对象 -> 输出结构化清单
### 场景3：更新知识网络
用户：「给对象类 X 添加一个新属性」
执行流程：
1. 流程路由识别为更新 -> 等待确认
1. 定位目标 -> 展示变更 diff 与影响面
1. 用户确认更新 -> 执行更新
1. 核验引用完整性 -> 输出回执
---

## 九、文件结构
```plaintext
skills/bkn-creator/
├── SKILL.md                  # 主控文件（流程路由 + 顶层约束）
├── COMMON_RULES.md           # 通用门禁与约束
├── FLOW_CREATE.md            # 新增流程
├── FLOW_READ.md              # 查找流程
├── FLOW_UPDATE.md            # 更新流程
├── FLOW_DELETE.md            # 删除流程
├── FLOW_EXTRACT_TYPES.md     # 提取流程
└── references/
    ├── DOMAIN_ROUTING.md     # 领域识别路由表
    ├── common/
    │   └── generic_extraction.md  # 通用提取规则
    ├── supply_chain/
    │   └── domain_supply_chain.md # 供应链领域知识
    ├── crm_sales/
    │   └── domain_crm_sales.md    # CRM销售领域知识
    ├── project_delivery/
    │   └── domain_project_delivery.md # 项目交付领域知识
    ├── bkn_report_template.html   # HTML 报告模板
    └── trigger-test-set.jsonl     # 触发词测试集
```

---

## 十、总结
bkn-creator 是一个设计严谨的编排器，核心优势：
1. 渐进式执行：每个阶段有明确目标与退出条件，防止跳步
1. 严格门禁：所有写操作必须经过用户明确确认
1. 领域智能：基于评分制的领域识别，支持供应链、CRM、项目交付三个垂直领域
1. 职责清晰：编排器不直接执行，所有 CLI 命令委托给 `kweaver-core`
1. 用户友好：统一回显模板、摘要优先展示、内部术语去术语化
如果你需要使用此 skill，只需提供业务文档或描述，并按照确认提示逐步推进即可。
