import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    // FK: PublishTarget이 남아있으면 삭제 실패하므로 먼저 제거
    await prisma.publishTarget.deleteMany({
      where: { platformConfigId: params.id },
    });
    await prisma.platformConfig.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PlatformConfig delete error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const { name, siteUrl, username, apiKey, refreshToken, extra, isActive } =
    body as {
      name?: string;
      siteUrl?: string;
      username?: string;
      apiKey?: string;
      refreshToken?: string;
      extra?: Record<string, unknown>;
      isActive?: boolean;
    };

  const config = await prisma.platformConfig.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(siteUrl !== undefined ? { siteUrl: siteUrl.trim() } : {}),
      ...(username !== undefined ? { username: username.trim() || null } : {}),
      ...(apiKey !== undefined ? { apiKey: apiKey.trim() || null } : {}),
      ...(refreshToken !== undefined
        ? { refreshToken: refreshToken.trim() || null }
        : {}),
      ...(extra !== undefined
        ? { extra: JSON.parse(JSON.stringify(extra)) }
        : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  return NextResponse.json({ ok: true, data: config });
}
