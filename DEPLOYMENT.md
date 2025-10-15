# TripFlow Deployment Guide

## Vercel 배포 설정

### 1. Vercel 프로젝트 생성

1. [Vercel Dashboard](https://vercel.com/dashboard)에 로그인
2. "New Project" 클릭
3. GitHub 저장소 연결
4. 프로젝트 이름: `tripflow`

### 2. 환경 변수 설정

Vercel Dashboard > Project Settings > Environment Variables에서 다음 변수들을 설정하세요:

#### 필수 환경 변수:
```
DATABASE_URL=sqlite:///tmp/tripflow.db
JWT_SECRET=your-super-secret-jwt-key-here
FILE_STORAGE_PATH=/tmp/tripflow-files
CORS_ALLOWED_ORIGINS=https://your-domain.vercel.app
GIN_MODE=release
```

#### 선택적 환경 변수:
```
PORT=8080
HOST=0.0.0.0
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=1m
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 3. 빌드 설정

Vercel이 자동으로 `vercel.json` 파일을 인식하여 다음을 수행합니다:

- **Go 백엔드**: `api/main.go`를 서버리스 함수로 배포
- **프론트엔드**: `frontend/` 디렉토리의 정적 파일 배포
- **라우팅**: `/api/*` 요청은 Go 함수로, 나머지는 프론트엔드로

### 4. 배포 프로세스

1. **자동 배포**: `main` 브랜치에 푸시하면 자동 배포
2. **프리뷰 배포**: Pull Request 생성 시 프리뷰 배포
3. **수동 배포**: Vercel Dashboard에서 수동 배포 가능

### 5. 모니터링

- **배포 로그**: Vercel Dashboard > Deployments에서 확인
- **함수 로그**: Vercel Dashboard > Functions에서 확인
- **성능 메트릭**: Vercel Analytics 사용

### 6. 커스텀 도메인

1. Vercel Dashboard > Domains
2. 도메인 추가 및 DNS 설정
3. SSL 인증서 자동 발급

### 7. 환경별 설정

#### Development:
- 브랜치: `develop`
- 환경 변수: 개발용 설정

#### Production:
- 브랜치: `main`
- 환경 변수: 프로덕션 설정

### 8. 트러블슈팅

#### 일반적인 문제들:

1. **빌드 실패**: `vercel.json` 설정 확인
2. **함수 타임아웃**: `maxDuration` 값 증가
3. **메모리 부족**: `memory` 값 증가
4. **환경 변수 누락**: Vercel Dashboard에서 확인

#### 로그 확인:
```bash
# Vercel CLI로 로그 확인
vercel logs --follow
```

### 9. 성능 최적화

1. **CDN**: Vercel의 글로벌 CDN 활용
2. **캐싱**: 정적 파일 캐싱 설정
3. **압축**: Gzip/Brotli 압축 자동 적용
4. **이미지 최적화**: Vercel Image Optimization 사용

### 10. 보안 설정

1. **HTTPS**: 자동 SSL 인증서
2. **CORS**: 환경 변수로 설정
3. **Rate Limiting**: 미들웨어로 구현
4. **JWT**: 안전한 시크릿 키 사용

## 로컬 개발

```bash
# 의존성 설치
cd frontend && npm install

# CSS 빌드
npm run build-css

# 개발 서버 실행
npm run dev
```

## 프로덕션 빌드

```bash
# 프론트엔드 빌드
cd frontend && npm run vercel-build

# Go 백엔드 테스트
go run api/main.go
```
