from flask import Flask, request, jsonify, render_template, redirect, url_for, flash, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
import json
import hmac
import hashlib

app = Flask(__name__)

# Flask Secret Key 설정 (세션 및 CSRF 보호용)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

# CORS 설정 개선 - 모든 도메인에서의 요청 허용
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        "supports_credentials": True
    }
})

# 추가 CORS 헤더 설정
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# 설정 파일 import
from config import Config

# PostgreSQL 데이터베이스 설정
app.config.from_object(Config)

db = SQLAlchemy(app)

# Flask-Login 설정
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'admin_login'
login_manager.login_message = '관리자 로그인이 필요합니다.'

# 관리자 모델
class Admin(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

@login_manager.user_loader
def load_user(user_id):
    return Admin.query.get(int(user_id))

# 주문 모델 정의
class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    paypal_order_id = db.Column(db.String(100), unique=True, nullable=False)
    product_name = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='USD')
    
    # 구매자 정보
    buyer_name = db.Column(db.String(100), nullable=False)
    buyer_email = db.Column(db.String(100), nullable=False)
    
    # 주소 정보
    address_line1 = db.Column(db.String(200))
    address_line2 = db.Column(db.String(200))
    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    postal_code = db.Column(db.String(20))
    country_code = db.Column(db.String(10))
    
    # 결제 상태
    payment_status = db.Column(db.String(50), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'paypal_order_id': self.paypal_order_id,
            'product_name': self.product_name,
            'amount': self.amount,
            'currency': self.currency,
            'buyer_name': self.buyer_name,
            'buyer_email': self.buyer_email,
            'address_line1': self.address_line1,
            'address_line2': self.address_line2,
            'city': self.city,
            'state': self.state,
            'postal_code': self.postal_code,
            'country_code': self.country_code,
            'payment_status': self.payment_status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

# 웹훅 이벤트 로그 모델
class WebhookEvent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    event_type = db.Column(db.String(100), nullable=False)
    event_id = db.Column(db.String(100), unique=True, nullable=False)
    resource_type = db.Column(db.String(50), nullable=False)
    resource_id = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.String(20))
    currency = db.Column(db.String(10))
    payer_email = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    raw_data = db.Column(db.Text)  # 전체 웹훅 데이터 저장

    def __repr__(self):
        return f'<WebhookEvent {self.event_type}:{self.event_id}>'

# PayPal 웹훅 검증 함수
def verify_webhook_signature(payload, headers):
    """
    PayPal 웹훅 서명을 검증합니다.
    """
    try:
        # PayPal에서 제공하는 서명 헤더들
        auth_algo = headers.get('PAYPAL-AUTH-ALGO')
        cert_url = headers.get('PAYPAL-CERT-URL')
        transmission_id = headers.get('PAYPAL-TRANSMISSION-ID')
        transmission_sig = headers.get('PAYPAL-TRANSMISSION-SIG')
        transmission_time = headers.get('PAYPAL-TRANSMISSION-TIME')
        
        # 실제 환경에서는 PayPal의 공개키를 사용하여 서명 검증
        # 여기서는 간단한 검증만 수행
        if not all([auth_algo, cert_url, transmission_id, transmission_sig, transmission_time]):
            return False
            
        # 실제 구현에서는 PayPal SDK를 사용하여 서명 검증
        # return paypal.verify_webhook_signature(payload, headers)
        
        # 개발 환경에서는 항상 True 반환
        return True
        
    except Exception as e:
        print(f"웹훅 서명 검증 오류: {e}")
        return False

# PayPal 웹훅 엔드포인트
@app.route('/api/webhooks/paypal', methods=['POST'])
def paypal_webhook():
    """
    PayPal 웹훅을 처리하는 엔드포인트
    """
    try:
        # 웹훅 데이터 받기
        payload = request.get_data(as_text=True)
        headers = dict(request.headers)
        
        print(f"🔔 PayPal 웹훅 수신: {headers.get('PAYPAL-TRANSMISSION-ID')}")
        
        # 웹훅 서명 검증 (실제 환경에서는 필수)
        if not verify_webhook_signature(payload, headers):
            print("❌ 웹훅 서명 검증 실패")
            return jsonify({'error': 'Invalid signature'}), 401
        
        # JSON 파싱
        webhook_data = json.loads(payload)
        event_type = webhook_data.get('event_type')
        event_id = webhook_data.get('id')
        resource = webhook_data.get('resource', {})
        
        print(f"📋 웹훅 이벤트: {event_type}")
        print(f"🆔 이벤트 ID: {event_id}")
        
        # 중복 이벤트 확인
        existing_event = WebhookEvent.query.filter_by(event_id=event_id).first()
        if existing_event:
            print(f"⚠️ 중복 웹훅 이벤트: {event_id}")
            return jsonify({'status': 'duplicate'}), 200
        
        # 웹훅 이벤트 저장
        webhook_event = WebhookEvent(
            event_type=event_type,
            event_id=event_id,
            resource_type=resource.get('type', ''),
            resource_id=resource.get('id', ''),
            status=resource.get('status', ''),
            amount=resource.get('amount', {}).get('value'),
            currency=resource.get('amount', {}).get('currency_code'),
            payer_email=resource.get('payer', {}).get('email_address'),
            raw_data=payload
        )
        
        db.session.add(webhook_event)
        db.session.commit()
        
        # 이벤트 타입별 처리
        if event_type == 'PAYMENT.CAPTURE.COMPLETED':
            handle_payment_completed(resource)
        elif event_type == 'PAYMENT.CAPTURE.DENIED':
            handle_payment_denied(resource)
        elif event_type == 'PAYMENT.CAPTURE.REFUNDED':
            handle_payment_refunded(resource)
        elif event_type == 'CHECKOUT.ORDER.COMPLETED':
            handle_order_completed(resource)
        else:
            print(f"📝 처리되지 않은 이벤트 타입: {event_type}")
        
        print(f"✅ 웹훅 처리 완료: {event_type}")
        return jsonify({'status': 'success'}), 200
        
    except Exception as e:
        print(f"❌ 웹훅 처리 오류: {e}")
        return jsonify({'error': str(e)}), 500

def handle_payment_completed(resource):
    """결제 완료 처리"""
    payment_id = resource.get('id')
    amount = resource.get('amount', {}).get('value')
    currency = resource.get('amount', {}).get('currency_code')
    payer_email = resource.get('payer', {}).get('email_address')
    
    print(f"💰 결제 완료: {payment_id}")
    print(f"💵 금액: {amount} {currency}")
    print(f"📧 결제자: {payer_email}")
    
    # 여기에 결제 완료 후 처리 로직 추가
    # 예: 주문 상태 업데이트, 이메일 발송, 재고 관리 등

def handle_payment_denied(resource):
    """결제 거부 처리"""
    payment_id = resource.get('id')
    reason = resource.get('status_details', {}).get('reason')
    
    print(f"❌ 결제 거부: {payment_id}")
    print(f"📝 거부 사유: {reason}")
    
    # 여기에 결제 거부 후 처리 로직 추가

def handle_payment_refunded(resource):
    """환불 처리"""
    payment_id = resource.get('id')
    refund_amount = resource.get('amount', {}).get('value')
    
    print(f"🔄 환불 완료: {payment_id}")
    print(f"💵 환불 금액: {refund_amount}")
    
    # 여기에 환불 후 처리 로직 추가

def handle_order_completed(resource):
    """주문 완료 처리"""
    order_id = resource.get('id')
    status = resource.get('status')
    
    print(f"✅ 주문 완료: {order_id}")
    print(f"📊 주문 상태: {status}")
    
    # 여기에 주문 완료 후 처리 로직 추가

# 웹훅 이벤트 조회 엔드포인트 (관리자용)
@app.route('/api/webhooks/events', methods=['GET'])
@login_required
def get_webhook_events():
    """웹훅 이벤트 목록 조회"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        events = WebhookEvent.query.order_by(
            WebhookEvent.created_at.desc()
        ).paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'success': True,
            'events': [{
                'id': event.id,
                'event_type': event.event_type,
                'event_id': event.event_id,
                'resource_type': event.resource_type,
                'resource_id': event.resource_id,
                'status': event.status,
                'amount': event.amount,
                'currency': event.currency,
                'payer_email': event.payer_email,
                'created_at': event.created_at.isoformat()
            } for event in events.items],
            'total': events.total,
            'pages': events.pages,
            'current_page': events.page
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 데이터베이스 연결 재시도 로직
def wait_for_db():
    import time
    from sqlalchemy import text
    max_retries = 30
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            db.session.execute(text('SELECT 1'))
            print("✅ 데이터베이스 연결 성공!")
            return True
        except Exception as e:
            retry_count += 1
            print(f"⏳ 데이터베이스 연결 시도 {retry_count}/{max_retries}: {str(e)}")
            time.sleep(2)
    
    print("❌ 데이터베이스 연결 실패")
    return False

# 데이터베이스 테이블 생성 및 기본 관리자 계정 생성
with app.app_context():
    if wait_for_db():
        db.create_all()
        print("✅ 데이터베이스 테이블 생성 완료")
        
        # 기본 관리자 계정 생성
        admin = Admin.query.filter_by(username='admin').first()
        if not admin:
            admin = Admin(
                username='admin',
                email='admin@example.com'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print("✅ 기본 관리자 계정 생성 완료")
            print("   사용자명: admin")
            print("   비밀번호: admin123")
        else:
            print("✅ 관리자 계정이 이미 존재합니다")
    else:
        print("❌ 데이터베이스 연결 실패로 인해 테이블 생성 건너뜀")

# 루트 경로 (헬스체크용)
@app.route('/')
def health_check():
    return jsonify({'status': 'ok', 'message': 'Instagram Web Service Backend is running'})

# 헬스체크 엔드포인트 (Docker healthcheck용)
@app.route('/health')
def health():
    try:
        # 데이터베이스 연결 확인
        from sqlalchemy import text
        db.session.execute(text('SELECT 1'))
        return jsonify({'status': 'healthy', 'database': 'connected'}), 200
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 503

# 관리자 페이지 라우트
@app.route('/admin')
def admin_page():
    return render_template('admin.html')

# 주문 저장 API
@app.route('/api/orders', methods=['POST'])
def create_order():
    try:
        data = request.json
        
        # PayPal 주문 정보에서 데이터 추출
        paypal_order = data.get('paypal_order', {})
        payer = paypal_order.get('payer', {})
        purchase_units = paypal_order.get('purchase_units', [{}])[0]
        shipping = purchase_units.get('shipping', {})
        address = shipping.get('address', {})
        
        # 새 주문 생성
        new_order = Order(
            paypal_order_id=paypal_order.get('id'),
            product_name=data.get('product_name', 'Unknown Product'),
            amount=float(purchase_units.get('amount', {}).get('value', 0)),
            currency=purchase_units.get('amount', {}).get('currency_code', 'USD'),
            
            # 구매자 정보
            buyer_name=f"{payer.get('name', {}).get('given_name', '')} {payer.get('name', {}).get('surname', '')}".strip(),
            buyer_email=payer.get('email_address', ''),
            
            # 주소 정보
            address_line1=address.get('address_line_1', ''),
            address_line2=address.get('address_line_2', ''),
            city=address.get('admin_area_2', ''),
            state=address.get('admin_area_1', ''),
            postal_code=address.get('postal_code', ''),
            country_code=address.get('country_code', ''),
            
            payment_status=paypal_order.get('status', 'pending')
        )
        
        db.session.add(new_order)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '주문이 성공적으로 저장되었습니다.',
            'order': new_order.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'주문 저장 중 오류가 발생했습니다: {str(e)}'
        }), 500

# PayPal 주문 ID로 주문 조회 API (공개 API - PayPal 웹훅용)
@app.route('/api/orders/paypal/<paypal_order_id>', methods=['GET'])
def get_order_by_paypal_id(paypal_order_id):
    try:
        order = Order.query.filter_by(paypal_order_id=paypal_order_id).first()
        if not order:
            return jsonify({
                'success': False,
                'message': '해당 PayPal 주문 ID를 찾을 수 없습니다.'
            }), 404
            
        return jsonify({
            'success': True,
            'order': order.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'주문 조회 중 오류가 발생했습니다: {str(e)}'
        }), 500

# 관리자 로그인 페이지
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        admin = Admin.query.filter_by(username=username).first()
        
        if admin and admin.check_password(password):
            login_user(admin)
            flash('로그인에 성공했습니다!', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('사용자명 또는 비밀번호가 올바르지 않습니다.', 'error')
    
    return render_template('login.html')

# 관리자 로그아웃
@app.route('/admin/logout')
@login_required
def admin_logout():
    logout_user()
    flash('로그아웃되었습니다.', 'success')
    return redirect(url_for('admin_login'))

# 관리자 대시보드 (보호된 페이지)
@app.route('/admin')
@login_required
def admin_dashboard():
    return render_template('admin.html')

# 통계 API (보호된 API)
@app.route('/api/stats', methods=['GET'])
@login_required
def get_stats():
    try:
        total_orders = Order.query.count()
        completed_orders = Order.query.filter_by(payment_status='COMPLETED').count()
        total_revenue = db.session.query(db.func.sum(Order.amount)).filter_by(payment_status='COMPLETED').scalar() or 0
        
        return jsonify({
            'success': True,
            'stats': {
                'total_orders': total_orders,
                'completed_orders': completed_orders,
                'total_revenue': float(total_revenue)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'통계 조회 중 오류가 발생했습니다: {str(e)}'
        }), 500

# 주문 목록 API (보호된 API)
@app.route('/api/orders', methods=['GET'])
@login_required
def get_orders():
    try:
        orders = Order.query.order_by(Order.created_at.desc()).all()
        return jsonify({
            'success': True,
            'orders': [order.to_dict() for order in orders]
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'주문 조회 중 오류가 발생했습니다: {str(e)}'
        }), 500

# 특정 주문 조회 API (보호된 API)
@app.route('/api/orders/<int:order_id>', methods=['GET'])
@login_required
def get_order(order_id):
    try:
        order = Order.query.get_or_404(order_id)
        return jsonify({
            'success': True,
            'order': order.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'주문 조회 중 오류가 발생했습니다: {str(e)}'
        }), 500

# 주문 상태 업데이트 API (보호된 API)
@app.route('/api/orders/<int:order_id>/status', methods=['PUT'])
@login_required
def update_order_status(order_id):
    try:
        order = Order.query.get_or_404(order_id)
        data = request.json
        
        order.payment_status = data.get('status', order.payment_status)
        order.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '주문 상태가 업데이트되었습니다.',
            'order': order.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'주문 상태 업데이트 중 오류가 발생했습니다: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 