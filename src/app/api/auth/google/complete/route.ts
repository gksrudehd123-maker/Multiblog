import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  const blogId = String(form.get("blogId") || "").trim();
  const accessToken = String(form.get("accessToken") || "").trim();
  const refreshToken = String(form.get("refreshToken") || "").trim();
  const expiryDate = Number(form.get("expiryDate") || 0);
  const labels = String(form.get("labels") || "").trim();
  const siteUrl = String(form.get(`siteUrl_${blogId}`) || "").trim();

  if (!name || !blogId || !accessToken || !refreshToken) {
    return new NextResponse("필수 값 누락", { status: 400 });
  }

  await prisma.platformConfig.create({
    data: {
      platform: "BLOGSPOT",
      name,
      siteUrl: siteUrl || "https://blogger.com",
      apiKey: accessToken,
      refreshToken,
      extra: {
        blogId,
        expiryDate,
        ...(labels ? { labels } : {}),
      },
      isActive: true,
    },
  });

  return NextResponse.redirect(new URL("/platforms", req.url));
}
