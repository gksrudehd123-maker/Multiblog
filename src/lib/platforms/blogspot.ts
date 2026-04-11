// Blogspot (Blogger v3 API) 어댑터
// 인증: OAuth 2.0 — 구글 클라우드 콘솔에서 OAuth 클라이언트 생성 후 refresh token 획득
// docs: https://developers.google.com/blogger/docs/3.0/using

export type BlogspotConfig = {
  blogId: string;
  accessToken: string; // OAuth access token (만료 시 refresh 필요)
};

export type BlogspotCreatePost = {
  title: string;
  content: string; // HTML
  labels?: string[];
  isDraft?: boolean;
};

export type BlogspotCreatedPost = {
  id: string;
  url: string;
  status: string;
};

export async function createPost(
  config: BlogspotConfig,
  input: BlogspotCreatePost,
): Promise<BlogspotCreatedPost> {
  const endpoint = `https://www.googleapis.com/blogger/v3/blogs/${config.blogId}/posts${
    input.isDraft ? "?isDraft=true" : ""
  }`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind: "blogger#post",
      title: input.title,
      content: input.content,
      labels: input.labels,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blogspot post create failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    id: string;
    url: string;
    status: string;
  };
  return data;
}

// TODO: refreshAccessToken() — refresh token으로 access token 갱신
// TODO: 이미지 업로드 — Blogger API는 이미지 업로드 엔드포인트가 없어서
//       Google Photos API 또는 외부 호스팅 후 <img src>로 삽입해야 함
