import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const configs = await prisma.platformConfig.findMany({
    orderBy: { createdAt: "desc" },
  });
  // apiKey는 마지막 4자리만 노출
  const masked = configs.map((c) => ({
    ...c,
    apiKey: c.apiKey ? `••••${c.apiKey.slice(-4)}` : null,
    refreshToken: c.refreshToken ? "••••" : null,
  }));
  return NextResponse.json({ ok: true, data: masked });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { platform, name, siteUrl, username, apiKey, refreshToken, extra } =
    body as {
      platform: "WORDPRESS" | "BLOGSPOT" | "TISTORY";
      name: string;
      siteUrl: string;
      username?: string;
      apiKey?: string;
      refreshToken?: string;
      extra?: Record<string, unknown>;
    };

  if (!platform || !name?.trim() || !siteUrl?.trim()) {
    return NextResponse.json(
      { ok: false, error: "platform, name, siteUrl 필수" },
      { status: 400 },
    );
  }

  const config = await prisma.platformConfig.create({
    data: {
      platform,
      name: name.trim(),
      siteUrl: siteUrl.trim(),
      username: username?.trim() || null,
      apiKey: apiKey?.trim() || null,
      refreshToken: refreshToken?.trim() || null,
      extra: extra ? JSON.parse(JSON.stringify(extra)) : undefined,
    },
  });

  return NextResponse.json({ ok: true, data: config });
}
