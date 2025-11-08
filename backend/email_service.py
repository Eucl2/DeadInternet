import os
import resend
from datetime import datetime, timedelta, timezone
import secrets
from dotenv import load_dotenv
from config import config

load_dotenv()

# Initialize Resend with API key
resend.api_key = os.getenv("RESEND_API_KEY")

def generate_verification_token() -> str:
    """Generate a secure random verification token"""
    return secrets.token_urlsafe(32)

def get_token_expiry() -> datetime:
    """24 hours to expiire"""
    return datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=24)

def send_verification_email(email: str, username: str, verification_token: str, frontend_url: str = None) -> bool:
    """
    Send verification email via Resend
    
    Args:
        email: User's email
        username: User's username
        verification_token: Token for email verification
        frontend_url: Frontend URL for verification link
    
    Returns:
        True if email sent successfully, False otherwise
    """
    
    if frontend_url is None:
        frontend_url = config.FRONTEND_URL
    
    verification_link = f"{frontend_url}/verify-email?token={verification_token}"
    
    email_html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>Welcome to DeadInternet, {username}!</h2>
            <p>Please verify your email address to complete your registration.</p>
            
            <p><a href="{verification_link}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                Verify Email
            </a></p>
            
            <p>Or copy and paste this link in your browser:</p>
            <p><code>{verification_link}</code></p>
            
            <p>This link expires in 24 hours.</p>
            
            <p>If you didn't create this account, please ignore this email.</p>
            
            <hr>
            <p style="font-size: 0.9em; color: #666;">DeadInternet - The only social media where every word is human.</p>
        </body>
    </html>
    """
    
    email_text = f"""
    Welcome to DeadInternet, {username}!
    
    Please verify your email address to complete your registration.
    
    Click here: {verification_link}
    
    This link expires in 24 hours.
    
    If you didn't create this account, please ignore this email.
    
    ---
    DeadInternet - The Last Living Network.
    """
    
    try:
        r = resend.Emails.send({
            "from": f"{config.RESEND_SENDER_NAME} <{config.RESEND_SENDER_EMAIL}>",
            "to": email,
            "subject": "Verify your DeadInternet Email",
            "html": email_html,
            "text": email_text
        })
        
        if r.get("id"):
            print(f"Verification email sent to {email}")
            return True
        else:
            print(f"Failed to send email: {r}")
            return False
            
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False