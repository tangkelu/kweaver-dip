#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
调用 text2sql（show_ds / gen_exec）assistant 工具接口。

**单文件自包含**：网关根地址 **不设脚本内默认**，解析顺序：
**`--base-url` / `-b` → 环境变量 `TEXT2SQL_BASE_URL` → 终端手动输入**
（非交互且仍缺省则报错）。
`url_path`、`kn_id`、`inner_llm` 与限流参数等写在本文件常量中，不读取 config.json；
`user_id` 由 **`--user-id` → `TEXT2SQL_USER_ID` → 交互输入** 解析。
常用项：`--kn-id`、`--input`、`--background`、`--token`、`--inner-llm-id`（或与 `TEXT2SQL_INNER_LLM_ID` 覆盖 `inner_llm.id`）。
生成临时 `_tmp_t2s_*.py` 时须与本文件同构（仅按任务调整 action、token、input、background、
session_id、kn_id、user_id、base_url 等），且 **不得** 写在仓库 `skills/` 或 `.claude/skills/` 及其子目录下；
详见同目录上级 `references/text2sql.md` 中「请求方式」与「临时 text2sql Python 脚本规范」。

直传 JSON：config、data_source、inner_llm、input、action、timeout、auth；
请求头 `x-business-domain` 与路径均使用内置默认值，Authorization 与 `auth.token` 保持一致。
`session_id` 由脚本内部使用 `uuid.uuid4()` 生成；不建议也不支持从外部传入复用。

示例（Linux/macOS Bash，需设置 `TEXT2SQL_BASE_URL` 或传入 `-b`）：
  export TEXT2SQL_TOKEN=$(kweaver token | tr -d '\\r\\n')
  python text2sql_request_example.py --action show_ds --insecure -i "销售域里区域、月份统计可能用到哪些表"

示例（Windows PowerShell，建议用 cmd 取 token 避免混入 stderr）：
  $env:TEXT2SQL_TOKEN = (cmd /c "npx kweaver token 2>nul").Trim()
  python text2sql_request_example.py --action show_ds --insecure -i "销售域里区域、月份统计可能用到哪些表"

示例（Windows CMD，仅 cmd.exe；PowerShell 勿用 set）：
  set TEXT2SQL_TOKEN=<your-token>
  python text2sql_request_example.py --action show_ds --insecure

可选覆盖：`TEXT2SQL_BASE_URL` 或 `-b https://...`；非交互场景请提前配置环境变量或传入对应参数。
环境变量 TEXT2SQL_TOKEN；若未设置则尝试 KN_SELECT_TOKEN（与 kn_select 同会话时便于共用）。
`inner_llm.id` 获取与持久化见 `references/text2sql.md`「inner_llm.id 获取与持久化」：OpenClaw 下读 **`OPENCLAW_MEMORY_INNER_LLM_ID`** / **`inner_llm.openclaw.txt`**；其它环境读 **`inner_llm.txt`**（或 **`TEXT2SQL_INNER_LLM_FILE`**）；仍无则 TTY 提示输入，并写回对应记忆镜像文件（OpenClaw 须由宿主再同步记忆区）。
非交互且无法解析 user_id 时请设置 `TEXT2SQL_USER_ID` 或传入 `--user-id`。
"""


import argparse
import json
import os
from pathlib import Path
import ssl
import sys
import urllib.error
import urllib.request
import uuid
from typing import Optional

DEFAULT_URL_PATH = "/api/af-sailor-agent/v1/assistant/tools/text2sql"
DEFAULT_X_BUSINESS_DOMAIN = "bd_public"
DEFAULT_KN_ID = "d71o5e1e8q1nr9l7mb80"

DEFAULT_RETURN_DATA_LIMIT = 2000
DEFAULT_RETURN_RECORD_LIMIT = 20
DEFAULT_TIMEOUT_SEC = 120

DEFAULT_INNER_LLM: dict = {
    "id": "",
    "name": "deepseek_v3",
    "temperature": 0.1,
    "top_k": 1,
    "top_p": 1,
    "frequency_penalty": 0,
    "presence_penalty": 0,
    "max_tokens": 20000,
}

DEFAULT_INPUT_SHOW_DS = (
    "销售域里做区域、月份统计可能用到哪些事实表和维度字段，列出表名与关键列"
)
DEFAULT_INPUT_GEN_EXEC = "按区域汇总上月订单金额，并给出各区域占比"
DEFAULT_GEN_EXEC_BACKGROUND_TEMPLATE = (
    "注册资金单位为万"
)


def _clean_token(raw: str) -> str:
    """HTTP 头须 latin-1；环境变量若混入非 ASCII（如 stderr 进 Out-String），取 ASCII 行。"""
    raw = (raw or "").strip()
    for line in raw.splitlines():
        s = line.strip()
        if len(s) < 20:
            continue
        if all(ord(c) < 128 for c in s):
            return s
    return "".join(c for c in raw if ord(c) < 128).strip()


def _token_from_env() -> str:
    return _clean_token(
        os.environ.get("TEXT2SQL_TOKEN", "").strip()
        or os.environ.get("KN_SELECT_TOKEN", "").strip()
    )


def _is_openclaw() -> bool:
    v = (os.environ.get("OPENCLAW") or "").strip().lower()
    return v in ("1", "true", "yes")


def _path_inner_llm_txt() -> Path:
    s = (os.environ.get("TEXT2SQL_INNER_LLM_FILE") or "").strip()
    return Path(s) if s else Path.cwd() / "inner_llm.txt"


def _path_openclaw_inner_llm_store() -> Path:
    s = (os.environ.get("TEXT2SQL_OPENCLAW_INNER_LLM_STORE") or "").strip()
    return Path(s) if s else Path.cwd() / "inner_llm.openclaw.txt"


def _read_inner_llm_id_line(path: Path) -> str:
    try:
        if path.is_file():
            for line in path.read_text(encoding="utf-8").splitlines():
                t = line.strip()
                if t and not t.startswith("#"):
                    return t
    except OSError:
        pass
    return ""


def _write_inner_llm_id_line(path: Path, llm_id: str) -> None:
    text = (llm_id or "").strip() + "\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _resolve_inner_llm_id_for_request(cli: str) -> str:
    """与 references/text2sql.md「inner_llm.id 获取与持久化」一致。"""
    s = (cli or "").strip()
    if s:
        return s
    s = os.environ.get("TEXT2SQL_INNER_LLM_ID", "").strip()
    if s:
        return s
    if _is_openclaw():
        s = os.environ.get("OPENCLAW_MEMORY_INNER_LLM_ID", "").strip()
        if s:
            return s
        s = _read_inner_llm_id_line(_path_openclaw_inner_llm_store())
        if s:
            return s
    else:
        s = _read_inner_llm_id_line(_path_inner_llm_txt())
        if s:
            return s

    if sys.stdin.isatty():
        try:
            print(
                "未从记忆区/OpenClaw 镜像文件或 inner_llm.txt 获取到 inner_llm.id，"
                "请输入大模型 id（inner_llm.id）：",
                file=sys.stderr,
            )
            s = input().strip()
        except EOFError:
            s = ""
        if s:
            if _is_openclaw():
                store = _path_openclaw_inner_llm_store()
                _write_inner_llm_id_line(store, s)
                print(
                    "info: 已将 inner_llm.id 写入 "
                    f"{store.resolve()}；OpenClaw 宿主请同步到记忆区。",
                    file=sys.stderr,
                )
            else:
                _write_inner_llm_id_line(_path_inner_llm_txt(), s)
            return s

    print(
        "warn: 未配置 inner_llm.id（非交互或空输入），回退 DEFAULT_INNER_LLM[\"id\"]。",
        file=sys.stderr,
    )
    return str(DEFAULT_INNER_LLM["id"])


def _base_url_from_env() -> str:
    return (os.environ.get("TEXT2SQL_BASE_URL", "") or "").strip().rstrip("/")


def _resolve_user_id(explicit: str) -> str:
    """优先级：--user-id > TEXT2SQL_USER_ID > 交互 input。"""
    uid = (explicit or "").strip()
    if uid:
        return uid
    uid = os.environ.get("TEXT2SQL_USER_ID", "").strip()
    if uid:
        return uid
    if not sys.stdin.isatty():
        return ""
    try:
        return input("请输入 data_source.user_id（UUID）：").strip()
    except EOFError:
        return ""


def _resolve_base_url(explicit: str) -> str:
    """优先级：--base-url > TEXT2SQL_BASE_URL > 交互 input。"""
    u = (explicit or "").strip().rstrip("/")
    if u:
        return u
    u = _base_url_from_env()
    if u:
        return u
    if not sys.stdin.isatty():
        return ""
    try:
        print(
            "缺少网关 base_url（请设置 TEXT2SQL_BASE_URL 或传入 --base-url/-b）。",
            file=sys.stderr,
        )
        return input("请输入网关 base_url（例如 https://example.com，不要以 / 结尾）：").strip().rstrip("/")
    except EOFError:
        return ""


def _build_payload(
    *,
    action: str,
    token: str,
    user_input: str,
    background: str,
    session_id: str,
    kn_id: str,
    user_id: str,
    timeout_sec: int = DEFAULT_TIMEOUT_SEC,
    inner_llm: dict,
) -> dict:
    return {
        "config": {
            "background": background,
            "return_data_limit": DEFAULT_RETURN_DATA_LIMIT,
            "return_record_limit": DEFAULT_RETURN_RECORD_LIMIT,
            "session_id": session_id,
            "session_type": "redis",
        },
        "data_source": {"kn": [kn_id], "user_id": user_id},
        "inner_llm": inner_llm,
        "input": user_input,
        "action": action,
        "timeout": timeout_sec,
        "auth": {"token": token},
    }


def _resolve_output_path(action: str, out: str, session_id: str) -> str:
    if out.strip():
        return out
    if action == "gen_exec":
        filename = f"_tmp_t2s_gen_exec_result_{session_id}.json"
        return str(Path.cwd() / filename)
    return ""


def main() -> int:
    p = argparse.ArgumentParser(description="POST text2sql (show_ds / gen_exec).")
    p.add_argument(
        "--action",
        "-a",
        required=True,
        choices=("show_ds", "gen_exec"),
        help="show_ds 或 gen_exec",
    )
    p.add_argument(
        "--token",
        "-t",
        default=_token_from_env(),
        help="与 body.auth.token、Authorization 一致；或设 TEXT2SQL_TOKEN / KN_SELECT_TOKEN",
    )
    p.add_argument(
        "--input",
        "-i",
        default="",
        help="中文问题，写入 body.input（show_ds / gen_exec 语义见 text2sql.md）",
    )
    p.add_argument(
        "--background",
        "-g",
        default="",
        help="gen_exec 必填（承接 show_ds 摘要）；show_ds 通常留空",
    )
    p.add_argument("--kn-id", "-k", default=DEFAULT_KN_ID, help="data_source.kn[0]")
    p.add_argument(
        "--user-id",
        "-u",
        default="",
        help="data_source.user_id；省略时用 TEXT2SQL_USER_ID 或交互输入",
    )
    p.add_argument(
        "--base-url",
        "-b",
        default="",
        help="网关根地址；省略时尝试 TEXT2SQL_BASE_URL，再交互输入",
    )
    p.add_argument("--insecure", action="store_true", help="跳过 TLS 证书校验")
    p.add_argument("--out", "-o", default="", help="响应 JSON 写入路径（UTF-8）")
    p.add_argument(
        "--inner-llm-id",
        default="",
        metavar="ID",
        help="body.inner_llm.id；省略时见 text2sql.md「inner_llm.id」：TEXT2SQL_INNER_LLM_ID、"
        "OPENCLAW 记忆/inner_llm.openclaw.txt 或 inner_llm.txt、交互补录",
    )
    args = p.parse_args()

    base_url = _resolve_base_url(args.base_url)
    if not base_url:
        print(
            "error: 无法得到网关 base_url：请设置 TEXT2SQL_BASE_URL 或传入 --base-url/-b"
            "（非交互终端须预先配置之一）",
            file=sys.stderr,
        )
        return 2
    url_path = DEFAULT_URL_PATH
    inner_llm: dict = dict(DEFAULT_INNER_LLM)
    inner_llm["id"] = _resolve_inner_llm_id_for_request(args.inner_llm_id)
    kn_id = args.kn_id
    timeout_sec = DEFAULT_TIMEOUT_SEC

    # 每次执行都生成新的 session_id；session_id 不从外部传入。
    session_id = str(uuid.uuid4())

    user_input = args.input.strip()
    if not user_input:
        user_input = (
            DEFAULT_INPUT_SHOW_DS
            if args.action == "show_ds"
            else DEFAULT_INPUT_GEN_EXEC
        )

    background = args.background
    if args.action == "gen_exec" and not background.strip():
        background = DEFAULT_GEN_EXEC_BACKGROUND_TEMPLATE
        print(
            "info: gen_exec 未传 --background，已回退为默认模板（请按实际 show_ds 结果替换占位符）。",
            file=sys.stderr,
        )

    token = _clean_token(args.token.strip())
    if not token:
        print("error: 缺少 token（--token 或环境变量 TEXT2SQL_TOKEN / KN_SELECT_TOKEN）", file=sys.stderr)
        if sys.platform == "win32":
            print(
                "hint: PowerShell 请用 $env:TEXT2SQL_TOKEN = '...'，勿用 CMD 的 set。\n"
                "  示例: python text2sql_request_example.py -a show_ds -b https://... -t '...' --insecure",
                file=sys.stderr,
            )
        return 2

    user_id = _resolve_user_id(args.user_id)
    if not user_id:
        print(
            "error: 无法得到 data_source.user_id：请设置 TEXT2SQL_USER_ID 或传入 --user-id"
            "（非交互终端须预先配置之一）",
            file=sys.stderr,
        )
        return 2

    payload = _build_payload(
        action=args.action,
        token=token,
        user_input=user_input,
        background=background if args.action == "gen_exec" else "",
        session_id=session_id,
        kn_id=kn_id,
        user_id=user_id,
        timeout_sec=timeout_sec,
        inner_llm=inner_llm,
    )

    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    url = base_url + url_path
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "x-business-domain": DEFAULT_X_BUSINESS_DOMAIN,
        "Authorization": token,
    }

    ctx: Optional[ssl.SSLContext] = None
    if args.insecure:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(url, data=body, method="POST", headers=headers)

    http_timeout = float(min(max(timeout_sec + 30, 45), 600))

    try:
        with urllib.request.urlopen(req, timeout=http_timeout, context=ctx) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"HTTP {e.code} {e.reason}\n{err_body}", file=sys.stderr)
        return 1
    except urllib.error.URLError as e:
        print(f"request failed: {e.reason}", file=sys.stderr)
        return 1

    output_path = _resolve_output_path(args.action, args.out, session_id)

    try:
        data = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        text = raw.decode("utf-8", errors="replace")
        print(text)
        if output_path:
            with open(output_path, "w", encoding="utf-8", newline="\n") as f:
                f.write(text)
                if not text.endswith("\n"):
                    f.write("\n")
            print(f"saved response to: {output_path}", file=sys.stderr)
        return 0

    out_text = json.dumps(data, ensure_ascii=False, indent=2)
    print(out_text)
    if output_path:
        with open(output_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(out_text)
            if not out_text.endswith("\n"):
                f.write("\n")
        print(f"saved response to: {output_path}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
