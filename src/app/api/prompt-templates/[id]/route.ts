import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = (await req.json()) as {
    name?: string;
    description?: string;
    body?: string;
  };
  const updated = await prisma.promptTemplate.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined
        ? { description: body.description.trim() || null }
        : {}),
      ...(body.body !== undefined ? { body: body.body } : {}),
    },
  });
  return NextResponse.json({ ok: true, data: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  await prisma.promptTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
