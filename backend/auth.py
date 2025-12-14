from datetime import datetime, timedelta, timezone
import bcrypt
from sqlalchemy.orm import Session
from models import User
from schemas import UserCreate
from fastapi import HTTPException
from email_service import generate_verification_token, get_token_expiry, send_verification_email
import re
from config import config
import jwt
from pathlib import Path

# Load disposable email domains at startup
def load_disposable_domains():
    """Load disposable email domain blocklist from local file"""
    blocklist_path = Path(__file__).parent / "blocklist" / "disposable_email_blocklist.conf"
    
    if not blocklist_path.exists():
        print(f"Warning: Blocklist not found at {blocklist_path}")
        return set()
    
    domains = set()
    with open(blocklist_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                domains.add(line.lower())
    
    print(f"Loaded {len(domains)} disposable email domains") #debug
    return domains

# Load once when module is imported
DISPOSABLE_DOMAINS = load_disposable_domains()


def is_disposable_email(email: str) -> bool:
    """
    Check if email uses a disposable domain
    Returns True if disposable, False if legitimate
    """
    try:
        domain_parts = email.lower().split("@")[1].split(".")
        for i in range(len(domain_parts) - 1):
            domain_to_check = ".".join(domain_parts[i:])
            if domain_to_check in DISPOSABLE_DOMAINS:
                return True
    except (IndexError, AttributeError):
        # Invalid email format, let other validation handle it
        return False
    
    return False


def validate_password_strength(password: str) -> None:
    """Validate password strength without exposing it in API responses"""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    if not re.search(r'[A-Z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    if not re.search(r'[a-z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
    if not re.search(r'\d', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number")
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one special character")

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_user_by_username(db: Session, username: str) -> User:
    """Get user by username"""
    return db.query(User).filter(User.username == username).first()

def get_current_user(credentials, db: Session):
    """Get current user from JWT token"""
    user_id = verify_access_token(credentials.credentials)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    return user

def create_user(db: Session, user: UserCreate, frontend_url: str = None) -> User:
    """Create a new user in the database and send verification email"""
    
    if frontend_url is None:
        frontend_url = config.FRONTEND_URL

    validate_password_strength(user.password)
    
    # Check for disposable email
    if is_disposable_email(user.email):
        raise HTTPException(
            status_code=400, 
            detail="Temporary email addresses are not allowed."
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(user.password)
    verification_token = generate_verification_token()
    token_expiry = get_token_expiry()
    
    db_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        name=user.name,
        verification_token=verification_token,
        verification_token_expires=token_expiry,
        email_verified=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    send_verification_email(
        email=user.email,
        username=user.username,
        verification_token=verification_token,
        frontend_url=frontend_url
    )
    
    return db_user

def verify_email(db: Session, token: str) -> bool:
    """
    Verify user email using token
    
    Returns:
        True if verification successful, False if not successful
    """
    user = db.query(User).filter(User.verification_token == token).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Invalid verification token")
    
    # Check if token expired (comparing naive datetimes for SQLite compatibility)
    if user.verification_token_expires < datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(status_code=400, detail="Verification token expired")
    
    # Mark email as verified
    user.email_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()
    db.refresh(user)
    
    return True

#JWT

def create_access_token(user_id: int) -> str:
    """
    Create a JWT access token for a user
    
    Args:
        user_id: The user ID to encode in the token
        
    Returns:
        JWT token string
    """
    expires = datetime.now(timezone.utc) + timedelta(hours=config.JWT_EXPIRATION_HOURS)
    
    payload = {
        "user_id": user_id,
        "exp": expires,
        "iat": datetime.now(timezone.utc)
    }
    
    # Encode and return token
    token = jwt.encode(payload, config.JWT_SECRET_KEY, algorithm=config.JWT_ALGORITHM)
    return token


def verify_access_token(token: str) -> int:
    """
    Verify a JWT access token and extract the user_id
    
    Args:
        token: The JWT token string
        
    Returns:
        user_id if token is valid
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.JWT_ALGORITHM])
        user_id = payload.get("user_id")
        
        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token: missing user_id"
            )
        
        return user_id
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )