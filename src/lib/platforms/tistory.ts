// Tistory 어댑터 — Phase 4
// 2024-04 카카오 OpenAPI 종료로 공식 API 사용 불가
// Playwright 브라우저 자동화 필요 (별도 워커에서 실행)
// TODO: Phase 4에서 Playwright 기반 구현 추가

export type TistoryConfig = {
  blogName: string; // example.tistory.com
  cookie: string; // 로그인 세션 쿠키 (수동 저장)
};

export async function createPost(
  _config: TistoryConfig,
  _input: { title: string; content: string; tags?: string[] },
): Promise<{ url: string }> {
  throw new Error(
    "Tistory 어댑터는 아직 미구현입니다 (Phase 4에서 Playwright 자동화 추가 예정)",
  );
}
