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

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. Supabase 대시보드에 들어가서: 왼쪽 메뉴에서 SQL Editor 를 선택하고`server/supabase-schema.sql` 파일 내용을 복사해 붙여넣은 뒤 
Run 버튼으로 실행하면 해당 프로젝트의 PostgreSQL DB에 tasks 테이블 등이 생성.
3. 프로젝트 설정에서 API URL과 anon key를 복사하여 `.env` 파일에 설정

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
업무 목록 조회

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

### GET /health
서버 상태 확인
