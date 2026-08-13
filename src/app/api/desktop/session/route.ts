import { NextResponse } from "next/server";
import { auth } from "auth/server";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 400 });
    }

    const session = await auth.api.getSession({
      headers: new Headers({
        cookie: `better-auth.session_token=${token}`,
      }),
    });

    if (!session?.session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        role: session.user.role,
      },
      session: {
        token: session.session.token,
      },
    });
  } catch {
    return NextResponse.json({ error: "Auth failed" }, { status: 401 });
  }
}
