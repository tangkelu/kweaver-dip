import { describe, expect, it } from "vitest";

import { asMessage, readOptionalString, resolveBknBackendUrl } from "./env";

describe("env helpers", () => {
  it("converts non-Error values to strings", () => {
    expect(asMessage("boom")).toBe("boom");
    expect(asMessage(503)).toBe("503");
  });

  it("returns undefined for missing optional strings", () => {
    expect(readOptionalString(undefined)).toBeUndefined();
  });

  it("normalizes the BKN backend URL", () => {
    expect(resolveBknBackendUrl(undefined)).toBe("http://127.0.0.1:13014/");
    expect(resolveBknBackendUrl("https://example.com/api?x=1")).toBe(
      "https://example.com/"
    );
  });
});
