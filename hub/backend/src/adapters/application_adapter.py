"""
应用适配器

实现 ApplicationPort 接口的数据库适配器。
负责与 MariaDB 数据库交互，完成应用数据的持久化操作。
"""
import base64
import json
import logging
from typing import List, Optional
from datetime import datetime

import aiomysql

from src.domains.application import Application, MicroAppInfo, OntologyConfigItem, AgentConfigItem, ReleaseConfigItem
from src.ports.application_port import ApplicationPort
from src.infrastructure.config.settings import Settings

logger = logging.getLogger(__name__)


class ApplicationAdapter(ApplicationPort):
    """
    应用数据库适配器实现。

    该适配器实现了 ApplicationPort 接口，提供应用数据的数据库访问操作。
    使用 aiomysql 进行异步数据库操作。
    """

    def __init__(self, settings: Settings):
        """
        初始化应用适配器。

        参数:
            settings: 应用配置
        """
        self._settings = settings
        self._pool: Optional[aiomysql.Pool] = None

    async def _get_pool(self) -> aiomysql.Pool:
        """
        获取数据库连接池。

        返回:
            aiomysql.Pool: 数据库连接池
        """
        if self._pool is None:
            self._pool = await aiomysql.create_pool(
                host=self._settings.db_host,
                port=self._settings.db_port,
                user=self._settings.db_user,
                password=self._settings.db_password,
                db=self._settings.db_name,
                autocommit=True,
                minsize=1,
                maxsize=10,
            )
            logger.info(f"数据库连接池已创建: {self._settings.db_host}:{self._settings.db_port}/{self._settings.db_name}")
        return self._pool

    async def close(self):
        """关闭数据库连接池。"""
        if self._pool is not None:
            self._pool.close()
            await self._pool.wait_closed()
            logger.info("数据库连接池已关闭")

    def _parse_json_list(self, json_str: Optional[str], default: list = None) -> list:
        """
        解析 JSON 字符串为列表。

        参数:
            json_str: JSON 字符串
            default: 默认值

        返回:
            list: 解析后的列表
        """
        if default is None:
            default = []
        if not json_str:
            return default
        try:
            result = json.loads(json_str)
            return result if isinstance(result, list) else default
        except json.JSONDecodeError:
            logger.warning(f"JSON 解析失败: {json_str}")
            return default

    def _parse_micro_app(self, json_str: Optional[str]) -> Optional[MicroAppInfo]:
        """
        解析 JSON 字符串为 MicroAppInfo。

        参数:
            json_str: JSON 字符串

        返回:
            Optional[MicroAppInfo]: 解析后的微应用信息，失败时返回 None
        """
        if not json_str:
            return None
        try:
            data = json.loads(json_str)
            if isinstance(data, dict):
                return MicroAppInfo(
                    name=data.get("name", ""),
                    entry=data.get("entry", ""),
                    headless=data.get("headless", False),
                )
            return None
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"微应用配置 JSON 解析失败: {json_str}, 错误: {e}")
            return None

    def _parse_release_config_list(self, json_str: Optional[str]) -> List[ReleaseConfigItem]:
        """
        解析 release_config JSON 字符串。

        参数:
            json_str: JSON 字符串

        返回:
            list: 解析后的 ReleaseConfigItem 列表
        """
        if not json_str:
            return []
        try:
            data = json.loads(json_str)
            if not isinstance(data, list):
                return []
            
            result = []
            for item in data:
                if isinstance(item, dict):
                    # 新格式：{name, namespace}
                    result.append(ReleaseConfigItem(
                        name=item.get("name", ""),
                        namespace=item.get("namespace", "default"),
                    ))
                elif isinstance(item, str):
                    # 兼容旧格式：仅 release name，namespace 使用默认值
                    result.append(ReleaseConfigItem(name=item, namespace="default"))
            return result
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"release_config JSON 解析失败: {json_str}, 错误: {e}")
            return []

    def _parse_config_list(self, json_str: Optional[str], config_type: str) -> list:
        """
        解析配置列表 JSON 字符串。

        参数:
            json_str: JSON 字符串
            config_type: 配置类型 ('ontology' 或 'agent')

        返回:
            list: 解析后的配置项列表
        """
        if not json_str:
            return []
        try:
            data = json.loads(json_str)
            if not isinstance(data, list):
                return []
            
            result = []
            for item in data:
                if isinstance(item, dict):
                    if config_type == 'ontology':
                        result.append(OntologyConfigItem(
                            id=str(item.get("id", "")),
                            is_config=item.get("is_config", False),
                        ))
                    elif config_type == 'agent':
                        result.append(AgentConfigItem(
                            id=str(item.get("id", "")),
                            is_config=item.get("is_config", False),
                        ))
                # 兼容旧格式：如果是整数或字符串，转换为配置项
                elif isinstance(item, (int, str)):
                    if config_type == 'ontology':
                        result.append(OntologyConfigItem(id=str(item), is_config=False))
                    elif config_type == 'agent':
                        result.append(AgentConfigItem(id=str(item), is_config=False))
            return result
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"配置列表 JSON 解析失败: {json_str}, 错误: {e}")
            return []

    def _row_to_application(self, row: tuple) -> Application:
        """
        将数据库行转换为应用领域模型。

        参数:
            row: 数据库查询结果行
                (id, key, name, description, icon, version, category, micro_app,
                 release_config, ontology_ids, agent_ids, is_config, updated_by, updated_by_id, updated_at)
                或包含 business_domain 的扩展版本

        返回:
            Application: 应用领域模型
        """
        # 将二进制图标转换为 Base64 字符串
        icon_base64 = None
        if row[4]:
            try:
                icon_base64 = base64.b64encode(row[4]).decode('utf-8')
            except Exception as e:
                logger.warning(f"应用图标 Base64 编码失败: {e}")
                icon_base64 = None

        # 解析 JSON 字段
        micro_app = self._parse_micro_app(row[7])
        release_config = self._parse_release_config_list(row[8])
        # 兼容旧格式：如果字段名还是 ontology_ids/agent_ids，先尝试解析为配置项
        ontology_config = self._parse_config_list(row[9], 'ontology')
        agent_config = self._parse_config_list(row[10], 'agent')
        
        # is_config, pinned, updated_by, updated_by_id, updated_at, business_domain
        # 新结构（17 列）：row[11]=is_config, row[12]=pinned, row[13]=updated_by, row[14]=updated_by_id, row[15]=updated_at, row[16]=business_domain
        # 旧结构（16 列）：row[11]=is_config, row[12]=updated_by, row[13]=updated_by_id, row[14]=updated_at, row[15]=business_domain
        if len(row) > 16:
            pinned = bool(row[12]) if row[12] is not None else False
            updated_by = row[13] or ""
            updated_by_id = (row[14] or "") if len(row) > 14 else ""
            updated_at = row[15] if len(row) > 15 else None
            business_domain = row[16] if row[16] is not None else "db_public"
        else:
            pinned = False
            updated_by = row[12] or "" if len(row) > 12 else ""
            updated_by_id = (row[13] or "") if len(row) > 13 else ""
            updated_at = row[14] if len(row) > 14 else (row[13] if len(row) > 13 else None)
            business_domain = row[15] if len(row) > 15 and row[15] is not None else "db_public"

        return Application(
            id=row[0],
            key=row[1],
            name=row[2],
            description=row[3],
            icon=icon_base64,
            version=row[5],
            category=row[6],
            business_domain=business_domain,
            micro_app=micro_app,
            release_config=release_config,
            ontology_config=ontology_config,
            agent_config=agent_config,
            is_config=bool(row[11]) if row[11] is not None else False,
            pinned=pinned,
            updated_by=updated_by,
            updated_by_id=updated_by_id,
            updated_at=updated_at,
        )

    async def get_all_applications(self, pinned: Optional[bool] = None) -> List[Application]:
        """
        获取所有已安装的应用列表，可按被钉状态过滤。
        """
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cursor:
                sql = """SELECT id, `key`, name, description, icon, version, category, micro_app,
                              release_config, ontology_ids, agent_ids, is_config,
                              COALESCE(pinned, 0) as pinned,
                              updated_by, updated_by_id, updated_at, COALESCE(business_domain, 'db_public') as business_domain
                       FROM t_application"""
                params = ()
                if pinned is not None:
                    sql += " WHERE pinned = %s"
                    params = (pinned,)
                sql += " ORDER BY updated_at DESC"
                await cursor.execute(sql, params)
                rows = await cursor.fetchall()
                return [self._row_to_application(row) for row in rows]

    async def get_application_by_key(self, key: str) -> Application:
        """
        根据应用唯一标识获取应用信息。

        参数:
            key: 应用包唯一标识

        返回:
            Application: 应用实体

        异常:
            ValueError: 当应用不存在时抛出
        """
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """SELECT id, `key`, name, description, icon, version, category, micro_app,
                              release_config, ontology_ids, agent_ids, is_config,
                              COALESCE(pinned, 0) as pinned,
                              updated_by, updated_by_id, updated_at, COALESCE(business_domain, 'db_public') as business_domain
                       FROM t_application 
                       WHERE `key` = %s""",
                    (key,)
                )
                row = await cursor.fetchone()
                if row is None:
                    raise ValueError(f"应用不存在: {key}")
                return self._row_to_application(row)

    async def get_application_by_key_optional(self, key: str) -> Optional[Application]:
        """
        根据应用唯一标识获取应用信息（可选）。

        参数:
            key: 应用包唯一标识

        返回:
            Optional[Application]: 应用实体，不存在时返回 None
        """
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """SELECT id, `key`, name, description, icon, version, category, micro_app,
                              release_config, ontology_ids, agent_ids, is_config,
                              COALESCE(pinned, 0) as pinned,
                              updated_by, updated_by_id, updated_at, COALESCE(business_domain, 'db_public') as business_domain
                       FROM t_application 
                       WHERE `key` = %s""",
                    (key,)
                )
                row = await cursor.fetchone()
                if row is None:
                    return None
                return self._row_to_application(row)

    async def set_application_pinned(self, key: str, pinned: bool) -> Application:
        """设置应用是否被钉状态。"""
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    "UPDATE t_application SET pinned = %s WHERE `key` = %s",
                    (pinned, key),
                )
                if cursor.rowcount == 0:
                    raise ValueError(f"应用不存在: {key}")
        return await self.get_application_by_key(key)

    async def create_application(self, application: Application) -> Application:
        """
        创建新应用。

        参数:
            application: 应用实体

        返回:
            Application: 创建后的应用实体（包含生成的 ID）

        异常:
            ValueError: 当应用 key 已存在时抛出
        """
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cursor:
                # 检查应用是否已存在
                await cursor.execute(
                    "SELECT COUNT(*) FROM t_application WHERE `key` = %s",
                    (application.key,)
                )
                count = (await cursor.fetchone())[0]
                if count > 0:
                    raise ValueError(f"应用已存在: {application.key}")

                # 将 Base64 字符串转换为二进制数据
                icon_binary = None
                if application.icon:
                    try:
                        icon_binary = base64.b64decode(application.icon)
                    except Exception as e:
                        logger.warning(f"应用图标 Base64 解码失败: {e}")
                        icon_binary = None

                # 序列化 JSON 字段
                micro_app_json = None
                if application.micro_app:
                    micro_app_json = json.dumps({
                        "name": application.micro_app.name,
                        "entry": application.micro_app.entry,
                        "headless": application.micro_app.headless,
                    })
                release_config_json = json.dumps([
                    {"name": item.name, "namespace": item.namespace}
                    for item in (application.release_config or [])
                ])
                ontology_config_json = json.dumps([
                    {"id": item.id, "is_config": item.is_config}
                    for item in (application.ontology_config or [])
                ])
                agent_config_json = json.dumps([
                    {"id": item.id, "is_config": item.is_config}
                    for item in (application.agent_config or [])
                ])

                # 插入新应用
                await cursor.execute(
                    """INSERT INTO t_application 
                       (`key`, name, description, icon, version, category, micro_app,
                        release_config, ontology_ids, agent_ids, is_config, pinned,
                        updated_by, updated_by_id, updated_at, business_domain) 
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (
                        application.key,
                        application.name,
                        application.description,
                        icon_binary,
                        application.version,
                        application.category,
                        micro_app_json,
                        release_config_json,
                        ontology_config_json,
                        agent_config_json,
                        application.is_config,
                        getattr(application, 'pinned', False),
                        application.updated_by,
                        application.updated_by_id,
                        application.updated_at or datetime.now(),
                        application.business_domain,
                    )
                )

                # 获取插入的 ID
                application.id = cursor.lastrowid
                return application

    async def update_application(self, application: Application) -> Application:
        """
        更新应用信息。

        参数:
            application: 应用实体

        返回:
            Application: 更新后的应用实体

        异常:
            ValueError: 当应用不存在时抛出
        """
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cursor:
                # 将 Base64 字符串转换为二进制数据
                icon_binary = None
                if application.icon:
                    try:
                        icon_binary = base64.b64decode(application.icon)
                    except Exception as e:
                        logger.warning(f"应用图标 Base64 解码失败: {e}")
                        icon_binary = None

                # 序列化 JSON 字段
                micro_app_json = None
                if application.micro_app:
                    micro_app_json = json.dumps({
                        "name": application.micro_app.name,
                        "entry": application.micro_app.entry,
                        "headless": application.micro_app.headless,
                    })
                release_config_json = json.dumps([
                    {"name": item.name, "namespace": item.namespace}
                    for item in (application.release_config or [])
                ])
                ontology_config_json = json.dumps([
                    {"id": item.id, "is_config": item.is_config}
                    for item in (application.ontology_config or [])
                ])
                agent_config_json = json.dumps([
                    {"id": item.id, "is_config": item.is_config}
                    for item in (application.agent_config or [])
                ])

                await cursor.execute(
                    """UPDATE t_application 
                       SET name = %s, description = %s, icon = %s, version = %s, category = %s, micro_app = %s,
                           release_config = %s, ontology_ids = %s, agent_ids = %s, is_config = %s, pinned = %s,
                           updated_by = %s, updated_by_id = %s, updated_at = %s, business_domain = %s
                       WHERE `key` = %s""",
                    (
                        application.name,
                        application.description,
                        icon_binary,
                        application.version,
                        application.category,
                        micro_app_json,
                        release_config_json,
                        ontology_config_json,
                        agent_config_json,
                        application.is_config,
                        getattr(application, 'pinned', False),
                        application.updated_by,
                        application.updated_by_id,
                        application.updated_at or datetime.now(),
                        application.business_domain,
                        application.key,
                    )
                )

                if cursor.rowcount == 0:
                    raise ValueError(f"应用不存在: {application.key}")

                return application

    async def update_application_config(
        self,
        key: str,
        ontology_config: List[OntologyConfigItem],
        agent_config: List[AgentConfigItem],
        updated_by: str,
        updated_by_id: str = ""
    ) -> Application:
        """
        更新应用配置（业务知识网络和智能体）。

        参数:
            key: 应用唯一标识
            ontology_config: 业务知识网络配置列表
            agent_config: 智能体配置列表
            updated_by: 更新者用户显示名称
            updated_by_id: 更新者用户ID

        返回:
            Application: 更新后的应用实体

        异常:
            ValueError: 当应用不存在时抛出
        """
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cursor:
                ontology_config_json = json.dumps([
                    {"id": item.id, "is_config": item.is_config}
                    for item in ontology_config
                ])
                agent_config_json = json.dumps([
                    {"id": item.id, "is_config": item.is_config}
                    for item in agent_config
                ])
                is_config = True  # 配置后标记为已配置

                await cursor.execute(
                    """UPDATE t_application 
                       SET ontology_ids = %s, agent_ids = %s, is_config = %s,
                           updated_by = %s, updated_by_id = %s, updated_at = %s 
                       WHERE `key` = %s""",
                    (
                        ontology_config_json,
                        agent_config_json,
                        is_config,
                        updated_by,
                        updated_by_id,
                        datetime.now(),
                        key,
                    )
                )

                if cursor.rowcount == 0:
                    raise ValueError(f"应用不存在: {key}")

                # 返回更新后的应用
                return await self.get_application_by_key(key)

    async def delete_application(self, key: str) -> bool:
        """
        删除应用。

        参数:
            key: 应用包唯一标识

        返回:
            bool: 是否删除成功

        异常:
            ValueError: 当应用不存在时抛出
        """
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    "DELETE FROM t_application WHERE `key` = %s",
                    (key,)
                )

                if cursor.rowcount == 0:
                    raise ValueError(f"应用不存在: {key}")

                return True
