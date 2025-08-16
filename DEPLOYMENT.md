# 배포 가이드 (Deployment Guide)

## 🚀 다른 컴퓨터에서 배포하기

### 1. 사전 요구사항

- Docker 및 Docker Compose 설치
- Git 설치
- 포트 3000, 5000, 5432, 6379 사용 가능

### 2. 프로젝트 클론 및 설정

```bash
# 프로젝트 클론
git clone https://github.com/sjh146/instasell.git
cd instasell

# 환경 변수 설정
cp frontend/env.example frontend/.env
```

### 3. 환경 변수 설정

`frontend/.env` 파일을 편집하여 다음 설정을 추가하세요:

```env
# PayPal 설정 (실제 PayPal Client ID로 교체)
REACT_APP_PAYPAL_CLIENT_ID=your_actual_paypal_client_id

# 백엔드 설정 (실제 서버 IP/도메인으로 교체)
REACT_APP_BACKEND_URL=http://your-server-ip:5000
REACT_APP_BACKEND_PORT=5000

# 환경 설정
NODE_ENV=production
```

### 4. Docker 컨테이너 실행

```bash
# 컨테이너 빌드 및 실행
docker compose up -d --build

# 상태 확인
docker compose ps
```

### 5. 접속 방법

#### 로컬 접속
- 프론트엔드: `http://localhost:3000`
- 백엔드: `http://localhost:5000`
- 관리자 페이지: `http://localhost:5000/admin`

#### 다른 컴퓨터에서 접속
- 프론트엔드: `http://서버IP:3000`
- 백엔드: `http://서버IP:5000`
- 관리자 페이지: `http://서버IP:5000/admin`

### 6. 방화벽 설정

다음 포트를 열어주세요:
- 3000: React 프론트엔드
- 5000: Flask 백엔드
- 5432: PostgreSQL (선택사항)
- 6379: Redis (선택사항)

### 7. PayPal 설정

#### PayPal 개발자 계정 설정
1. [PayPal Developer](https://developer.paypal.com) 계정 생성
2. 새 앱 생성
3. Client ID 복사하여 `.env` 파일에 설정

#### 테스트 계정
- 이메일: `sb-1234567890@business.example.com`
- 비밀번호: `123456789`

### 8. 문제 해결

#### 백엔드 연결 실패
```bash
# 백엔드 로그 확인
docker compose logs backend

# 백엔드 재시작
docker compose restart backend
```

#### PayPal 결제 실패
1. PayPal Client ID 확인
2. 네트워크 연결 확인
3. 브라우저 콘솔에서 오류 확인

#### 포트 충돌
```bash
# 사용 중인 포트 확인
netstat -tulpn | grep :3000
netstat -tulpn | grep :5000

# 충돌하는 프로세스 종료
sudo kill -9 [PID]
```

### 9. 프로덕션 배포

#### HTTPS 설정 (권장)
```bash
# Nginx 설정 예시
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 환경 변수 설정
```bash
# 프로덕션 환경 변수
export NODE_ENV=production
export REACT_APP_PAYPAL_CLIENT_ID=your_production_paypal_client_id
export REACT_APP_BACKEND_URL=https://your-domain.com
```

### 10. 모니터링

#### 로그 확인
```bash
# 모든 서비스 로그
docker compose logs -f

# 특정 서비스 로그
docker compose logs -f frontend
docker compose logs -f backend
```

#### 상태 확인
```bash
# 컨테이너 상태
docker compose ps

# 리소스 사용량
docker stats
```

### 11. 백업 및 복구

#### 데이터베이스 백업
```bash
# PostgreSQL 백업
docker compose exec postgres pg_dump -U instagram_user instagram_db > backup.sql

# Redis 백업
docker compose exec redis redis-cli BGSAVE
```

#### 데이터베이스 복구
```bash
# PostgreSQL 복구
docker compose exec -T postgres psql -U instagram_user instagram_db < backup.sql
```

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. Docker 로그: `docker compose logs`
2. 네트워크 연결: `curl http://localhost:5000/health`
3. 환경 변수: `echo $REACT_APP_BACKEND_URL`

## 🔗 유용한 링크

- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [React Deployment](https://create-react-app.dev/docs/deployment/)
