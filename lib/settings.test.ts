import { describe, expect, it } from "vitest";
import { notificationPreferenceSchema } from "./notification-preferences";
import { describeDevice } from "./settings";

describe("describeDevice", () => {
  it("labels common browsers and operating systems", () => {
    expect(
      describeDevice(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      ),
    ).toBe("Chrome on Windows");
    expect(
      describeDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari on iOS");
    expect(
      describeDevice(
        "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
      ),
    ).toBe("Firefox on Linux");
  });

  it("falls back for missing or unknown agents", () => {
    expect(describeDevice(null)).toBe("Unknown device");
    expect(describeDevice("  ")).toBe("Unknown device");
    expect(describeDevice("curl/8.0")).toBe("Unknown browser on Unknown OS");
  });
});

describe("notificationPreferenceSchema", () => {
  it("accepts a full toggle set", () => {
    expect(
      notificationPreferenceSchema.safeParse({
        productUpdates: true,
        billingAlerts: false,
        researchDigests: true,
      }).success,
    ).toBe(true);
  });

  it("rejects non-boolean toggles", () => {
    const parsed = notificationPreferenceSchema.safeParse({
      productUpdates: "yes",
      billingAlerts: true,
      researchDigests: false,
    });
    expect(parsed.success).toBe(false);
  });
});
