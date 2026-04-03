# Text2SQL 背景知识片段（渐进式加载）

本文档存放 **`gen_exec` 的 `config.background` 可拼接 SQL 模板** 等可复用知识。**默认不要整文件预读**，按下方规则按需加载对应章节即可。

## 渐进式加载规则（MUST）

1. **先**只读 [text2sql.md](text2sql.md) 完成主流程约束与 **`show_ds` → `gen_exec` 顺序**。
2. **在 `show_ds` 已有候选表/字段摘要之后**，再根据用户问题做意图匹配：命中 [索引：意图 → 章节](#索引意图--章节) 中的某一类时，**仅打开本文档对应 `##` 章节**，把该节 SQL 模板与占位说明 **追加或合并** 进 `gen_exec` 的 `background`（与 `show_ds` 摘要同属一段纯文本即可；业务口径如「注册资金单位为万」仍放在摘要侧）。
3. **未命中**任一类时：**不读取**本文档其余章节，避免无关模板干扰生成。
4. 后续每新增一类知识：在本文档增加新 `##` 节，并更新下方索引表一行。

## 索引：意图 → 章节

| 意图关键词（示例） | 读取章节 |
|-------------------|----------|
| 前百分之几、Top X%、排名前 10%、最高 5% 企业/记录、按比例取前段 | [Top X%（按指标排名前百分之几）](#top-x按指标排名前百分之几) |
| 投资者/股东/关联方/对方主体的地址或地区、认缴出资金额、多表联查、多表出现同名地址字段（如 `dom`）易混 | [多表场景：地址类字段落在哪张表（主体 vs 对方）](#多表场景地址类字段落在哪张表主体-vs-对方) |

---

## 多表场景：地址类字段落在哪张表（主体 vs 对方）

**适用**：`show_ds` 已给出 **至少两张可关联表**（常见：主体/企业基本信息 + 明细或关联方表，如股东、投资人、供应商、客户、分支机构等），且多张表上存在 **同名或同类「地址、住所、属地」字段**（如 `dom`、`address`、`reg_addr`）。用户问「地址在【地区】的…」「住在【城市】的…投资方/股东/客户…」但未写清是 **哪一类主体** 的地址。

**核心原则（MUST）**：

1. **先判「这句话里的地址描述的主体是谁」**，再选表选列；**禁止**因为某张表也有 `dom` 就默认把地区条件写在那张表上。
2. **语义优先于字段同名**：以 `show_ds` 里 **表注释、字段 comment、业务名** 为准，判断某一列是 **登记主体（本企业）** 的住所，还是 **对方/关联方/出资方/明细行** 的住所或联系地址。
3. **常见口语映射（默认倾向，可被用户明确口径覆盖）**：
   - 「**企业/公司**的注册地址、住所、经营场所」→ 通常落在 **主体/证照侧** 事实表（名称里常含 base、ent、主体信息）。
   - 「**投资者、股东、出资方、关联方、客户、供应商、对方**…的地址、所在地」→ 通常落在 **明细/关系/子表**（一行对应一个对方或一笔关系），地区条件写在 **该明细行所属表** 的地址列上。
4. **关联条件** 仅用 `show_ds` 已确认的 **外键/业务主键**（如 `pripid`、`ent_id`、`company_id`，以 DDL 为准），**不得**臆造关联。

**完整表路径**：`SELECT` / `FROM` / `JOIN` 中的对象名必须以 `show_ds` 的 **`table_path` / `path`** 为准，保留 catalog、schema，避免只写裸表名导致环境不一致。

**拼进 `config.background` 时**：用一两句话写清「地区条件作用在 **{表别名}** 的 **{列名}**，语义是 **{主体/对方}**」；再给出 `show_ds` 摘要中的连接键与目标指标列名。

**SQL 结构模板（占位符全部由 `show_ds` 替换）**：

```sql
-- 当地区约束属于「对方/明细行」而非「登记主体」时：条件放在对方表侧（ON 或 WHERE 等价即可）
SELECT {party_cols_to_output}
FROM {path_subject} s
JOIN {path_party_or_detail} p
  ON {join_on_fk}
 AND {party_address_col} LIKE '%{region}%';
```

- `{path_subject}` / `{path_party_or_detail}`：主体表与对方或明细表的完整路径。
- `{join_on_fk}`：`show_ds` 确认的主外键等式（可多列 AND）。
- `{party_address_col}`：注释/语义表明属于 **对方或明细行** 的地址类列。
- `{party_cols_to_output}`：用户要的对方名称、认缴额、比例等（以 DDL 为准）。
- `{region}`：用户口中的地名片段；若需「省 OR 市」等，在 `background` 中写清 OR 规则再由模型展开。

**显式澄清优先**：用户若已写「**本企业**住所…」「**仅**注册地址…」，则地区条件落在主体表地址列；若已写「**股东户籍/投资方注册地**…」，则落在对应子表。同一问句里出现 **两个不同主体** 的地区要求时，在 `background` 里 **拆成两个条件**，分别指定表与列，避免同一 `LIKE` 语义含糊。

**典型示例（非穷举）**：市场监管语境下，「地址在 X 的 **企业投资者** 认缴出资」常表示 **投资人行上的** `dom`（或等价列），而非企业的 `baseinfo.dom`；字段名以当前 `show_ds` 为准，不必照搬历史表名。

---

## Top X%（按指标排名前百分之几）

**适用**：单表（或已 `show_ds` 明确的单事实源）上，按某数值指标 **降序** 取 **前 `top_percent` 比例** 的行，输出指定目标列（如企业名称）。

**重要约束（MUST）**：若当前 `gen_exec` 引擎对 `WITH/CTE` 报 `SqlSyntaxError`，请不要使用 `WITH ... AS ...`，改用“派生表（FROM (...)）+ 外层过滤”的写法。

**拼进 `config.background` 时**：将占位符替换为 `show_ds` 已确认的**真实表名与字段名**；`{and_condition}` 无前缀过滤则整行删除或留空。

```sql
-- 适用：查询某表中按某指标排名前X%的目标字段
SELECT {target_col}
FROM (
    SELECT
        {target_col},
        {metric_col},
        ROW_NUMBER() OVER (ORDER BY {metric_col} DESC) AS rn,
        COUNT(*) OVER () AS total_cnt
    FROM {table_name}
    WHERE {metric_col} IS NOT NULL
      {and_condition}
) t
WHERE rn <= CEIL(total_cnt * {top_percent});
```

**备选模板（仅前10%，NTILE 分桶）**：当 `{top_percent}` 为 `0.1` 且更偏向“分桶取前段”（而不是按 `CEIL(total_cnt * top_percent)` 逐行取整）时，可用该模板。

若目标字段需要把 `entname` 与 `name` 统一（例如企业名称），可将 `{target_col}` 直接设为 `COALESCE(entname, name)`（占位符可放表达式）。

```sql
-- 适用：取前10%（NTILE(10) 的 bucket=1）
-- 说明：该模板不使用 WITH/CTE，仅用派生表
SELECT {target_col}
FROM (
    SELECT
        {target_col} AS target_col,
        {metric_col},
        NTILE(10) OVER (ORDER BY {metric_col} DESC) AS bucket
    FROM {table_name}
    WHERE {metric_col} IS NOT NULL
      {and_condition}
) t
WHERE t.bucket = 1
ORDER BY t.{metric_col} DESC;
```

**占位符**：

- `{target_col}`：目标输出字段（如 `entname`）
- `{metric_col}`：排序指标字段（如 `regcap`）
- `{table_name}`：表名（如 `scjg_e_baseinfo`）
- `{and_condition}`：额外 `AND` 条件（无条件则不要写 `{and_condition}` 这一行）
- `{top_percent}`：小数比例（如 `0.1` 表示前 10%）

**口径说明**：该写法按 **行数** 取整前排位（`CEIL`），并列指标值时可能多出行；若业务要求严格“分位数阈值”而非“前 10% 行数”，需在业务侧另定口径（本文档不展开）。
