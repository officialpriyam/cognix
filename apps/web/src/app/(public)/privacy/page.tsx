import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Cognix Privacy Policy.",
};

const updated = "September 17, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Cognix
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {updated}
        </p>
        <div className="prose prose-sm dark:prose-invert mt-8 max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-semibold">1. Data we collect</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Account data:</strong> name, email, and password hash
                (for email accounts) or OAuth profile data you authorize.
              </li>
              <li>
                <strong>Content you provide:</strong> chats, prompts, agents,
                workflows, files, and settings needed to operate your workspace.
              </li>
              <li>
                <strong>Usage data:</strong> basic operational logs (e.g.
                errors, performance) to keep the Service reliable.
              </li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold">2. How we use it</h2>
            <p>
              To provide and improve the Service: authentication, storing your
              workspace, generating AI responses via the model providers you
              configure, preventing abuse, and communicating about your account.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">3. Sharing</h2>
            <p>
              We share data only as needed to run the Service: with AI model
              providers to generate responses, OAuth providers for sign-in, and
              infrastructure providers (hosting, database, email). We do not
              sell your personal data.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">4. Storage and security</h2>
            <p>
              Data is stored on secured infrastructure with access controls. No
              method is perfectly secure, but we apply reasonable safeguards and
              monitor for issues.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">5. Your rights</h2>
            <p>
              You may access, correct, export, or delete your data, including by
              deleting your account, which removes your workspace data subject
              to legal retention duties. Contact us from the account email to
              exercise these rights.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">6. Changes</h2>
            <p>
              Material changes will be posted here with a new “Last updated”
              date. Continued use after changes take effect constitutes
              acceptance.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
