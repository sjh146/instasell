# Instagram-Style Web Service with PayPal Integration

인스타그램 스타일의 웹 서비스로, PayPal 결제 기능이 통합된 React + Flask 애플리케이션입니다.

## 🚀 Features

- **Instagram-style UI**: 실제 인스타그램과 유사한 디자인
- **PayPal Integration**: 안전한 결제 처리
- **Responsive Design**: 모바일 및 데스크톱 지원
- **Real-time Updates**: 실시간 주문 상태 업데이트
- **Admin Dashboard**: 주문 관리 및 통계

## 🛠 Tech Stack

### Frontend
- React 19.1.0
- PayPal React SDK
- CSS3 with Instagram-style design

### Backend
- Python 3.12
- Flask
- Flask-SQLAlchemy
- PostgreSQL (with SQLite fallback)
- Anaconda 환경 (dduckbeagy)

### Infrastructure
- Docker
- RHEL 10
- Anaconda
- Node.js 18.x

## 📦 Docker 배포 (분리된 서비스)

### 1. 분리된 서비스 빌드 및 실행

```bash
# 모든 서비스 빌드 및 실행
docker-compose -f docker-compose.separated.yml up -d --build

# 또는 스크립트 사용
./build-separated.sh
```

### 2. 개별 서비스 빌드

```bash
# 백엔드만 빌드
docker-compose -f docker-compose.separated.yml build backend

# 프론트엔드만 빌드
docker-compose -f docker-compose.separated.yml build frontend

# PostgreSQL은 이미지 사용
docker pull postgres:15
```

### 3. 서비스별 실행

```bash
# 데이터베이스 먼저 실행
docker-compose -f docker-compose.separated.yml up -d postgres

# 백엔드 실행
docker-compose -f docker-compose.separated.yml up -d backend

# 프론트엔드 실행
docker-compose -f docker-compose.separated.yml up -d frontend
```

## ☁️ AWS EC2 배포

### 1. EC2 인스턴스 준비

- RHEL 10 AMI 선택
- 보안 그룹에서 포트 3000, 5000, 5432, 22 열기
- 최소 2GB RAM, 20GB 스토리지 권장

### 2. 분리된 서비스 배포

```bash
# 프로젝트 파일 업로드
scp -r . ec2-user@your-ec2-ip:/home/ec2-user/instagram-web

# EC2에 접속
ssh ec2-user@your-ec2-ip

# Docker 및 Docker Compose 설치
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 서비스 실행
cd instagram-web
docker-compose -f docker-compose.separated.yml up -d --build
```

### 3. 서비스 모니터링

```bash
# 서비스 상태 확인
docker-compose -f docker-compose.separated.yml ps

# 로그 확인
docker-compose -f docker-compose.separated.yml logs -f

# 특정 서비스 재시작
docker-compose -f docker-compose.separated.yml restart backend
```

# 이미지 가져오기
docker pull dduckbeagy/instagram-web-service:latest

# 컨테이너 실행
docker run -d \
  --name instagram-web-service \
  -p 3000:3000 \
  -p 5000:5000 \
  --restart unless-stopped \
  dduckbeagy/instagram-web-service:latest
```

## 🔧 환경 설정

### 환경 변수

```bash
# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shopping_db
DB_USERNAME=postgres
DB_PASSWORD=password

# PayPal 설정
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Flask 설정
FLASK_ENV=production
SECRET_KEY=your_secret_key
```

### 포트 설정

- **3000**: React 프론트엔드
- **5000**: Flask 백엔드 API
- **5432**: PostgreSQL (선택사항)

## 📱 사용 방법

1. **프론트엔드 접속**: `http://your-domain:3000`
2. **상품 선택**: 카메라 상품 확인
3. **PayPal 결제**: 결제 버튼 클릭
4. **주문 완료**: 결제 후 주문 정보 저장

## 🛡️ 보안 고려사항

- PayPal 샌드박스 환경 사용 (개발용)
- 환경 변수로 민감 정보 관리
- HTTPS 사용 권장 (프로덕션)
- 방화벽 설정으로 포트 제한

## 📊 모니터링

```bash
# 컨테이너 상태 확인
docker ps

# 로그 확인
docker logs -f instagram-web-service

# 리소스 사용량 확인
docker stats instagram-web-service
```

## 🔄 업데이트

```bash
# 최신 이미지 가져오기
docker pull dduckbeagy/instagram-web-service:latest

# 컨테이너 재시작
docker restart instagram-web-service
```

## 🐛 문제 해결

### 일반적인 문제들

1. **포트 충돌**: 다른 서비스가 3000/5000 포트 사용 중
2. **메모리 부족**: EC2 인스턴스 크기 증가
3. **네트워크 문제**: 보안 그룹 설정 확인

### 로그 확인

```bash
# 컨테이너 로그
docker logs instagram-web-service

# 시스템 로그
sudo journalctl -u docker
```

## 📞 지원

문제가 발생하면 다음을 확인하세요:

1. Docker 로그: `docker logs instagram-web-service`
2. 시스템 리소스: `docker stats`
3. 네트워크 연결: `curl localhost:3000`

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 