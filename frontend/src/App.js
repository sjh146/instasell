import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import './App.css';

// 상품 정보를 객체로 관리합니다.
const product = {
  name: "MINI high-end camera",
  description: "The ultimate camera for pros — unmatched precision, instant response.",
  price: "75.00", // PayPal은 USD와 같은 통화를 사용하므로, 문자열로 가격을 전달합니다.
  krw_price: "90,000원",
  imageUrl: "/S7e8223771d9643b290de7b81268d8d4dd.jpg_220x220q75.jpg_.avif", // public 폴더 기준
  videoUrl: "/output_fixed.mp4" // public 폴더 기준
};

// PayPal Client ID - 환경 변수에서 가져오거나 기본값 사용
const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID || "AYclIN8z4NgfjpWr7HIUOAip4fOM69wFvd9BKw7g1GFCkfnZcRwHaNGqQl2M0f8286oQRmUCK1qhp82k";

// 배포 환경에 따른 백엔드 URL 설정
const getBackendUrl = () => {
  // 환경 변수에서 백엔드 URL 가져오기
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // 프로덕션 환경에서는 현재 호스트의 백엔드 포트 사용
  if (process.env.NODE_ENV === 'production') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = process.env.REACT_APP_BACKEND_PORT || '5000';
    return `${protocol}//${hostname}:${port}`;
  }
  
  // 개발 환경에서는 localhost 사용
  return 'http://localhost:5000';
};

// 배포 환경에 따른 PayPal 설정
const getPayPalOptions = () => {
  const baseOptions = {
    "client-id": PAYPAL_CLIENT_ID,
    "currency": "USD",
    "intent": "capture"
  };

  // 프로덕션 환경에서는 추가 설정
  if (process.env.NODE_ENV === 'production') {
    return {
      ...baseOptions,
      "components": "buttons,funding-eligibility",
      "disable-funding": "credit,card",
      "enable-funding": "paylater,venmo"
    };
  }

  return baseOptions;
};

function App() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [backendUrl, setBackendUrl] = useState(getBackendUrl());
  const [isLoading, setIsLoading] = useState(true);

  // 모바일 감지 함수
  const checkMobile = () => {
    const mobileBreakpoint = 768;
    const isMobileDevice = window.innerWidth <= mobileBreakpoint || 
                          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(isMobileDevice);
  };

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // 백엔드 연결 테스트
    testBackendConnection();
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // 백엔드 연결 테스트
  const testBackendConnection = async () => {
    try {
      console.log('백엔드 연결 테스트 시작:', backendUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
      
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('✅ 백엔드 연결 성공:', backendUrl);
      } else {
        console.warn('⚠️ 백엔드 응답 오류:', response.status);
      }
    } catch (error) {
      console.error('❌ 백엔드 연결 실패:', error);
      
      // 백엔드 연결 실패 시 대체 URL 시도
      if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
        const currentHost = window.location.hostname;
        const currentProtocol = window.location.protocol;
        const fallbackUrl = `${currentProtocol}//${currentHost}:5000`;
        
        if (fallbackUrl !== backendUrl) {
          console.log('🔄 대체 백엔드 URL 시도:', fallbackUrl);
          setBackendUrl(fallbackUrl);
          
          // 재시도
          setTimeout(() => {
            testBackendConnection();
          }, 1000);
          return;
        }
      }
      
      // 모든 시도 실패 시 사용자에게 알림
      console.error('모든 백엔드 연결 시도 실패');
    } finally {
      setIsLoading(false);
    }
  };

  // PayPal 결제 처리 개선
  const handlePayPalPayment = async (order) => {
    try {
      console.log('PayPal 결제 처리 시작:', order);
      console.log('백엔드 URL:', backendUrl);
      
      const response = await fetch(`${backendUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paypal_order: order,
          product_name: product.name
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const result = await response.json();
      console.log("✅ 백엔드 응답:", result);
      
      if (result.success) {
        alert(`🎉 PayPal 결제 완료! ${order.payer.name.given_name}님!\n주문이 성공적으로 저장되었습니다.\n주문 ID: ${order.id}`);
      } else {
        alert(`PayPal 결제는 완료되었지만 주문 저장 중 오류가 발생했습니다: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ PayPal 결제 처리 중 오류:', error);
      console.error('백엔드 URL:', backendUrl);
      
      // 네트워크 오류인 경우 사용자에게 안내
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        alert(`🌐 네트워크 연결 오류입니다.\n\n백엔드 서버가 실행 중인지 확인해주세요.\n백엔드 URL: ${backendUrl}\n\n다른 기기에서 접속하는 경우:\n1. 서버 IP 주소 확인\n2. 방화벽 설정 확인\n3. 포트 5000이 열려있는지 확인`);
      } else if (error.name === 'AbortError') {
        alert(`⏰ 요청 시간 초과입니다.\n\n네트워크 연결을 확인하고 다시 시도해주세요.\n백엔드 URL: ${backendUrl}`);
      } else {
        alert(`❌ PayPal 결제 처리 중 오류가 발생했습니다:\n${error.message}\n\n백엔드 URL: ${backendUrl}`);
      }
    }
  };

  const handleVideoClick = () => {
    setIsVideoPlaying(true);
  };

  const handleLikeClick = () => {
    setIsLiked(!isLiked);
  };

  const handleInstagramClick = () => {
    window.open('https://www.instagram.com', '_blank');
  };

  // 로딩 중 표시
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#000000',
        color: '#ffffff',
        fontSize: '18px'
      }}>
        <div>
          <div style={{ marginBottom: '20px' }}>로딩 중...</div>
          <div style={{ fontSize: '14px', color: '#888' }}>
            백엔드 연결 확인 중: {backendUrl}
          </div>
        </div>
      </div>
    );
  }

  // 결제 처리 함수
  const handlePayment = async () => {
    console.log("결제 버튼 클릭됨");
    console.log("백엔드 URL:", backendUrl);
    
    try {
      // PayPal 결제 시뮬레이션
      const mockOrder = {
        id: "PAY-" + Date.now(),
        status: "COMPLETED",
        payer: {
          name: {
            given_name: "테스트",
            surname: "사용자"
          },
          email_address: "test@example.com"
        },
        purchase_units: [{
          amount: {
            value: product.price,
            currency_code: "USD"
          }
        }]
      };
      
      console.log("결제 주문:", mockOrder);
      
      const response = await fetch(`${backendUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paypal_order: mockOrder,
          product_name: product.name
        })
      });
      
      const result = await response.json();
      console.log("백엔드 응답:", result);
      
      if (result.success) {
        alert(`🎉 결제 완료! ${mockOrder.payer.name.given_name}님!\n주문이 성공적으로 저장되었습니다.\n주문 ID: ${mockOrder.id}`);
      } else {
        alert(`결제는 완료되었지만 주문 저장 중 오류가 발생했습니다: ${result.message}`);
      }
    } catch (error) {
      console.error('결제 처리 중 오류:', error);
      console.error('백엔드 URL:', backendUrl);
      alert(`결제 처리 중 오류가 발생했습니다: ${error.message}\n백엔드 URL: ${backendUrl}`);
    }
  };

  // 모바일 전용 컴포넌트
  const MobileView = () => (
    <div className="mobile-container">
      <div className="mobile-header">
        <div className="mobile-header-left">
          <div className="mobile-user-info">
            <div className="mobile-profile-pic">👤</div>
            <span className="mobile-username">dogunnny</span>
          </div>
        </div>
        
        <div className="mobile-header-center">
          <div className="instagram-logo" onClick={handleInstagramClick}>
            Instagram
          </div>
        </div>
        
        <div className="mobile-header-right">
          <div className="mobile-action-buttons">
            <button 
              className={`mobile-like-button ${isLiked ? 'liked' : ''}`}
              onClick={handleLikeClick}
            >
              {isLiked ? '❤️' : '🤍'}
            </button>
            <button className="mobile-message-button">
              ✈️
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 동영상/이미지 섹션 */}
      <div className="mobile-video-section">
        {isVideoPlaying ? (
          <video 
            src={product.videoUrl} 
            controls 
            autoPlay 
            className="mobile-video"
            onEnded={() => setIsVideoPlaying(false)}
          />
        ) : (
          <div className="mobile-image-container">
            <img src={product.imageUrl} alt="Post" className="mobile-image" />
            <button 
              className="mobile-video-play-button"
              onClick={handleVideoClick}
            >
              ▶️
            </button>
          </div>
        )}
      </div>

      {/* 모바일 결제 섹션 */}
      <div className="mobile-payment-section">
        <div className="mobile-price-info">
          <span className="mobile-price">{product.krw_price}</span>
          <span className="mobile-usd-price">(USD ${product.price})</span>
        </div>
        
        {/* PayPal 결제 버튼 */}
        <PayPalScriptProvider options={getPayPalOptions()}>
          <div className="mobile-paypal-container">
            <PayPalButtons
              style={{ 
                layout: "vertical",
                color: "gold",
                shape: "rect",
                label: "paypal"
              }}
              createOrder={(data, actions) => {
                console.log("PayPal createOrder 호출됨");
                return actions.order.create({
                  purchase_units: [
                    {
                      description: product.name,
                      amount: {
                        value: product.price,
                        currency_code: "USD"
                      }
                    }
                  ],
                  application_context: {
                    shipping_preference: "NO_SHIPPING"
                  }
                });
              }}
              onApprove={async (data, actions) => {
                console.log("PayPal onApprove 호출됨", data);
                try {
                  const order = await actions.order.capture();
                  console.log("PayPal 결제 완료:", order);
                  
                  await handlePayPalPayment(order);
                } catch (error) {
                  console.error('PayPal 결제 처리 중 오류:', error);
                  console.error('백엔드 URL:', backendUrl);
                  
                  // PayPal 자체 오류인 경우
                  if (error.message.includes('PAYMENT_ALREADY_DONE')) {
                    alert('이미 처리된 결제입니다.');
                  } else if (error.message.includes('PAYMENT_DENIED')) {
                    alert('결제가 거부되었습니다. 다시 시도해주세요.');
                  } else {
                    alert(`PayPal 결제 처리 중 오류가 발생했습니다: ${error.message}`);
                  }
                }
              }}
              onError={(err) => {
                console.error("PayPal 에러:", err);
                alert("PayPal 결제 중 오류가 발생했습니다. 다시 시도해주세요.");
              }}
              onCancel={(data) => {
                console.log("PayPal 결제 취소:", data);
                alert("PayPal 결제가 취소되었습니다.");
              }}
            />
          </div>
        </PayPalScriptProvider>
        
        {/* PayPal 테스트 계정 정보 */}
        <div style={{ 
          marginTop: '20px', 
          padding: '16px', 
          backgroundColor: 'rgba(255, 255, 255, 0.1)', 
          borderRadius: '8px',
          textAlign: 'center',
          color: 'white',
          fontSize: '12px'
        }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>PayPal 샌드박스 테스트 계정:</div>
          <div>이메일: sb-1234567890@business.example.com</div>
          <div>비밀번호: 123456789</div>
          <div style={{ marginTop: '8px', fontSize: '10px', color: '#ccc' }}>
            * 실제 돈이 차감되지 않는 테스트 환경입니다
          </div>
        </div>
        
        {/* 배포 정보 (개발 환경에서만 표시) */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            marginTop: '10px', 
            padding: '8px', 
            backgroundColor: 'rgba(0, 255, 0, 0.1)', 
            borderRadius: '4px',
            textAlign: 'center',
            color: '#00ff00',
            fontSize: '10px'
          }}>
            <div>개발 모드</div>
            <div>백엔드 URL: {backendUrl}</div>
            <div>PayPal Client ID: {PAYPAL_CLIENT_ID.substring(0, 10)}...</div>
            <div>현재 호스트: {window.location.hostname}</div>
            <div>현재 프로토콜: {window.location.protocol}</div>
          </div>
        )}
        
        {/* 모바일 네트워크 상태 표시 */}
        {isMobile && (
          <div style={{ 
            marginTop: '10px', 
            padding: '8px', 
            backgroundColor: 'rgba(255, 255, 0, 0.1)', 
            borderRadius: '4px',
            textAlign: 'center',
            color: '#ffff00',
            fontSize: '10px'
          }}>
            <div>📱 모바일 모드</div>
            <div>백엔드: {backendUrl}</div>
            <div>연결 상태: {isLoading ? '확인 중...' : '연결됨'}</div>
            <div>네트워크: {navigator.onLine ? '온라인' : '오프라인'}</div>
          </div>
        )}
      </div>
    </div>
  );

  // 데스크톱 전용 컴포넌트
  const DesktopView = () => (
    <div className="container">
      {/* 사이드바 네비게이션 */}
      <div className="sidebar">
        <div className="sidebar-content">
          <div className="logo">Instagram</div>
          <nav className="nav">
            <div className="nav-item">
              <span className="nav-icon">🏠</span>
              <span className="nav-text">홈</span>
            </div>
            <div className="nav-item">
              <span className="nav-icon">🔍</span>
              <span className="nav-text">검색</span>
            </div>
            <div className="nav-item">
              <span className="nav-icon">📱</span>
              <span className="nav-text">탐색 탭</span>
            </div>
            <div className="nav-item">
              <span className="nav-icon">🎬</span>
              <span className="nav-text">릴스</span>
            </div>
            <div className="nav-item">
              <span className="nav-icon">💬</span>
              <span className="nav-text">메시지</span>
            </div>
            <div className="nav-item">
              <span className="nav-icon">🔔</span>
              <span className="nav-text">알림</span>
            </div>
            <div className="nav-item">
              <span className="nav-icon">➕</span>
              <span className="nav-text">만들기</span>
            </div>
            <div className="nav-item">
              <span className="nav-icon">📊</span>
              <span className="nav-text">대시보드</span>
            </div>
            <div className="nav-item">
              <span className="nav-icon">👤</span>
              <span className="nav-text">프로필</span>
            </div>
          </nav>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="main-content">
        {/* 스토리 섹션 */}
        <div className="stories-section">
          <div className="stories-container">
            <div className="story-item">
              <div className="story-avatar">📸</div>
              <span className="story-username">_hy_n</span>
            </div>
            <div className="story-item">
              <div className="story-avatar">👤</div>
              <span className="story-username">gnaranha</span>
            </div>
            <div className="story-item">
              <div className="story-avatar">👤</div>
              <span className="story-username">_ycwon</span>
            </div>
            <div className="story-item">
              <div className="story-avatar">👤</div>
              <span className="story-username">carpenter_...</span>
            </div>
            <div className="story-item">
              <div className="story-avatar">👤</div>
              <span className="story-username">baskinrob...</span>
            </div>
            <div className="story-item">
              <div className="story-avatar">👤</div>
              <span className="story-username">satgotloco</span>
            </div>
          </div>
        </div>

        {/* 포스트 카드 */}
        <div className="post-card">
          {/* 포스트 헤더 */}
          <div className="post-header">
            <div className="user-info">
              <div className="profile-pic">👤</div>
              <div className="user-details">
                <span className="username">dogunnny</span>
              </div>
            </div>
            <span className="more-button">⋯</span>
          </div>

          {/* 포스트 이미지/동영상 */}
          <div className="image-section">
            {isVideoPlaying ? (
              <video 
                src={product.videoUrl} 
                controls 
                autoPlay 
                className="post-video"
                onEnded={() => setIsVideoPlaying(false)}
              />
            ) : (
              <div className="image-container">
                <img src={product.imageUrl} alt="Post" className="post-image" />
                <button 
                  className="video-play-button"
                  onClick={handleVideoClick}
                >
                  ▶️
                </button>
              </div>
            )}
            <div className="image-navigation">
              <div className="pagination-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
              <span className="next-button">›</span>
            </div>
          </div>
          
          {/* 포스트 액션 */}
          <div className="post-actions">
            <div className="action-buttons">
              <span className="action-icon">❤️</span>
              <span className="action-icon">💬</span>
              <span className="action-icon">📤</span>
              <span className="action-icon">🔖</span>
            </div>
            
            {/* 좋아요 수 */}
            <div className="likes">좋아요 6개</div>
            
            {/* 캡션 */}
            <div className="caption">
              <span className="username">dogunnny</span> [0802,+835] 성주 물맑은펜션 😊
            </div>
            
            {/* 댓글 */}
            <div className="comments">
              <div className="view-comments">댓글 0개 모두 보기</div>
            </div>
            
            {/* 시간 */}
            <div className="timestamp">10시간</div>
          </div>
          
          {/* 댓글 입력 */}
          <div className="comment-input">
            <span className="emoji-button">😊</span>
            <input 
              type="text" 
              placeholder="댓글 달기..." 
              className="comment-field"
            />
            <button className="post-button">게시</button>
          </div>
          
          {/* 결제 섹션 */}
          <div className="payment-section">
            <div className="price-info">
              <span className="price">{product.krw_price}</span>
              <span className="usd-price">(USD ${product.price})</span>
            </div>
            
            {/* PayPal 결제 버튼 */}
            <PayPalScriptProvider options={{ 
              "client-id": PAYPAL_CLIENT_ID,
              "currency": "USD",
              "intent": "capture"
            }}>
              <div className="paypal-container">
                <PayPalButtons
                  style={{ 
                    layout: "horizontal",
                    color: "blue",
                    shape: "rect",
                    label: "pay",
                    height: 50
                  }}
                  createOrder={(data, actions) => {
                    return actions.order.create({
                      purchase_units: [
                        {
                          description: product.name,
                          amount: {
                            value: product.price,
                          },
                        },
                      ],
                    });
                  }}
                  onApprove={async (data, actions) => {
                    const order = await actions.order.capture();
                    console.log("결제 완료, 주문 정보:", order);
                    
                    try {
                      const response = await fetch('http://localhost:5000/api/orders', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          paypal_order: order,
                          product_name: product.name
                        })
                      });
                      
                      const result = await response.json();
                      
                      if (result.success) {
                        alert(`🎉 결제 완료! ${order.payer.name.given_name}님!\n주문이 성공적으로 저장되었습니다.`);
                      } else {
                        alert(`결제는 완료되었지만 주문 저장 중 오류가 발생했습니다: ${result.message}`);
                      }
                    } catch (error) {
                      console.error('백엔드 API 호출 중 오류:', error);
                      alert(`결제는 완료되었지만 주문 저장 중 오류가 발생했습니다.`);
                    }
                  }}
                  onError={(err) => {
                    console.error("PayPal 결제 중 에러 발생:", err);
                    alert("결제 중 오류가 발생했습니다. 다시 시도해주세요.");
                  }}
                />
              </div>
            </PayPalScriptProvider>
          </div>
        </div>

        {/* 다음 포스트 미리보기 */}
        <div className="next-post-preview">
          <div className="next-post-header">
            <div className="next-post-user-info">
              <div className="next-post-profile-pic">👤</div>
              <span className="next-post-username">yunandnora</span>
            </div>
            <span className="next-post-time">1주</span>
          </div>
        </div>
      </div>

      {/* 오른쪽 사이드바 */}
      <div className="right-sidebar">
        {/* 현재 사용자 */}
        <div className="current-user">
          <div className="current-user-pic">👤</div>
          <div className="current-user-info">
            <span className="current-username">hangot146</span>
            <span className="current-user-name">Bea Gy Dduck</span>
          </div>
          <button className="switch-button">전환</button>
        </div>

        {/* 추천 섹션 */}
        <div className="suggestions-section">
          <div className="suggestions-header">
            <span className="suggestions-title">회원님을 위한 추천</span>
            <button className="see-all-button">모두 보기</button>
          </div>
          
          <div className="suggestion-item">
            <div className="suggestion-pic">👤</div>
            <div className="suggestion-info">
              <span className="suggestion-username">user1</span>
              <span className="suggestion-desc">회원님을 위한 추천</span>
            </div>
            <button className="follow-button">팔로우</button>
          </div>
          
          <div className="suggestion-item">
            <div className="suggestion-pic">👤</div>
            <div className="suggestion-info">
              <span className="suggestion-username">user2</span>
              <span className="suggestion-desc">user3님이 팔로우함</span>
            </div>
            <button className="follow-button">팔로우</button>
          </div>
        </div>

        {/* 푸터 링크 */}
        <div className="footer-links">
          <div className="footer-row">
            <a href="#" className="footer-link">소개</a>
            <a href="#" className="footer-link">도움말</a>
            <a href="#" className="footer-link">API</a>
          </div>
          <div className="footer-row">
            <a href="#" className="footer-link">채용 정보</a>
            <a href="#" className="footer-link">개인정보처리방침</a>
            <a href="#" className="footer-link">약관</a>
          </div>
          <div className="footer-row">
            <a href="#" className="footer-link">위치</a>
            <a href="#" className="footer-link">언어</a>
            <a href="#" className="footer-link">Meta Verified</a>
          </div>
          <div className="copyright">© 2025 INSTAGRAM FROM META</div>
        </div>
      </div>

      {/* 플로팅 메시지 버튼 */}
      <div className="floating-message">
        <span className="message-icon">💬</span>
      </div>
    </div>
  );

  // 모바일 여부에 따라 다른 뷰 렌더링
  return isMobile ? <MobileView /> : <DesktopView />;
}

export default App;

