# 무료 배포 가이드 (Vercel + Render + Neon)

완전 무료 조합으로 프로덕션 배포하는 가이드.

| 서비스 | 역할 | 무료 제한 |
|---|---|---|
| Neon | PostgreSQL DB | 0.5GB 저장, 삭제 없음 |
| Render | 백엔드 (NestJS) | 월 750시간, 15분 비활성 시 sleep |
| Vercel | 프론트엔드 (React) | 무제한 CDN, 자동 SPA 라우팅 |

> Render PostgreSQL은 90일 후 자동 삭제됨. Neon은 삭제 없이 무료 유지.

---

## 전제 조건

- GitHub에 코드가 push 되어 있어야 함
- 로컬에 Node.js, npm 설치
- 로컬에 PostgreSQL 설치 (마이그레이션 파일 생성용, 선택사항)

---

## Step 1: Prisma 마이그레이션 파일 생성 (로컬)

배포 시 `prisma migrate deploy`를 실행하려면 마이그레이션 파일이 필요함.

```bash
cd backend

# 로컬 PostgreSQL이 있는 경우:
npx prisma migrate dev --name init

# 로컬 PostgreSQL이 없는 경우:
# → Step 2에서 Neon DB 생성 후, Neon 연결 문자열로 실행 가능
# DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/store_ops?sslmode=require" npx prisma migrate dev --name init

# 마이그레이션 파일 확인
ls prisma/migrations/
```

```bash
git add prisma/migrations
git commit -m "add initial prisma migration"
git push origin main
```

---

## Step 2: Neon PostgreSQL 생성

1. https://neon.tech 접속 → [Sign Up] (GitHub 로그인 가능)
2. [Create a project] 클릭
3. 설정:
   - Project name: `store-ops`
   - Postgres version: `16` (기본값)
   - Region: `US East (Ohio)` 또는 가까운 리전
4. [Create project] 클릭
5. 연결 문자열이 표시됨 — 복사해둠:

```
postgresql://store_ops_owner:xxxx@ep-cool-name-12345.us-east-2.aws.neon.tech/store_ops?sslmode=require
```

> ⚠️ `?sslmode=require` 가 반드시 포함되어야 함. Neon은 SSL 필수.

6. 왼쪽 메뉴 [Dashboard] → Connection string 언제든 다시 확인 가능

---

## Step 3: 마이그레이션 파일이 없는 경우 (Step 1 건너뛴 경우)

로컬 PostgreSQL이 없어서 Step 1을 건너뛴 경우, Neon DB로 마이그레이션 생성:

```bash
cd backend
DATABASE_URL="여기에_Step2에서_복사한_Neon_연결문자열" npx prisma migrate dev --name init
git add prisma/migrations
git commit -m "add initial prisma migration"
git push origin main
```

---

## Step 4: Render 백엔드 Web Service 생성

1. https://dashboard.render.com 접속 → 로그인
2. [New +] → [Web Service]
3. [Build and deploy from a Git repository] → [Next]
4. GitHub 리포지토리 연결 → 해당 repo 선택
5. 설정:

| 항목 | 값 |
|---|---|
| Name | `store-ops-api` |
| Region | `Oregon (US West)` |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | `Node` |
| Build Command | `npm install && npx prisma generate && npx prisma migrate deploy && npm run build` |
| Start Command | `npm run start:prod` |
| Plan | `Free` |

6. [Advanced] → [Add Environment Variable]:

| Key | Value |
|---|---|
| `DATABASE_URL` | Step 2에서 복사한 Neon 연결 문자열 |
| `JWT_SECRET` | `openssl rand -base64 48` 결과 |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 48` 결과 (위와 다른 값) |
| `JWT_EXPIRATION` | `15m` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `CORS_ORIGIN` | `https://store-ops.vercel.app` (Step 6에서 확정 후 수정) |

7. [Create Web Service] 클릭
8. 빌드 로그 확인 — 약 3~5분 소요
9. 배포 완료 후 URL 확인: `https://store-ops-api.onrender.com`
10. 브라우저에서 `https://store-ops-api.onrender.com/auth/me` → `401 Unauthorized` 응답이면 정상

---

## Step 5: 프론트엔드 환경변수 수정

`frontend/.env.production` 수정:

```env
VITE_API_BASE_URL=https://store-ops-api.onrender.com
```

> ⚠️ Vercel에서는 Vite dev server proxy가 동작하지 않음.
> `/api`가 아닌 백엔드 전체 URL을 지정해야 함.

```bash
git add frontend/.env.production
git commit -m "set production API URL for Vercel deployment"
git push origin main
```

---

## Step 6: Vercel 프론트엔드 배포

1. https://vercel.com 접속 → [Sign Up] (GitHub 로그인)
2. [Add New...] → [Project]
3. GitHub 리포지토리 Import
4. 설정:

| 항목 | 값 |
|---|---|
| Project Name | `store-ops` |
| Framework Preset | `Vite` |
| Root Directory | `frontend` (Edit 클릭하여 변경) |
| Build Command | `npm run build` (자동 감지됨) |
| Output Directory | `dist` (자동 감지됨) |

5. [Deploy] 클릭
6. 빌드 완료 대기 — 약 1~2분
7. 배포 URL 확인: `https://store-ops.vercel.app` (또는 자동 생성된 URL)

> Vercel은 SPA 라우팅을 자동 처리함. 별도 rewrite 설정 불필요.
> 단, 확실하게 하려면 `vercel.json`을 추가 (아래 Step 7).

---

## Step 7: vercel.json 생성 (선택사항)

Vercel은 프레임워크 감지로 SPA 라우팅을 자동 처리하지만, 명시적으로 설정하려면:

프로젝트 루트에 `frontend/vercel.json` 생성:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

```bash
git add frontend/vercel.json
git commit -m "add vercel.json for SPA routing"
git push origin main
# Vercel이 자동으로 재배포
```

---

## Step 8: CORS_ORIGIN 최종 수정

Vercel 프론트엔드 URL이 확정되었으므로 Render 백엔드 환경변수 업데이트.

1. https://dashboard.render.com → 백엔드 Web Service 클릭
2. 좌측 [Environment] 클릭
3. `CORS_ORIGIN` 값을 Vercel 프론트엔드 URL로 수정:
   - 예: `https://store-ops.vercel.app`
   - URL 끝에 `/` 없어야 함
4. [Save Changes] 클릭
5. 자동 재배포 시작

---

## Step 9: 동작 확인

1. `https://store-ops.vercel.app` 접속
2. 로그인 페이지 표시 확인
3. 브라우저 DevTools → Network 탭
4. 로그인 시도 → 요청이 `https://store-ops-api.onrender.com/auth/login`으로 가는지 확인
5. CORS 에러 없이 응답 오면 성공

> 첫 요청 시 Render Free 플랜은 sleep 상태에서 깨어나느라 30초~1분 걸릴 수 있음.

---

## 트러블슈팅

### CORS 에러
- Render 환경변수 `CORS_ORIGIN`이 Vercel URL과 정확히 일치하는지 확인
- `https://store-ops.vercel.app` (O) / `https://store-ops.vercel.app/` (X)
- Vercel이 자동 생성한 URL (예: `store-ops-abc123.vercel.app`)도 추가해야 할 수 있음
- 여러 도메인: `CORS_ORIGIN=https://store-ops.vercel.app,https://store-ops-abc123.vercel.app`

### Neon 연결 실패
- `?sslmode=require`가 연결 문자열에 포함되어 있는지 확인
- Neon Dashboard에서 연결 문자열 재확인
- Render 환경변수 `DATABASE_URL` 값에 따옴표가 포함되지 않았는지 확인

### Render 502 Bad Gateway
- Logs 탭에서 빌드/런타임 에러 확인
- `DATABASE_URL`이 Neon External URL인지 확인 (Render와 Neon은 다른 네트워크)
- Free 플랜 sleep 후 첫 요청은 30초~1분 소요

### Vercel 빌드 실패
- Root Directory가 `frontend`로 설정되어 있는지 확인
- `tsc -b` 에러 시: TypeScript 에러 수정 후 재배포
- Vercel Dashboard → Deployments → 빌드 로그 확인

### Prisma 마이그레이션 실패
- `prisma/migrations/` 폴더가 Git에 포함되어 있는지 확인
- Build Command에 `npx prisma migrate deploy`가 있는지 확인

---

## 각 서비스 무료 제한 정리

| 서비스 | 제한 | 비고 |
|---|---|---|
| Neon | 0.5GB 저장, 1 프로젝트, 10 브랜치 | 삭제 없음, 자동 suspend |
| Render Free Web Service | 월 750시간, 15분 비활성 시 sleep | 첫 요청 시 cold start 30초~1분 |
| Vercel Hobby | 월 100GB 대역폭, 빌드 6000분 | CDN 자동, SPA 자동 |

---

## 배포 후 초기 데이터

DB가 비어있으므로 초기 사용자/매장 데이터가 필요함.

```bash
# 로컬에서 Neon External URL로 seed 실행
cd backend
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/store_ops?sslmode=require" npx prisma db seed
```

seed 스크립트가 미구현이면 Neon SQL Editor에서 직접 INSERT:

1. Neon Dashboard → [SQL Editor]
2. 초기 사용자, 매장 데이터 INSERT 쿼리 실행

---

## 전체 소요 시간: 약 15~20분
