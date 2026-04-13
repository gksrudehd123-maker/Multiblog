# MultiBlog

네이버 블로그에 올린 글을 **Claude로 리라이트**하고 이미지를 가공하여 **WordPress / Blogspot / Tistory**에 자동 배포하는 Next.js 앱.

> **저장소 현황**: 이 저장소는 웹 서버(`src/`, `prisma/`)와 크롬 확장프로그램(`chrome-extension/`)을 **하나의 레포**에 같이 담고 있습니다. 초기 개발 편의 목적이며, **Phase 1 MVP 검증이 끝나면 확장프로그램을 별도 저장소(`multiblog-extension` 등)로 분리할 예정**입니다.

## 아키텍처

```
네이버 블로그 (사용자가 포스팅)
      ↓
크롬 확장프로그램 ("멀티배포" 버튼) ─── POST /api/webhook/naver-post ───▶ MultiBlog 서버
                                                                            ↓
                                                            SourcePost 저장 (Supabase Postgres)
                                                                            ↓
                                                            사용자가 대시보드에서 "배포" 클릭
                                                                            ↓
                                          Claude 리라이트 → 이미지 sharp 가공 → 플랫폼 어댑터 호출
                                                                            ↓
                                                          WordPress / Blogspot / (Tistory)
```

## 폴더 구조

```
multiblog/
├── src/
│   ├── app/
│   │   ├── page.tsx                            # 대시보드 — 수집된 포스트 목록
│   │   ├── posts/[id]/page.tsx                 # 포스트 상세 + 배포 + 이미지 썸네일
│   │   ├── platforms/page.tsx                  # 플랫폼 계정 CRUD + 프롬프트 설정
│   │   ├── prompts/page.tsx                    # 프롬프트 템플릿 CRUD + 샘플 시드
│   │   └── api/
│   │       ├── webhook/naver-post/route.ts     # 확장프로그램 수신 엔드포인트
│   │       ├── proxy-image/route.ts            # 네이버 이미지 Referer 우회 프록시
│   │       ├── posts/route.ts                  # 포스트 목록
│   │       ├── posts/[id]/route.ts             # 포스트 상세/삭제
│   │       ├── posts/[id]/publish/route.ts     # 배포 파이프라인 (리라이트+업로드)
│   │       ├── platform-configs/route.ts       # 플랫폼 계정 목록/생성
│   │       ├── platform-configs/[id]/route.ts  # 플랫폼 계정 수정/삭제
│   │       ├── prompt-templates/route.ts       # 프롬프트 템플릿 목록/생성
│   │       ├── prompt-templates/[id]/route.ts  # 프롬프트 템플릿 수정/삭제
│   │       └── prompt-templates/seed/route.ts  # 샘플 프롬프트 3종 자동 등록
│   └── lib/
│       ├── prisma.ts                          # Prisma 클라이언트 싱글턴
│       ├── claude.ts                          # Anthropic SDK + 리라이트 프롬프트
│       ├── image-processor.ts                 # sharp 기반 이미지 색상/크기 가공
│       └── platforms/
│           ├── wordpress.ts                   # WordPress REST API 어댑터 ✅
│           ├── blogspot.ts                    # Blogger v3 + OAuth refresh ✅
│           └── tistory.ts                     # Phase 4 스텁 (Playwright 필요)
├── prisma/
│   ├── schema.prisma                          # 4개 모델
│   └── migrations/                            # 초기 마이그레이션 포함
├── chrome-extension/                          # MV3 크롬 확장프로그램 (Phase 1 내 분리 예정)
│   ├── manifest.json
│   ├── content.js                             # 네이버 블로그 본문 파싱 + 버튼 주입
│   ├── background.js                          # 웹훅 POST
│   ├── popup.html
│   └── popup.js                               # 서버URL + Secret 설정
├── .env.example
└── README.md
```

## 배포 파이프라인

`POST /api/posts/:id/publish` 요청 시 다음 순서로 처리됩니다:

1. `PublishTarget` 레코드 `PROCESSING` 상태로 생성
2. **프롬프트 결정** — 우선순위: `body.promptTemplateId` → `config.extra.promptTemplate` → 내장 기본 프롬프트
3. Claude 리라이트 — 제목/본문HTML/메타/slug + 본문에 `<img>` 태그 삽입 (원본 네이버 URL)
4. (WordPress) 원본 이미지 다운로드(sharp 가공) → WP 미디어 업로드 → 본문의 원본 URL을 WP URL로 치환
5. `RewrittenVersion` 저장 (최종 HTML, 이미지 매핑, 사용 모델 기록)
6. 플랫폼 어댑터 호출:
   - **WordPress**: `createPost` (draft/publish)
   - **Blogspot**: accessToken 만료 시 `refreshAccessToken` 후 `createPost` (isDraft)
7. `PublishTarget` → `SUCCESS` + `publishedUrl`. 실패 시 `FAILED` + `errorMessage`

Blogspot 토큰 자동 갱신 시 새 `accessToken`과 `expiryDate`가 DB에 저장됩니다.

## 프롬프트 템플릿

`/prompts` 페이지에서 Claude 리라이트 프롬프트를 여러 개 저장해두고 배포 시 선택할 수 있습니다.

- **샘플 불러오기** — SEO 정보성 / 리뷰 / 뉴스 3종 자동 생성
- `{PLATFORM}` 플레이스홀더는 `WORDPRESS`/`BLOGSPOT`/`TISTORY`로 치환
- 프롬프트는 반드시 JSON 응답(`title`, `contentHtml`, `metaDescription`, `slug`) 지시 포함 필요
- 이미지 URL 목록은 user message에 자동 첨부되므로 "이미지 URL이 있으면 `<img>`로 본문에 삽입" 규칙 포함 권장

## 데이터 모델 (Prisma)

| 모델                 | 역할                                                         |
| -------------------- | ------------------------------------------------------------ |
| **SourcePost**       | 네이버 블로그 원본 (확장프로그램이 전송) — `naverUrl` unique |
| **RewrittenVersion** | Claude로 리라이트한 플랫폼별 버전                            |
| **PublishTarget**    | 특정 플랫폼에 배포한 작업 (status/publishedUrl/error)        |
| **PlatformConfig**   | 플랫폼 계정 설정 (WordPress 사이트, Blogger blogId 등)       |

## 로드맵

### Phase 1 — MVP ✅ (2026-04-13 완료)

- [x] Next.js 14 + TypeScript + Tailwind 스캐폴드
- [x] Prisma 스키마 + Neon Postgres(Singapore) 연결, 마이그레이션 적용
- [x] Claude 리라이트 모듈 — 이미지 URL 주입, 커스텀 프롬프트, JSON 파싱 보강
- [x] sharp 이미지 가공 모듈 + Referer 헤더로 네이버 핫링크 차단 우회
- [x] WordPress REST 어댑터 + Application Password 인증 + 이미지 업로드
- [x] Blogspot Blogger v3 어댑터 + OAuth refresh 자동 갱신
- [x] 크롬 확장프로그램용 웹훅 (`POST /api/webhook/naver-post`)
- [x] **크롬 확장프로그램** — SE ONE 셀렉터, 태그 추출, 모바일 지원, iframe 재시도
- [x] **대시보드 UI** — 포스트 목록(`/`), 상세(`/posts/:id`, 이미지 썸네일 + 프록시), 플랫폼 계정(`/platforms`), 프롬프트 템플릿(`/prompts`)
- [x] **배포 파이프라인** (`POST /api/posts/:id/publish`) — Claude 리라이트 → 이미지 가공/업로드 → 플랫폼 업로드 → PublishTarget 상태 기록, 풀스크린 로딩 오버레이
- [x] **프롬프트 템플릿** — `PromptTemplate` 모델, CRUD, 샘플(SEO 정보성/리뷰/뉴스) 자동 시드, 배포 시 드롭다운 선택
- [x] 플랫폼별 기본 프롬프트 (`PlatformConfig.extra.promptTemplate`) — 템플릿 미선택 시 fallback
- [x] 이미지 프록시 (`/api/proxy-image`) — 네이버 Referer 차단 우회, 도메인 화이트리스트
- [x] **WordPress E2E 검증 완료** — Claude 리라이트 + 이미지 9개 삽입 + WP 초안 생성 성공
- [ ] Vercel 배포 + 환경변수 등록
- [ ] **크롬 확장프로그램을 `multiblog-extension` 별도 저장소로 분리**

### Phase 2 — Blogspot 완성

- [x] Blogspot 어댑터 + Blog ID/Refresh Token UI + 토큰 자동 갱신
- [ ] **Google OAuth 자체 플로우** — 서버 자체 OAuth 로그인 + 콜백 라우트로 refresh token 획득 (현재는 외부에서 발급한 토큰 직접 입력 필요)
- [ ] 이미지 호스팅 (Blogger API에 이미지 업로드 엔드포인트가 없음 → Cloudinary / R2 / 자체 호스팅 결정)
- [ ] Blogspot E2E 테스트 (토큰 발급 후)

### Phase 3 — 이미지 가공 강화

- [ ] 배경색 변경 외에 워터마크, 미세 크롭, 텍스트 오버레이 등 조합
- [ ] 이미지별 가공 전/후 미리보기 UI

### Phase 4 — Tistory (Playwright)

- [ ] Vercel 서버리스는 Playwright 불가 → **별도 워커** (자체 VPS 또는 AWS Lambda container)
- [ ] 로그인 세션 쿠키 기반 자동 업로드
- [ ] 배포 트리거: 메인 서버가 SQS/Queue로 워커에 작업 전달

## 주요 리스크

1. **티스토리 공식 API 없음** (2024-04 카카오 OpenAPI 종료) — Playwright 자동화 필수
2. **네이버 이용약관** — 크롬 확장프로그램 방식으로 스크래핑 회피, 사용자 본인의 포스팅만 캡처
3. **SEO 중복 컨텐츠 페널티** — Claude 리라이트 필수 (원본 그대로 복사 금지)

---

## 🚀 처음 시작하는 사람을 위한 세팅 가이드

> **다른 컴퓨터에서 처음 작업할 때 이 섹션을 순서대로 따라가세요.**

### 사전 준비

- **Node.js 20 이상** ([nodejs.org](https://nodejs.org))
- **pnpm** (`npm install -g pnpm`)
- **Git**
- **GitHub 계정** (이 저장소를 clone 받기 위해)
- **Postgres DB 계정** — [Neon](https://neon.tech) (권장, 무료) 또는 [Supabase](https://supabase.com)
- **Anthropic API 계정** — [console.anthropic.com](https://console.anthropic.com)
- (Blogspot 사용 시) **Google Cloud OAuth 클라이언트** — Blogger API 활성화 + OAuth 2.0 Client ID/Secret

### 1단계: 저장소 Clone + 패키지 설치

```bash
git clone https://github.com/gksrudehd123-maker/multiblog.git
cd multiblog
pnpm install
```

> 설치 중 `Ignored build scripts` 경고가 나오면 `pnpm approve-builds` 실행 후 `@prisma/client, @prisma/engines, prisma, sharp` 모두 스페이스로 선택 후 Enter. (이 저장소는 `package.json`의 `pnpm.onlyBuiltDependencies`에 미리 등록돼있어 자동 처리됨)

### 2단계: Postgres DB 프로젝트 만들기

**Neon (권장)**

1. [neon.tech](https://neon.tech) 로그인 → **New Project**
2. Region: `AWS Asia Pacific (Singapore)` — Seoul/Tokyo가 없으면 Singapore가 한국에서 가장 빠름
3. 생성 후 **Connection Details**의 connection string 복사
4. `.env.local`의 `DATABASE_URL`과 `DIRECT_URL` **둘 다 동일한 direct URL** 사용 (Neon의 `-pooler` 엔드포인트는 선택 사항이며 이 프로젝트에서는 direct URL로 통일)

**Supabase (대안)**

1. [supabase.com](https://supabase.com) → New Project → Region `Seoul` → DB 비밀번호 저장
2. Project Settings → Database → Connection string에서:
   - Transaction mode (`pgbouncer=true`) → `DATABASE_URL`
   - Session/Direct → `DIRECT_URL`

### 3단계: Anthropic API Key 발급

1. [console.anthropic.com](https://console.anthropic.com) 로그인 → **API Keys**
2. **Create Key** → 이름 `multiblog` → 생성 후 복사 (한 번만 표시됨!)
3. Billing에 카드 등록 + 최소 충전 (예: $5)
4. 모델 ID: `claude-opus-4-6` (또는 `claude-sonnet-4-6`) 사용

### 4단계: 환경변수 설정

`.env.local` 파일을 프로젝트 루트에 만들고 아래 내용 채우기:

```env
# Postgres (Neon/Supabase)
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
DIRECT_URL="postgresql://user:password@host/db?sslmode=require"

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."
CLAUDE_MODEL="claude-opus-4-6"

# Google OAuth (Blogspot access token refresh)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# 크롬 확장프로그램 인증용 (아무 랜덤 문자열)
WEBHOOK_SECRET="openssl rand -hex 32 로 생성"

# NextAuth (추후 사용자 로그인 기능)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="openssl rand -base64 32 로 생성"
```

> **참고**: Prisma CLI는 `.env`만 읽고 Next.js는 `.env.local`을 읽습니다. 같은 값을 두 파일에 모두 두거나 `.env.local`만 편집한 뒤 `cp .env.local .env`로 동기화하세요.

### 5단계: Prisma 마이그레이션 (DB 테이블 생성)

```bash
pnpm prisma migrate dev --name init
```

> 이 명령은 `prisma/schema.prisma`의 모델을 Supabase Postgres에 반영합니다. 처음 실행 시 `prisma/migrations/` 폴더가 생성되고, Git에 커밋됩니다.

### 6단계: 개발 서버 실행

```bash
pnpm dev
```

→ http://localhost:3000 접속. 대시보드 랜딩 페이지가 보이면 OK.

### 7단계: 크롬 확장프로그램 설치

1. Chrome → `chrome://extensions/` 접속
2. 우측 상단 **개발자 모드** 켜기
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. `multiblog/chrome-extension/` 폴더 선택
5. 확장프로그램 아이콘 → 팝업 열기 → **서버 URL** `http://localhost:3000`, **Webhook Secret** 4단계에서 설정한 값 입력 → 저장
6. 네이버 블로그 포스트 페이지 접속하면 우측 하단에 **📤 MultiBlog 전송** 버튼이 나타남 (content.js 셀렉터가 실제 DOM과 맞지 않을 수 있음 — 콘솔 찍으면서 조정 필요)

### 8단계: 웹훅 동작 확인 (확장프로그램 없이 테스트)

```bash
curl -X POST http://localhost:3000/api/webhook/naver-post \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "naverUrl": "https://blog.naver.com/test/123",
    "naverBlogId": "test",
    "naverLogNo": "123",
    "title": "테스트 제목",
    "contentHtml": "<p>본문</p>",
    "contentText": "본문",
    "images": [],
    "tags": []
  }'
```

응답 `{"ok":true,"id":"..."}` 오면 DB 저장 성공. Supabase 대시보드 → Table Editor → `source_posts`에서 확인 가능.

---

## 환경변수 요약

| 변수                   | 설명                                          | 필수 |
| ---------------------- | --------------------------------------------- | ---- |
| `DATABASE_URL`         | Supabase Postgres pooler URL                  | ✅   |
| `DIRECT_URL`           | Supabase Postgres direct URL (마이그레이션용) | ✅   |
| `ANTHROPIC_API_KEY`    | Claude API 키                                 | ✅   |
| `CLAUDE_MODEL`         | 사용할 Claude 모델 (기본 `claude-opus-4-6`)   | ❌   |
| `WEBHOOK_SECRET`       | 확장프로그램 인증용 랜덤 문자열               | ✅   |
| `GOOGLE_CLIENT_ID`     | Blogspot OAuth refresh (Blogger 사용 시)      | ⚠️   |
| `GOOGLE_CLIENT_SECRET` | Blogspot OAuth refresh (Blogger 사용 시)      | ⚠️   |
| `NEXTAUTH_URL`         | 추후 인증 붙일 때                             | ❌   |
| `NEXTAUTH_SECRET`      | 추후 인증 붙일 때                             | ❌   |

## 배포

- **프론트/API**: Vercel (OMS 프로젝트와 동일 패턴)
- **DB**: Supabase Postgres
- **환경변수**: Vercel Project Settings → Environment Variables에 동일하게 등록

## License

MIT (Private use)
