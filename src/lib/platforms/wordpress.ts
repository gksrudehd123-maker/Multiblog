// WordPress REST API 어댑터
// 인증: Application Password (https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/)

export type WordPressConfig = {
  siteUrl: string; // https://example.com
  username: string;
  applicationPassword: string; // Application Password
};

type UploadedMedia = {
  id: number;
  source_url: string;
};

function authHeader(config: WordPressConfig): string {
  const token = Buffer.from(
    `${config.username}:${config.applicationPassword}`,
  ).toString("base64");
  return `Basic ${token}`;
}

export async function uploadMedia(
  config: WordPressConfig,
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<UploadedMedia> {
  const res = await fetch(`${config.siteUrl}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: {
      Authorization: authHeader(config),
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
    body: new Uint8Array(fileBuffer),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPress media upload failed: ${res.status} ${text}`);
  }

  return (await res.json()) as UploadedMedia;
}

export type CreatePostInput = {
  title: string;
  content: string; // HTML
  slug?: string;
  status?: "draft" | "publish";
  excerpt?: string;
  featuredMediaId?: number;
  categories?: number[];
  tags?: number[];
};

export type CreatedPost = {
  id: number;
  link: string;
  status: string;
};

export async function createPost(
  config: WordPressConfig,
  input: CreatePostInput,
): Promise<CreatedPost> {
  const res = await fetch(`${config.siteUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: authHeader(config),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: input.title,
      content: input.content,
      slug: input.slug,
      status: input.status ?? "draft",
      excerpt: input.excerpt,
      featured_media: input.featuredMediaId,
      categories: input.categories,
      tags: input.tags,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPress post create failed: ${res.status} ${text}`);
  }

  return (await res.json()) as CreatedPost;
}
