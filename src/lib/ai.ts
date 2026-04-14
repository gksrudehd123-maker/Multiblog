// AI 모델 라우터 (서버 전용) — Claude / Gemini 중 선택해서 리라이트 수행

import {
  rewritePost as rewriteWithClaude,
  type RewriteInput,
  type RewriteOutput,
} from "./claude";
import { rewritePostWithGemini } from "./gemini";
import { getProvider } from "./ai-models";

export { AI_MODELS, getProvider } from "./ai-models";
export type { AiModelOption, AiProvider } from "./ai-models";

export const DEFAULT_MODEL_ID = process.env.CLAUDE_MODEL || "gemini-2.0-flash";

// 모델 ID로 적절한 provider 호출
export async function rewritePostWithModel(
  input: RewriteInput,
  modelId: string,
): Promise<{ output: RewriteOutput; modelId: string }> {
  const provider = getProvider(modelId);
  if (provider === "gemini") {
    const output = await rewritePostWithGemini(input, modelId);
    return { output, modelId };
  }
  const output = await rewriteWithClaude(input, modelId);
  return { output, modelId };
}
