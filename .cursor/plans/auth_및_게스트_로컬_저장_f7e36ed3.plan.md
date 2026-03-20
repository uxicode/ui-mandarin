---
name: Auth 및 게스트 로컬 저장
overview: Supabase Auth로 로그인/회원가입/프로필을 추가하고, `tasks`에 `user_id`와 RLS로 회원별 데이터를 격리합니다. 비회원은 기존 UI를 그대로 쓰되 Task CRUD는 `localStorage`만 사용하고 API는 호출하지 않습니다.
todos:
  - id: db-rls
    content: tasks.user_id 컬럼, 인덱스, RLS 정책, 마이그레이션 SQL 정리
    status: completed
  - id: express-jwt
    content: "server.js tasks 라우트: Bearer JWT로 user-scoped Supabase 클라이언트 사용"
    status: completed
  - id: local-storage
    content: localTaskStorage + task-store 게스트/회원 분기 + api Authorization
    status: completed
  - id: auth-ui
    content: Supabase 클라이언트, auth-store, vue-router, Login/Signup/Profile, App 헤더
    status: completed
isProject: false
---

# 로그인·회원가입·프로필 + 회원별 Task / 게스트 로컬 전용

## 아키텍처 요약

```mermaid
flowchart TB
  subgraph guest [비회원]
    LS[localStorage mandarin_guest_tasks]
    TS1[task-store]
    TS1 --> LS
  end
  subgraph member [회원]
    Auth[Supabase Auth JWT]
    API[Express /api/tasks]
    DB[(Supabase tasks + RLS)]
    TS2[task-store]
    TS2 --> Auth
    TS2 --> API
    API --> DB
  end
```

- **회원**: 프론트에서 `Authorization: Bearer <access_token>`으로 Express 호출. Express는 요청마다 **동일 anon 키**로 Supabase 클라이언트를 만들되, 헤더에 사용자 JWT를 넘겨 PostgREST가 `auth.uid()`를 인식하게 함 → RLS로 본인 `tasks`만 접근.
- **비회원**: `task-store`가 `apiService`의 tasks API를 **전혀 호출하지 않고** `[src/services/localTaskStorage.ts](src/services/localTaskStorage.ts)` (신규)로 `Task[]`를 직렬화 저장/로드. `fetch-url-title` 등 공용 API는 기존처럼 무인증 호출 가능.

---

## 1. 데이터베이스 (Supabase SQL)

`[server/supabase-schema.sql](server/supabase-schema.sql)`에 반영할 내용 (기존 DB는 SQL Editor로 마이그레이션):

- `tasks`에 `user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE`
  - 기존 행이 있으면: 임시로 `user_id` nullable 추가 후 데이터 정리, 이후 `NOT NULL` + `DEFAULT auth.uid()` 적용 등 단계적 마이그레이션 문서화.
- 인덱스: `CREATE INDEX ON tasks(user_id)`.
- **RLS**: 기존 `"Allow all operations"` 정책 **제거** 후, `SELECT/INSERT/UPDATE/DELETE` 모두 `user_id = auth.uid()` (또는 `auth.uid() = user_id`) 조건.
- `INSERT` 시 `user_id`는 DB 기본값 `auth.uid()`에 맡기거나 앱에서 생략.

---

## 2. 백엔드 Express (`[server/server.js](server/server.js)`)

- **태스크 관련 라우트** (`GET/POST/PUT/PATCH/DELETE /api/tasks...`):
  - `Authorization: Bearer` 없으면 **401** (또는 게스트 전용 분기 없음 — 게스트는 프론트에서 아예 호출 안 함).
  - 토큰이 있으면:

```js
createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: req.headers.authorization } },
});
```

```
로 `from('tasks')` 조회/삽입/수정/삭제. **서버 전역 `supabase` 단일 클라이언트로 tasks를 처리하지 말 것** (RLS가 적용되지 않음).
```

- `fetch-url-title` 등 인증 불필요한 라우트는 기존 클라이언트 유지.

---

## 3. 프론트: Supabase Auth

- 의존성: `@supabase/supabase-js`.
- 환경 변수: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (`[.env.example](.env.example)` / README 보강).
- `[src/lib/supabase.ts](src/lib/supabase.ts)` (신규): 브라우저용 `createClient` 싱글톤 (persistSession 기본 활성화).

---

## 4. Pinia: auth 스토어 (`[src/stores/auth-store.ts](src/stores/auth-store.ts)` 신규)

- `session`, `user`, `isAuthenticated` (computed).
- `initAuth()`: `onAuthStateChange` 구독 + 초기 `getSession()`.
- `signUp(email, password)`, `signIn(email, password)`, `signOut()`.
- `updateProfile({ displayName, ... })`: `supabase.auth.updateUser({ data: { ... } })` (프로필 설정).

---

## 5. Task 저장소 분기 (`[src/stores/task-store.ts](src/stores/task-store.ts)`)

- `useAuthStore`의 `isAuthenticated`와 `session?.access_token` 참조.
- **게스트**: `fetchTasks` → localStorage에서 `Task[]` 로드; `add/update/toggle/delete` → 메모리 갱신 후 localStorage에 전체 저장. 새 id는 `crypto.randomUUID()`.
- **회원**: 기존처럼 `apiService` 호출하되, 모든 `fetch`에 `Authorization: Bearer <access_token>` 헤더 추가 (`[src/services/api.ts](src/services/api.ts)`에서 토큰 주입 함수 또는 `getAuthHeaders()`).
- **로그인/로그아웃 시**:
  - 로그인 성공 후 `fetchTasks()` → 서버 데이터로 교체 (게스트 로컬 데이터는 키 그대로 두고, 계정 데이터와 혼합하지 않음 — MVP).
  - 로그아웃 시 `tasks` 비우고 게스트 `fetchTasks()`로 로컬 다시 로드.

---

## 6. API 서비스 (`[src/services/api.ts](src/services/api.ts)`)

- `getAccessToken(): string | null` (auth store에서 가져오기 — 순환 참조 주의 시 작은 `getToken` 콜백 등록 패턴 사용).
- tasks 관련 요청에만 `Authorization` 헤더 병합.

---

## 7. UI: 로그인 / 회원가입 / 프로필

- **라우팅**: `vue-router` 추가 권장 — `/` 메인(현재 앱), `/login`, `/signup`, `/profile`. 비회원도 `/` 접근 가능.
- 컴포넌트 (신규): `LoginView.vue`, `SignupView.vue`, `ProfileView.vue` (또는 모달로 통합 가능 — 계획은 라우트 기준).
- `[App.vue](src/App.vue)`: 헤더에 로그인/가입 링크 또는 로그인 시 이메일·프로필·로그아웃. `RouterView`로 메인/폼 화면 분리.
- `main.ts`에 `router`, `authStore.initAuth()` 후 앱 마운트.

---

## 8. 기타

- **기존 데이터**: `user_id` 마이그레이션 전 `tasks`가 공용이었으면, 운영 정책(삭제 vs 특정 사용자에 귀속)을 README에 한 줄 명시.
- **테스트**: `task-store` / `api`에 토큰 mock이 필요하면 후속으로 Vitest 보강.

---

## 구현 순서 제안

1. DB: `user_id` + RLS + 기존 정책 제거 (마이그레이션 SQL 파일 분리 권장).
2. Express: tasks 라우트만 JWT 전달 클라이언트로 전환 + 401 처리.
3. `localTaskStorage` + `task-store` 게스트/회원 분기 + `api` 헤더.
4. `supabase` 클라이언트 + `auth-store` + `initAuth`.
5. `vue-router` + 로그인/회원가입/프로필 화면 + `App.vue` 헤더 연동.
