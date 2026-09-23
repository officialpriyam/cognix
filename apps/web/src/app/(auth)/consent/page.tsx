import { ConsentForm } from "@/components/auth/consent";

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{
    consent_code?: string;
    client_id?: string;
    scope?: string;
  }>;
}) {
  const { consent_code, client_id, scope } = await searchParams;

  return (
    <ConsentForm
      consentCode={consent_code}
      clientId={client_id}
      scope={scope}
    />
  );
}
