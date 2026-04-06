# 사내 호스트 서버 → 매출 실적 연동 가이드

## 개요

사내 ERP/호스트 서버에서 수주 데이터를 대시보드 백엔드로 직접 push하는 방식입니다.
CSV 파일 없이 JSON API로 실시간 연동이 가능합니다.

---

## 엔드포인트

```
POST https://<백엔드 도메인>/api/sales-data/push
```

---

## 인증

JWT 없이 **API Key** 방식으로 인증합니다.

```
Header: X-Api-Key: <SALES_PUSH_API_KEY>
```

백엔드 환경변수에 `SALES_PUSH_API_KEY`를 설정해야 합니다.
Render 배포 기준: Dashboard → Environment → `SALES_PUSH_API_KEY` 추가

---

## 요청 형식

```http
POST /api/sales-data/push
Content-Type: application/json
X-Api-Key: your-secret-key

{
  "source": "inhouse-erp",
  "rows": [
    {
      "orderNumber": "SO-2026-001234",
      "itemCode": "SATI-3S-GRY",
      "storeAlias": "알로소청담",
      "orderDate": "2026-04-01",
      "confirmedDate": "2026-04-15",
      "seriesCode": "SATI",
      "orderAmount": 3200000,
      "quantity": 1,
      "itemName": "SATI 3인 소파 그레이"
    },
    {
      "orderNumber": "SO-2026-001235",
      "itemCode": "QUERENCIA-2S-BEG",
      "storeAlias": "알로소청담",
      "orderDate": "2026-04-02",
      "confirmedDate": "2026-04-20",
      "seriesCode": "QUERENCIA",
      "orderAmount": 4500000,
      "quantity": 1,
      "itemName": "QUERENCIA 2인 소파 베이지"
    }
  ]
}
```

---

## 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `orderNumber` | string | ✅ | 수주번호 (고유 식별자) |
| `itemCode` | string | ✅ | 단품코드 (orderNumber + itemCode 조합으로 중복 방지) |
| `storeAlias` | string | ✅ | 대리점명 — 관리자 탭 "매장 별칭 매핑"에 등록된 이름과 일치해야 함 |
| `orderDate` | string | - | 수주일자 (YYYY-MM-DD) |
| `confirmedDate` | string | - | 확정납기일 (YYYY-MM-DD) |
| `seriesCode` | string | - | 시리즈 코드 (SATI, QUERENCIA, MILO, BONUM, VARD, ELMER 등) |
| `orderAmount` | number | ✅ | 수주금액 (원 단위, 예: 3200000) |
| `quantity` | number | - | 수주수량 (기본값 1) |
| `itemName` | string | - | 단품명칭 |
| `source` | string | - | 데이터 출처 식별자 (로그용, 예: "inhouse-erp") |

---

## 응답 형식

```json
{
  "batchId": "uuid-...",
  "savedRows": 2,
  "skippedRows": 0,
  "totalRows": 2,
  "unmappedAliases": []
}
```

- `unmappedAliases`: 매장 별칭 매핑이 안 된 대리점명 목록 → 관리자 탭에서 매핑 등록 필요

---

## 중복 처리

`orderNumber + itemCode` 조합이 이미 존재하면 **upsert** (업데이트) 처리됩니다.
동일 데이터를 여러 번 push해도 중복 저장되지 않습니다.

---

## 주기적 동기화 권장

사내 서버에서 **매일 자정** 또는 **수주 발생 시 실시간**으로 push하는 방식을 권장합니다.

```bash
# 예시: curl로 push
curl -X POST https://<백엔드 도메인>/api/sales-data/push \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: your-secret-key" \
  -d '{"source":"inhouse-erp","rows":[...]}'
```

---

## 매장 별칭 매핑 확인

push 전에 대리점명이 매핑되어 있는지 확인:

```
GET /api/sales-data/store-mappings
Authorization: Bearer <HQ_ADMIN JWT>
```

미매핑 대리점명 조회:

```
GET /api/sales-data/unmapped-aliases
Authorization: Bearer <HQ_ADMIN JWT>
```

---

## 환경변수 설정 (Render)

```
SALES_PUSH_API_KEY=your-strong-secret-key-here
```

API Key는 충분히 복잡하게 설정하세요 (32자 이상 랜덤 문자열 권장).

---

## 연동 흐름 요약

```
사내 ERP/호스트 서버
    ↓ POST /api/sales-data/push (X-Api-Key)
대시보드 백엔드 (Render)
    ↓ salesRawData 테이블에 upsert
대시보드 프론트엔드
    ↓ /dashboard/all, /dashboard/weekly 등 API 호출
본사 대시보드 실적 반영
```
