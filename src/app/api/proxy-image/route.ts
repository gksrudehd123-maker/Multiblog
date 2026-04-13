import { NextResponse } from "next/server";

// 네이버 이미지는 referer 기반 hotlink 차단이 있어서 서버에서 프록시
// GET /api/proxy-image?url=<encoded>
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "url 파라미터 필요" }, { status: 400 });
  }

  // 허용 도메인 화이트리스트 (SSRF 방지)
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  const allowed = /(^|\.)(pstatic\.net|naver\.net|naver\.com)$/i;
  if (!allowed.test(parsed.hostname)) {
    return NextResponse.json(
      { error: "허용되지 않은 도메인" },
      { status: 403 },
    );
  }

  const res = await fetch(target, {
    headers: {
      Referer: "https://blog.naver.com/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `upstream ${res.status}` },
      { status: res.status },
    );
  }

  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": res.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
