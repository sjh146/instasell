from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__)

# CORS 설정 (React 프론트엔드와 통신)
CORS(app)

# 설정 파일 import
from config import Config

# PostgreSQL 데이터베이스 설정
app.config.from_object(Config)

db = SQLAlchemy(app)

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

# 데이터베이스 테이블 생성
with app.app_context():
    if wait_for_db():
        db.create_all()
        print("✅ 데이터베이스 테이블 생성 완료")
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

# 모든 주문 조회 API
@app.route('/api/orders', methods=['GET'])
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

# 특정 주문 조회 API
@app.route('/api/orders/<int:order_id>', methods=['GET'])
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

# PayPal 주문 ID로 주문 조회 API
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

# 주문 상태 업데이트 API
@app.route('/api/orders/<int:order_id>/status', methods=['PUT'])
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

# 통계 API
@app.route('/api/stats', methods=['GET'])
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 