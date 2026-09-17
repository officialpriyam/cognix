-- 0050: organization-level browser-automation switch. The AI-policy tab lets
-- org admins disable the browse (page-reader) tool for their members; chat
-- tool loading drops BrowsePage when this is false. Defaults true so
-- existing organizations keep current behaviour.

ALTER TABLE "organization_ai_policy" ADD COLUMN IF NOT EXISTS "browser_automation_enabled" boolean DEFAULT true NOT NULL;
