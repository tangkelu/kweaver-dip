import { describe, expect, it, vi } from "vitest";

import { DefaultOpenClawAgentsService } from "./openclaw-agents-service";

describe("DefaultOpenClawAgentsService", () => {
  it("delegates agents.list to the shared gateway client", async () => {
    const gatewayClient = {
      invoke: vi.fn().mockResolvedValue({
        defaultId: "main",
        mainKey: "sender",
        scope: "per-sender",
        agents: []
      })
    };
    const service = new DefaultOpenClawAgentsService(gatewayClient as never);

    await expect(service.listAgents()).resolves.toEqual({
      defaultId: "main",
      mainKey: "sender",
      scope: "per-sender",
      agents: []
    });
    expect(gatewayClient.invoke).toHaveBeenCalledOnce();
  });
});
