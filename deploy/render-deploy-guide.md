# Render 배포 가이드 (실전 클릭 순서)

## 전제 조건
- GitHub에 코드가 push 되어 있어야 함
- Render 계정 생성 완료 (https://render.com)
- 로컬에 PostgreSQL이 설치되어 있어야 함 (마이그레이션 파일 생성용)

---

## Step 1: Prisma 마이그레이션 파일 생성 (로컬)

Render에서 `prisma migrate deploy`를 실행하려면 마이그레이션 파일이 필요함.
로컬에서 먼저 생성:

```bash
cd backend

# 로컬 PostgreSQL에 .env의 DATABASE_URL이 연결 가능한 상태에서:
npx prisma migrate dev --name init

# 마이그레이션 파일 생성 확인
ls prisma/migrations/
# → 20260318_init/ 디렉토리가 생성됨
```

---

## Step 2: GitHub에 코드 Push

```bash
git add .
git commit -m "deploy: production ready with migration"
git push origin main
```

---

## Step 3: Render에서 PostgreSQL 생성

1. https://dashboard.render.com 접속
2. 상단 [New +] 클릭
3. [PostgreSQL] 선택
4. 설정 입력:
   - Name: `store-ops-db`
   - Database: `store_ops`
   - User: `store_ops_user`
   - Region: `Oregon (US West)` (또는 가까운 리전)
   - Plan: `Free` (테스트용) 또는 `Starter` (프로덕션)
5. [Create Database] 클릭
6. 생성 완료 후 **Internal Database URL** 복사해둠
   - 형식: `postgresql://store_ops_user:xxxxx@dpg-xxxxx/store_ops`
   - ⚠️ External이 아닌 **Internal** URL 사용 (같은 Render 네트워크)

---

## Step 4: 백엔드 Web Service 생성

1. Dashboard → [New +] → [Web Service]
2. [Build and deploy from a Git repository] 선택 → [Next]
3. GitHub 리포지토리 연결 → 해당 repo 선택
4. 설정 입력:

| 항목 | 값 |
|---|---|
| Name | `store-ops-api` |
| Region | PostgreSQL과 동일 리전 |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | `Node` |
| Build Command | `npm install && npx prisma generate && npx prisma migrate deploy && npm run build` |
| Start Command | `npm run start:prod` |
| Plan | `Free` 또는 `Starter` |

5. [Advanced] 펼치기 → [Add Environment Variable] 클릭
6. 환경변수 하나씩 추가:

| Key | Value |
|---|---|
| `DATABASE_URL` | Step 2에서 복사한 Internal Database URL |
| `JWT_SECRET` | 터미널에서 `openssl rand -base64 48` 실행한 결과 |
| `JWT_REFRESH_SECRET` | 다시 `openssl rand -base64 48` 실행한 결과 (위와 다른 값) |
| `JWT_EXPIRATION` | `15m` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `CORS_ORIGIN` | `https://store-ops-frontend.onrender.com` (Step 5에서 확정 후 수정) |

7. [Create Web Service] 클릭
8. 빌드 로그 확인 — 약 2~3분 소요
9. 배포 완료 후 URL 확인: `https://store-ops-api.onrender.com`
10. 브라우저에서 `https://store-ops-api.onrender.com/auth/me` 접속 → `401 Unauthorized` 응답이면 정상

---

## Step 5: 프론트엔드 환경변수 수정

배포 전에 프론트엔드의 API URL을 백엔드 Render URL로 변경해야 함.

`frontend/.env.production` 파일 수정:

```env
VITE_API_BASE_URL=https://store-ops-api.onrender.com
```

⚠️ 중요: Render Static Site에서는 Vite dev server의 proxy가 동작하지 않음.
프로덕션에서는 프론트가 백엔드 URL을 직접 호출해야 함.
따라서 `/api`가 아닌 백엔드의 전체 URL을 지정.

```bash
# 변경 후 push
git add frontend/.env.production
git commit -m "fix: set production API URL for Render"
git push origin main
```

---

## Step 6: 프론트엔드 Static Site 생성

1. Dashboard → [New +] → [Static Site]
2. 같은 GitHub 리포지토리 선택
3. 설정 입력:

| 항목 | 값 |
|---|---|
| Name | `store-ops-frontend` |
| Branch | `main` |
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

4. [Create Static Site] 클릭
5. 빌드 완료 대기 — 약 1~2분

---

## Step 7: SPA Rewrite Rule 설정

React Router가 동작하려면 모든 경로를 index.html로 보내야 함.

1. 프론트엔드 Static Site 대시보드 진입
2. 좌측 메뉴 [Redirects/Rewrites] 클릭
3. [Add Rule] 클릭:

| Source | Destination | Action |
|---|---|---|
| `/*` | `/index.html` | `Rewrite` |

4. [Save Changes] 클릭

---

## Step 8: CORS_ORIGIN 최종 수정

프론트엔드 URL이 확정되었으므로 백엔드 환경변수를 업데이트.

1. 백엔드 Web Service 대시보드 진입
2. 좌측 메뉴 [Environment] 클릭
3. `CORS_ORIGIN` 값을 프론트엔드 실제 URL로 수정:
   - 예: `https://store-ops-frontend.onrender.com`
4. [Save Changes] 클릭
5. 자동으로 재배포 시작됨

---

## Step 9: 동작 확인

1. `https://store-ops-frontend.onrender.com` 접속
2. 로그인 페이지 표시 확인
3. 브라우저 DevTools → Network 탭 열기
4. 로그인 시도 → `/auth/login` 요청이 `https://store-ops-api.onrender.com/auth/login`으로 가는지 확인
5. CORS 에러 없이 응답 오면 성공

---

## 트러블슈팅

### CORS 에러 발생 시
- 백엔드 Environment에서 `CORS_ORIGIN` 값이 프론트엔드 URL과 정확히 일치하는지 확인
- URL 끝에 `/` 없어야 함: `https://store-ops-frontend.onrender.com` (O)
- `https://store-ops-frontend.onrender.com/` (X)

### 502 Bad Gateway
- 백엔드 빌드 로그 확인 (Logs 탭)
- `DATABASE_URL`이 Internal URL인지 확인
- Free 플랜은 15분 비활성 시 sleep → 첫 요청에 30초 정도 걸림

### Prisma 마이그레이션 실패
- Build Command에 `npx prisma migrate deploy`가 포함되어 있는지 확인
- `DATABASE_URL`이 올바른지 확인
- 마이그레이션 파일이 `backend/prisma/migrations/` 에 있는지 확인
- 최초 배포 시 마이그레이션 파일이 없으면 로컬에서 먼저 생성:
  ```bash
  cd backend
  npx prisma migrate dev --name init
  git add prisma/migrations
  git commit -m "add initial migration"
  git push origin main
  ```

### 프론트엔드 빈 화면
- Redirects/Rewrites에 `/* → /index.html (Rewrite)` 설정 확인
- 브라우저 콘솔에서 JS 에러 확인

### Free 플랜 제한
- Web Service: 15분 비활성 시 sleep, 월 750시간
- PostgreSQL: 1GB 저장, 90일 후 삭제
- Static Site: 무제한 (CDN)
- 프로덕션에서는 Starter 플랜 이상 권장

---

## 배포 후 최초 데이터 설정

DB가 비어있으므로 Seed 데이터가 필요함.
Render Shell 또는 로컬에서 External DB URL로 접속하여 초기 사용자 생성:

```bash
# 로컬에서 External Database URL 사용
DATABASE_URL="postgresql://store_ops_user:xxxxx@dpg-xxxxx.oregon-postgres.render.com/store_ops" \
npx prisma db seed
```

또는 Render 대시보드 → 백엔드 Web Service → [Shell] 탭에서:
```bash
npx prisma db seed
```

(seed 스크립트가 아직 미구현이면 직접 SQL로 초기 사용자/매장 생성 필요)

---

## 전체 소요 시간: 약 15~20분
