import React, { useState, useEffect } from 'react';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 주문 목록 조회
  const fetchOrders = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/orders');
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('주문 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 통계 조회
  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('통계 조회 중 오류:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, []);

  // 주문 상태 업데이트
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 주문 목록 새로고침
        fetchOrders();
        fetchStats();
        alert('주문 상태가 업데이트되었습니다.');
      } else {
        alert(`상태 업데이트 실패: ${data.message}`);
      }
    } catch (error) {
      alert('주문 상태 업데이트 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return <div style={styles.loading}>주문 정보를 불러오는 중...</div>;
  }

  if (error) {
    return <div style={styles.error}>오류: {error}</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>주문 관리 시스템</h1>
      
      {/* 통계 정보 */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <h3>총 주문 수</h3>
          <p style={styles.statNumber}>{stats.total_orders || 0}</p>
        </div>
        <div style={styles.statCard}>
          <h3>완료된 주문</h3>
          <p style={styles.statNumber}>{stats.completed_orders || 0}</p>
        </div>
        <div style={styles.statCard}>
          <h3>총 매출</h3>
          <p style={styles.statNumber}>${stats.total_revenue || 0}</p>
        </div>
      </div>

      {/* 주문 목록 */}
      <div style={styles.ordersContainer}>
        <h2>주문 목록</h2>
        {orders.length === 0 ? (
          <p style={styles.noOrders}>아직 주문이 없습니다.</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} style={styles.orderCard}>
              <div style={styles.orderHeader}>
                <h3>주문 #{order.id}</h3>
                <span style={styles.orderDate}>
                  {new Date(order.created_at).toLocaleString()}
                </span>
              </div>
              
              <div style={styles.orderDetails}>
                <div style={styles.orderInfo}>
                  <h4>상품 정보</h4>
                  <p><strong>상품명:</strong> {order.product_name}</p>
                  <p><strong>가격:</strong> ${order.amount} {order.currency}</p>
                  <p><strong>PayPal 주문 ID:</strong> {order.paypal_order_id}</p>
                  <p><strong>결제 상태:</strong> 
                    <span style={{
                      color: order.payment_status === 'COMPLETED' ? 'green' : 'orange',
                      fontWeight: 'bold'
                    }}>
                      {order.payment_status}
                    </span>
                  </p>
                </div>
                
                <div style={styles.buyerInfo}>
                  <h4>구매자 정보</h4>
                  <p><strong>이름:</strong> {order.buyer_name}</p>
                  <p><strong>이메일:</strong> {order.buyer_email}</p>
                </div>
                
                <div style={styles.addressInfo}>
                  <h4>배송 주소</h4>
                  <p>{order.address_line1}</p>
                  {order.address_line2 && <p>{order.address_line2}</p>}
                  <p>{order.city}, {order.state} {order.postal_code}</p>
                  <p>{order.country_code}</p>
                </div>
              </div>
              
              {/* 주문 상태 업데이트 */}
              <div style={styles.statusUpdate}>
                <select 
                  value={order.payment_status}
                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                  style={styles.statusSelect}
                >
                  <option value="pending">대기 중</option>
                  <option value="COMPLETED">완료</option>
                  <option value="CANCELLED">취소됨</option>
                  <option value="REFUNDED">환불됨</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: '30px',
  },
  loading: {
    textAlign: 'center',
    fontSize: '18px',
    marginTop: '50px',
  },
  error: {
    textAlign: 'center',
    color: 'red',
    fontSize: '18px',
    marginTop: '50px',
  },
  statsContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '40px',
    gap: '20px',
  },
  statCard: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
    flex: 1,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2980b9',
    margin: '10px 0 0 0',
  },
  ordersContainer: {
    background: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  noOrders: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: '16px',
  },
  orderCard: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    marginBottom: '20px',
    padding: '20px',
    background: '#fafafa',
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid #eee',
  },
  orderDate: {
    color: '#7f8c8d',
    fontSize: '14px',
  },
  orderDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '15px',
  },
  orderInfo: {
    background: 'white',
    padding: '15px',
    borderRadius: '6px',
  },
  buyerInfo: {
    background: 'white',
    padding: '15px',
    borderRadius: '6px',
  },
  addressInfo: {
    background: 'white',
    padding: '15px',
    borderRadius: '6px',
  },
  statusUpdate: {
    textAlign: 'right',
  },
  statusSelect: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '14px',
  },
};

export default OrderManagement; 