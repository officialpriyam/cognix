"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import { OrgAiPolicyTab } from "./org-ai-policy-tab";
import { OrgInviteTab } from "./org-invite-tab";
import { OrgMembersTab } from "./org-members-tab";
import { OrgSettingsTab } from "./org-settings-tab";
import { OrgUsageTab } from "./org-usage-tab";
import type { OrgTabId } from "./org-shared";

export function OrgManagePage({
  organizationId,
  initialName,
  slug,
  isManager,
}: {
  organizationId: string;
  initialName: string;
  slug: string | null;
  isManager: boolean;
}) {
  const [tab, setTab] = useState<OrgTabId>("members");
  const [name, setName] = useState(initialName);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
        {slug ? (
          <p className="mt-0.5 text-sm text-muted-foreground">/{slug}</p>
        ) : null}
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as OrgTabId)}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invite" disabled={!isManager}>
            Invite
          </TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="ai-policy">AI policy</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="mt-6">
          <OrgMembersTab organizationId={organizationId} />
        </TabsContent>
        <TabsContent value="invite" className="mt-6">
          <OrgInviteTab organizationId={organizationId} />
        </TabsContent>
        <TabsContent value="usage" className="mt-6">
          <OrgUsageTab organizationId={organizationId} />
        </TabsContent>
        <TabsContent value="ai-policy" className="mt-6">
          <OrgAiPolicyTab
            organizationId={organizationId}
            isManager={isManager}
          />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <OrgSettingsTab
            organizationId={organizationId}
            initialName={name}
            slug={slug}
            isManager={isManager}
            onRenamed={setName}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
