from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import create_tables, get_db
from schemas import UserCreate, UserResponse, AuthResponse, LoginRequest, PostCreate, PostResponse
from auth import create_user, get_user_by_username, verify_password
import models
import secrets
from datetime import datetime, timedelta

user_sessions = {}  # session_id -> user_id

app = FastAPI(title="DeadInternet API", version="0.3.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    create_tables()

@app.get("/")
def read_root():
    return {"message": "DeadInternet Backend"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "0.3.0"}

@app.post("/auth/register", response_model=AuthResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    if get_user_by_username(db, user.username):
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )
    
    # Create user
    db_user = create_user(db, user)
    
    # Create session
    session_id = secrets.token_urlsafe(32)
    user_sessions[session_id] = db_user.id
    
    return AuthResponse(
        session_id=session_id,
        user=UserResponse(
            id=db_user.id,
            username=db_user.username,
            email=db_user.email,
            name=db_user.name,
            created_at=db_user.created_at
        )
    )

@app.post("/auth/login", response_model=AuthResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    # Get user
    user = get_user_by_username(db, credentials.username)
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    
    # Create session
    session_id = secrets.token_urlsafe(32)
    user_sessions[session_id] = user.id
    
    return AuthResponse(
        session_id=session_id,
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            name=user.name,
            created_at=user.created_at
        )
    )


@app.put("/auth/update-username")
def update_username(request: dict, db: Session = Depends(get_db)):
    user_id = request.get("user_id")
    new_username = request.get("new_username")
    
    if not user_id or not new_username:
        raise HTTPException(status_code=400, detail="User ID and new username required")
    
    existing_user = get_user_by_username(db, new_username)

    if existing_user and existing_user.id != user_id:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Update username
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.username = new_username
    db.commit()
    
    return {
        "message": "Username updated successfully"
    }

@app.put("/auth/set-name")
def set_name(request: dict, db: Session = Depends(get_db)):
    user_id = request.get("user_id")
    new_name = request.get("new_name")

    if not user_id or not new_name:
        raise HTTPException(status_code=400, detail="User ID and new name required")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.name: #Not allow changing name once set
        raise HTTPException(
            status_code=403, 
            detail="Name already set and cannot be changed"
        )

    user.name = new_name
    db.commit()
    db.refresh(user)

    return {"message": "Name set successfully", "name": user.name}

@app.get("/auth/validate-session", response_model=UserResponse)
def validate_session(session_id: str, db: Session = Depends(get_db)):
    """Validate session and return user data"""
    user = get_current_user(session_id, db)
    return user

@app.post("/auth/logout")
def logout(session_id: str):
    """Logout and clear session"""
    if session_id in user_sessions:
        del user_sessions[session_id]
    return {"message": "Logged out successfully"}

@app.post("/posts", response_model=PostResponse)
def create_post(
    post: PostCreate,
    session_id: str,
    db: Session = Depends(get_db)
):
    """Create a new post"""
    user = get_current_user(session_id, db)
    
    db_post = models.Post(
        content=post.content,
        tag=post.tag,
        author_id=user.id
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    
    return PostResponse(
        id=db_post.id,
        content=db_post.content,
        tag=db_post.tag,
        author=user.username,
        created_at=db_post.created_at
    )

@app.get("/posts", response_model=list[PostResponse])
def get_posts(db: Session = Depends(get_db)):
    """Get all posts for feed"""
    posts = db.query(models.Post).order_by(models.Post.created_at.desc()).all()
    
    return [
        PostResponse(
            id=post.id,
            content=post.content,
            tag=post.tag,
            author=post.author.username,
            created_at=post.created_at
        ) for post in posts
    ]


def get_current_user(session_id: str, db: Session = Depends(get_db)):
    """Get current user from session"""
    if not session_id or session_id not in user_sessions:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    user_id = user_sessions[session_id]
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user