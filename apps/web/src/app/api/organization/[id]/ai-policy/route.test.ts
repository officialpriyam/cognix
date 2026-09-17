import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { aiPolicyPutSchema } = await import("./validations");

describe("aiPolicyPutSchema", () => {
  it("accepts a full policy payload", () => {
    const parsed = aiPolicyPutSchema.safeParse({
      automaticRoutingEnabled: true,
      browserAutomationEnabled: false,
      maxInputPriceMicrosPerMillion: 2000000,
      maxOutputPriceMicrosPerMillion: null,
      maxEstimatedRequestMicros: null,
      allowedRegions: ["EU"],
      deployments: [
        {
          deploymentId: "123e4567-e89b-42d3-a456-426614174000",
          enabled: true,
          inOverride: 500000,
          outOverride: null,
        },
      ],
      members: [
        { memberId: "member-1", monthlyCapMicros: null, hardStop: true },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts an empty (no-op) payload", () => {
    expect(aiPolicyPutSchema.safeParse({}).success).toBe(true);
  });

  it("rejects negative prices and malformed ids", () => {
    expect(
      aiPolicyPutSchema.safeParse({
        maxInputPriceMicrosPerMillion: -5,
      }).success,
    ).toBe(false);
    expect(
      aiPolicyPutSchema.safeParse({
        deployments: [{ deploymentId: "not-a-uuid", enabled: true }],
      }).success,
    ).toBe(false);
  });
});
