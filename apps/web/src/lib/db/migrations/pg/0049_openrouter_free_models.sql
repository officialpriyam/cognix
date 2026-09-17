-- 0049: catalog additions — OpenRouter free-tier provider + new Gemini models.
--
-- 1. Adds model_deployment.is_free. A zero price alone means "not configured
--    yet" and is excluded from routing; is_free marks a $0 price intentional.
-- 2. Seeds models/model_deployment rows for the new static-catalog entries so
--    organization allowlists (which only surface DB deployments) include them.
-- 3. Enables the new deployments for all existing organizations. First-use
--    seeding covers new orgs; existing orgs are never auto-widened elsewhere,
--    but a catalog addition is only useful if it is actually selectable.
--    Admins can still disable models per org afterwards.
-- Newer Gemini generations without a published stable list price
-- (gemini-3.5-flash, gemini-3.7-flash, gemini-3.8-flash) get models rows only;
-- add a priced deployment row once rates are confirmed instead of guessing.

ALTER TABLE "model_deployment" ADD COLUMN IF NOT EXISTS "is_free" boolean DEFAULT false NOT NULL;

INSERT INTO "models" ("model", "developer", "country", "text", "vision", "description") VALUES
  ('gemini-2.5-flash-lite', 'Google', 'US', true, true, 'Fastest budget Gemini for high-volume multimodal tasks.'),
  ('gemini-2.5-pro', 'Google', 'US', true, true, 'Deep reasoning and coding flagship of the 2.5 family.'),
  ('gemini-3-flash-preview', 'Google', 'US', true, true, 'Preview frontier Flash balancing speed and intelligence.'),
  ('gemini-3.1-flash-lite', 'Google', 'US', true, true, 'Cost-efficient Flash-Lite for high-volume agentic tasks.'),
  ('gemini-3.5-flash', 'Google', 'US', true, true, 'Speed-optimized Flash for routine high-throughput workloads.'),
  ('gemini-3.5-flash-lite', 'Google', 'US', true, true, 'Cost-efficient 3.5 Flash-Lite for agentic search and parsing.'),
  ('gemini-3.6-flash', 'Google', 'US', true, true, 'Previous-generation Flash balancing speed and multimodal skill.'),
  ('gemini-3.7-flash', 'Google', 'US', true, true, 'Workhorse Flash for coding and multi-step agentic workflows.'),
  ('gemini-3.8-flash', 'Google', 'US', true, true, 'Most intelligent Flash for long-horizon engineering and agents.'),
  ('glm-5.2', 'Z.ai', 'CN', true, false, 'Z.ai GLM 5.2 free tier for general chat.'),
  ('north-mini-code', 'Cohere', 'CA', true, false, 'Cohere North Mini agentic coding model, free tier.'),
  ('dots-3-note', 'Dots Studio', NULL, true, true, 'Dots Studio note-taking preview model, free tier.'),
  ('gemma-4-26b', 'Google', 'US', true, true, 'Google Gemma 4 26B multimodal model, free tier.'),
  ('gemma-4-31b', 'Google', 'US', true, true, 'Google Gemma 4 31B multimodal model, free tier.'),
  ('ling-3-flash-fin', 'InclusionAI', NULL, true, false, 'InclusionAI Ling 3.0 Flash finance-tuned model, free tier.'),
  ('ling-3-flash-sante', 'InclusionAI', NULL, true, false, 'InclusionAI Ling 3.0 Flash model, free tier.'),
  ('ling-3-flash-vl', 'InclusionAI', NULL, true, true, 'InclusionAI Ling 3.0 Flash vision-language model, free tier.'),
  ('lfm-2.5-2.6b', 'Liquid AI', NULL, true, false, 'LiquidAI compact 2.6B model, free tier.'),
  ('nex-n2.5-mini', 'Nex AGI', NULL, true, true, 'Nex AGI compact multimodal model, free tier.'),
  ('nex-n2.5-pro', 'Nex AGI', NULL, true, true, 'Nex AGI pro multimodal model, free tier.'),
  ('nemotron-3-nano-omni', 'NVIDIA', 'US', true, true, 'NVIDIA compact omni-modal reasoning model, free tier.'),
  ('nemotron-3-super', 'NVIDIA', 'US', true, false, 'NVIDIA 120B MoE model, free tier.'),
  ('nemotron-3-ultra', 'NVIDIA', 'US', true, false, 'NVIDIA 550B MoE reasoning model, free tier.'),
  ('nemotron-3.5-lightning', 'NVIDIA', 'US', true, false, 'NVIDIA fast 1M-context model, free tier.'),
  ('nemotron-3.5-content-safety', 'NVIDIA', 'US', true, true, 'NVIDIA content-safety classifier model, free tier.'),
  ('free-router', 'OpenRouter', 'US', true, true, 'OpenRouter router across the free model pool.'),
  ('laguna-s-2.1', 'Poolside', NULL, true, false, 'Poolside Laguna coding model, free tier.'),
  ('laguna-xs-2.1', 'Poolside', NULL, true, false, 'Poolside compact coding model, free tier.'),
  ('inkling', 'Thinking Machines', 'US', true, true, 'Thinking Machines Inkling model, free tier.'),
  ('inkling-small', 'Thinking Machines', 'US', true, true, 'Thinking Machines compact model, free tier.')
ON CONFLICT ("model") DO NOTHING;

-- New Gemini deployments (published per-1M list prices, micros per million).
INSERT INTO "model_deployment" ("model_id", "provider", "provider_model_id", "data_retention", "input_price_micros_per_million", "output_price_micros_per_million", "context_tokens", "supports_tools", "supports_vision") VALUES
  ('gemini-2.5-flash-lite', 'google', 'gemini-2.5-flash-lite', 'standard', 100000, 400000, 1048576, true, true),
  ('gemini-2.5-pro', 'google', 'gemini-2.5-pro', 'standard', 1250000, 10000000, 1048576, true, true),
  ('gemini-3-flash-preview', 'google', 'gemini-3-flash-preview', 'standard', 500000, 3000000, 1048576, true, true),
  ('gemini-3.1-flash-lite', 'google', 'gemini-3.1-flash-lite', 'standard', 250000, 1500000, 1048576, true, true),
  ('gemini-3.5-flash-lite', 'google', 'gemini-3.5-flash-lite', 'standard', 300000, 2500000, 1048576, true, true),
  ('gemini-3.6-flash', 'google', 'gemini-3.6-flash', 'standard', 1500000, 7500000, 1048576, true, true)
ON CONFLICT ("provider", "provider_model_id") DO NOTHING;

-- OpenRouter free-tier deployments. Prices are intentionally $0 (is_free);
-- free prompts may be used for upstream training, served under standard terms.
-- provider_model_id is the static-catalog key (what the UI sends), not the
-- upstream slug: chat resolution looks up staticModels[provider][key], and the
-- full OpenRouter slug already lives in the models.ts instance.
INSERT INTO "model_deployment" ("model_id", "provider", "provider_model_id", "data_retention", "evidence_url", "input_price_micros_per_million", "output_price_micros_per_million", "context_tokens", "supports_tools", "supports_vision", "is_free") VALUES
  ('glm-5.2', 'openrouter', 'glm-5.2', 'standard', 'https://openrouter.ai/docs', 0, 0, 32768, false, false, true),
  ('north-mini-code', 'openrouter', 'north-mini-code', 'standard', 'https://openrouter.ai/docs', 0, 0, 256000, true, false, true),
  ('dots-3-note', 'openrouter', 'dots-3-note', 'standard', 'https://openrouter.ai/docs', 0, 0, 512000, true, true, true),
  ('gemma-4-26b', 'openrouter', 'gemma-4-26b', 'standard', 'https://openrouter.ai/docs', 0, 0, 262144, true, true, true),
  ('gemma-4-31b', 'openrouter', 'gemma-4-31b', 'standard', 'https://openrouter.ai/docs', 0, 0, 262144, true, true, true),
  ('ling-3-flash-fin', 'openrouter', 'ling-3-flash-fin', 'standard', 'https://openrouter.ai/docs', 0, 0, 262144, true, false, true),
  ('ling-3-flash-sante', 'openrouter', 'ling-3-flash-sante', 'standard', 'https://openrouter.ai/docs', 0, 0, 262144, true, false, true),
  ('ling-3-flash-vl', 'openrouter', 'ling-3-flash-vl', 'standard', 'https://openrouter.ai/docs', 0, 0, 262144, true, true, true),
  ('lfm-2.5-2.6b', 'openrouter', 'lfm-2.5-2.6b', 'standard', 'https://openrouter.ai/docs', 0, 0, 65536, true, false, true),
  ('nex-n2.5-mini', 'openrouter', 'nex-n2.5-mini', 'standard', 'https://openrouter.ai/docs', 0, 0, 262144, true, true, true),
  ('nex-n2.5-pro', 'openrouter', 'nex-n2.5-pro', 'standard', 'https://openrouter.ai/docs', 0, 0, 262144, true, true, true),
  ('nemotron-3-nano-omni', 'openrouter', 'nemotron-3-nano-omni', 'standard', 'https://openrouter.ai/docs', 0, 0, 256000, true, true, true),
  ('nemotron-3-super', 'openrouter', 'nemotron-3-super', 'standard', 'https://openrouter.ai/docs', 0, 0, 262144, true, false, true),
  ('nemotron-3-ultra', 'openrouter', 'nemotron-3-ultra', 'standard', 'https://openrouter.ai/docs', 0, 0, 1000000, true, false, true),
  ('nemotron-3.5-lightning', 'openrouter', 'nemotron-3.5-lightning', 'standard', 'https://openrouter.ai/docs', 0, 0, 1000000, true, false, true),
  ('nemotron-3.5-content-safety', 'openrouter', 'nemotron-3.5-content-safety', 'standard', 'https://openrouter.ai/docs', 0, 0, 128000, false, true, true),
  ('free-router', 'openrouter', 'free-router', 'standard', 'https://openrouter.ai/docs', 0, 0, 200000, true, true, true),
  ('laguna-s-2.1', 'openrouter', 'laguna-s-2.1', 'standard', 'https://openrouter.ai/docs', 0, 0, 262144, true, false, true),
  ('laguna-xs-2.1', 'openrouter', 'laguna-xs-2.1', 'standard', 'https://openrouter.ai/docs', 0, 0, 262144, true, false, true),
  ('inkling', 'openrouter', 'inkling', 'standard', 'https://openrouter.ai/docs', 0, 0, 1048576, true, true, true),
  ('inkling-small', 'openrouter', 'inkling-small', 'standard', 'https://openrouter.ai/docs', 0, 0, 1048576, true, true, true)
ON CONFLICT ("provider", "provider_model_id") DO NOTHING;

-- Enable the new deployments for all existing organizations (new orgs pick
-- them up through first-use seeding).
INSERT INTO "organization_model_access" ("organization_id", "deployment_id", "enabled")
SELECT o."id", d."id", true
FROM "organization" o
CROSS JOIN "model_deployment" d
WHERE d."provider" = 'openrouter'
   OR (d."provider" = 'google' AND d."provider_model_id" IN ('gemini-2.5-flash-lite', 'gemini-2.5-pro', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'))
ON CONFLICT ("organization_id", "deployment_id") DO NOTHING;
