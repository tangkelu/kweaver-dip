import type { CronJob, CronJobListResponse } from '@/apis/dip-studio/plan'

/** 设为 `true` 时使用本地 mock 预览列表 UI；接好接口后改为 `false` */
export const PLAN_LIST_USE_MOCK = true

const MOCK_TOTAL = 35
const MOCK_DELAY_MS = 380

function buildMockJob(index: number): CronJob {
  const now = Date.now()
  const id = `mock-plan-${index}`

  const base = {
    id,
    agentId: 'mock-agent',
    sessionKey: `session-${index}`,
    name:
      index % 4 === 0
        ? `库存巡检日报 #${index}`
        : index % 4 === 1
          ? `自动补货申请 #${index}`
          : index % 4 === 2
            ? `审批超时提醒 #${index}`
            : `周计划汇总 #${index}`,
    enabled: index % 6 !== 0,
    createdAtMs: now - 86400000 * 3,
    updatedAtMs: now - 3600000,
    schedule: {
      kind: index % 5 === 0 ? 'at' : 'every',
      expr: index % 3 === 0 ? '30 9 * * *' : '0 11 * * *',
      tz: 'Asia/Shanghai',
    },
    sessionTarget: index % 5 === 0 ? 'workflow://approval/default' : undefined,
    wakeMode: index % 4 === 1 ? '新订单生成' : index % 4 === 2 ? '库存低于阈值' : undefined,
    payload: {
      description: '基于库存分析自动生成补货申请单并推送审批',
      ...(index % 3 === 0 ? { fileCount: 3 } : {}),
    },
  } satisfies Omit<CronJob, 'state'>

  let state: CronJob['state']
  if (index % 8 === 1) {
    state = { nextRunAtMs: now + 3600000, runningAtMs: now, lastRunStatus: 'ok' }
  } else if (index % 8 === 2) {
    state = {
      nextRunAtMs: now + 86400000,
      lastRunAtMs: now - 7200000,
      lastRunStatus: 'ok',
    }
  } else if (index % 8 === 3) {
    state = {
      nextRunAtMs: now + 3600000,
      lastRunAtMs: now - 600000,
      lastRunStatus: 'error',
      lastError: 'timeout',
    }
  } else if (index % 8 === 4) {
    state = {
      nextRunAtMs: now + 86400000,
      lastRunAtMs: now - 3600000,
      lastRunStatus: 'skipped',
    }
  } else {
    state = {
      nextRunAtMs: now + 43200000,
      lastRunAtMs: index % 7 === 0 ? now - 86400000 : undefined,
      lastRunStatus: index % 7 === 0 ? 'ok' : undefined,
    }
  }

  return { ...base, state }
}

/** 模拟分页列表（含短延迟，便于看 loading） */
export function mockFetchPlanListPage(offset: number, limit: number): Promise<CronJobListResponse> {
  const jobs: CronJob[] = []
  for (let i = 0; i < limit && offset + i < MOCK_TOTAL; i++) {
    jobs.push(buildMockJob(offset + i))
  }
  const end = offset + jobs.length
  const hasMore = end < MOCK_TOTAL

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        total: MOCK_TOTAL,
        offset,
        limit,
        hasMore,
        nextOffset: hasMore ? end : null,
        jobs,
      })
    }, MOCK_DELAY_MS)
  })
}
