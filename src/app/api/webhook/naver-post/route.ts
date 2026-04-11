import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 크롬 확장프로그램이 네이버 블로그 포스팅을 캡처해서 전송하는 엔드포인트
// Authorization: Bearer <WEBHOOK_SECRET>

type WebhookPayload = {
  naverUrl: string;
  naverBlogId: string;
  naverLogNo: string;
  title: string;
  contentHtml: string;
  contentText?: string;
  images?: string[];
  tags?: string[];
};

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.WEBHOOK_SECRET}`;
  if (!process.env.WEBHOOK_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as WebhookPayload;

    if (!body.naverUrl || !body.title || !body.contentHtml) {
      return NextResponse.json(
        { error: "naverUrl, title, contentHtml은 필수입니다" },
        { status: 400 },
      );
    }

    const post = await prisma.sourcePost.upsert({
      where: { naverUrl: body.naverUrl },
      create: {
        naverUrl: body.naverUrl,
        naverBlogId: body.naverBlogId,
        naverLogNo: body.naverLogNo,
        title: body.title,
        contentHtml: body.contentHtml,
        contentText: body.contentText || null,
        images: body.images || [],
        tags: body.tags || [],
      },
      update: {
        title: body.title,
        contentHtml: body.contentHtml,
        contentText: body.contentText || null,
        images: body.images || [],
        tags: body.tags || [],
      },
    });

    return NextResponse.json({ ok: true, id: post.id });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Internal error", detail: String(err) },
      { status: 500 },
    );
  }
}
