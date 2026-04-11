import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-6";

export type RewriteInput = {
  title: string;
  contentText: string;
  platform: "WORDPRESS" | "BLOGSPOT" | "TISTORY";
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

JSON 형식으로만 응답:
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
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `원본 제목: ${input.title}\n\n원본 본문:\n${input.contentText}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude 응답에 텍스트가 없습니다");
  }

  const match = textBlock.text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Claude 응답에서 JSON을 추출할 수 없습니다");
  }

  return JSON.parse(match[0]) as RewriteOutput;
}
