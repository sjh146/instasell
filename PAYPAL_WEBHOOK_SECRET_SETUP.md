# PayPal 웹훅 시크릿 설정 가이드

## 🔐 PayPal 웹훅 시크릿이란?

PayPal 웹훅 시크릿은 웹훅의 무결성을 검증하기 위한 비밀키입니다. PayPal에서 보낸 웹훅이 실제로 PayPal에서 온 것인지 확인하는 데 사용됩니다.

## 🔍 웹훅 ID vs 웹훅 시크릿

### **📋 차이점**

| 구분 | 웹훅 ID | 웹훅 시크릿 |
|------|---------|-------------|
| **용도** | 웹훅을 식별하는 고유 번호 | 웹훅 서명을 검증하는 비밀키 |
| **형태** | `WH-1234567890ABCDEF` | `1234567890abcdef1234567890abcdef` |
| **위치** | 웹훅 목록에서 확인 | 웹훅 상세 페이지에서 확인 |
| **사용처** | 웹훅 관리, 삭제, 수정 | 서명 검증, 보안 |

### **🛠️ PayPal Developer Dashboard에서 확인 방법**

#### **1. 웹훅 ID 확인**
1. PayPal Developer Dashboard 접속
2. **Webhooks** 메뉴로 이동
3. 웹훅 목록에서 **웹훅 ID** 확인
   ```
   예시: WH-2JR3241H2131242X
   ```

#### **2. 웹훅 시크릿 확인**
1. 웹훅 목록에서 해당 웹훅 **클릭**
2. **Webhook Secret** 섹션에서 시크릿 확인
   ```
   예시: 1234567890abcdef1234567890abcdef
   ```

### **💻 코드에서의 사용**

#### **웹훅 ID 사용**
```python
# 웹훅 관리용 (삭제, 수정 등)
webhook_id = "WH-2JR3241H2131242X"

# PayPal SDK에서 웹훅 삭제
paypalrestsdk.Webhook.delete(webhook_id)
```

#### **웹훅 시크릿 사용**
```python
# 서명 검증용
PAYPAL_WEBHOOK_SECRET = "1234567890abcdef1234567890abcdef"

def verify_webhook_signature(payload, headers):
    # 웹훅 시크릿을 사용하여 서명 검증
    return verify_signature(payload, headers, PAYPAL_WEBHOOK_SECRET)
```

## 🛠️ 웹훅 시크릿 설정 방법

### **1. PayPal Developer Dashboard에서 웹훅 생성**

#### **1.1 개발자 계정 접속**
1. [PayPal Developer](https://developer.paypal.com) 접속
2. 로그인 후 Dashboard로 이동

#### **1.2 샌드박스 환경 선택**
- **Sandbox**: 테스트 환경
- **Live**: 실제 운영 환경

#### **1.3 웹훅 생성**
1. **Webhooks** 메뉴로 이동
2. **Add Webhook** 클릭
3. **Webhook URL** 설정: `https://your-domain.com/api/webhooks/paypal`
4. **Event Types** 선택:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `CHECKOUT.ORDER.COMPLETED`

#### **1.4 웹훅 시크릿 확인**
웹훅을 생성하면 PayPal에서 자동으로 웹훅 시크릿을 생성합니다:
1. 생성된 웹훅을 클릭
2. **Webhook Secret** 섹션에서 시크릿 확인
3. 시크릿을 복사하여 안전한 곳에 보관

### **2. 환경 변수 설정**

#### **2.1 개발 환경 (.env 파일)**
```bash
# backend/.env 파일 생성
PAYPAL_WEBHOOK_SECRET=your-actual-webhook-secret-from-paypal
PAYPAL_WEBHOOK_ID=your-actual-webhook-id-from-paypal
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
FLASK_ENV=development
```

#### **2.2 프로덕션 환경**
```bash
# 서버에서 환경 변수 설정
export PAYPAL_WEBHOOK_SECRET=your-actual-webhook-secret-from-paypal
export PAYPAL_WEBHOOK_ID=your-actual-webhook-id-from-paypal
export PAYPAL_CLIENT_ID=your-paypal-client-id
export PAYPAL_CLIENT_SECRET=your-paypal-client-secret
export FLASK_ENV=production
```

#### **2.3 Docker 환경**
```yaml
# docker-compose.yml에 환경 변수 추가
services:
  backend:
    environment:
      - PAYPAL_WEBHOOK_SECRET=your-actual-webhook-secret-from-paypal
      - PAYPAL_WEBHOOK_ID=your-actual-webhook-id-from-paypal
      - PAYPAL_CLIENT_ID=your-paypal-client-id
      - PAYPAL_CLIENT_SECRET=your-paypal-client-secret
      - FLASK_ENV=production
```

### **3. 웹훅 시크릿 검증**

#### **3.1 현재 코드의 검증 로직**
```python
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
        
        # 실제 환경에서는 PayPal SDK를 사용하여 서명 검증
        # return paypal.verify_webhook_signature(payload, headers)
        
        # 개발 환경에서는 기본 검증만 수행
        return True
        
    except Exception as e:
        print(f"❌ 웹훅 서명 검증 오류: {e}")
        return False
```

#### **3.2 실제 프로덕션 검증 (PayPal SDK 사용)**
```python
import paypalrestsdk

def verify_webhook_signature(payload, headers):
    """
    PayPal SDK를 사용한 실제 웹훅 서명 검증
    """
    try:
        # PayPal SDK 설정
        paypalrestsdk.configure({
            "mode": "sandbox",  # 또는 "live"
            "client_id": os.environ.get('PAYPAL_CLIENT_ID'),
            "client_secret": os.environ.get('PAYPAL_CLIENT_SECRET')
        })
        
        # 웹훅 서명 검증
        verification_result = paypalrestsdk.WebhookEvent.verify(
            transmission_id=headers.get('PAYPAL-TRANSMISSION-ID'),
            transmission_time=headers.get('PAYPAL-TRANSMISSION-TIME'),
            cert_url=headers.get('PAYPAL-CERT-URL'),
            auth_algo=headers.get('PAYPAL-AUTH-ALGO'),
            transmission_sig=headers.get('PAYPAL-TRANSMISSION-SIG'),
            webhook_id=os.environ.get('PAYPAL_WEBHOOK_ID'),  # 웹훅 ID도 필요
            webhook_event=payload
        )
        
        return verification_result
        
    except Exception as e:
        print(f"❌ 웹훅 서명 검증 오류: {e}")
        return False
```

## 🔒 보안 고려사항

### **1. 시크릿 관리**
- ✅ **환경 변수 사용**: 코드에 직접 하드코딩하지 않음
- ✅ **안전한 저장**: 시크릿을 안전한 곳에 보관
- ✅ **정기적 변경**: 주기적으로 시크릿 변경
- ❌ **Git에 커밋 금지**: .env 파일을 Git에 포함하지 않음

### **2. .gitignore 설정**
```gitignore
# 환경 변수 파일
.env
.env.local
.env.production
.env.staging

# 시크릿 파일
*.key
*.pem
secrets/
```

### **3. 프로덕션 환경**
```bash
# 프로덕션에서는 반드시 실제 시크릿 사용
export PAYPAL_WEBHOOK_SECRET=WH-2JR3241H2131242X-1234567890123456
export PAYPAL_WEBHOOK_ID=WH-2JR3241H2131242X
export FLASK_ENV=production
```

## 🧪 테스트 방법

### **1. 개발 환경 테스트**
```bash
# 개발 환경에서는 기본 시크릿 사용
export FLASK_ENV=development
# PAYPAL_WEBHOOK_SECRET이 설정되지 않으면 자동으로 기본값 사용
```

### **2. 웹훅 테스트**
```bash
# 웹훅 테스트 실행
curl -X POST http://localhost:5000/api/webhooks/test
```

### **3. PayPal 웹훅 시뮬레이터**
1. PayPal Developer Dashboard 접속
2. Webhooks > Simulate Event 선택
3. 이벤트 타입 선택
4. 테스트 실행

## 🚨 문제 해결

### **1. 시크릿이 설정되지 않은 경우**
```
❌ PAYPAL_WEBHOOK_SECRET 환경 변수가 설정되지 않았습니다.
   프로덕션 환경에서는 반드시 환경 변수를 설정하세요.
```

**해결 방법:**
```bash
export PAYPAL_WEBHOOK_SECRET=your-actual-webhook-secret
```

### **2. 웹훅 서명 검증 실패**
```
❌ 웹훅 서명 검증 실패
```

**해결 방법:**
1. PayPal Developer Dashboard에서 웹훅 시크릿 확인
2. 환경 변수가 올바르게 설정되었는지 확인
3. 웹훅 URL이 올바른지 확인

### **3. 개발 환경에서 기본값 사용**
```
⚠️ 개발 환경에서 기본 웹훅 시크릿을 사용합니다. 프로덕션에서는 환경 변수를 설정하세요.
```

**이는 정상적인 동작입니다.** 개발 환경에서는 기본값을 사용하고, 프로덕션에서는 실제 시크릿을 사용합니다.

## 📋 체크리스트

- [ ] PayPal Developer Dashboard에서 웹훅 생성
- [ ] 웹훅 ID 복사
- [ ] 웹훅 시크릿 복사
- [ ] 환경 변수 설정 (.env 파일 또는 시스템 환경 변수)
- [ ] .gitignore에 .env 파일 추가
- [ ] 프로덕션 환경에서 실제 시크릿 사용
- [ ] 웹훅 테스트 실행
- [ ] 서명 검증 테스트

## 🔗 유용한 링크

- [PayPal Webhooks Documentation](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)
- [PayPal Webhook Signature Verification](https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/)
- [PayPal Developer Dashboard](https://developer.paypal.com/)
