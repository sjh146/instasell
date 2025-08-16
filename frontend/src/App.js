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

// PayPal Client ID. "test"는 개발 및 테스트용 샌드박스 ID입니다.
// 실제 서비스에서는 발급받은 본인의 Client ID로 교체해야 합니다.
const PAYPAL_CLIENT_ID = "AYclIN8z4NgfjpWr7HIUOAip4fOM69wFvd9BKw7g1GFCkfnZcRwHaNGqQl2M0f8286oQRmUCK1qhp82k";

function App() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // 모바일 감지 함수
  const checkMobile = () => {
    const mobileBreakpoint = 768;
    setIsMobile(window.innerWidth <= mobileBreakpoint);
  };

  // 컴포넌트 마운트 시와 윈도우 리사이즈 시 모바일 감지
  useEffect(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleVideoClick = () => {
    setIsVideoPlaying(true);
  };

  const handleLikeClick = () => {
    setIsLiked(!isLiked);
  };

  const handleInstagramClick = () => {
    window.open('https://www.instagram.com', '_blank');
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
        <PayPalScriptProvider options={{ 
          "client-id": PAYPAL_CLIENT_ID,
          "currency": "USD",
          "intent": "capture"
        }}>
          <div className="mobile-paypal-container">
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
