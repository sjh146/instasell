import os

class Config:
    # PostgreSQL 데이터베이스 설정
    DB_USERNAME = os.getenv('DB_USERNAME', 'instagram_user')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'instagram_password')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'instagram_db')
    
    # 데이터베이스 URI
    SQLALCHEMY_DATABASE_URI = f'postgresql://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # PayPal 설정 (샌드박스 환경)
    PAYPAL_CLIENT_ID = os.getenv('PAYPAL_CLIENT_ID', 'AYclIN8z4NgfjpWr7HIUOAip4fOM69wFvd9BKw7g1GFCkfnZcRwHaNGqQl2M0f8286oQRmUCK1qhp82k')
    PAYPAL_CLIENT_SECRET = os.getenv('PAYPAL_CLIENT_SECRET', 'ENMSCRX03HWGc1BHqLUOfngB_IoIpBffyvJ2YwnmBuxjd3jpN7UCJJGE0FkoEi2GpLecNCfr5LUhJab3')
    PAYPAL_MODE = 'sandbox'  # 명시적으로 샌드박스 모드 설정
    
    # Flask 설정
    SECRET_KEY = os.getenv('SECRET_KEY', 'ENMSCRX03HWGc1BHqLUOfngB_IoIpBffyvJ2YwnmBuxjd3jpN7UCJJGE0FkoEi2GpLecNCfr5LUhJab3') 