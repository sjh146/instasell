# PayPal 웹훅 설정 가이드

## 🔗 PayPal 웹훅이란?

PayPal 웹훅은 결제 상태 변경, 주문 완료, 환불 등의 이벤트가 발생했을 때 자동으로 귀하의 서버에 알림을 보내는 시스템입니다.

### **웹훅의 장점**
- ✅ **실시간 알림**: 결제 상태 변경을 즉시 알림
- ✅ **자동화**: 수동 확인 없이 자동으로 처리
- ✅ **신뢰성**: PayPal에서 보장하는 안정적인 전송
- ✅ **보안**: 서명 검증으로 무결성 보장

## 📋 주요 웹훅 이벤트

### **결제 관련 이벤트**
```json
{
  "PAYMENT.CAPTURE.COMPLETED": "결제 완료",
  "PAYMENT.CAPTURE.DENIED": "결제 거부",
  "PAYMENT.CAPTURE.PENDING": "결제 대기 중",
  "PAYMENT.CAPTURE.REFUNDED": "환불 완료",
  "PAYMENT.CAPTURE.REVERSED": "결제 취소"
}
```

### **주문 관련 이벤트**
```json
{
  "CHECKOUT.ORDER.APPROVED": "주문 승인",
  "CHECKOUT.ORDER.COMPLETED": "주문 완료",
  "CHECKOUT.ORDER.PROCESSED": "주문 처리됨"
}
```

### **구독 관련 이벤트**
```json
{
  "BILLING.SUBSCRIPTION.ACTIVATED": "구독 활성화",
  "BILLING.SUBSCRIPTION.CANCELLED": "구독 취소",
  "BILLING.SUBSCRIPTION.EXPIRED": "구독 만료"
}
```

## 🛠️ 웹훅 설정 방법

### **1. PayPal 개발자 계정 설정**

#### **1.1 개발자 계정 접속**
1. [PayPal Developer](https://developer.paypal.com) 접속
2. 로그인 후 Dashboard로 이동

#### **1.2 샌드박스 환경 선택**
- **Sandbox**: 테스트 환경
- **Live**: 실제 운영 환경

### **2. 웹훅 생성**

#### **2.1 웹훅 URL 설정**
```
https://your-domain.com/api/webhooks/paypal
```

#### **2.2 이벤트 선택**
필수 이벤트:
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.REFUNDED`
- `CHECKOUT.ORDER.COMPLETED`

### **3. 웹훅 검증**

#### **3.1 서명 검증**
PayPal은 모든 웹훅에 디지털 서명을 포함합니다:

```python
def verify_webhook_signature(payload, headers):
    """
    PayPal 웹훅 서명을 검증합니다.
    """
    # PayPal에서 제공하는 서명 헤더들
    auth_algo = headers.get('PAYPAL-AUTH-ALGO')
    cert_url = headers.get('PAYPAL-CERT-URL')
    transmission_id = headers.get('PAYPAL-TRANSMISSION-ID')
    transmission_sig = headers.get('PAYPAL-TRANSMISSION-SIG')
    transmission_time = headers.get('PAYPAL-TRANSMISSION-TIME')
    
    # 실제 구현에서는 PayPal SDK를 사용하여 서명 검증
    return paypal.verify_webhook_signature(payload, headers)
```

#### **3.2 중복 이벤트 방지**
```python
# 중복 이벤트 확인
existing_event = WebhookEvent.query.filter_by(event_id=event_id).first()
if existing_event:
    return jsonify({'status': 'duplicate'}), 200
```

## 🔧 웹훅 처리 구현

### **1. 웹훅 엔드포인트**

```python
@app.route('/api/webhooks/paypal', methods=['POST'])
def paypal_webhook():
    try:
        # 웹훅 데이터 받기
        payload = request.get_data(as_text=True)
        headers = dict(request.headers)
        
        # 웹훅 서명 검증
        if not verify_webhook_signature(payload, headers):
            return jsonify({'error': 'Invalid signature'}), 401
        
        # JSON 파싱
        webhook_data = json.loads(payload)
        event_type = webhook_data.get('event_type')
        resource = webhook_data.get('resource', {})
        
        # 이벤트 타입별 처리
        if event_type == 'PAYMENT.CAPTURE.COMPLETED':
            handle_payment_completed(resource)
        elif event_type == 'PAYMENT.CAPTURE.DENIED':
            handle_payment_denied(resource)
        elif event_type == 'PAYMENT.CAPTURE.REFUNDED':
            handle_payment_refunded(resource)
        
        return jsonify({'status': 'success'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

### **2. 이벤트별 처리 함수**

#### **결제 완료 처리**
```python
def handle_payment_completed(resource):
    payment_id = resource.get('id')
    amount = resource.get('amount', {}).get('value')
    currency = resource.get('amount', {}).get('currency_code')
    payer_email = resource.get('payer', {}).get('email_address')
    
    # 주문 상태 업데이트
    # 이메일 발송
    # 재고 관리
    # 로그 기록
```

#### **결제 거부 처리**
```python
def handle_payment_denied(resource):
    payment_id = resource.get('id')
    reason = resource.get('status_details', {}).get('reason')
    
    # 주문 상태 업데이트
    # 고객에게 알림
    # 재고 복원
```

#### **환불 처리**
```python
def handle_payment_refunded(resource):
    payment_id = resource.get('id')
    refund_amount = resource.get('amount', {}).get('value')
    
    # 주문 상태 업데이트
    # 환불 이메일 발송
    # 재고 복원
```

## 📊 웹훅 모니터링

### **1. 웹훅 이벤트 로그**

```python
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
    raw_data = db.Column(db.Text)
```

### **2. 웹훅 이벤트 조회 API**

```python
@app.route('/api/webhooks/events', methods=['GET'])
@login_required
def get_webhook_events():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    events = WebhookEvent.query.order_by(
        WebhookEvent.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'success': True,
        'events': [event.to_dict() for event in events.items],
        'total': events.total,
        'pages': events.pages,
        'current_page': events.page
    })
```

## 🔒 보안 고려사항

### **1. 서명 검증**
- 모든 웹훅의 서명을 반드시 검증
- PayPal의 공개키를 사용하여 무결성 확인

### **2. HTTPS 필수**
- 웹훅 URL은 반드시 HTTPS여야 함
- HTTP는 보안상 위험

### **3. 중복 이벤트 처리**
- 동일한 이벤트가 여러 번 전송될 수 있음
- 이벤트 ID를 사용하여 중복 방지

### **4. 타임아웃 설정**
- 웹훅 처리는 30초 이내에 완료
- 긴 처리 시간은 재시도 발생

## 🧪 웹훅 테스트

### **1. PayPal 웹훅 시뮬레이터**

1. PayPal Developer Dashboard 접속
2. Webhooks > Simulate Event 선택
3. 이벤트 타입 선택
4. 테스트 실행

### **2. 로컬 테스트**

```bash
# ngrok을 사용한 로컬 테스트
ngrok http 5000

# 웹훅 URL 설정
https://your-ngrok-url.ngrok.io/api/webhooks/paypal
```

### **3. 테스트 이벤트 예시**

```json
{
  "id": "WH-2JR3241H2131242X-1234567890123456",
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "create_time": "2023-01-01T00:00:00.000Z",
  "resource_type": "capture",
  "resource": {
    "id": "2GG3456789012345",
    "status": "COMPLETED",
    "amount": {
      "currency_code": "USD",
      "value": "75.00"
    },
    "payer": {
      "email_address": "sb-1234567890@business.example.com"
    }
  }
}
```

## 🚨 문제 해결

### **1. 웹훅 수신 안됨**
- URL이 올바른지 확인
- HTTPS 사용 여부 확인
- 방화벽 설정 확인

### **2. 서명 검증 실패**
- PayPal 공개키 확인
- 헤더 정보 확인
- 시간 동기화 확인

### **3. 중복 이벤트**
- 이벤트 ID 기반 중복 체크
- 데이터베이스 인덱스 설정

### **4. 처리 시간 초과**
- 비동기 처리 고려
- 큐 시스템 도입

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. PayPal Developer Dashboard의 웹훅 로그
2. 서버 로그 확인
3. 네트워크 연결 상태
4. SSL 인증서 유효성

## 🔗 유용한 링크

- [PayPal Webhooks Documentation](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)
- [PayPal Webhook Event Types](https://developer.paypal.com/docs/api-basics/notifications/webhooks/event-names/)
- [PayPal Webhook Signature Verification](https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/)
