import { describe, expect, it } from "vitest";
import { withDbRetry } from "./prisma";

describe("withDbRetry", () => {
  it("returns the first success without retrying", async () => {
    let calls = 0;
    const result = await withDbRetry(async () => {
      calls += 1;
      return "ok";
    });
    expect(result).toBe("ok");
    expect(calls).toBe(1);
  });

  it("retries transient failures then resolves", async () => {
    let calls = 0;
    const result = await withDbRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error(`wake-up failure ${calls}`);
        return "recovered";
      },
      { baseDelayMs: 1 },
    );
    expect(result).toBe("recovered");
    expect(calls).toBe(3);
  });

  it("throws the last error after exhausting attempts", async () => {
    let calls = 0;
    await expect(
      withDbRetry(
        async () => {
          calls += 1;
          throw new Error(`down ${calls}`);
        },
        { attempts: 2, baseDelayMs: 1 },
      ),
    ).rejects.toThrow("down 2");
    expect(calls).toBe(2);
  });
});
