import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Configuration for DeadInternet Backend"""
    
    # Email Service
    RESEND_API_KEY = os.getenv("RESEND_API_KEY")
    
    # Frontend Configuration
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # CORS - Allowed origins (comma-separated for production)
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    
    @staticmethod
    def validate():
        """Validate that all required environment variables are set"""
        if not Config.RESEND_API_KEY:
            raise ValueError("RESEND_API_KEY environment variable is not set")
        print("Configuration loaded successfully")

# Create instance
config = Config()