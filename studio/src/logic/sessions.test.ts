import { describe, expect, it, vi } from "vitest";

import { DefaultSessionsLogic } from "./sessions";

describe("DefaultSessionsLogic", () => {
  it("delegates listSessions to the adapter", async () => {
    const logic = new DefaultSessionsLogic({
      listSessions: vi.fn().mockResolvedValue({
        sessions: []
      }),
      getSession: vi.fn(),
      previewSessions: vi.fn()
    });

    await expect(
      logic.listSessions({
        limit: 20,
        includeDerivedTitles: true,
        includeLastMessage: true
      })
    ).resolves.toEqual({
      sessions: []
    });
  });

  it("delegates getSession to the adapter", async () => {
    const logic = new DefaultSessionsLogic({
      listSessions: vi.fn(),
      getSession: vi.fn().mockResolvedValue({
        key: "key1",
        messages: []
      }),
      previewSessions: vi.fn()
    });

    await expect(
      logic.getSession({
        key: "key1",
        limit: 100
      })
    ).resolves.toEqual({
      key: "key1",
      messages: []
    });
  });

  it("delegates previewSessions to the adapter", async () => {
    const logic = new DefaultSessionsLogic({
      listSessions: vi.fn(),
      getSession: vi.fn(),
      previewSessions: vi.fn().mockResolvedValue({
        items: []
      })
    });

    await expect(
      logic.previewSessions({
        keys: ["key1", "key2"],
        limit: 5
      })
    ).resolves.toEqual({
      items: []
    });
  });
});
