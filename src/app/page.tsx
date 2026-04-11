export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">MultiBlog</h1>
        <p className="mt-2 text-slate-600">
          네이버 블로그 → AI 리라이트 → 멀티 플랫폼 자동 배포
        </p>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">🚧 MVP 개발 중</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            <li>✅ 프로젝트 스캐폴드</li>
            <li>
              ✅ Prisma 스키마 (SourcePost / RewrittenVersion / PublishTarget /
              PlatformConfig)
            </li>
            <li>✅ Claude 리라이트 모듈</li>
            <li>✅ sharp 이미지 가공 모듈</li>
            <li>✅ WordPress / Blogspot 어댑터</li>
            <li>✅ 크롬 확장프로그램용 웹훅 라우트</li>
            <li>⬜ 크롬 확장프로그램 (블로그 포스팅 캡처 → 서버 전송)</li>
            <li>⬜ 대시보드 (포스팅 목록, 배포 이력, 플랫폼 계정 관리)</li>
            <li>⬜ 배포 파이프라인 (리라이트 + 이미지 가공 + 업로드)</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
