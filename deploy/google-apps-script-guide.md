# Google Apps Script — 비공개 시트 연동 가이드

구글 시트를 공개(공유) 설정 없이 대시보드와 연동하는 방법입니다.

---

## 1단계: Apps Script 열기

1. 연동할 구글 시트 열기
2. 상단 메뉴 → **확장 프로그램** → **Apps Script**

---

## 2단계: 스크립트 코드 붙여넣기

아래 코드를 Apps Script 편집기에 붙여넣으세요.

### 매출 실적 시트용 스크립트

```javascript
// 환경변수처럼 사용할 API Key (대시보드 백엔드의 SALES_PUSH_API_KEY와 동일하게 설정)
const API_KEY = 'your-secret-api-key-here';

// 시트 이름 설정
const SHEET_NAME = 'Sheet1'; // 실제 시트 탭 이름으로 변경

function doGet(e) {
  // API Key 검증
  const key = e.parameter['api_key'] || (e.headers && e.headers['X-Api-Key']);
  if (key !== API_KEY) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();

  if (data.length === 0) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 첫 행을 헤더로 사용
  const headers = data[0].map(h => String(h).trim());
  const rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });

  return ContentService
    .createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## 3단계: Web App으로 배포

1. 오른쪽 상단 **배포** → **새 배포**
2. 유형: **웹 앱**
3. 설정:
   - 설명: `대시보드 연동`
   - 다음 사용자로 실행: **나 (본인 계정)**
   - 액세스 권한: **모든 사용자** (URL을 아는 사람만 접근 가능, API Key로 추가 보안)
4. **배포** 클릭
5. 생성된 **웹 앱 URL** 복사

---

## 4단계: 대시보드 관리자 탭에 URL 입력

1. 본사 대시보드 → **관리자** 탭
2. **데이터 연동 URL** 섹션
3. **매출 실적 Apps Script URL** 입력란에 복사한 URL 붙여넣기
4. **저장** 클릭

---

## 5단계: 동기화 테스트

관리자 탭 → **데이터 동기화** → **매출 실적 동기화** 버튼 클릭

---

## 주의사항

- Apps Script URL은 `https://script.google.com/macros/s/...` 형식입니다
- API Key는 대시보드 백엔드 환경변수 `SALES_PUSH_API_KEY`와 동일하게 설정하세요
- 시트 구조(컬럼명)는 기존 CSV 형식과 동일해야 합니다:
  - `수주번호`, `단품코드`, `대리점`, `수주일자`, `확정납기`, `시리즈구분`, `수주단가*수량`, `수주수량`, `단품명칭(한글)`

---

## 컬럼명 매핑 참고

| 시트 컬럼명 | 설명 |
|------------|------|
| 수주번호 | 주문 고유번호 |
| 단품코드 | 제품 코드 |
| 대리점 | 매장 별칭 (별칭 매핑 필요) |
| 수주일자 | YYYY-MM-DD 또는 YYYY/MM/DD |
| 확정납기 | YYYY-MM-DD 또는 YYYY/MM/DD |
| 시리즈구분 | SATI, QUERENCIA, MILO 등 |
| 수주단가*수량 | 수주금액 (숫자) |
| 수주수량 | 수량 (숫자) |
| 단품명칭(한글) | 제품명 |
