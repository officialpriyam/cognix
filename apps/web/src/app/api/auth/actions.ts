"use server";

import { auth } from "@/lib/auth/server";
import { BasicUser, UserZodSchema } from "app-types/user";
import { userRepository } from "lib/db/repository";
import { ActionState } from "lib/action-utils";
import { headers } from "next/headers";

export async function existsByEmailAction(email: string) {
  const exists = await userRepository.existsByEmail(email);
  return exists;
}

type SignUpActionResponse = ActionState & {
  user?: BasicUser;
};

export async function signUpAction(data: {
  email: string;
  name: string;
  password: string;
  termsAccepted: boolean;
}): Promise<SignUpActionResponse> {
  if (!data.termsAccepted) {
    return {
      success: false,
      message: "You must accept the Terms of Service and Privacy Policy.",
    };
  }
  const { success, data: parsedData } = UserZodSchema.safeParse(data);
  if (!success) {
    return {
      success: false,
      message: "Invalid data",
    };
  }
  try {
    const { user } = await auth.api.signUpEmail({
      body: {
        email: parsedData.email,
        password: parsedData.password,
        name: parsedData.name,
      },
      headers: await headers(),
    });
    try {
      const current =
        (await userRepository.getPreferences(user.id)) ?? undefined;
      await userRepository.updatePreferences(user.id, {
        ...(typeof current === "object" && current !== null ? current : {}),
        termsAcceptedAt: new Date().toISOString(),
      });
    } catch {
      // Non-fatal: the account exists; acceptance was still enforced above.
    }
    return {
      user,
      success: true,
      message: "Successfully signed up",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to sign up",
    };
  }
}
