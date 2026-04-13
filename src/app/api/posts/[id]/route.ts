import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const post = await prisma.sourcePost.findUnique({
    where: { id: params.id },
    include: {
      rewrites: { orderBy: { createdAt: "desc" } },
      publishes: {
        orderBy: { createdAt: "desc" },
        include: {
          platformConfig: { select: { id: true, name: true, siteUrl: true } },
        },
      },
    },
  });
  if (!post) {
    return NextResponse.json(
      { ok: false, error: "not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, data: post });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  await prisma.sourcePost.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
