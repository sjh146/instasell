#!/bin/bash

# Instagram Web Service - 분리된 서비스 빌드 및 실행 스크립트
set -e

echo "🚀 Building and running Instagram Web Service (Separated Services)..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 함수 정의
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 기존 컨테이너 정리
print_status "Cleaning up existing containers..."
docker-compose -f docker-compose.separated.yml down 2>/dev/null || true

# 이미지 빌드
print_status "Building Docker images..."
docker-compose -f docker-compose.separated.yml build --no-cache

print_success "Images built successfully!"

# 서비스 시작
print_status "Starting services..."
docker-compose -f docker-compose.separated.yml up -d

# 서비스 상태 확인
print_status "Checking service status..."
sleep 10

# 헬스체크
print_status "Performing health checks..."

# PostgreSQL 체크
if docker-compose -f docker-compose.separated.yml exec -T postgres pg_isready -U instagram_user -d instagram_db > /dev/null 2>&1; then
    print_success "PostgreSQL is healthy"
else
    print_warning "PostgreSQL health check failed"
fi

# Backend 체크
if curl -f http://localhost:5000/ > /dev/null 2>&1; then
    print_success "Backend is healthy"
else
    print_warning "Backend health check failed"
fi

# Frontend 체크
if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    print_success "Frontend is healthy"
else
    print_warning "Frontend health check failed"
fi

# 서비스 정보 출력
echo ""
print_success "Instagram Web Service is running!"
echo ""
echo "📊 Service Information:"
echo "   🗄️  PostgreSQL: localhost:5432"
echo "   🔧 Backend API: http://localhost:5000"
echo "   📱 Frontend: http://localhost:3000"
echo "   📊 Admin Panel: http://localhost:5000/admin"
echo ""
echo "🔧 Useful Commands:"
echo "   View logs: docker-compose -f docker-compose.separated.yml logs -f"
echo "   Stop services: docker-compose -f docker-compose.separated.yml down"
echo "   Restart services: docker-compose -f docker-compose.separated.yml restart"
echo "   Scale frontend: docker-compose -f docker-compose.separated.yml up -d --scale frontend=3"
echo ""
