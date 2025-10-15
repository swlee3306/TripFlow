# CSRF 보호 통합 가이드

## 개요

이 문서는 TripFlow 애플리케이션에서 CSRF(Cross-Site Request Forgery) 보호를 프론트엔드에서 어떻게 통합하는지 설명합니다.

## CSRF 토큰 획득

### 1. CSRF 토큰 요청

프론트엔드에서 상태 변경 요청을 보내기 전에 CSRF 토큰을 획득해야 합니다.

```javascript
// CSRF 토큰 획득
async function getCSRFToken() {
    try {
        const response = await fetch('/api/csrf', {
            method: 'GET',
            credentials: 'include' // 쿠키 포함
        });
        
        if (!response.ok) {
            throw new Error('Failed to get CSRF token');
        }
        
        const data = await response.json();
        return data.csrf_token;
    } catch (error) {
        console.error('CSRF token error:', error);
        throw error;
    }
}
```

### 2. CSRF 토큰 저장

획득한 CSRF 토큰을 메모리에 저장합니다.

```javascript
let csrfToken = null;

// CSRF 토큰 초기화
async function initializeCSRF() {
    csrfToken = await getCSRFToken();
    console.log('CSRF token initialized');
}
```

## 상태 변경 요청에 CSRF 토큰 포함

### 1. 헤더에 CSRF 토큰 포함

POST, PUT, DELETE 요청에 CSRF 토큰을 헤더에 포함합니다.

```javascript
// 파일 업로드 예시
async function uploadFile(file) {
    if (!csrfToken) {
        await initializeCSRF();
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: {
                'X-CSRF-Token': csrfToken
            }
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}
```

### 2. 폼 데이터에 CSRF 토큰 포함

HTML 폼을 사용하는 경우, 숨겨진 필드로 CSRF 토큰을 포함할 수 있습니다.

```html
<form id="upload-form">
    <input type="hidden" name="csrf_token" id="csrf-token-field">
    <input type="file" name="file" accept=".md,.markdown">
    <button type="submit">Upload</button>
</form>
```

```javascript
// 폼 제출 시 CSRF 토큰 설정
document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!csrfToken) {
        await initializeCSRF();
    }
    
    // 숨겨진 필드에 CSRF 토큰 설정
    document.getElementById('csrf-token-field').value = csrfToken;
    
    // 폼 제출 로직...
});
```

## 오류 처리

### 1. CSRF 토큰 만료 처리

CSRF 토큰이 만료된 경우 403 Forbidden 응답을 받게 됩니다.

```javascript
async function handleCSRFError(response) {
    if (response.status === 403) {
        const data = await response.json();
        if (data.error === 'CSRF token validation failed') {
            // CSRF 토큰 재획득
            await initializeCSRF();
            return true; // 재시도 가능
        }
    }
    return false;
}
```

### 2. 자동 재시도 로직

```javascript
async function makeAuthenticatedRequest(url, options = {}) {
    const maxRetries = 2;
    let retries = 0;
    
    while (retries <= maxRetries) {
        try {
            if (!csrfToken) {
                await initializeCSRF();
            }
            
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'include'
            });
            
            if (response.status === 403) {
                const shouldRetry = await handleCSRFError(response);
                if (shouldRetry && retries < maxRetries) {
                    retries++;
                    continue;
                }
            }
            
            return response;
        } catch (error) {
            if (retries >= maxRetries) {
                throw error;
            }
            retries++;
        }
    }
}
```

## 보안 고려사항

### 1. 쿠키 설정

CSRF 보호를 위해 쿠키가 필요합니다. 개발 환경에서는 `credentials: 'include'`를 사용하고, 프로덕션에서는 HTTPS를 사용해야 합니다.

### 2. 토큰 갱신

CSRF 토큰은 세션과 연관되어 있으므로, 사용자가 로그인/로그아웃할 때 토큰을 갱신해야 합니다.

```javascript
// 로그인 후 CSRF 토큰 갱신
async function onLoginSuccess() {
    await initializeCSRF();
}

// 로그아웃 시 CSRF 토큰 초기화
function onLogout() {
    csrfToken = null;
}
```

### 3. 개발 환경 설정

개발 환경에서는 CORS 설정에 CSRF 관련 헤더를 포함해야 합니다.

```go
// CORS 설정에 CSRF 헤더 포함
c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-CSRF-Token, X-Request-ID")
```

## 예제 통합

### 완전한 파일 업로드 예제

```javascript
class SecureFileUploader {
    constructor() {
        this.csrfToken = null;
        this.initializeCSRF();
    }
    
    async initializeCSRF() {
        try {
            const response = await fetch('/api/csrf', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.csrfToken = data.csrf_token;
            }
        } catch (error) {
            console.error('CSRF initialization failed:', error);
        }
    }
    
    async uploadFile(file) {
        if (!this.csrfToken) {
            await this.initializeCSRF();
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: {
                    'X-CSRF-Token': this.csrfToken
                }
            });
            
            if (response.status === 403) {
                // CSRF 토큰 갱신 후 재시도
                await this.initializeCSRF();
                return this.uploadFile(file);
            }
            
            if (!response.ok) {
                throw new Error('Upload failed');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }
}

// 사용 예제
const uploader = new SecureFileUploader();
```

이 가이드를 따라 CSRF 보호를 프론트엔드에 통합하면 안전한 상태 변경 요청을 보낼 수 있습니다.
