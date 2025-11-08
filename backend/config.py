import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuration for DeadInternet Backend"""
    
    # Email Service
    RESEND_API_KEY = os.getenv("RESEND_API_KEY")
    RESEND_SENDER_EMAIL = os.getenv("RESEND_SENDER_EMAIL", "noreply@deadinternet.dk")
    RESEND_SENDER_NAME = os.getenv("RESEND_SENDER_NAME", "DeadInternet")
    
    # Frontend Configuration
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # CORS
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    
    @staticmethod
    def validate():
        """Validate that all required environment variables are set"""
        if not Config.RESEND_API_KEY:
            raise ValueError("RESEND_API_KEY environment variable is not set")
        print(f"Configuration loaded successfully: {Config.RESEND_SENDER_NAME} <{Config.RESEND_SENDER_EMAIL}>")

config = Config()