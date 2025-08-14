#!/bin/bash

# Instagram Clone 네트워크 모니터링 스크립트
# 이 스크립트는 Docker 네트워크 상태를 모니터링합니다.

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 네트워크 상태 확인
check_networks() {
    log_info "Docker 네트워크 상태 확인 중..."
    
    # 네트워크 목록 확인
    networks=$(docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}" | grep instagram)
    
    if [ -z "$networks" ]; then
        log_warning "Instagram 관련 네트워크가 없습니다."
        return 1
    fi
    
    echo "$networks"
    log_success "네트워크 목록 확인 완료"
}

# 컨테이너 네트워크 연결 확인
check_container_networks() {
    log_info "컨테이너 네트워크 연결 확인 중..."
    
    containers=("instagram-postgres" "instagram-redis" "instagram-backend" "instagram-frontend" "instagram-nginx")
    
    for container in "${containers[@]}"; do
        if docker ps --format "{{.Names}}" | grep -q "$container"; then
            networks=$(docker inspect "$container" --format='{{range $net, $config := .NetworkSettings.Networks}}{{$net}} {{end}}')
            log_info "$container: $networks"
        else
            log_warning "$container 컨테이너가 실행 중이 아닙니다."
        fi
    done
}

# 네트워크 통신 테스트
test_network_connectivity() {
    log_info "네트워크 통신 테스트 중..."
    
    # 백엔드에서 데이터베이스 연결 테스트
    if docker ps --format "{{.Names}}" | grep -q "instagram-backend"; then
        log_info "백엔드 -> PostgreSQL 연결 테스트..."
        if docker exec instagram-backend curl -f http://postgres:5432 > /dev/null 2>&1; then
            log_success "백엔드 -> PostgreSQL 연결 성공"
        else
            log_error "백엔드 -> PostgreSQL 연결 실패"
        fi
        
        log_info "백엔드 -> Redis 연결 테스트..."
        if docker exec instagram-backend curl -f http://redis:6379 > /dev/null 2>&1; then
            log_success "백엔드 -> Redis 연결 성공"
        else
            log_error "백엔드 -> Redis 연결 실패"
        fi
    fi
    
    # 프론트엔드에서 백엔드 연결 테스트
    if docker ps --format "{{.Names}}" | grep -q "instagram-frontend"; then
        log_info "프론트엔드 -> 백엔드 연결 테스트..."
        if docker exec instagram-frontend curl -f http://backend:5000/health > /dev/null 2>&1; then
            log_success "프론트엔드 -> 백엔드 연결 성공"
        else
            log_error "프론트엔드 -> 백엔드 연결 실패"
        fi
    fi
    
    # Nginx에서 내부 서비스 연결 테스트
    if docker ps --format "{{.Names}}" | grep -q "instagram-nginx"; then
        log_info "Nginx -> 백엔드 연결 테스트..."
        if docker exec instagram-nginx wget -q --spider http://backend:5000/health; then
            log_success "Nginx -> 백엔드 연결 성공"
        else
            log_error "Nginx -> 백엔드 연결 실패"
        fi
        
        log_info "Nginx -> 프론트엔드 연결 테스트..."
        if docker exec instagram-nginx wget -q --spider http://frontend:3000/; then
            log_success "Nginx -> 프론트엔드 연결 성공"
        else
            log_error "Nginx -> 프론트엔드 연결 실패"
        fi
    fi
}

# 네트워크 보안 확인
check_network_security() {
    log_info "네트워크 보안 설정 확인 중..."
    
    # 외부 포트 노출 확인
    exposed_ports=$(docker ps --format "table {{.Names}}\t{{.Ports}}" | grep instagram)
    
    if echo "$exposed_ports" | grep -q "5432\|6379\|5000\|3000"; then
        log_warning "데이터베이스나 내부 서비스 포트가 외부에 노출되어 있습니다:"
        echo "$exposed_ports"
    else
        log_success "내부 서비스 포트가 적절히 보호되고 있습니다."
    fi
    
    # 네트워크 격리 확인
    networks=$(docker network ls --format "{{.Name}}" | grep instagram)
    
    for network in $networks; do
        if docker network inspect "$network" --format='{{.Internal}}' | grep -q "true"; then
            log_success "$network: 내부 네트워크로 격리됨"
        else
            log_warning "$network: 외부 접근 가능"
        fi
    done
}

# 메인 함수
main() {
    log_info "Instagram Clone 네트워크 모니터링 시작"
    echo "========================================"
    
    check_networks
    echo ""
    
    check_container_networks
    echo ""
    
    test_network_connectivity
    echo ""
    
    check_network_security
    echo ""
    
    log_success "네트워크 모니터링 완료"
}

# 스크립트 실행
main "$@"
