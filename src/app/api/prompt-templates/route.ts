import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const list = await prisma.promptTemplate.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ ok: true, data: list });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name?: string;
    description?: string;
    body?: string;
  };
  if (!body.name?.trim() || !body.body?.trim()) {
    return NextResponse.json(
      { ok: false, error: "name, body 필수" },
      { status: 400 },
    );
  }
  const created = await prisma.promptTemplate.create({
    data: {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      body: body.body,
    },
  });
  return NextResponse.json({ ok: true, data: created });
}
