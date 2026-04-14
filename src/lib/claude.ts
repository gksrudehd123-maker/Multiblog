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
  customPrompt?: string; // 커스텀 시스템 프롬프트 ({PLATFORM} 치환 지원)
  mode?: "OWN" | "REFERENCE"; // REFERENCE: inspiration 기반 재작성(참고용)
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

// REFERENCE 모드: 남의 글을 참고 자료로 삼아 완전히 다른 글 작성
// - 저작권 이슈 회피: 원문 구조/문장을 따라가지 않음
// - SEO: 단순 리라이트가 아닌 본인 관점으로 재구성해야 중복 콘텐츠 페널티 회피
const REFERENCE_PROMPT = `너는 한국어 블로그 콘텐츠 작가다. 제공되는 원본 글은 **참고 자료**일 뿐 리라이트 대상이 아니다. 이 주제에 대해 {PLATFORM}에 올릴 새로운 글을 작성하라.

규칙:
1. 원본 글의 **주제/핵심 정보만** 참고하고 구조/문장/표현은 **완전히 다르게** 새로 작성
2. 원본의 단락 순서, 소제목 흐름을 따라가지 말 것 (다른 관점/순서로 재구성)
3. 원본에 없는 일반적인 배경 지식/맥락/실용 팁을 추가해 독자 가치 높일 것
4. 사실 관계는 정확히 유지 (왜곡/허위 금지)
5. 본문은 HTML (h2, h3, p, ul, strong 활용)
6. 제목은 원본과 전혀 다른 표현으로 (검색 의도만 유지)
7. 메타 설명 140자 이내, URL slug는 영문 lowercase + hyphen
8. 이미지 태그는 삽입하지 말 것 (참고용이므로 원본 이미지 사용 불가)

JSON 형식으로만 응답 (다른 텍스트 금지):
{
  "title": "...",
  "contentHtml": "...",
  "metaDescription": "...",
  "slug": "..."
}
`;

export const DEFAULT_REWRITE_PROMPT = REWRITE_PROMPT;
export const DEFAULT_REFERENCE_PROMPT = REFERENCE_PROMPT;

export async function rewritePost(input: RewriteInput): Promise<RewriteOutput> {
  const defaultPrompt =
    input.mode === "REFERENCE" ? REFERENCE_PROMPT : REWRITE_PROMPT;
  const basePrompt = input.customPrompt?.trim() || defaultPrompt;
  const systemPrompt = basePrompt.replace(/\{PLATFORM\}/g, input.platform);

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
