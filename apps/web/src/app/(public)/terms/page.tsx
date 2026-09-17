import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Cognix Terms of Service.",
};

const updated = "September 17, 2026";

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {updated}
        </p>
        <div className="prose prose-sm dark:prose-invert mt-8 max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-semibold">1. The service</h2>
            <p>
              Cognix provides an AI-powered workspace for chats, agents,
              workflows, and related tools (the “Service”). By creating an
              account or using the Service, you agree to these Terms.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">2. Your account</h2>
            <p>
              You must provide accurate registration information and keep your
              credentials confidential. You are responsible for all activity
              under your account. You must be able to form a binding contract in
              your jurisdiction to use the Service.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">3. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>violate any law or third-party rights;</li>
              <li>
                abuse, disrupt, or attempt to gain unauthorized access to the
                Service or its infrastructure;
              </li>
              <li>
                use the Service to generate spam, malware, or unlawful,
                harassing, or infringing content;
              </li>
              <li>
                circumvent usage limits, access controls, or security features.
              </li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold">4. Your content</h2>
            <p>
              You retain ownership of content you submit. You grant Cognix a
              limited license to host, process, and display it solely to operate
              the Service. AI-generated outputs may be inaccurate; review
              important content before relying on it.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">5. Third-party services</h2>
            <p>
              The Service integrates third-party providers (such as AI model
              providers and OAuth login providers). Their terms and privacy
              policies apply to your use of those integrations.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">6. Termination</h2>
            <p>
              You may delete your account at any time. We may suspend or
              terminate accounts that violate these Terms. Provisions that by
              nature should survive (ownership, liability limits) do survive.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">
              7. Disclaimers and liability
            </h2>
            <p>
              The Service is provided “as is” without warranties of any kind. To
              the maximum extent permitted by law, Cognix is not liable for
              indirect, incidental, or consequential damages arising from your
              use of the Service.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">8. Changes</h2>
            <p>
              We may update these Terms; material changes will be posted here
              with a new “Last updated” date. Continued use after changes take
              effect constitutes acceptance.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
