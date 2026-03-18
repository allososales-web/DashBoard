# 배포 가이드

## 공통 사전 준비

```bash
# 1. JWT Secret 생성 (프로덕션용)
openssl rand -base64 48  # JWT_SECRET
openssl rand -base64 48  # JWT_REFRESH_SECRET

# 2. PostgreSQL 데이터베이스 생성
createdb store_ops

# 3. Prisma 마이그레이션 실행
cd backend
npx prisma migrate deploy
npx prisma generate
```

---

## 방법 1: Railway / Render (간편 배포)

### Railway

```bash
# 1. Railway CLI 설치
npm install -g @railway/cli
railway login

# 2. 프로젝트 생성
railway init

# 3. PostgreSQL 추가
railway add --plugin postgresql

# 4. 환경변수 설정
railway variables set JWT_SECRET="$(openssl rand -base64 48)"
railway variables set JWT_REFRESH_SECRET="$(openssl rand -base64 48)"
railway variables set JWT_EXPIRATION="15m"
railway variables set NODE_ENV="production"
railway variables set CORS_ORIGIN="https://your-app.railway.app"
# DATABASE_URL은 PostgreSQL 플러그인이 자동 설정

# 5. 백엔드 배포 (backend 디렉토리)
cd backend
railway up

# 6. 프론트엔드 배포 (frontend 디렉토리)
cd ../frontend
# .env.production에서 VITE_API_BASE_URL을 Railway 백엔드 URL로 변경
# VITE_API_BASE_URL=https://your-backend.railway.app
npm run build
railway up
```

### Render

1. GitHub 리포지토리 연결
2. 백엔드 Web Service 생성:
   - Root Directory: `backend`
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm run start:prod`
   - Environment: Node
3. PostgreSQL 데이터베이스 생성 (Render Dashboard)
4. 환경변수 설정:
   - `DATABASE_URL`: Render PostgreSQL Internal URL
   - `JWT_SECRET`: 랜덤 문자열
   - `JWT_REFRESH_SECRET`: 랜덤 문자열
   - `JWT_EXPIRATION`: `15m`
   - `NODE_ENV`: `production`
   - `CORS_ORIGIN`: 프론트엔드 URL
5. 프론트엔드 Static Site 생성:
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Rewrite Rule: `/*` → `/index.html` (SPA)

---

## 방법 2: EC2 + Nginx (실무형 배포)

### Step 1: EC2 인스턴스 준비

```bash
# Ubuntu 22.04 LTS 기준
sudo apt update && sudo apt upgrade -y

# Node.js 20 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 설치
sudo npm install -g pm2

# Nginx 설치
sudo apt install -y nginx

# PostgreSQL 설치 (또는 RDS 사용)
sudo apt install -y postgresql postgresql-contrib
```

### Step 2: PostgreSQL 설정

```bash
sudo -u postgres psql
CREATE USER store_ops_user WITH PASSWORD 'STRONG_PASSWORD';
CREATE DATABASE store_ops OWNER store_ops_user;
\q
```

### Step 3: 프로젝트 배포

```bash
# 코드 클론
cd /var/www
git clone https://github.com/your-repo/store-ops.git
cd store-ops

# 백엔드 빌드
cd backend
cp .env.production .env  # 환경변수 편집
npm install --production
npx prisma migrate deploy
npx prisma generate
npm run build

# 프론트엔드 빌드
cd ../frontend
npm install
npm run build
```

### Step 4: PM2로 백엔드 실행

```bash
cd /var/www/store-ops
pm2 start deploy/ecosystem.config.js --env production
pm2 save
pm2 startup  # 부팅 시 자동 시작
```

### Step 5: Nginx 설정

```bash
# Nginx 설정 복사
sudo cp deploy/nginx.conf /etc/nginx/sites-available/store-ops
sudo ln -s /etc/nginx/sites-available/store-ops /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# SSL 인증서 (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# Nginx 재시작
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: 확인

```bash
# 백엔드 상태 확인
pm2 status
pm2 logs store-ops-api

# 헬스체크
curl https://your-domain.com/api/auth/me  # 401 응답이면 정상

# 프론트엔드 확인
curl https://your-domain.com  # HTML 응답
```

---

## Prisma 마이그레이션 절차

```bash
cd backend

# 개발 환경: 새 마이그레이션 생성
npx prisma migrate dev --name init

# 프로덕션 환경: 마이그레이션 적용만
npx prisma migrate deploy

# Prisma Client 재생성
npx prisma generate

# DB 상태 확인
npx prisma migrate status
```

---

## 보안 체크리스트

- [ ] JWT_SECRET: 최소 32자 랜덤 문자열 (`openssl rand -base64 48`)
- [ ] JWT_REFRESH_SECRET: JWT_SECRET과 다른 별도 랜덤 문자열
- [ ] DATABASE_URL: 프로덕션 DB에 SSL 연결 (`?sslmode=require`)
- [ ] CORS_ORIGIN: 프론트엔드 도메인만 허용 (와일드카드 금지)
- [ ] HTTPS 필수 (Let's Encrypt 또는 CloudFront)
- [ ] .env 파일 .gitignore에 포함 확인
- [ ] bcrypt salt rounds: 기본 10 (현재 설정 OK)
- [ ] Refresh Token Rotation: 구현됨 (사용 후 즉시 폐기)
- [ ] Rate Limiting: 프로덕션에서 추가 권장 (`@nestjs/throttler`)
