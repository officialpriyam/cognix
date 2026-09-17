import z from "zod";

const priceField = z.number().int().min(0).max(1_000_000_000_000).nullable();

export const aiPolicyPutSchema = z.object({
  automaticRoutingEnabled: z.boolean().optional(),
  browserAutomationEnabled: z.boolean().optional(),
  maxInputPriceMicrosPerMillion: priceField.optional(),
  maxOutputPriceMicrosPerMillion: priceField.optional(),
  maxEstimatedRequestMicros: priceField.optional(),
  allowedRegions: z
    .array(z.string().min(1).max(32))
    .max(20)
    .nullable()
    .optional(),
  deployments: z
    .array(
      z.object({
        deploymentId: z.string().uuid(),
        enabled: z.boolean(),
        inOverride: priceField.optional(),
        outOverride: priceField.optional(),
      }),
    )
    .max(200)
    .optional(),
  members: z
    .array(
      z.object({
        memberId: z.string(),
        monthlyCapMicros: priceField.optional(),
        hardStop: z.boolean().optional(),
      }),
    )
    .max(500)
    .optional(),
});

export type AiPolicyPut = z.infer<typeof aiPolicyPutSchema>;
