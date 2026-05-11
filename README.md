# N빵 정산

로그인 없이 바로 쓰는 React + Vite + TypeScript + Tailwind CSS 기반 N빵 정산 MVP입니다.

## 주요 기능

- 새 정산 생성 및 8자리 정산 코드 발급
- 기존 정산 코드로 참여
- 같은 이름 참여자 발견 시 기존 참여자 재입장 또는 새 참여자 입장 선택
- localStorage 기반 현재 참여자 및 최근 참여 정산 10개 저장
- Firestore 실시간 참여자/결제 내역 표시
- 결제 날짜, 결제자, 금액, 상세내역, 정산 대상자 입력
- 결제 내역 날짜별 그룹 표시 및 삭제
- 최종 정산 결과와 최소 송금 내역 계산
- Kakao JavaScript SDK 공유 기능으로 초대/결과 공유

## 시작하기

```bash
npm install
cp .env.example .env
npm run dev
```

`.env`에 Firebase Web App 설정과 Kakao JavaScript 키를 입력합니다.

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_KAKAO_JAVASCRIPT_KEY=...
```

## Firestore 구조

```text
settlements/{settlementCode}
settlements/{settlementCode}/participants/{participantId}
settlements/{settlementCode}/expenses/{expenseId}
```

생성 시 timestamp 필드는 모두 Firestore `Timestamp`로 저장합니다.

- `Settlement`: `createdAt`, `updatedAt`, `expiresAt`
- `Participant`: `joinedAt`, `createdAt`, `updatedAt`
- `Expense`: `createdAt`, `updatedAt`

Security Rules 예시는 [firestore.rules](/Users/gayoung/Documents/Codex/2026-05-11/react-vite-typescript-tailwind-css-n/firestore.rules)에 있습니다. 로그인 없는 MVP라 공개 쓰기를 전제로 하므로, 실제 배포 시 Firebase 프로젝트를 이 앱 전용으로 분리하고 만료 정책/사용량 제한을 함께 설정하는 것을 권장합니다.

Rules 배포:

```bash
npx firebase-tools deploy --only firestore:rules --project receipt-splitter-69494
```

## Kakao 공유 설정

카카오 로그인은 사용하지 않고 JavaScript SDK 공유 기능만 사용합니다.

1. Kakao Developers에서 JavaScript 키를 발급합니다.
2. 플랫폼 Web에 배포 도메인을 등록합니다.
3. `.env`의 `VITE_KAKAO_JAVASCRIPT_KEY`에 JavaScript 키를 입력합니다.

## GitHub Pages 배포

프로젝트 페이지로 배포할 때는 저장소 이름을 기준으로 base URL을 설정합니다.

```bash
VITE_APP_BASE_URL=/repository-name/
npm run build
```

`dist` 폴더를 GitHub Pages에 배포하면 됩니다. 예를 들어 `gh-pages` 패키지를 쓰는 경우:

```bash
npm install -D gh-pages
```

`package.json`에 아래 스크립트를 추가합니다.

```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

그 뒤 실행합니다.

```bash
npm run deploy
```

이 프로젝트에는 GitHub Pages 새로고침/직접 링크 접근을 위한 `public/404.html` 리다이렉트와 `index.html` 복구 스크립트가 포함되어 있습니다.

## 정산 계산 규칙

- 결제자는 `paidAmount`에 결제 금액이 더해집니다.
- 정산 대상자는 `Math.floor(amount / targetParticipantIds.length)` 만큼 부담합니다.
- 나머지 금액은 MVP 규칙에 따라 결제자가 부담합니다.
- 최종 송금은 받을 사람과 보낼 사람을 매칭해 송금 횟수를 줄입니다.
