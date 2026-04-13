import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const posts = await prisma.sourcePost.findMany({
    orderBy: { capturedAt: "desc" },
    take: 100,
    include: {
      publishes: {
        select: { id: true, platform: true, status: true, publishedUrl: true },
      },
    },
  });
  return NextResponse.json({ ok: true, data: posts });
}
