import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuration for DeadInternet Backend"""
    
    # Email Service
    RESEND_API_KEY = os.getenv("RESEND_API_KEY")
    RESEND_SENDER_EMAIL = os.getenv("RESEND_SENDER_EMAIL", "noreply@mail.deadinternet.dk")
    RESEND_SENDER_NAME = os.getenv("RESEND_SENDER_NAME", "DeadInternet")
    
    # Frontend Configuration
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # CORS
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRATION_HOURS = 24
    
    @staticmethod
    def validate():
        """Validate that all required environment variables are set"""
        if not Config.RESEND_API_KEY:
            raise ValueError("RESEND_API_KEY environment variable is not set")
        if Config.JWT_SECRET_KEY == "your-secret-key-change-in-production":
            print("WARNING: Using default JWT_SECRET_KEY. Set JWT_SECRET_KEY environment variable in production!")
        print("Configuration loaded successfully")

# Create instance
config = Config()