// 모델 목록 — 클라이언트/서버 양쪽에서 import 안전 (SDK 의존 없음)

export type AiProvider = "claude" | "gemini";

export type AiModelOption = {
  id: string; // 실제 API 모델 ID
  label: string; // UI 표시명
  provider: AiProvider;
  tier: "free" | "paid";
  description: string;
};

export const AI_MODELS: AiModelOption[] = [
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite (무료·추천)",
    provider: "gemini",
    tier: "free",
    description: "무료 · 최신 경량 · 쿼터 여유",
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6 (유료)",
    provider: "claude",
    tier: "paid",
    description: "유료 · 품질 좋음 · Opus의 1/5 가격",
  },
  {
    id: "claude-opus-4-6",
    label: "Claude Opus 4.6 (유료)",
    provider: "claude",
    tier: "paid",
    description: "유료 · 최고 품질",
  },
  {
    id: "claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5 (유료)",
    provider: "claude",
    tier: "paid",
    description: "유료 · 가장 저렴",
  },
];

export function getProvider(modelId: string): AiProvider {
  if (modelId.startsWith("gemini-")) return "gemini";
  if (modelId.startsWith("claude-")) return "claude";
  throw new Error(`알 수 없는 모델 ID: ${modelId}`);
}
