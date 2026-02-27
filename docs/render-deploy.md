# Render Deploy Runbook (P6ix-groupware)

## 1) Blueprint 배포
1. 이 저장소 변경사항을 원격 브랜치에 push 한다.
2. Render Dashboard > New + > Blueprint 를 선택한다.
3. 이 저장소를 연결하고 루트의 `render.yaml`을 적용한다.
4. 생성될 리소스:
- `p6ix-backend` (Django + Daphne)
- `p6ix-frontend` (Vite static)
- `p6ix-db` (Postgres)

## 2) 필수 환경변수 확인
`render.yaml` 기본값은 `onrender.com` 도메인 기준이다. 커스텀 도메인 사용 시 아래 값을 실제 도메인으로 수정한다.

- Backend
  - `ALLOWED_HOSTS` = `api.your-domain.com,p6ix-backend.onrender.com`
  - `CORS_ALLOWED_ORIGINS` = `https://app.your-domain.com,https://p6ix-frontend.onrender.com`
  - `CSRF_TRUSTED_ORIGINS` = `https://app.your-domain.com,https://p6ix-frontend.onrender.com`

- Frontend
  - `REACT_APP_API_BASE` = `https://api.your-domain.com/api`
  - `REACT_APP_WS_BASE` = `wss://api.your-domain.com`

## 3) 도메인 연결
1. Frontend 서비스에 `app.your-domain.com` 추가
2. Backend 서비스에 `api.your-domain.com` 추가
3. DNS에서 Render가 안내한 CNAME 설정
4. TLS 발급 완료 후 환경변수 URL을 커스텀 도메인으로 재확인

## 4) DB 운영
- Render Postgres 내부 연결은 `DATABASE_URL` 자동 주입
- 운영 전환 전 데이터 이전이 필요하면 로컬/기존 DB에서 dump 후 restore

## 5) 롤백
- 앱 코드 롤백: 서비스 Events에서 직전 성공 Deploy로 Rollback
- DB 롤백: Postgres Recovery(PITR)로 특정 시점 복구 후 `DATABASE_URL` 전환

## 6) 배포 후 점검
- `GET /healthz/` 200 확인
- 로그인/토큰 갱신 API 확인
- WebSocket 채팅 연결 확인 (`/ws/chat/`)
- 정적 리소스 및 업로드 파일(media) 확인
