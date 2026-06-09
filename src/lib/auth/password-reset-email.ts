import logger from "logger";

type PasswordResetEmail = {
  to: string;
  url: string;
};

const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendPasswordResetEmail({ to, url }: PasswordResetEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PASSWORD_RESET_EMAIL_FROM;

  if (apiKey && from) {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: "Reset your Cognix password",
        text: `Use this link to reset your Cognix password: ${url}`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Failed to send password reset email", error);
    }

    return;
  }

  if (process.env.NODE_ENV !== "production") {
    logger.info(`Password reset link for ${to}: ${url}`);
    return;
  }

  logger.warn(
    "Password reset email requested, but RESEND_API_KEY and PASSWORD_RESET_EMAIL_FROM are not configured.",
  );
}
