# 요구사항 문서: 매장 운영 시스템 재설계 (Store Ops System Redesign)

## 소개

본 문서는 기존 단일 HTML 파일 기반 매장 운영 프로토타입을 NestJS + React + PostgreSQL 기반의 서버 중심 아키텍처로 재설계하기 위한 요구사항을 정의한다. 모든 데이터는 store_id 기준으로 격리되며, KPI 계산은 서버에서만 수행되고, 인증/인가는 JWT + RBAC + StoreAccessGuard를 통해 처리된다.

## 용어 정의 (Glossary)

- **API_서버**: NestJS 기반 백엔드 서버. 모든 비즈니스 로직과 데이터 접근을 처리한다.
- **클라이언트**: React SPA 기반 프론트엔드 애플리케이션 (매장용, HQ용).
- **AuthModule**: 로그인, JWT 발급/갱신, 권한 검증을 담당하는 NestJS 모듈.
- **StoreAccessGuard**: URL 파라미터의 storeId에 대한 사용자 접근 권한을 검증하는 NestJS Guard.
- **RolesGuard**: 사용자 역할(Role)이 요구 수준 이상인지 검증하는 NestJS Guard.
- **JwtAuthGuard**: JWT 토큰의 유효성을 검증하는 전역 NestJS Guard.
- **KpiCalculatorService**: 월간 KPI를 계산하고 monthly_metrics 테이블에 저장하는 서비스.
- **DashboardService**: KPI 조회 및 목표 달성률 계산을 담당하는 서비스.
- **Role**: 사용자 역할 열거형 (HQ_ADMIN, STORE_MANAGER, STORE_STAFF, READONLY).
- **PermissionLevel**: 매장 접근 권한 수준 (MANAGE, VIEW, NONE).
- **Collection**: 제품 컬렉션 열거형 (SATI, QUERENCIA, MILO, BONUM, VARD, ELMER).
- **monthly_metrics**: 매장별 월간 KPI 계산 결과를 캐싱하는 테이블.
- **monthly_goals**: 매장별 월간 목표를 저장하는 테이블.
- **contract_cancellations**: 계약 취소 기록을 저장하는 테이블 (contract_id 당 최대 1건).
- **audit_logs**: 모든 CUD 작업의 감사 로그를 저장하는 INSERT ONLY 테이블.
- **accessToken**: JWT 형식의 인증 토큰 (만료: 15분).
- **refreshToken**: 토큰 갱신용 UUID 토큰 (만료: 7일, DB 저장).

## 요구사항

### 요구사항 1: 사용자 인증

**사용자 스토리:** 매장 직원으로서, 안전하게 시스템에 로그인하여 인증된 상태에서 매장 데이터에 접근하고 싶다.

#### 수용 기준

1. WHEN 사용자가 유효한 username과 password로 POST /auth/login 요청을 보내면, THE API_서버 SHALL accessToken(15분 만료)과 refreshToken(7일 만료)을 포함한 응답을 반환한다.
2. WHEN 사용자가 존재하지 않는 username 또는 잘못된 password로 로그인을 시도하면, THE API_서버 SHALL 401 Unauthorized 응답을 반환한다.
3. WHEN 비활성화된 계정(isActive=false)으로 로그인을 시도하면, THE API_서버 SHALL 401 Unauthorized 응답을 반환한다.
4. WHEN 유효한 refreshToken으로 POST /auth/refresh 요청을 보내면, THE API_서버 SHALL 기존 refreshToken을 폐기하고 새로운 accessToken과 refreshToken 쌍을 발급한다.
5. WHEN 만료되었거나 폐기된 refreshToken으로 갱신을 시도하면, THE API_서버 SHALL 401 Unauthorized 응답을 반환한다.
6. WHEN POST /auth/logout 요청을 보내면, THE API_서버 SHALL 해당 refreshToken을 폐기(revokedAt 설정)한다.

### 요구사항 2: 역할 기반 접근 제어 (RBAC)

**사용자 스토리:** 시스템 관리자로서, 사용자 역할에 따라 API 접근을 제한하여 데이터 보안을 유지하고 싶다.

#### 수용 기준

1. THE JwtAuthGuard SHALL @Public() 데코레이터가 없는 모든 API 엔드포인트에 대해 유효한 JWT 토큰을 요구한다.
2. WHEN 만료된 accessToken으로 API 요청을 보내면, THE JwtAuthGuard SHALL 401 Unauthorized 응답을 반환한다.
3. THE RolesGuard SHALL 역할 계층(HQ_ADMIN=4 > STORE_MANAGER=3 > STORE_STAFF=2 > READONLY=1)에 따라 상위 역할이 하위 역할의 모든 접근 권한을 포함하도록 검증한다.
4. WHEN 요구 역할보다 낮은 역할의 사용자가 API에 접근하면, THE RolesGuard SHALL 403 Forbidden 응답을 반환한다.

### 요구사항 3: 매장 기반 접근 제어 (Store Access)

**사용자 스토리:** 매장 관리자로서, 내가 권한을 가진 매장의 데이터에만 접근할 수 있어야 한다.

#### 수용 기준

1. WHEN URL에 storeId 파라미터가 포함된 API 요청이 들어오면, THE StoreAccessGuard SHALL JWT payload의 storePermissions에서 해당 storeId에 대한 권한을 확인한다.
2. WHEN HQ_ADMIN 역할의 사용자가 요청하면, THE StoreAccessGuard SHALL 모든 매장에 대한 접근을 허용한다.
3. WHEN user_store_permissions에 해당 매장 권한이 없거나 NONE인 사용자가 요청하면, THE StoreAccessGuard SHALL 403 Forbidden 응답을 반환한다.
4. THE API_서버 SHALL 모든 매장 관련 데이터 쿼리에 store_id 조건을 필수로 포함한다.
5. WHEN 매장 관련 API 응답을 반환할 때, THE API_서버 SHALL 요청한 store_id에 해당하는 데이터만 포함한다.

### 요구사항 4: 매장 관리

**사용자 스토리:** HQ 관리자로서, 매장을 생성/조회/수정/비활성화하여 전체 매장 네트워크를 관리하고 싶다.

#### 수용 기준

1. WHEN HQ_ADMIN이 GET /stores 요청을 보내면, THE API_서버 SHALL 검색(name/code), 지역 필터, 활성 상태 필터, 페이지네이션을 지원하는 매장 목록을 반환한다.
2. WHEN HQ_ADMIN이 POST /stores 요청을 보내면, THE API_서버 SHALL 유니크한 code를 가진 새 매장을 생성한다.
3. WHEN HQ_ADMIN이 DELETE /stores/:storeId 요청을 보내면, THE API_서버 SHALL 해당 매장의 isActive를 false로 설정한다 (물리 삭제 금지).
4. WHEN 페이지네이션 응답을 반환할 때, THE API_서버 SHALL total, page, limit, totalPages 메타 정보를 포함한다.

### 요구사항 5: KPI 계산 엔진

**사용자 스토리:** 매장 관리자로서, 정확하고 조작 불가능한 월간 KPI를 서버에서 계산하여 신뢰할 수 있는 성과 지표를 확인하고 싶다.

#### 수용 기준

1. THE KpiCalculatorService SHALL 특정 매장의 월간 KPI를 서버에서 계산한다: 견적 수(quoteCount), 계약 수(contractCount), 계약 매출(contractAmount), 전환율(conversionRate), 평균 주문 금액(avgOrderValue).
2. WHEN KPI를 계산할 때, THE KpiCalculatorService SHALL status가 CANCELLED인 계약을 contractCount와 contractAmount 집계에서 제외한다.
3. WHEN quoteCount가 0보다 클 때, THE KpiCalculatorService SHALL conversionRate를 contractCount / quoteCount로 계산한다.
4. WHEN quoteCount가 0일 때, THE KpiCalculatorService SHALL conversionRate를 0으로 설정한다.
5. WHEN contractCount가 0보다 클 때, THE KpiCalculatorService SHALL avgOrderValue를 contractAmount / contractCount로 계산한다.
6. WHEN contractCount가 0일 때, THE KpiCalculatorService SHALL avgOrderValue를 0으로 설정한다.
7. THE KpiCalculatorService SHALL 컬렉션별(SATI, QUERENCIA, MILO, BONUM, VARD, ELMER) 매출 분류(collectionBreakdown)를 계산한다.
8. THE KpiCalculatorService SHALL 컬렉션별 totalAmount 합계가 전체 contractAmount와 일치하도록 보장한다.
9. WHEN KPI 계산이 완료되면, THE KpiCalculatorService SHALL monthly_metrics 테이블에 결과를 upsert한다.

### 요구사항 6: 대시보드 지표 조회

**사용자 스토리:** 매장 직원으로서, 월간 KPI와 목표 달성률을 대시보드에서 확인하여 영업 성과를 파악하고 싶다.

#### 수용 기준

1. WHEN 인증된 사용자가 GET /stores/:storeId/metrics/:year/:month 요청을 보내면, THE DashboardService SHALL 해당 월의 KPI 지표, 목표, 달성률을 반환한다.
2. WHEN 캐시된 monthly_metrics가 존재하면, THE DashboardService SHALL 캐시된 데이터를 반환한다.
3. WHEN 캐시된 monthly_metrics가 존재하지 않으면, THE DashboardService SHALL KpiCalculatorService를 호출하여 KPI를 계산한 후 반환한다.
4. WHEN monthly_goals가 존재할 때, THE DashboardService SHALL 달성률(amountRate, contractRate, consultRate)을 계산하여 포함한다.
5. WHEN STORE_MANAGER 이상의 사용자가 POST /stores/:storeId/metrics/recalculate 요청을 보내면, THE DashboardService SHALL 현재 월의 KPI를 강제 재계산한다.

### 요구사항 7: 견적 관리

**사용자 스토리:** 매장 직원으로서, 고객에게 견적서를 생성하고 관리하여 영업 활동을 체계적으로 수행하고 싶다.

#### 수용 기준

1. WHEN STORE_STAFF 이상의 사용자가 POST /stores/:storeId/quotes 요청을 보내면, THE API_서버 SHALL 견적과 견적 항목(quote_items)을 트랜잭션으로 원자적으로 생성한다.
2. THE API_서버 SHALL 견적번호를 QT-{storeCode}-{YYYYMM}-{seq} 형식으로 자동 생성하며, 유니크함을 보장한다.
3. WHEN 견적이 생성될 때, THE API_서버 SHALL totalAmount를 모든 항목의 unitPrice × quantity 합계로 계산한다.
4. WHEN consultId가 제공되면, THE API_서버 SHALL 해당 상담이 같은 storeId에 속하는지 검증한다.
5. WHEN consultId가 제공되었으나 해당 상담이 존재하지 않으면, THE API_서버 SHALL 404 Not Found 응답을 반환한다.
6. WHEN 견적 항목의 collection 값이 유효한 Collection enum에 포함되지 않으면, THE API_서버 SHALL 400 Bad Request 응답을 반환한다.

### 요구사항 8: 계약 생성

**사용자 스토리:** 매장 직원으로서, 견적을 기반으로 또는 직접 입력하여 계약을 체결하고 싶다.

#### 수용 기준

1. WHEN STORE_STAFF 이상의 사용자가 POST /stores/:storeId/contracts 요청을 보내면, THE API_서버 SHALL 계약과 계약 항목(contract_items)을 트랜잭션으로 원자적으로 생성한다.
2. WHEN quoteId가 제공되면, THE API_서버 SHALL 해당 견적의 항목을 계약 항목으로 복사하고 견적 상태를 ACCEPTED로 변경한다.
3. WHEN quoteId가 제공되었으나 견적 상태가 ACCEPTED, REJECTED, EXPIRED 중 하나이면, THE API_서버 SHALL 409 Conflict 응답을 반환한다.
4. WHEN quoteId가 제공되지 않으면, THE API_서버 SHALL dto.items를 필수로 요구하며, items가 비어있으면 400 Bad Request 응답을 반환한다.
5. THE API_서버 SHALL 계약번호를 CT-{storeCode}-{YYYYMM}-{seq} 형식으로 자동 생성하며, 유니크함을 보장한다.
6. WHEN 계약이 생성될 때, THE API_서버 SHALL totalAmount를 모든 항목의 unitPrice × quantity 합계로 계산한다.
7. WHEN 계약이 성공적으로 생성되면, THE API_서버 SHALL 해당 월의 KPI를 KpiCalculatorService를 통해 재계산한다.

### 요구사항 9: 계약 취소

**사용자 스토리:** 매장 관리자로서, 계약을 취소하고 KPI에 정확히 반영하여 신뢰할 수 있는 성과 데이터를 유지하고 싶다.

#### 수용 기준

1. WHEN STORE_MANAGER 이상의 사용자가 POST /stores/:storeId/contracts/:id/cancel 요청을 보내면, THE API_서버 SHALL 트랜잭션으로 contract.status를 CANCELLED로 변경하고 contract_cancellations 레코드를 생성한다.
2. WHEN 이미 취소된 계약(status=CANCELLED)에 대해 취소를 시도하면, THE API_서버 SHALL 409 Conflict 응답을 반환한다.
3. WHEN refundAmount가 contract.totalAmount를 초과하면, THE API_서버 SHALL 400 Bad Request 응답을 반환한다.
4. WHEN refundAmount가 제공되지 않으면, THE API_서버 SHALL contract.totalAmount를 기본 환불 금액으로 사용한다.
5. WHEN 계약이 성공적으로 취소되면, THE API_서버 SHALL 해당 월의 KPI를 재계산하여 취소된 계약을 KPI에서 제외한다.
6. THE API_서버 SHALL 동일 contract_id에 대해 최대 1건의 contract_cancellations만 허용한다.

### 요구사항 10: 감사 로그

**사용자 스토리:** 시스템 관리자로서, 모든 데이터 변경 이력을 추적하여 보안 감사와 문제 추적을 수행하고 싶다.

#### 수용 기준

1. WHEN POST, PUT, PATCH, DELETE 메서드의 API 요청이 처리되면, THE AuditLogInterceptor SHALL audit_logs 테이블에 user_id, store_id, action, resource_type, resource_id, old_value, new_value, ip_address를 기록한다.
2. WHEN GET 메서드의 API 요청이 처리되면, THE AuditLogInterceptor SHALL 감사 로그를 기록하지 않는다.
3. THE API_서버 SHALL audit_logs 테이블에 대해 INSERT만 허용하고 UPDATE/DELETE를 금지한다.

### 요구사항 11: 상담 관리

**사용자 스토리:** 매장 직원으로서, 고객 상담 기록을 등록하고 관리하여 영업 파이프라인을 추적하고 싶다.

#### 수용 기준

1. WHEN STORE_STAFF 이상의 사용자가 POST /stores/:storeId/consults 요청을 보내면, THE API_서버 SHALL 해당 매장에 상담 기록을 생성한다.
2. WHEN STORE_STAFF 이상의 사용자가 GET /stores/:storeId/consults 요청을 보내면, THE API_서버 SHALL 해당 매장의 상담 목록을 반환한다.
3. WHEN STORE_MANAGER 이상의 사용자가 DELETE /stores/:storeId/consults/:id 요청을 보내면, THE API_서버 SHALL 해당 상담 기록을 삭제한다.
4. THE API_서버 SHALL 상담 상태를 PENDING, IN_PROGRESS, COMPLETED, CANCELLED 중 하나로 관리한다.

### 요구사항 12: 목표 관리

**사용자 스토리:** 매장 관리자로서, 월간 목표를 설정하고 실적과 비교하여 달성률을 확인하고 싶다.

#### 수용 기준

1. WHEN STORE_MANAGER 이상의 사용자가 POST /stores/:storeId/goals 요청을 보내면, THE API_서버 SHALL 해당 매장의 월간 목표(targetAmount, targetContracts, targetConsults)를 설정한다.
2. THE API_서버 SHALL (store_id, year, month) 조합에 대해 유니크 제약을 적용하여 중복 목표 생성을 방지한다.
3. WHEN 목표와 실적이 모두 존재할 때, THE DashboardService SHALL 달성률을 (실적/목표) × 100으로 계산한다.

### 요구사항 13: 메모 관리

**사용자 스토리:** 매장 직원으로서, 매장 관련 메모를 작성하고 관리하여 업무 정보를 공유하고 싶다.

#### 수용 기준

1. WHEN STORE_STAFF 이상의 사용자가 POST /stores/:storeId/memos 요청을 보내면, THE API_서버 SHALL 해당 매장에 메모를 생성한다.
2. THE API_서버 SHALL 메모 카테고리를 GENERAL, IMPORTANT, TODO 중 하나로 관리한다.
3. WHEN STORE_MANAGER 이상의 사용자가 DELETE /stores/:storeId/memos/:id 요청을 보내면, THE API_서버 SHALL 해당 메모를 삭제한다.

### 요구사항 14: 이슈 관리

**사용자 스토리:** 매장 직원으로서, 매장 이슈를 등록하고 추적하여 문제를 체계적으로 관리하고 싶다.

#### 수용 기준

1. WHEN STORE_STAFF 이상의 사용자가 POST /stores/:storeId/issues 요청을 보내면, THE API_서버 SHALL 해당 매장에 이슈를 생성한다.
2. WHEN READONLY 이상의 사용자가 GET /stores/:storeId/issues 요청을 보내면, THE API_서버 SHALL 해당 매장의 이슈 목록을 반환한다.
3. THE API_서버 SHALL 이슈 우선순위를 LOW, MEDIUM, HIGH, CRITICAL 중 하나로 관리한다.
4. THE API_서버 SHALL 이슈 상태를 OPEN, IN_PROGRESS, RESOLVED, CLOSED 중 하나로 관리한다.

### 요구사항 15: 직원 관리

**사용자 스토리:** 매장 관리자로서, 매장 직원 정보를 등록하고 관리하고 싶다.

#### 수용 기준

1. WHEN STORE_MANAGER 이상의 사용자가 POST /stores/:storeId/staffs 요청을 보내면, THE API_서버 SHALL 해당 매장에 직원을 등록한다.
2. WHEN STORE_MANAGER 이상의 사용자가 DELETE /stores/:storeId/staffs/:id 요청을 보내면, THE API_서버 SHALL 해당 직원의 isActive를 false로 설정한다 (물리 삭제 금지).
3. WHEN STORE_STAFF 이상의 사용자가 GET /stores/:storeId/staffs 요청을 보내면, THE API_서버 SHALL 해당 매장의 직원 목록을 반환한다.

### 요구사항 16: 스케줄 관리

**사용자 스토리:** 매장 관리자로서, 직원 근무 스케줄을 등록하고 관리하고 싶다.

#### 수용 기준

1. WHEN STORE_MANAGER 이상의 사용자가 POST /stores/:storeId/schedules 요청을 보내면, THE API_서버 SHALL 해당 매장의 직원 스케줄을 등록한다.
2. THE API_서버 SHALL 근무 유형을 MORNING, AFTERNOON, FULL, OFF 중 하나로 관리한다.
3. WHEN STORE_STAFF 이상의 사용자가 GET /stores/:storeId/schedules 요청을 보내면, THE API_서버 SHALL 해당 매장의 스케줄 목록을 반환한다.

### 요구사항 17: 배송 관리

**사용자 스토리:** 매장 직원으로서, 배송 일정과 상태를 관리하여 고객 배송을 추적하고 싶다.

#### 수용 기준

1. WHEN STORE_STAFF 이상의 사용자가 POST /stores/:storeId/deliveries 요청을 보내면, THE API_서버 SHALL 해당 매장에 배송을 등록한다.
2. THE API_서버 SHALL 배송 상태를 SCHEDULED, IN_TRANSIT, DELIVERED, FAILED 중 하나로 관리한다.
3. WHEN STORE_STAFF 이상의 사용자가 PATCH /stores/:storeId/deliveries/:id/status 요청을 보내면, THE API_서버 SHALL 배송 상태를 변경한다.

### 요구사항 18: HQ 관리 (본사)

**사용자 스토리:** HQ 관리자로서, 공지사항, 이벤트, 배송 규칙을 관리하여 전체 매장에 정보를 전달하고 싶다.

#### 수용 기준

1. WHEN HQ_ADMIN이 POST /hq/notices 요청을 보내면, THE API_서버 SHALL 공지사항을 생성한다.
2. WHEN 인증된 사용자가 GET /hq/notices 요청을 보내면, THE API_서버 SHALL 공지사항 목록을 반환한다.
3. WHEN HQ_ADMIN이 POST /hq/events 요청을 보내면, THE API_서버 SHALL 이벤트를 생성한다.
4. WHEN HQ_ADMIN이 POST /hq/delivery-rules 요청을 보내면, THE API_서버 SHALL 배송 규칙을 생성한다.
5. THE API_서버 SHALL 공지사항 우선순위를 NORMAL, IMPORTANT, URGENT 중 하나로 관리한다.

### 요구사항 19: 인사이트 및 내보내기

**사용자 스토리:** HQ 관리자로서, 매장 간 성과를 비교 분석하고 데이터를 내보내어 경영 의사결정에 활용하고 싶다.

#### 수용 기준

1. WHEN HQ_ADMIN이 GET /insights/stores/comparison 요청을 보내면, THE API_서버 SHALL 매장 간 KPI 비교 데이터를 반환한다.
2. WHEN HQ_ADMIN이 GET /insights/kpi/trends 요청을 보내면, THE API_서버 SHALL KPI 트렌드 데이터를 반환한다.
3. WHEN STORE_MANAGER 이상의 사용자가 GET /stores/:storeId/export/:resource 요청을 보내면, THE API_서버 SHALL 해당 리소스 데이터를 CSV 또는 Excel 형식으로 내보낸다.

### 요구사항 20: 데이터베이스 스키마 및 무결성

**사용자 스토리:** 개발자로서, 데이터 무결성을 보장하는 스키마를 통해 안정적인 시스템을 구축하고 싶다.

#### 수용 기준

1. THE API_서버 SHALL 모든 매장 관련 테이블에 store_id FK를 NOT NULL로 설정한다.
2. THE API_서버 SHALL monthly_metrics 테이블에 (store_id, year, month) UNIQUE 제약을 적용한다.
3. THE API_서버 SHALL monthly_goals 테이블에 (store_id, year, month) UNIQUE 제약을 적용한다.
4. THE API_서버 SHALL quotes.quote_number와 contracts.contract_number에 UNIQUE 제약을 적용한다.
5. THE API_서버 SHALL contract_cancellations.contract_id에 UNIQUE 제약을 적용하여 계약당 최대 1건의 취소만 허용한다.
6. THE API_서버 SHALL 모든 테이블의 id를 UUID v4로 생성한다.
7. THE API_서버 SHALL Prisma ORM을 통해 PostgreSQL에 접근하며, 클라이언트의 직접 DB 접근을 금지한다.
