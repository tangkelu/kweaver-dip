import { describe, expect, it, vi } from "vitest";

import {
  OpenClawCronGatewayAdapter,
  createCronListRequest,
  createCronRunsRequest
} from "./openclaw-cron-adapter";

describe("createCronListRequest", () => {
  it("builds the cron.list JSON RPC frame", () => {
    expect(
      createCronListRequest("req-1", {
        includeDisabled: true,
        limit: 50,
        offset: 0,
        enabled: "all",
        sortBy: "nextRunAtMs",
        sortDir: "asc"
      })
    ).toEqual({
      type: "req",
      id: "req-1",
      method: "cron.list",
      params: {
        includeDisabled: true,
        limit: 50,
        offset: 0,
        enabled: "all",
        sortBy: "nextRunAtMs",
        sortDir: "asc"
      }
    });
  });
});

describe("createCronRunsRequest", () => {
  it("builds the cron.runs JSON RPC frame", () => {
    expect(
      createCronRunsRequest("req-2", {
        scope: "all",
        limit: 50,
        offset: 0,
        status: "all",
        sortDir: "desc"
      })
    ).toEqual({
      type: "req",
      id: "req-2",
      method: "cron.runs",
      params: {
        scope: "all",
        limit: 50,
        offset: 0,
        status: "all",
        sortDir: "desc"
      }
    });
  });
});

describe("OpenClawCronGatewayAdapter", () => {
  it("delegates cron.list to the gateway port", async () => {
    const gatewayPort = {
      invoke: vi.fn().mockResolvedValue({
        jobs: [],
        total: 0,
        offset: 0,
        limit: 50,
        hasMore: false,
        nextOffset: null
      })
    };
    const adapter = new OpenClawCronGatewayAdapter(gatewayPort);

    await expect(
      adapter.listCronJobs({
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

  it("delegates cron.runs to the gateway port", async () => {
    const gatewayPort = {
      invoke: vi.fn().mockResolvedValue({
        entries: [],
        total: 0,
        offset: 0,
        limit: 50,
        hasMore: false,
        nextOffset: null
      })
    };
    const adapter = new OpenClawCronGatewayAdapter(gatewayPort);

    await expect(
      adapter.listCronRuns({
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
