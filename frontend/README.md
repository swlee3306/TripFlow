# TripFlow Frontend

여행 스케줄 공유 플랫폼의 프론트엔드 애플리케이션입니다.

## 기술 스택

- **HTML5**: 시맨틱 마크업
- **CSS3**: 스타일링
- **Tailwind CSS**: 유틸리티 기반 CSS 프레임워크
- **Vanilla JavaScript**: 순수 자바스크립트 (프레임워크 없음)
- **Heroicons**: 아이콘 라이브러리

## 프로젝트 구조

```
frontend/
├── public/
│   ├── index.html          # 메인 HTML 파일
│   ├── css/
│   │   └── output.css     # Tailwind CSS 컴파일 결과
│   └── js/
│       └── app.js         # 메인 JavaScript 파일
├── src/
│   ├── input.css          # Tailwind CSS 소스
│   └── app.js             # JavaScript 소스 (개발용)
├── package.json           # npm 패키지 설정
├── tailwind.config.js     # Tailwind CSS 설정
├── postcss.config.js      # PostCSS 설정
└── README.md             # 프로젝트 문서
```

## 개발 환경 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. CSS 빌드

```bash
# 일회성 빌드
npm run build-css

# 개발 모드 (파일 변경 감지)
npm run watch-css
```

### 3. 개발 서버 실행

```bash
# 정적 파일 서버 실행 (예: Live Server, http-server 등)
# 또는 Python의 경우:
python -m http.server 8000
```

## 주요 기능

### 1. 파일 업로드 인터페이스
- 드래그 앤 드롭 지원
- 마크다운 파일 타입 검증
- 파일 크기 제한 (10MB)
- 업로드 진행률 표시

### 2. 반응형 디자인
- 모바일 우선 설계
- 태블릿 및 데스크톱 최적화
- Tailwind CSS 유틸리티 클래스 활용

### 3. 사용자 경험
- 직관적인 UI/UX
- 로딩 상태 표시
- 에러 메시지 처리
- 성공 피드백

## CSS 커스터마이징

### Tailwind CSS 설정
`tailwind.config.js`에서 다음을 커스터마이징할 수 있습니다:

- 색상 팔레트
- 폰트 패밀리
- 간격 및 크기
- 애니메이션
- 다크 모드

### 커스텀 스타일
`src/input.css`에서 추가 스타일을 정의할 수 있습니다:

```css
@layer components {
  .btn-primary {
    @apply bg-indigo-600 text-white py-2 px-4 rounded-md;
  }
}
```

## 빌드 및 배포

### 프로덕션 빌드
```bash
npm run build
```

### 배포 준비사항
1. `public/` 디렉토리의 모든 파일을 웹 서버에 업로드
2. CSS 파일이 올바르게 링크되어 있는지 확인
3. JavaScript 파일이 올바르게 로드되는지 확인

## 브라우저 지원

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 개발 가이드라인

### JavaScript
- ES6+ 문법 사용
- 모듈화된 코드 구조
- 에러 처리 필수
- 사용자 피드백 제공

### CSS
- Tailwind CSS 유틸리티 클래스 우선 사용
- 커스텀 스타일은 `@layer` 디렉티브 활용
- 반응형 디자인 고려
- 접근성 고려

### HTML
- 시맨틱 HTML 태그 사용
- 접근성 속성 추가 (`aria-*`, `role` 등)
- SEO 최적화 (`meta` 태그 등)

## 문제 해결

### CSS가 적용되지 않는 경우
1. `npm run build-css` 실행 확인
2. `public/css/output.css` 파일 존재 확인
3. HTML에서 CSS 링크 경로 확인

### JavaScript 오류
1. 브라우저 개발자 도구 콘솔 확인
2. 파일 경로 및 로딩 순서 확인
3. ES6+ 문법 브라우저 지원 확인

## 라이선스

MIT License
