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
│   │   ├── page.tsx                           # 대시보드 랜딩
│   │   └── api/
│   │       └── webhook/naver-post/route.ts    # 확장프로그램 수신 엔드포인트
│   └── lib/
│       ├── prisma.ts                          # Prisma 클라이언트 싱글턴
│       ├── claude.ts                          # Anthropic SDK + 리라이트 프롬프트
│       ├── image-processor.ts                 # sharp 기반 이미지 색상/크기 가공
│       └── platforms/
│           ├── wordpress.ts                   # WordPress REST API 어댑터 (완성)
│           ├── blogspot.ts                    # Blogger v3 API 어댑터 (기본)
│           └── tistory.ts                     # Phase 4 스텁 (Playwright 필요)
├── prisma/
│   └── schema.prisma                          # 4개 모델
├── chrome-extension/                          # MV3 크롬 확장프로그램 (Phase 1 내 분리 예정)
│   ├── manifest.json
│   ├── content.js                             # 네이버 블로그 본문 파싱 + 버튼 주입
│   ├── background.js                          # 웹훅 POST
│   ├── popup.html
│   └── popup.js                               # 서버URL + Secret 설정
├── .env.example
└── README.md
```

## 데이터 모델 (Prisma)

| 모델                 | 역할                                                         |
| -------------------- | ------------------------------------------------------------ |
| **SourcePost**       | 네이버 블로그 원본 (확장프로그램이 전송) — `naverUrl` unique |
| **RewrittenVersion** | Claude로 리라이트한 플랫폼별 버전                            |
| **PublishTarget**    | 특정 플랫폼에 배포한 작업 (status/publishedUrl/error)        |
| **PlatformConfig**   | 플랫폼 계정 설정 (WordPress 사이트, Blogger blogId 등)       |

## 로드맵

### Phase 1 — MVP (진행 중)

- [x] Next.js 14 + TypeScript + Tailwind 스캐폴드
- [x] Prisma 스키마 (`SourcePost`, `RewrittenVersion`, `PublishTarget`, `PlatformConfig`)
- [x] Claude 리라이트 모듈 (`src/lib/claude.ts`)
- [x] sharp 이미지 가공 모듈 (`src/lib/image-processor.ts`)
- [x] WordPress REST 어댑터 (`src/lib/platforms/wordpress.ts`)
- [x] Blogspot Blogger v3 어댑터 (`src/lib/platforms/blogspot.ts`)
- [x] 크롬 확장프로그램용 웹훅 (`POST /api/webhook/naver-post`)
- [x] 크롬 확장프로그램 뼈대 (content/background/popup)
- [ ] **Supabase Postgres 연결** + 첫 마이그레이션 ← **다음 작업**
- [ ] **`.env.local`에 ANTHROPIC_API_KEY / WEBHOOK_SECRET 세팅** ← **다음 작업**
- [ ] 크롬 확장프로그램 content.js 셀렉터를 실제 네이버 블로그 DOM에 맞게 조정
- [ ] 대시보드: 포스팅 목록 / 배포 상태 / 플랫폼 계정 관리 UI
- [ ] 배포 파이프라인 API (`POST /api/posts/:id/publish`)
- [ ] WordPress 실제 테스트 블로그로 E2E 검증
- [ ] **크롬 확장프로그램을 `multiblog-extension` 별도 저장소로 분리**

### Phase 2 — Blogspot

- [ ] Google OAuth 플로우 (access token + refresh token)
- [ ] 이미지 호스팅 (Blogger API에 이미지 업로드 엔드포인트가 없음 → Cloudinary / R2 / 자체 호스팅 결정)
- [ ] Blogspot E2E 테스트

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
- **Supabase 계정** (무료) — [supabase.com](https://supabase.com)
- **Anthropic API 계정** — [console.anthropic.com](https://console.anthropic.com)

### 1단계: 저장소 Clone + 패키지 설치

```bash
git clone https://github.com/gksrudehd123-maker/multiblog.git
cd multiblog
pnpm install
```

> 설치 중 `Ignored build scripts` 경고가 나오면 `pnpm approve-builds` 실행 후 `@prisma/client, @prisma/engines, prisma, sharp` 모두 스페이스로 선택 후 Enter. (이 저장소는 `package.json`의 `pnpm.onlyBuiltDependencies`에 미리 등록돼있어 자동 처리됨)

### 2단계: Supabase Postgres 프로젝트 만들기

1. [supabase.com](https://supabase.com) 로그인 → **New Project**
2. 프로젝트 이름: `multiblog` (아무거나 OK)
3. Region: **Seoul (ap-northeast-2)** 권장
4. Database Password: **안전한 비밀번호 생성 후 저장** (나중에 필요)
5. 프로젝트 생성 후 **Project Settings → Database → Connection string** 에서 2개 URL 복사:
   - **Transaction mode** (`?pgbouncer=true&connection_limit=1`) → `DATABASE_URL`
   - **Session mode / Direct connection** → `DIRECT_URL`

### 3단계: Anthropic API Key 발급

1. [console.anthropic.com](https://console.anthropic.com) 로그인 → **API Keys**
2. **Create Key** → 이름 `multiblog` → 생성 후 복사 (한 번만 표시됨!)
3. Billing에 카드 등록 + 최소 충전 (예: $5)
4. 모델 ID: `claude-opus-4-6` (또는 `claude-sonnet-4-6`) 사용

### 4단계: 환경변수 설정

`.env.local` 파일을 프로젝트 루트에 만들고 아래 내용 채우기:

```env
# Supabase Postgres (2단계에서 복사한 값)
DATABASE_URL="postgresql://postgres.xxxxx:PASSWORD@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxxxx:PASSWORD@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"

# Anthropic (3단계에서 복사한 값)
ANTHROPIC_API_KEY="sk-ant-..."
CLAUDE_MODEL="claude-opus-4-6"

# 크롬 확장프로그램 인증용 (아무 랜덤 문자열 — 확장프로그램 popup에도 동일하게 입력)
WEBHOOK_SECRET="openssl rand -hex 32 로 생성한 값 또는 아무 문자열"

# NextAuth (추후 사용자 로그인 기능 붙일 때)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="openssl rand -base64 32 로 생성"
```

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

| 변수                | 설명                                          | 필수 |
| ------------------- | --------------------------------------------- | ---- |
| `DATABASE_URL`      | Supabase Postgres pooler URL                  | ✅   |
| `DIRECT_URL`        | Supabase Postgres direct URL (마이그레이션용) | ✅   |
| `ANTHROPIC_API_KEY` | Claude API 키                                 | ✅   |
| `CLAUDE_MODEL`      | 사용할 Claude 모델 (기본 `claude-opus-4-6`)   | ❌   |
| `WEBHOOK_SECRET`    | 확장프로그램 인증용 랜덤 문자열               | ✅   |
| `NEXTAUTH_URL`      | 추후 인증 붙일 때                             | ❌   |
| `NEXTAUTH_SECRET`   | 추후 인증 붙일 때                             | ❌   |

## 배포

- **프론트/API**: Vercel (OMS 프로젝트와 동일 패턴)
- **DB**: Supabase Postgres
- **환경변수**: Vercel Project Settings → Environment Variables에 동일하게 등록

## License

MIT (Private use)
