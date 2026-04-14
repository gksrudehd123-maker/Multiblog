import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rewritePostWithModel, DEFAULT_MODEL_ID } from "@/lib/ai";
import { processImageForPlatform } from "@/lib/image-processor";
import { uploadToImgbb } from "@/lib/imgbb";
import {
  createPost as wpCreatePost,
  uploadMedia as wpUploadMedia,
} from "@/lib/platforms/wordpress";
import {
  createPost as bsCreatePost,
  refreshAccessToken as bsRefreshToken,
} from "@/lib/platforms/blogspot";
export const maxDuration = 300;

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const {
    platformConfigId,
    status = "draft",
    promptTemplateId,
    modelId,
  } = body as {
    platformConfigId: string;
    status?: "draft" | "publish";
    promptTemplateId?: string;
    modelId?: string;
  };
  const effectiveModelId = modelId || DEFAULT_MODEL_ID;

  if (!platformConfigId) {
    return NextResponse.json(
      { ok: false, error: "platformConfigId 필수" },
      { status: 400 },
    );
  }

  const source = await prisma.sourcePost.findUnique({
    where: { id: params.id },
  });
  if (!source) {
    return NextResponse.json(
      { ok: false, error: "원본 포스트를 찾을 수 없음" },
      { status: 404 },
    );
  }

  const config = await prisma.platformConfig.findUnique({
    where: { id: platformConfigId },
  });
  if (!config || !config.isActive) {
    return NextResponse.json(
      { ok: false, error: "플랫폼 설정이 없거나 비활성화됨" },
      { status: 400 },
    );
  }

  // PublishTarget 생성 (PROCESSING 상태)
  const target = await prisma.publishTarget.create({
    data: {
      sourcePostId: source.id,
      platformConfigId: config.id,
      platform: config.platform,
      status: "PROCESSING",
      attempts: 1,
    },
  });

  try {
    // 1. Claude 리라이트 (프롬프트 우선순위: body.promptTemplateId > config.extra.promptTemplate > 기본)
    let customPrompt: string | undefined;
    if (promptTemplateId) {
      const tpl = await prisma.promptTemplate.findUnique({
        where: { id: promptTemplateId },
      });
      customPrompt = tpl?.body;
    }
    if (!customPrompt) {
      const configExtra = (config.extra || {}) as { promptTemplate?: string };
      customPrompt = configExtra.promptTemplate;
    }

    // 참고용 모드는 이미지 사용 안 함 + 자동 draft 강제 (수동 검토 필수)
    const isReference = source.mode === "REFERENCE";
    const effectiveStatus = isReference ? "draft" : status;

    const { output: rewritten } = await rewritePostWithModel(
      {
        title: source.title,
        contentText: source.contentText || source.contentHtml,
        platform: config.platform as "WORDPRESS" | "BLOGSPOT" | "TISTORY",
        imageUrls: isReference ? [] : source.images,
        customPrompt,
        mode: isReference ? "REFERENCE" : "OWN",
      },
      effectiveModelId,
    );

    // 2. 이미지 가공 + 플랫폼별 업로드
    const processedImages: {
      original: string;
      uploadedUrl?: string;
      uploadedId?: number | string;
      alt?: string;
    }[] = [];
    let finalHtml = rewritten.contentHtml;

    if (isReference) {
      // 참고용 모드: 이미지 처리 스킵 (원본 이미지 저작권 사용 불가)
    } else if (config.platform === "WORDPRESS") {
      for (let idx = 0; idx < source.images.length; idx += 1) {
        const imgUrl = source.images[idx];
        try {
          const { buffer, mimeType } = await processImageForPlatform(
            imgUrl,
            "WORDPRESS",
          );
          const ext = mimeType === "image/webp" ? "webp" : "jpg";
          const filename = `img-${Date.now()}-${idx}.${ext}`;
          const uploaded = await wpUploadMedia(
            {
              siteUrl: config.siteUrl,
              username: config.username || "",
              applicationPassword: config.apiKey || "",
            },
            buffer,
            filename,
            mimeType,
          );
          processedImages.push({
            original: imgUrl,
            uploadedUrl: uploaded.source_url,
            uploadedId: uploaded.id,
          });
          finalHtml = finalHtml.replaceAll(imgUrl, uploaded.source_url);
        } catch (e) {
          processedImages.push({
            original: imgUrl,
            alt: `이미지 처리 실패: ${e instanceof Error ? e.message : String(e)}`,
          });
        }
      }
    } else if (config.platform === "BLOGSPOT") {
      // Blogspot은 Blogger API에 이미지 업로드 엔드포인트가 없음 → imgbb에 업로드 후 URL 삽입
      // WP와 다른 변형 프리셋 적용해서 구글 이미지 중복 탐지 회피
      for (let i = 0; i < source.images.length; i += 1) {
        const imgUrl = source.images[i];
        try {
          const { buffer } = await processImageForPlatform(imgUrl, "BLOGSPOT");
          const uploaded = await uploadToImgbb(
            buffer,
            `blogspot-${Date.now()}-${i}`,
          );
          processedImages.push({
            original: imgUrl,
            uploadedUrl: uploaded.url,
          });
          finalHtml = finalHtml.replaceAll(imgUrl, uploaded.url);
        } catch (e) {
          processedImages.push({
            original: imgUrl,
            alt: `이미지 처리 실패: ${e instanceof Error ? e.message : String(e)}`,
          });
        }
      }
    }

    // 3. RewrittenVersion 저장
    const rv = await prisma.rewrittenVersion.create({
      data: {
        sourcePostId: source.id,
        platform: config.platform,
        title: rewritten.title,
        contentHtml: finalHtml,
        metaDescription: rewritten.metaDescription,
        slug: rewritten.slug,
        images: processedImages,
        model: effectiveModelId,
      },
    });

    // 4. 플랫폼 업로드
    let publishedUrl: string | null = null;
    let publishedId: string | null = null;

    if (config.platform === "WORDPRESS") {
      const created = await wpCreatePost(
        {
          siteUrl: config.siteUrl,
          username: config.username || "",
          applicationPassword: config.apiKey || "",
        },
        {
          title: rewritten.title,
          content: finalHtml,
          slug: rewritten.slug,
          excerpt: rewritten.metaDescription,
          status: effectiveStatus,
        },
      );
      publishedUrl = created.link;
      publishedId = String(created.id);
    } else if (config.platform === "BLOGSPOT") {
      const extra = (config.extra || {}) as {
        blogId?: string;
        expiryDate?: number;
        labels?: string;
      };
      if (!extra.blogId) {
        throw new Error("Blogspot: extra.blogId 설정이 필요합니다");
      }

      // accessToken 만료 확인 → 필요 시 refresh
      let accessToken = config.apiKey || "";
      const now = Date.now();
      const expired = !extra.expiryDate || extra.expiryDate - 60000 < now;
      if (expired) {
        if (!config.refreshToken) {
          throw new Error("Blogspot: refreshToken이 없어 갱신 불가");
        }
        const refreshed = await bsRefreshToken(config.refreshToken);
        accessToken = refreshed.accessToken;
        await prisma.platformConfig.update({
          where: { id: config.id },
          data: {
            apiKey: refreshed.accessToken,
            extra: { ...extra, expiryDate: refreshed.expiryDate },
          },
        });
      }

      const labels = extra.labels
        ? extra.labels
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      const created = await bsCreatePost(
        { blogId: extra.blogId, accessToken },
        {
          title: rewritten.title,
          content: finalHtml,
          labels,
          isDraft: effectiveStatus === "draft",
        },
      );
      publishedUrl = created.url;
      publishedId = created.id;
    } else {
      throw new Error(`${config.platform} 플랫폼은 아직 구현되지 않았습니다`);
    }

    // 5. 성공 처리
    const updated = await prisma.publishTarget.update({
      where: { id: target.id },
      data: {
        status: "SUCCESS",
        publishedUrl,
        publishedId,
        publishedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      data: { target: updated, rewrittenVersionId: rv.id },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.publishTarget.update({
      where: { id: target.id },
      data: { status: "FAILED", errorMessage: message },
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
