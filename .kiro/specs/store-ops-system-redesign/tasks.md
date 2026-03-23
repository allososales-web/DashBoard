# 구현 계획: 매장 운영 시스템 재설계 (Store Ops System Redesign)

## 개요

기존 단일 HTML 파일 기반 프로토타입을 NestJS + React + PostgreSQL 기반 서버 중심 아키텍처로 재설계한다. 핵심 원칙: store_id 기반 접근 제어, 서버 KPI 계산, 클라이언트 DB 직접 접근 금지, JWT + Roles + StoreAccessGuard 적용, 계약 취소 로직 반영. 구현 우선순위: auth → stores → dashboard → quotes → contracts → 나머지 도메인.

## Tasks

- [x] 1. 프로젝트 초기 설정 및 Prisma 스키마 구성
  - [x] 1.1 NestJS 프로젝트 구조 생성 및 공통 의존성 설치
    - `backend/` 디렉토리에 NestJS 프로젝트 생성 (`@nestjs/cli`)
    - `@nestjs/config`, `@nestjs/passport`, `@nestjs/jwt`, `passport-jwt`, `passport-local`, `bcrypt`, `class-validator`, `class-transformer`, `uuid`, `prisma`, `@prisma/client` 설치
    - `src/main.ts`에 글로벌 ValidationPipe, CORS 설정
    - `.env.example` 파일 생성 (DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET)
    - _Requirements: 20.7_

  - [x] 1.2 Prisma 스키마 정의 및 마이그레이션 실행
    - `prisma/schema.prisma`에 설계 문서 섹션 12의 전체 스키마 작성
    - Enum 정의: Role, PermissionLevel, Collection, ConsultStatus, QuoteStatus, ContractStatus, MemoCatagory, IssuePriority, IssueStatus, ShiftType, DeliveryStatus, NoticePriority
    - 모든 모델 정의: User, UserRole, UserStorePermission, RefreshToken, Store, StoreAuth, MonthlyMetric, MonthlyGoal, Consult, Quote, QuoteItem, Contract, ContractItem, ContractCancellation, Memo, Issue, Staff, Schedule, Delivery, HqNotice, HqEvent, HqDeliveryRule, AuditLog
    - UNIQUE 제약 조건 적용: `(storeId, year, month)` on MonthlyMetric/MonthlyGoal, `quoteNumber`, `contractNumber`, `ContractCancellation.contractId`
    - 모든 매장 관련 테이블에 `store_id` NOT NULL FK 확인
    - `npx prisma migrate dev --name init` 실행
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_

  - [x] 1.3 PrismaModule 및 PrismaService 구현
    - `src/prisma/prisma.module.ts`: @Global() 모듈로 PrismaService 제공
    - `src/prisma/prisma.service.ts`: PrismaClient 확장, onModuleInit/onModuleDestroy 구현
    - _Requirements: 20.7_

  - [x] 1.4 공통 타입, Enum, 인터페이스 정의
    - `src/common/types/roles.enum.ts`: Role, PermissionLevel, ROLE_HIERARCHY 정의
    - `src/common/types/collections.enum.ts`: Collection enum 정의
    - `src/common/interfaces/authenticated-user.interface.ts`: AuthenticatedUser 인터페이스
    - `src/common/interfaces/jwt-payload.interface.ts`: JwtPayload 인터페이스
    - _Requirements: 2.3, 3.1_


- [x] 2. 인증/인가 공통 인프라 (Guards, Decorators, Interceptors)
  - [x] 2.1 커스텀 데코레이터 구현
    - `src/common/decorators/public.decorator.ts`: @Public() 데코레이터 (IS_PUBLIC_KEY 메타데이터)
    - `src/common/decorators/roles.decorator.ts`: @Roles(...roles) 데코레이터 (ROLES_KEY 메타데이터)
    - `src/common/decorators/current-user.decorator.ts`: @CurrentUser() 파라미터 데코레이터 (request.user 추출)
    - _Requirements: 2.1, 2.3_

  - [x] 2.2 JwtAuthGuard 구현 (전역 Guard)
    - `src/common/guards/jwt-auth.guard.ts`: AuthGuard('jwt') 확장
    - @Public() 데코레이터가 있으면 인증 건너뜀
    - JWT 서명 검증 실패 또는 만료 시 401 Unauthorized 반환
    - `app.module.ts`에서 APP_GUARD로 전역 등록
    - _Requirements: 2.1, 2.2_

  - [x] 2.3 RolesGuard 구현
    - `src/common/guards/roles.guard.ts`: ROLE_HIERARCHY 기반 역할 계층 검증
    - HQ_ADMIN(4) > STORE_MANAGER(3) > STORE_STAFF(2) > READONLY(1)
    - 요구 역할보다 낮은 역할이면 403 Forbidden 반환
    - @Roles() 데코레이터가 없으면 통과
    - _Requirements: 2.3, 2.4_

  - [x] 2.4 StoreAccessGuard 구현
    - `src/common/guards/store-access.guard.ts`: URL params의 storeId에 대한 접근 권한 검증
    - HQ_ADMIN은 모든 매장 접근 허용
    - JWT payload의 storePermissions에서 해당 storeId 권한 확인
    - 권한 없음 또는 NONE이면 403 Forbidden 반환
    - storeId 파라미터가 없으면 Guard 통과
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 2.5 Property 테스트: 역할 계층 일관성 (Property 4)
    - **Property 4: 역할 계층 일관성 (Role Hierarchy Consistency)**
    - fast-check로 임의의 두 사용자 역할 조합에 대해 상위 역할이 하위 역할의 접근 권한을 포함하는지 검증
    - **Validates: Requirements 2.3, 2.4**

  - [ ]* 2.6 Property 테스트: 매장 접근 제어 (Property 5)
    - **Property 5: 매장 접근 
제어 (Store Access Control)**
    - fast-check로 임의의 사용자/매장 조합에 대해: HQ_ADMIN은 항상 접근 가능, 권한 없는 사용자는 403 반환 검증
    - **Validates: Requirements 3.2, 3.3**

  - [x] 2.7 AuditLogInterceptor 구현
    - `src/common/interceptors/audit-log.interceptor.ts`: NestInterceptor 구현
    - GET 요청은 감사 로그 제외
    - POST/PUT/PATCH/DELETE 요청에 대해 audit_logs 테이블에 기록
    - user_id, store_id, action, resource_type, resource_id, old_value, new_value, ip_address 기록
    - `app.module.ts`에서 APP_INTERCEPTOR로 전역 등록
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 2.8 Property 테스트: 감사 로그 완전성 (Property 10)
    - **Property 10: 감사 로그 완전성 (Audit Log Completeness)**
    - fast-check로 임의의 HTTP 메서드에 대해: CUD 요청은 로그 생성, GET 요청은 로그 미생성 검증
    - **Validates: Requirements 10.1, 10.2**

  - [x] 2.9 HttpExceptionFilter 및 UuidValidationPipe 구현
    - `src/common/filters/http-exception.filter.ts`: 전역 예외 필터 (일관된 에러 응답 형식)
    - `src/common/pipes/uuid-validation.pipe.ts`: UUID 형식 검증 파이프
    - _Requirements: 20.6_

- [x] 3. Auth 모듈 구현
  - [x] 3.1 AuthModule, JwtStrategy, LocalStrategy 구현
    - `src/modules/auth/auth.module.ts`: PassportModule + JwtModule 설정 (accessToken 15분 만료)
    - `src/modules/auth/strategies/jwt.strategy.ts`: JWT payload에서 AuthenticatedUser 생성, storePermissions를 Map으로 변환
    - `src/modules/auth/strategies/local.strategy.ts`: username/password 검증
    - _Requirements: 1.1, 2.1_

  - [x] 3.2 AuthService 구현 (login, refresh, logout)
    - `src/modules/auth/auth.service.ts`:
    - `login(dto)`: 사용자 조회 → bcrypt 비밀번호 검증 → 비활성 계정 거부 → 매장 권한 조회 → JWT accessToken(15분) + refreshToken(UUID, 7일) 발급 → refresh_tokens 테이블에 저장
    - `refresh(token)`: refresh_tokens 조회 → 폐기/만료 확인 → 기존 토큰 revokedAt 설정 → 새 토큰 쌍 발급 (Refresh Token Rotation)
    - `logout(token)`: refreshToken의 revokedAt 설정
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 3.3 AuthController 구현
    - `src/modules/auth/auth.controller.ts`:
    - `POST /auth/login` (@Public): LoginDto 검증 → AuthService.login 호출
    - `POST /auth/refresh` (@Public): refreshToken 검증 → AuthService.refresh 호출
    - `POST /auth/logout`: AuthService.logout 호출
    - `GET /auth/me`: @CurrentUser()로 현재 사용자 정보 반환
    - _Requirements: 1.1, 1.4, 1.6_

  - [x] 3.4 Auth DTO 정의
    - `src/modules/auth/dto/login.dto.ts`: LoginDto (username, password 필수, class-validator)
    - `src/modules/auth/dto/refresh.dto.ts`: RefreshDto (refreshToken 필수)
    - `src/modules/auth/dto/token-response.dto.ts`: TokenResponseDto (accessToken, refreshToken, user 정보)
    - _Requirements: 1.1_

  - [ ]* 3.5 Property 테스트: 토큰 라이프사이클 (Property 6)
    - **Property 6: 토큰 라이프사이클 (Token Lifecycle)**
    - fast-check로 임의의 사용자에 대해: 로그인 시 토큰 쌍 발급, refresh 시 기존 토큰 폐기 + 새 토큰 발급, logout 후 refresh 불가 검증
    - **Validates: Requirements 1.1, 1.4, 1.6**

  - [ ]* 3.6 Auth 단위 테스트
    - 유효한 자격증명으로 로그인 성공 테스트
    - 잘못된 비밀번호로 401 반환 테스트
    - 비활성 계정으로 401 반환 테스트
    - 만료된 refreshToken으로 401 반환 테스트
    - 폐기된 refreshToken으로 401 반환 테스트
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4. Checkpoint - 인증/인가 기반 검증
  - 모든 테스트 통과 확인, 사용자에게 질문이 있으면 확인.

- [x] 5. Stores 모듈 구현
  - [x] 5.1 StoresService 구현
    - `src/modules/stores/stores.service.ts`:
    - `findAll(query)`: 검색(name/code), 지역 필터, 활성 상태 필터, 페이지네이션 지원. Prisma findMany + count로 total, page, limit, totalPages 메타 반환
    - `create(dto)`: 유니크 code 검증 후 매장 생성
    - `findOne(storeId)`: 매장 상세 조회
    - `update(storeId, dto)`: 매장 정보 수정
    - `deactivate(storeId)`: isActive=false 설정 (물리 삭제 금지)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 5.2 StoresController 구현
    - `src/modules/stores/stores.controller.ts`:
    - `GET /stores` (@Roles(HQ_ADMIN)): 매장 목록 조회 (StoreListQueryDto)
    - `POST /stores` (@Roles(HQ_ADMIN)): 매장 생성 (CreateStoreDto)
    - `GET /stores/:storeId` (@UseGuards(StoreAccessGuard), @Roles(STORE_MANAGER)): 매장 상세
    - `PUT /stores/:storeId` (@Roles(HQ_ADMIN)): 매장 수정 (UpdateStoreDto)
    - `DELETE /stores/:storeId` (@Roles(HQ_ADMIN)): 매장 비활성화
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 5.3 Stores DTO 정의
    - `src/modules/stores/dto/store-list-query.dto.ts`: search, region, isActive, page, limit
    - `src/modules/stores/dto/create-store.dto.ts`: name(필수), code(필수, 유니크), address, phone, region
    - `src/modules/stores/dto/update-store.dto.ts`: PartialType(CreateStoreDto)
    - `src/modules/stores/dto/store-response.dto.ts`: StoreResponseDto, StoreListResponseDto (data + meta)
    - _Requirements: 4.1, 4.4_

  - [ ]* 5.4 Property 테스트: 매장 데이터 격리 (Property 1)
    - **Property 1: 매장 데이터 격리 (Store Data Isolation)**
    - fast-check로 임의의 storeId에 대해 API 응답의 모든 데이터가 요청한 storeId와 일치하는지 검증
    - **Validates: Requirements 3.5**

  - [ ]* 5.5 Property 테스트: 페이지네이션 메타 정합성 (Property 11)
    - **Property 11: 페이지네이션 메타 정합성 (Pagination Meta Consistency)**
    - fast-check로 임의의 total, limit에 대해 totalPages === ceil(total / limit), 반환 데이터 수 <= limit 검증
    - **Validates: Requirements 4.4**

- [x] 6. Dashboard 모듈 구현 (KPI 계산 엔진)
  - [x] 6.1 KpiCalculatorService 구현
    - `src/modules/dashboard/kpi-calculator.service.ts`:
    - `calculateMonthlyKpi(storeId, year, month)`:
      - Step 1: 해당 월 견적 수(quoteCount) 집계 (quotes WHERE store_id, created_at 범위)
      - Step 2: 해당 월 계약 집계 (contracts WHERE store_id, contract_date 범위, status !== CANCELLED) → contractCount, contractAmount
      - Step 3: 파생 KPI 계산 - conversionRate = contractCount/quoteCount (0이면 0), avgOrderValue = contractAmount/contractCount (0이면 0)
      - Step 4: buildCollectionBreakdown(contracts) - 컬렉션별 totalAmount, itemCount, contractCount 분류
      - Step 5: monthly_metrics 테이블에 upsert (store_id, year, month 기준)
    - `calculateCollectionBreakdown(storeId, year, month)`: 컬렉션별 매출 분석
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x] 6.2 DashboardService 구현
    - `src/modules/dashboard/dashboard.service.ts`:
    - `getMetrics(storeId, year, month)`: monthly_metrics 캐시 조회 → 없으면 KpiCalculatorService 호출 → 목표 달성률 계산 포함
    - `recalculate(storeId, year, month)`: KPI 강제 재계산
    - `getKpiSummary(storeId)`: 최근 N개월 KPI 요약
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 6.3 DashboardController 구현
    - `src/modules/dashboard/dashboard.controller.ts`:
    - `GET /stores/:storeId/metrics` (@UseGuards(StoreAccessGuard, RolesGuard), @Roles(READONLY)): 월간 지표 조회
    - `GET /stores/:storeId/metrics/:year/:month`: 특정 월 지표
    - `POST /stores/:storeId/metrics/recalculate` (@Roles(STORE_MANAGER)): KPI 재계산
    - `GET /stores/:storeId/kpi/summary` (@Roles(READONLY)): KPI 요약
    - _Requirements: 6.1, 6.5_

  - [x] 6.4 Dashboard DTO 정의
    - `src/modules/dashboard/dto/metrics-response.dto.ts`: KpiResult, CollectionBreakdown, MonthlyGoalComparison
    - `src/modules/dashboard/dto/metrics-query.dto.ts`: year, month 파라미터
    - _Requirements: 5.1, 6.1_

  - [ ]* 6.5 Property 테스트: KPI 공식 정합성 (Property 2)
    - **Property 2: KPI 공식 정합성 (KPI Formula Correctness)**
    - fast-check로 임의의 quoteCount, contractCount, contractAmount에 대해:
      - CANCELLED 계약 제외 확인
      - quoteCount > 0 → conversionRate === contractCount / quoteCount
      - contractCount > 0 → avgOrderValue === contractAmount / contractCount
      - quoteCount === 0 → conversionRate === 0
      - contractCount === 0 → avgOrderValue === 0
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6, 9.5**

  - [ ]* 6.6 Property 테스트: 컬렉션 분류 합계 불변식 (Property 3)
    - **Property 3: 컬렉션 분류 합계 불변식 (Collection Breakdown Sum Invariant)**
    - fast-check로 임의의 contract_items 집합에 대해 컬렉션별 totalAmount 합계 === 전체 contractAmount 검증
    - **Validates: Requirements 5.8**

  - [ ]* 6.7 Property 테스트: KPI 저장 라운드트립 (Property 12)
    - **Property 12: KPI 저장 라운드트립 (KPI Persistence Round-Trip)**
    - fast-check로 KPI 계산 후 monthly_metrics에 upsert → 재조회 시 동일 값 반환 검증
    - **Validates: Requirements 5.9**

- [x] 7. Checkpoint - 핵심 인프라 + KPI 엔진 검증
  - 모든 테스트 통과 확인, 사용자에게 질문이 있으면 확인.

- [x] 8. Quotes 모듈 구현
  - [x] 8.1 QuotesService 구현
    - `src/modules/quotes/quotes.service.ts`:
    - `create(storeId, dto, userId)`: 트랜잭션으로 Quote + QuoteItem 원자적 생성. 견적번호 자동 생성 (QT-{storeCode}-{YYYYMM}-{seq}). totalAmount = Σ(unitPrice × quantity). consultId 제공 시 같은 storeId 소속 검증. collection enum 유효성 검증
    - `findAll(storeId, query)`: 해당 매장 견적 목록 (페이지네이션, 상태 필터)
    - `findOne(storeId, quoteId)`: 견적 상세 (quote_items 포함)
    - `update(storeId, quoteId, dto)`: 견적 수정 (DRAFT/SENT 상태만 수정 가능)
    - `remove(storeId, quoteId)`: 견적 삭제 (STORE_MANAGER 이상)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 8.2 QuotesController 구현
    - `src/modules/quotes/quotes.controller.ts`:
    - `POST /stores/:storeId/quotes` (@UseGuards(StoreAccessGuard, RolesGuard), @Roles(STORE_STAFF)): 견적 생성
    - `GET /stores/:storeId/quotes`: 견적 목록
    - `GET /stores/:storeId/quotes/:id`: 견적 상세
    - `PUT /stores/:storeId/quotes/:id`: 견적 수정
    - `DELETE /stores/:storeId/quotes/:id` (@Roles(STORE_MANAGER)): 견적 삭제
    - _Requirements: 7.1_

  - [x] 8.3 Quotes DTO 정의
    - `src/modules/quotes/dto/create-quote.dto.ts`: customerName(필수), consultId(선택), validUntil, items[](productName, collection, quantity, unitPrice)
    - `src/modules/quotes/dto/update-quote.dto.ts`: PartialType
    - `src/modules/quotes/dto/quote-response.dto.ts`: QuoteResponseDto (items 포함)
    - `src/modules/quotes/dto/quote-list-query.dto.ts`: status 필터, 페이지네이션
    - _Requirements: 7.1, 7.6_

  - [ ]* 8.4 Property 테스트: 총액 계산 불변식 - 견적 (Property 7)
    - **Property 7: 총액 계산 불변식 (Total Amount Calculation Invariant)**
    - fast-check로 임의의 견적 항목 목록에 대해 totalAmount === Σ(unitPrice × quantity) 검증
    - **Validates: Requirements 7.3**

- [x] 9. Contracts 모듈 구현 (취소 로직 포함)
  - [x] 9.1 ContractsService 구현
    - `src/modules/contracts/contracts.service.ts`:
    - `create(storeId, dto, userId)`: 트랜잭션으로 Contract + ContractItem 원자적 생성. 계약번호 자동 생성 (CT-{storeCode}-{YYYYMM}-{seq}). quoteId 제공 시: 견적 항목 → 계약 항목 복사, 견적 상태 ACCEPTED로 변경 (ACCEPTED/REJECTED/EXPIRED이면 409 Conflict). quoteId 미제공 시: dto.items 필수 (비어있으면 400). totalAmount = Σ(unitPrice × quantity). 생성 후 KpiCalculatorService.calculateMonthlyKpi 호출
    - `findAll(storeId, query)`: 해당 매장 계약 목록 (페이지네이션, 상태 필터)
    - `findOne(storeId, contractId)`: 계약 상세 (contract_items, cancellation 포함)
    - `update(storeId, contractId, dto)`: 계약 수정 (STORE_MANAGER 이상)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 9.2 계약 취소 로직 구현
    - `cancel(storeId, contractId, dto, userId)`:
      - 이미 CANCELLED인 계약이면 409 Conflict 반환
      - refundAmount > contract.totalAmount이면 400 Bad Request 반환
      - refundAmount 미제공 시 contract.totalAmount를 기본값으로 사용
      - 트랜잭션으로: contract.status = CANCELLED + contract_cancellations INSERT (동일 contract_id UNIQUE 제약)
      - 취소 후 KpiCalculatorService.calculateMonthlyKpi 호출하여 KPI 재계산
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 9.3 ContractsController 구현
    - `src/modules/contracts/contracts.controller.ts`:
    - `POST /stores/:storeId/contracts` (@UseGuards(StoreAccessGuard, RolesGuard), @Roles(STORE_STAFF)): 계약 생성
    - `GET /stores/:storeId/contracts`: 계약 목록
    - `GET /stores/:storeId/contracts/:id`: 계약 상세
    - `PUT /stores/:storeId/contracts/:id` (@Roles(STORE_MANAGER)): 계약 수정
    - `POST /stores/:storeId/contracts/:id/cancel` (@Roles(STORE_MANAGER)): 계약 취소
    - _Requirements: 8.1, 9.1_

  - [x] 9.4 Contracts DTO 정의
    - `src/modules/contracts/dto/create-contract.dto.ts`: customerName(필수), quoteId(선택), contractDate(필수), deliveryDate(선택), items[](quoteId 없을 때 필수)
    - `src/modules/contracts/dto/cancel-contract.dto.ts`: reason(필수), refundAmount(선택), cancelledDate(필수)
    - `src/modules/contracts/dto/contract-response.dto.ts`: ContractResponseDto (items, cancellation 포함)
    - _Requirements: 8.1, 9.1_

  - [ ]* 9.5 Property 테스트: 견적-계약 전환 충실도 (Property 8)
    - **Property 8: 견적-계약 전환 충실도 (Quote-to-Contract Copy Fidelity)**
    - fast-check로 임의의 견적 기반 계약 생성에 대해: 계약 항목이 원본 견적 항목과 동일한 productName, collection, quantity, unitPrice를 가지며, 견적 상태가 ACCEPTED로 변경되는지 검증
    - **Validates: Requirements 8.2**

  - [ ]* 9.6 Property 테스트: 계약 취소 원자성 (Property 9)
    - **Property 9: 계약 취소 원자성 (Contract Cancellation Atomicity)**
    - fast-check로 임의의 유효한 계약 취소에 대해: contract.status === CANCELLED, contract_cancellations 정확히 1건 생성, 두 변경이 원자적으로 수행되는지 검증
    - **Validates: Requirements 9.1, 9.6**

  - [ ]* 9.7 Property 테스트: 총액 계산 불변식 - 계약 (Property 7)
    - **Property 7: 총액 계산 불변식 (Total Amount Calculation Invariant)**
    - fast-check로 임의의 계약 항목 목록에 대해 totalAmount === Σ(unitPrice × quantity) 검증
    - **Validates: Requirements 8.6**

- [x] 10. Checkpoint - 핵심 영업 도메인 검증
  - 모든 테스트 통과 확인, 사용자에게 질문이 있으면 확인.

- [x] 11. Consults 모듈 구현
  - [x] 11.1 ConsultsService 구현
    - `src/modules/consults/consults.service.ts`:
    - `create(storeId, dto, userId)`: 상담 기록 생성 (store_id 바인딩)
    - `findAll(storeId, query)`: 해당 매장 상담 목록 (상태 필터, 날짜 범위, 페이지네이션)
    - `findOne(storeId, consultId)`: 상담 상세 (연결된 quotes 포함)
    - `update(storeId, consultId, dto)`: 상담 수정
    - `remove(storeId, consultId)`: 상담 삭제 (STORE_MANAGER 이상)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 11.2 ConsultsController 및 DTO 구현
    - `src/modules/consults/consults.controller.ts`: CRUD 엔드포인트 (@UseGuards(StoreAccessGuard, RolesGuard))
    - `src/modules/consults/dto/create-consult.dto.ts`: customerName(필수), customerPhone, customerEmail, notes, consultDate(필수), assignedTo
    - `src/modules/consults/dto/consult-response.dto.ts`
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 12. Goals 모듈 구현
  - [x] 12.1 GoalsService 및 GoalsController 구현
    - `src/modules/goals/goals.service.ts`:
    - `create(storeId, dto, userId)`: 월간 목표 설정 (store_id, year, month UNIQUE 제약)
    - `findByMonth(storeId, year, month)`: 특정 월 목표 조회
    - `update(storeId, goalId, dto)`: 목표 수정
    - `src/modules/goals/goals.controller.ts`: CRUD 엔드포인트 (@Roles(STORE_MANAGER) for CUD, @Roles(READONLY) for read)
    - `src/modules/goals/dto/create-goal.dto.ts`: year, month, targetAmount, targetContracts, targetConsults, customGoals
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 13. Memos 모듈 구현
  - [x] 13.1 MemosService 및 MemosController 구현
    - `src/modules/memos/memos.service.ts`: CRUD (store_id 바인딩, 카테고리 필터, 고정 메모 우선 정렬)
    - `src/modules/memos/memos.controller.ts`: CRUD 엔드포인트 (@Roles(STORE_STAFF) for CRU, @Roles(STORE_MANAGER) for delete)
    - `src/modules/memos/dto/create-memo.dto.ts`: title(필수), content, category(GENERAL|IMPORTANT|TODO), isPinned
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 14. Issues 모듈 구현
  - [x] 14.1 IssuesService 및 IssuesController 구현
    - `src/modules/issues/issues.service.ts`: CRUD + 상태 변경 (store_id 바인딩, 우선순위/상태 필터)
    - `src/modules/issues/issues.controller.ts`:
    - `GET /stores/:storeId/issues` (@Roles(READONLY)): 이슈 목록
    - `POST /stores/:storeId/issues` (@Roles(STORE_STAFF)): 이슈 생성
    - `PUT /stores/:storeId/issues/:id` (@Roles(STORE_STAFF)): 이슈 수정
    - `PATCH /stores/:storeId/issues/:id/status` (@Roles(STORE_MANAGER)): 상태 변경
    - `src/modules/issues/dto/create-issue.dto.ts`: title(필수), description, priority(LOW|MEDIUM|HIGH|CRITICAL), assignedTo
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 15. Staffs 모듈 구현
  - [x] 15.1 StaffsService 및 StaffsController 구현
    - `src/modules/staffs/staffs.service.ts`: CRUD (store_id 바인딩, 비활성화=soft delete)
    - `src/modules/staffs/staffs.controller.ts`:
    - `GET /stores/:storeId/staffs` (@Roles(STORE_STAFF)): 직원 목록
    - `POST /stores/:storeId/staffs` (@Roles(STORE_MANAGER)): 직원 등록
    - `PUT /stores/:storeId/staffs/:id` (@Roles(STORE_MANAGER)): 직원 수정
    - `DELETE /stores/:storeId/staffs/:id` (@Roles(STORE_MANAGER)): 직원 비활성화 (isActive=false)
    - `src/modules/staffs/dto/create-staff.dto.ts`: name(필수), phone, position, hireDate
    - _Requirements: 15.1, 15.2, 15.3_

- [x] 16. Schedules 모듈 구현
  - [x] 16.1 SchedulesService 및 SchedulesController 구현
    - `src/modules/schedules/schedules.service.ts`: CRUD (store_id 바인딩, staffId 검증, 날짜 범위 조회)
    - `src/modules/schedules/schedules.controller.ts`:
    - `GET /stores/:storeId/schedules` (@Roles(STORE_STAFF)): 스케줄 조회
    - `POST /stores/:storeId/schedules` (@Roles(STORE_MANAGER)): 스케줄 등록
    - `PUT /stores/:storeId/schedules/:id` (@Roles(STORE_MANAGER)): 스케줄 수정
    - `DELETE /stores/:storeId/schedules/:id` (@Roles(STORE_MANAGER)): 스케줄 삭제
    - `src/modules/schedules/dto/create-schedule.dto.ts`: staffId(필수), workDate(필수), startTime, endTime, shiftType(MORNING|AFTERNOON|FULL|OFF), notes
    - _Requirements: 16.1, 16.2, 16.3_

- [x] 17. Deliveries 모듈 구현
  - [x] 17.1 DeliveriesService 및 DeliveriesController 구현
    - `src/modules/deliveries/deliveries.service.ts`: CRUD + 상태 변경 (store_id 바인딩, contractId 연결 선택)
    - `src/modules/deliveries/deliveries.controller.ts`:
    - `GET /stores/:storeId/deliveries` (@Roles(STORE_STAFF)): 배송 목록
    - `POST /stores/:storeId/deliveries` (@Roles(STORE_STAFF)): 배송 등록
    - `PUT /stores/:storeId/deliveries/:id` (@Roles(STORE_STAFF)): 배송 수정
    - `PATCH /stores/:storeId/deliveries/:id/status` (@Roles(STORE_STAFF)): 배송 상태 변경 (SCHEDULED→IN_TRANSIT→DELIVERED|FAILED)
    - `src/modules/deliveries/dto/create-delivery.dto.ts`: customerName(필수), scheduledDate(필수), contractId(선택), address, notes
    - _Requirements: 17.1, 17.2, 17.3_

- [x] 18. Checkpoint - 운영 도메인 검증
  - 모든 테스트 통과 확인, 사용자에게 질문이 있으면 확인.

- [x] 19. HQ 모듈 구현
  - [x] 19.1 HqService 및 HqController 구현
    - `src/modules/hq/hq.service.ts`:
    - 공지사항 CRUD: create/findAll/update/remove (HQ_ADMIN for CUD, Authenticated for read)
    - 이벤트 CRUD: create/findAll/update (HQ_ADMIN for CUD, Authenticated for read)
    - 배송 규칙 CRUD: create/findAll/update (HQ_ADMIN for CUD, Authenticated for read)
    - `src/modules/hq/hq.controller.ts`:
    - `GET /hq/notices` (Authenticated): 공지 목록
    - `POST /hq/notices` (@Roles(HQ_ADMIN)): 공지 생성
    - `PUT /hq/notices/:id` (@Roles(HQ_ADMIN)): 공지 수정
    - `DELETE /hq/notices/:id` (@Roles(HQ_ADMIN)): 공지 삭제
    - `GET /hq/events`, `POST /hq/events`, `PUT /hq/events/:id`: 이벤트 관리
    - `GET /hq/delivery-rules`, `POST /hq/delivery-rules`, `PUT /hq/delivery-rules/:id`: 배송 규칙 관리
    - DTO: CreateNoticeDto, CreateEventDto, CreateDeliveryRuleDto 등
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [x] 20. Insights 모듈 구현
  - [x] 20.1 InsightsService 및 InsightsController 구현
    - `src/modules/insights/insights.service.ts`:
    - `getStoreComparison(query)`: 매장 간 KPI 비교 (monthly_metrics 기반, 기간/지역 필터)
    - `getKpiTrends(query)`: KPI 트렌드 (월별 추이)
    - `getCollectionAnalysis(query)`: 컬렉션별 매출 분석
    - `src/modules/insights/insights.controller.ts`:
    - `GET /insights/stores/comparison` (@Roles(HQ_ADMIN)): 매장 비교
    - `GET /insights/kpi/trends` (@Roles(HQ_ADMIN)): KPI 트렌드
    - `GET /insights/collections/analysis` (@Roles(HQ_ADMIN)): 컬렉션 분석
    - _Requirements: 19.1, 19.2_

- [x] 21. Export 모듈 구현
  - [x] 21.1 ExportService 및 ExportController 구현
    - `src/modules/export/export.service.ts`:
    - `exportStoreResource(storeId, resource, format)`: 매장 리소스 데이터를 CSV/Excel로 변환 (quotes, contracts, consults, staffs 등)
    - `exportHqResource(resource, format)`: HQ 데이터 내보내기
    - `src/modules/export/export.controller.ts`:
    - `GET /stores/:storeId/export/:resource` (@UseGuards(StoreAccessGuard), @Roles(STORE_MANAGER)): 매장 데이터 내보내기
    - `GET /hq/export/:resource` (@Roles(HQ_ADMIN)): HQ 데이터 내보내기
    - _Requirements: 19.3_

- [x] 22. AppModule 통합 및 전역 설정 완성
  - [x] 22.1 AppModule에 모든 모듈 등록 및 전역 설정 완성
    - `src/app.module.ts`: 모든 도메인 모듈 imports 등록
    - APP_GUARD: JwtAuthGuard 전역 등록
    - APP_INTERCEPTOR: AuditLogInterceptor 전역 등록
    - ConfigModule.forRoot({ isGlobal: true }) 설정
    - `src/main.ts`: 글로벌 ValidationPipe (whitelist, forbidNonWhitelisted, transform), CORS, 포트 설정
    - _Requirements: 2.1, 10.1, 20.7_

- [x] 23. Prisma Seed 스크립트 작성
  - [x] 23.1 초기 데이터 시드 구현
    - `prisma/seed.ts`:
    - HQ_ADMIN 계정 생성 (bcrypt 해시 비밀번호)
    - 테스트용 매장 2~3개 생성
    - STORE_MANAGER, STORE_STAFF 계정 생성 + user_store_permissions 설정
    - 샘플 견적/계약/상담 데이터 생성
    - `package.json`에 prisma seed 스크립트 등록
    - _Requirements: 20.6, 20.7_

- [x] 24. Final Checkpoint - 전체 시스템 통합 검증
  - 모든 테스트 통과 확인, 사용자에게 질문이 있으면 확인.

## Notes

- `*` 표시된 태스크는 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있습니다
- 각 태스크는 특정 요구사항을 참조하여 추적 가능합니다
- Checkpoint 태스크는 점진적 검증을 보장합니다
- Property 테스트는 fast-check 라이브러리를 사용하여 정확성 속성을 검증합니다
- 모든 매장 관련 API는 반드시 StoreAccessGuard를 적용하여 store_id 기반 접근 제어를 수행합니다
- KPI 계산은 반드시 서버(KpiCalculatorService)에서 수행하며, 클라이언트에서 계산하지 않습니다
- 계약 생성/취소 시 자동으로 KPI 재계산이 트리거됩니다


---

## 수주/매출 로우데이터 연동 태스크

- [x] 25. Prisma 스키마 확장 - 수주/매출 데이터 테이블
  - [x] 25.1 신규 모델 추가 및 마이그레이션
    - `prisma/schema.prisma`에 `SalesRawData`, `SalesUploadHistory`, `StoreAliasMapping` 모델 추가
    - `Store` 모델에 `storeAliasMappings StoreAliasMapping[]` 관계 추가
    - `npx prisma migrate dev --name add_sales_raw_data` 실행
    - _Requirements: 21.1, 22.1, 25.2_

- [x] 26. SalesData 모듈 구현 (백엔드)
  - [x] 26.1 SalesDataModule 기본 구조 생성
    - `backend/src/modules/sales-data/` 디렉토리 생성
    - `sales-data.module.ts`, `sales-data.controller.ts`, `sales-data.service.ts` 생성
    - `app.module.ts`에 SalesDataModule 등록
    - `multer` 패키지 설치 (`@nestjs/platform-express` 내장)
    - _Requirements: 21.1_

  - [x] 26.2 CSV 파싱 서비스 구현
    - `sales-data.service.ts`에 `parseCsv(buffer: Buffer)` 메서드 구현:
      - `iconv-lite` 패키지로 EUC-KR → UTF-8 인코딩 변환 지원
      - `csv-parse` 패키지로 CSV 파싱 (헤더 행 기준 컬럼 매핑)
      - 숫자 필드 쉼표 제거 후 `parseFloat` 변환
      - `수주단가*수량▲` = 0인 행 필터링
      - 파싱 결과: `{ rows: ParsedRow[], skippedCount: number }`
    - _Requirements: 21.2, 21.3, 21.6_

  - [x] 26.3 CSV 업로드 및 저장 구현
    - `uploadCsv(file, userId)` 메서드 구현:
      - `SalesUploadHistory` 레코드 생성 (배치 ID 발급)
      - `SalesRawData` upsert (orderNumber + itemCode 기준)
      - 매핑 안 된 대리점명 목록 추출 (`StoreAliasMapping`에 없는 `storeAlias` 값)
      - 결과 반환: `{ batchId, savedRows, skippedRows, unmappedAliases }`
    - _Requirements: 21.1, 21.4, 21.5, 22.5, 25.1_

  - [x] 26.4 대리점-매장 매핑 CRUD 구현
    - `createMapping(dto)`: aliasName + storeId 매핑 저장 (UNIQUE 제약)
    - `findAllMappings()`: 전체 매핑 목록 (store 정보 포함)
    - `deleteMapping(id)`: 매핑 삭제
    - _Requirements: 22.1, 22.2, 22.3, 22.4_

  - [x] 26.5 업로드 이력 및 롤백 구현
    - `getUploadHistory()`: 업로드 이력 목록 반환
    - `rollbackBatch(batchId)`: 해당 배치 ID의 `SalesRawData` 삭제 + `SalesUploadHistory` 상태 업데이트
    - _Requirements: 25.2, 25.3, 25.4_

  - [x] 26.6 SalesDataController 구현
    - `POST /sales-data/upload` (@Roles(HQ_ADMIN), @UseInterceptors(FileInterceptor('file'))): CSV 업로드
    - `GET /sales-data/upload-history` (@Roles(HQ_ADMIN)): 업로드 이력
    - `DELETE /sales-data/upload-history/:batchId` (@Roles(HQ_ADMIN)): 배치 롤백
    - `GET /sales-data/store-mappings` (@Roles(HQ_ADMIN)): 매핑 목록
    - `POST /sales-data/store-mappings` (@Roles(HQ_ADMIN)): 매핑 추가
    - `DELETE /sales-data/store-mappings/:id` (@Roles(HQ_ADMIN)): 매핑 삭제
    - _Requirements: 21.1, 22.1, 22.2, 22.3, 25.3_

- [x] 27. KPI 계산 엔진 확장 - 수주/매출 모드
  - [x] 27.1 SalesKpiService 구현
    - `backend/src/modules/dashboard/sales-kpi.service.ts` 생성:
    - `calculateSalesKpi(storeId, year, month, dataMode, referenceDate?)`:
      - `dataMode=ORDER`: `order_date` 기준 해당 월 행 집계
      - `dataMode=SALES`: `confirmed_date` 기준 해당 월 + `confirmed_date <= referenceDate` 행 집계
      - 매장 필터: `StoreAliasMapping`으로 해당 storeId의 aliasName 목록 조회 → `storeAlias IN (...)` 조건
      - HQ_ADMIN: storeId 없이 전체 집계 가능
      - 반환: `{ orderAmount, salesAmount, orderCount, seriesBreakdown }`
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7_

  - [x] 27.2 DashboardService 확장
    - `getMetrics(storeId, year, month, dataMode?)` 시그니처 확장
    - `dataMode` 파라미터가 있으면 `SalesKpiService` 호출하여 `orderAmount`, `salesAmount`, `orderCount` 추가
    - `KpiResult` DTO에 `orderAmount`, `salesAmount`, `orderCount`, `dataMode` 필드 추가
    - _Requirements: 23.1, 23.2_

  - [x] 27.3 DashboardController 확장
    - `GET /stores/:storeId/metrics` 엔드포인트에 `dataMode` 쿼리 파라미터 추가 (`ORDER` | `SALES`, 기본값 `ORDER`)
    - `MetricsQueryDto`에 `dataMode` 필드 추가
    - _Requirements: 23.1, 23.2_

- [x] 28. 프론트엔드 - 수주/매출 전환 UI
  - [x] 28.1 DataModeSelector 컴포넌트 구현
    - `frontend/src/components/DataModeSelector.tsx` 생성:
      - `<select>` 또는 토글 버튼 형태
      - 옵션: `수주 (ORDER)` / `매출 (SALES)`
      - `onChange` 콜백으로 부모에 모드 전달
    - _Requirements: 24.1_

  - [x] 28.2 DashboardPage 수주/매출 전환 연동
    - `frontend/src/pages/store/DashboardPage.tsx` 수정:
      - `dataMode` 상태 추가 (기본값: `'ORDER'`)
      - `DataModeSelector` 컴포넌트 대시보드 상단에 배치
      - `dataMode` 변경 시 API 재호출 (`?dataMode=ORDER|SALES`)
      - KPI 카드 금액 레이블 동적 변경: `dataMode === 'ORDER' ? '수주금액' : '매출금액'`
      - 금액 표시: `dataMode === 'ORDER' ? metrics.orderAmount : metrics.salesAmount`
    - _Requirements: 24.2, 24.3, 24.4, 24.5_

  - [x] 28.3 dashboard.types.ts 타입 확장
    - `frontend/src/types/dashboard.types.ts`에 `orderAmount`, `salesAmount`, `orderCount`, `dataMode` 필드 추가
    - `DataMode = 'ORDER' | 'SALES'` 타입 추가
    - _Requirements: 24.2, 24.3_

- [x] 29. HQ 대시보드 - 전체 매장 수주/매출 현황
  - [x] 29.1 HQ 전체 매장 수주/매출 API 확장
    - `DashboardService.getAllStoresMetrics(year, month, dataMode?)` 확장:
      - 각 매장별 `SalesKpiService` 호출하여 수주/매출 금액 포함
    - _Requirements: 23.7_

  - [x] 29.2 HqPerformanceTab 수주/매출 전환 연동
    - `frontend/src/pages/hq/tabs/HqPerformanceTab.tsx` 수정:
      - `DataModeSelector` 추가
      - 매장별 수주금액/매출금액 표시 전환
    - _Requirements: 24.1, 24.2_

- [x] 30. Checkpoint - 수주/매출 연동 검증
  - CSV 업로드 → 파싱 → DB 저장 → KPI 조회 전체 흐름 확인
  - 대리점-매장 매핑 후 매장별 필터링 동작 확인
  - 수주/매출 전환 선택박스 UI 동작 확인
  - 사용자에게 질문이 있으면 확인
