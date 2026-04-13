import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-6";

export type RewriteInput = {
  title: string;
  contentText: string;
  platform: "WORDPRESS" | "BLOGSPOT" | "TISTORY";
  imageUrls?: string[]; // 본문에 배치할 이미지 URL (순서 보존)
};

export type RewriteOutput = {
  title: string;
  contentHtml: string;
  metaDescription: string;
  slug: string;
};

const REWRITE_PROMPT = `너는 한국어 블로그 콘텐츠 리라이터다. 원본 네이버 블로그 글을 받아서 {PLATFORM} 플랫폼에 맞게 재작성한다.

규칙:
1. 핵심 내용과 사실은 절대 바꾸지 말 것
2. 표현/문장 구조/어휘는 최대한 바꾸어 SEO 중복 컨텐츠 페널티를 피할 것
3. 제목은 원본과 다르되 검색 의도는 동일하게 유지
4. 본문은 HTML로 출력 (h2, h3, p, ul, strong 적절히 사용)
5. 메타 설명 140자 이내, URL slug는 영문 lowercase + hyphen
6. 제공된 이미지 URL 목록이 있으면 본문 흐름에 맞게 <img src="..."> 태그로 삽입 (순서 보존, 모든 이미지 포함, 첫 이미지는 본문 최상단 또는 첫 단락 뒤에 배치)

JSON 형식으로만 응답 (다른 텍스트 금지):
{
  "title": "...",
  "contentHtml": "...",
  "metaDescription": "...",
  "slug": "..."
}
`;

export async function rewritePost(input: RewriteInput): Promise<RewriteOutput> {
  const systemPrompt = REWRITE_PROMPT.replace("{PLATFORM}", input.platform);

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content:
          `원본 제목: ${input.title}\n\n원본 본문:\n${input.contentText}` +
          (input.imageUrls && input.imageUrls.length
            ? `\n\n본문에 삽입할 이미지 URL (순서 보존, 전부 포함):\n${input.imageUrls.map((u, i) => `${i + 1}. ${u}`).join("\n")}`
            : ""),
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude 응답에 텍스트가 없습니다");
  }

  // JSON 블록 추출 — 코드펜스 제거 후 첫 { 부터 마지막 } 까지
  const cleaned = textBlock.text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "")
    .trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    console.error("[claude] 원본 응답:", textBlock.text.slice(0, 500));
    throw new Error(
      `Claude 응답에서 JSON을 추출할 수 없습니다 (stop_reason=${response.stop_reason})`,
    );
  }
  try {
    return JSON.parse(cleaned.slice(first, last + 1)) as RewriteOutput;
  } catch (e) {
    console.error(
      "[claude] JSON 파싱 실패. 원본 일부:",
      textBlock.text.slice(0, 1000),
    );
    throw new Error(
      `Claude JSON 파싱 실패: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
