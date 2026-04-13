import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID 환경 변수 필요" },
      { status: 500 },
    );
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/auth/google/callback`;
  const scope = "https://www.googleapis.com/auth/blogger";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.redirect(url);
}
