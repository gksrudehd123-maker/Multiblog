import { NextResponse } from "next/server";

type Blog = {
  id: string;
  name: string;
  url: string;
  description?: string;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  if (error) {
    return new NextResponse(`OAuth 에러: ${error}`, { status: 400 });
  }
  if (!code) {
    return new NextResponse("code 파라미터가 없습니다", { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new NextResponse("GOOGLE_CLIENT_ID/SECRET 필요", { status: 500 });
  }

  const redirectUri = `${origin}/api/auth/google/callback`;

  // 1) code → 토큰 교환
  const form = new URLSearchParams();
  form.set("code", code);
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);
  form.set("redirect_uri", redirectUri);
  form.set("grant_type", "authorization_code");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return new NextResponse(`토큰 교환 실패: ${text}`, { status: 500 });
  }
  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };
  if (!tokens.refresh_token) {
    return new NextResponse(
      "refresh_token이 발급되지 않았습니다. Google 계정 → 보안 → 서드파티 액세스에서 기존 권한을 제거한 후 다시 시도하세요.",
      { status: 400 },
    );
  }

  // 2) 내 블로그 목록 조회
  const blogsRes = await fetch(
    "https://www.googleapis.com/blogger/v3/users/self/blogs",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );
  if (!blogsRes.ok) {
    const text = await blogsRes.text();
    return new NextResponse(`블로그 목록 조회 실패: ${text}`, { status: 500 });
  }
  const { items = [] } = (await blogsRes.json()) as { items?: Blog[] };

  const expiryDate = Date.now() + tokens.expires_in * 1000;

  // 3) 블로그 선택 페이지 렌더 (hidden form으로 토큰 전달)
  const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><title>Blogspot 연결</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:40px;color:#0f172a}
.card{max-width:640px;margin:0 auto;background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
h1{margin:0 0 8px;font-size:22px}
p{color:#64748b;font-size:14px;margin:0 0 20px}
.blog{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px}
.blog:hover{background:#f1f5f9}
.blog label{flex:1;cursor:pointer}
.blog strong{display:block}
.blog small{color:#64748b}
.actions{margin-top:16px;display:flex;gap:8px;justify-content:flex-end}
input[type=text]{width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;margin-bottom:12px}
label.block{display:block;font-size:12px;color:#475569;margin-bottom:4px}
button{padding:10px 20px;border-radius:8px;border:none;font-weight:500;cursor:pointer;font-size:14px}
.primary{background:#2563eb;color:white}
.secondary{background:white;color:#0f172a;border:1px solid #cbd5e1}
.empty{text-align:center;padding:40px;color:#64748b}
</style></head><body>
<div class="card">
<h1>🔗 Blogspot 계정 연결</h1>
<p>Google 계정에 연결된 블로그를 선택하고 별칭을 입력하세요.</p>
${
  items.length === 0
    ? `<div class="empty">연결된 Blogger 블로그가 없습니다. <a href="https://www.blogger.com" target="_blank">Blogger</a>에서 블로그를 먼저 생성하세요.</div>`
    : `<form method="POST" action="/api/auth/google/complete">
<input type="hidden" name="accessToken" value="${escapeHtml(tokens.access_token)}">
<input type="hidden" name="refreshToken" value="${escapeHtml(tokens.refresh_token)}">
<input type="hidden" name="expiryDate" value="${expiryDate}">
<label class="block">별칭 *</label>
<input type="text" name="name" required placeholder="예: 내 블로거 메인" value="${items[0] ? escapeHtml(items[0].name) : ""}">
<label class="block">기본 라벨 (쉼표 구분, 선택)</label>
<input type="text" name="labels" placeholder="예: 일상, 리뷰">
<label class="block" style="margin-top:12px">블로그 선택</label>
${items
  .map(
    (b, i) => `
<div class="blog">
  <input type="radio" name="blogId" value="${escapeHtml(b.id)}" id="blog_${i}" ${i === 0 ? "checked" : ""} required>
  <input type="hidden" name="siteUrl_${escapeHtml(b.id)}" value="${escapeHtml(b.url)}">
  <label for="blog_${i}">
    <strong>${escapeHtml(b.name)}</strong>
    <small>${escapeHtml(b.url)}</small>
  </label>
</div>`,
  )
  .join("")}
<div class="actions">
  <a href="/platforms" class="secondary" style="text-decoration:none;display:inline-flex;align-items:center;padding:10px 20px;border-radius:8px;border:1px solid #cbd5e1;color:#0f172a;background:white">취소</a>
  <button type="submit" class="primary">저장</button>
</div>
</form>`
}
</div></body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
