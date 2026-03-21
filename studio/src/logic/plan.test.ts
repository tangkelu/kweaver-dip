import { describe, expect, it, vi } from "vitest";

import { DefaultCronLogic } from "./plan";

describe("DefaultCronLogic", () => {
  it("delegates listCronJobs to the adapter", async () => {
    const logic = new DefaultCronLogic({
      listCronJobs: vi.fn().mockResolvedValue({
        jobs: [],
        total: 0,
        offset: 0,
        limit: 50,
        hasMore: false,
        nextOffset: null
      }),
      listCronRuns: vi.fn()
    });

    await expect(
      logic.listCronJobs({
        includeDisabled: true,
        limit: 50,
        offset: 0,
        enabled: "all",
        sortBy: "nextRunAtMs",
        sortDir: "asc"
      })
    ).resolves.toEqual({
      jobs: [],
      total: 0,
      offset: 0,
      limit: 50,
      hasMore: false,
      nextOffset: null
    });
  });

  it("delegates listCronRuns to the adapter", async () => {
    const logic = new DefaultCronLogic({
      listCronJobs: vi.fn(),
      listCronRuns: vi.fn().mockResolvedValue({
        entries: [],
        total: 0,
        offset: 0,
        limit: 50,
        hasMore: false,
        nextOffset: null
      })
    });

    await expect(
      logic.listCronRuns({
        scope: "all",
        limit: 50,
        offset: 0,
        status: "all",
        sortDir: "desc"
      })
    ).resolves.toEqual({
      entries: [],
      total: 0,
      offset: 0,
      limit: 50,
      hasMore: false,
      nextOffset: null
    });
  });
});
