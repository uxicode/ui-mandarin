# Mandarin API Server

Express 기반 API 서버로 Supabase와 연동하여 업무 데이터를 관리합니다.

## 설치

```bash
cd server
npm install
```

## 환경 변수 설정

`server/.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Supabase 설정
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key


# 서버 설정
PORT=3001
FRONTEND_URL=http://localhost:5173
```

## Supabase 설정

### DB 스키마 동기화 (필수)

앱은 **코드만 배포해도 DB가 바뀌지 않습니다.** 사용자별 `tasks`·`memos`·RLS는 **Supabase 프로젝트에 SQL을 직접 적용**해야 합니다.

| 상황 | 실행할 파일 | 비고 |
|------|-------------|------|
| **새 Supabase 프로젝트** (아직 `tasks` 없음) | [`supabase-schema.sql`](./supabase-schema.sql) 전체를 SQL Editor에 붙여넣어 실행 | `tasks`·`memos`·`user_id` + RLS 한 번에 생성 |
| **이미 `tasks` 테이블만 있던 DB** | [`migrations/001_tasks_user_id_rls.sql`](./migrations/001_tasks_user_id_rls.sql) 실행 | `user_id` 추가·**기존 행은 `auth.users`에서 가장 먼저 가입한 계정으로 몰기**·RLS |
| **메모 테이블 추가** (tasks + RLS 적용 후) | [`migrations/002_memos.sql`](./migrations/002_memos.sql) 실행 | `memos` + RLS (`update_updated_at_column` 함수 필요) |

- **Supabase CLI 마이그레이션**을 쓰는 경우: 위 SQL을 `supabase/migrations/타임스탬프_설명.sql`로 옮겨 `supabase db push` 등으로 적용해도 됩니다. 이 레포는 **SQL Editor 수동 실행**을 기본으로 둡니다.
- 적용 후 스키마 캐시가 필요하면 대시보드 **Settings → API → Reload schema cache** 또는 SQL에서 `NOTIFY pgrst, 'reload schema';`

### 나머지 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 위 표에 맞는 SQL을 **한 번** 반영합니다. (`supabase-schema.sql`과 `001_...`를 **둘 다** 새 DB에 실행하지 마세요. 신규는 전자만.)
3. **Authentication**: 대시보드에서 Email 로그인을 활성화하세요.
4. API URL과 **anon** key를 `server/.env`에 넣습니다. 프론트는 `VITE_API_BASE_URL`만 사용합니다.

## 인증

- **로그인·세션**: `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/profile`. 성공 시 **HttpOnly 쿠키**(`mandarin_access`, `mandarin_refresh`)로 세션이 유지됩니다.
- `GET /api/auth/me`: 로그인 안 됨 → **200** `{ success: true, user: null }` (게스트도 정상 응답).
- **업무 API**: `GET/POST/PUT/DELETE/PATCH /api/tasks*` 는 위 쿠키(또는 `Authorization: Bearer <access_token>`)로 인증합니다. 프론트는 `fetch(..., { credentials: 'include' })` 로 쿠키를 보냅니다.
- **메모 API**: `GET/POST /api/memos`, `PUT/DELETE /api/memos/:id` — same auth as tasks. List ordered by `updated_at` desc.
- `GET /api/fetch-url-title` 등은 인증 없이 사용 가능합니다.

## 실행

```bash
# 개발 모드 (자동 재시작)
npm run dev

# 프로덕션 모드
npm start
```

서버는 기본적으로 `http://localhost:3001`에서 실행됩니다.

## API 엔드포인트

### GET /api/tasks
업무 목록 조회 (로그인 사용자 본인 데이터만, RLS)

**헤더:** `Authorization: Bearer <access_token>`

### POST /api/tasks
새 업무 생성

**요청 본문:**
```json
{
  "title": "업무 제목",
  "description": "업무 설명 (선택)",
  "scores": {
    "importance": 4,
    "urgency": 3
  },
  "startDate": "2024-01-01T00:00:00Z",
  "deadline": "2024-01-31T23:59:59Z",
  "completed": false
}
```

### PUT /api/tasks/:id
업무 수정

### DELETE /api/tasks/:id
업무 삭제

### PATCH /api/tasks/:id/toggle
업무 완료 상태 토글

### GET /api/memos
메모 목록 (본인 데이터만, RLS)

### POST /api/memos
Body example: `{ "title": "", "body": "" }`

### PUT /api/memos/:id
메모 수정 — `{ "title"?: string, "body"?: string }` 중 최소 하나

### DELETE /api/memos/:id
Delete a memo

### GET /health
서버 상태 확인
