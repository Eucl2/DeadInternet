from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import create_tables, get_db
from config import config
from schemas import UserCreate, UserResponse, AuthResponse, LoginRequest, PostCreate, PostResponse, CommentCreate, CommentResponse
from auth import create_user, get_user_by_username, verify_password
import models
import secrets
from datetime import datetime, timedelta
from typing import Optional
from analysis import analyze_typing_pattern, get_analysis_summary
from routers import creative
from email_service import send_verification_email
from auth import verify_email

user_sessions = {}  # session_id -> user_id

app = FastAPI(title="DeadInternet API", version="0.4.0")

#Creative router
app.include_router(creative.router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
def startup_event():
    config.validate()
    create_tables()

@app.get("/")
def read_root():
    return {"message": "DeadInternet Backend"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "0.4.0"}

@app.post("/auth/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    if get_user_by_username(db, user.username):
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )
    
    # Create user
    db_user = create_user(db, user)
    
    return {
        "message": "Registration successful! Check your email to verify your account.",
        "email": db_user.email,
        "username": db_user.username
    }

@app.post("/auth/login", response_model=AuthResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    # Get user
    user = get_user_by_username(db, credentials.username)
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    
    # Check if email is verified
    if not user.email_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before logging in"
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
    
    # Analyze typing pattern if data provided
    analysis_result = None
    if post.typing_data:
        typing_data_dict = post.typing_data.model_dump()
        analysis_result = analyze_typing_pattern(
            typing_data=typing_data_dict,
            content_length=len(post.content),
            space=post.space
        )
        
        # Log analysis for debugging
        print(f"Typing Analysis: {get_analysis_summary(analysis_result)}")
        
        # BLOCK if analysis says to block
        if analysis_result.decision == "block":
            raise HTTPException(
                status_code=400,
                detail=analysis_result.reason
            )
    
    # Create post
    db_post = models.Post(
        content=post.content,
        tag=post.tag,
        author_id=user.id,
        space=post.space
    )
    
    # Store analysis results if available
    if analysis_result:
        db_post.typing_metrics = typing_data_dict
        db_post.human_score = analysis_result.human_score
        db_post.analysis_decision = analysis_result.decision
        db_post.analysis_flags = analysis_result.flags
        
        # Mark for review if flagged
        if analysis_result.decision == "flag":
            db_post.requires_review = True
    
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    
    return PostResponse(
        id=db_post.id,
        content=db_post.content,
        tag=db_post.tag,
        author=user.username,
        created_at=db_post.created_at,
        like_count=db_post.like_count,
        user_has_liked=False,
        human_score=db_post.human_score,
        analysis_decision=db_post.analysis_decision
    )

@app.get("/posts", response_model=list[PostResponse])
def get_posts(session_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Get all posts for feed"""
    posts = db.query(models.Post).order_by(models.Post.created_at.desc()).all()
    
    current_user_id = None
    if session_id and session_id in user_sessions:
        current_user_id = user_sessions[session_id]
    
    return [
        PostResponse(
            id=post.id,
            content=post.content,
            tag=post.tag,
            author=post.author.username,
            created_at=post.created_at,
            like_count=post.like_count,
            user_has_liked=any(like.user_id == current_user_id for like in post.likes) if current_user_id else False,
            comment_count=post.comment_count
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

@app.post("/posts/{post_id}/like")
def like_post(post_id: int, session_id: str, db: Session = Depends(get_db)):
    """Like a post"""
    user = get_current_user(session_id, db)
    
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if already liked
    existing_like = db.query(models.Like).filter(
        models.Like.user_id == user.id,
        models.Like.post_id == post_id
    ).first()
    
    if existing_like:
        raise HTTPException(status_code=400, detail="Already liked")
    
    like = models.Like(user_id=user.id, post_id=post_id)
    db.add(like)
    db.commit()
    
    db.refresh(post)
    return {"like_count": post.like_count}

@app.delete("/posts/{post_id}/like")
def unlike_post(post_id: int, session_id: str, db: Session = Depends(get_db)):
    """Unlike a post"""
    user = get_current_user(session_id, db)
    
    # Find the like
    like = db.query(models.Like).filter(
        models.Like.user_id == user.id,
        models.Like.post_id == post_id
    ).first()
    
    if not like:
        raise HTTPException(status_code=404, detail="Like not found")
    
    db.delete(like)
    db.commit()
    
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    return {"like_count": post.like_count}

@app.delete("/posts/{post_id}")
def delete_post(post_id: int, session_id: str, db: Session = Depends(get_db)):
    """Delete own post"""
    user = get_current_user(session_id, db)
    
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check ownership
    if post.author_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
    
    db.delete(post)
    db.commit()
    
    return {"message": "Post deleted successfully"}

@app.post("/posts/{post_id}/comments", response_model=CommentResponse)
def create_comment(
    post_id: int,
    session_id: str,
    comment: CommentCreate,
    db: Session = Depends(get_db)
):
    """Create a comment on a post"""
    user = get_current_user(session_id, db)
    
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if len(comment.content) > 200:
        raise HTTPException(
            status_code=400, 
            detail="Comment must be 200 characters or less"
        )
    
    db_comment = models.Comment(
        content=comment.content,
        post_id=post_id,
        author_id=user.id
    )
    
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    return CommentResponse(
        id=db_comment.id,
        content=db_comment.content,
        author=db_comment.author.username,
        created_at=db_comment.created_at
    )

@app.get("/posts/{post_id}/comments")
def get_comments(post_id: int, db: Session = Depends(get_db)):
    """Get all comments for a post"""
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comments = db.query(models.Comment).filter(
        models.Comment.post_id == post_id
    ).order_by(models.Comment.created_at.asc()).all()
    
    return [
        {
            "id": comment.id,
            "content": comment.content,
            "author": comment.author.username,
            "created_at": comment.created_at
        } for comment in comments
    ]

@app.put("/auth/update-bio")
def update_bio(request: dict, db: Session = Depends(get_db)):
    user_id = request.get("user_id")
    new_bio = request.get("bio", "").strip()
    
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    
    if len(new_bio) > 100:
        raise HTTPException(status_code=400, detail="Bio must be 100 characters or less")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.bio = new_bio
    db.commit()
    db.refresh(user)
    
    return {"message": "Bio updated successfully", "bio": user.bio}


@app.get("/users/search")
def search_users(query: str, db: Session = Depends(get_db)):
    """Search users by username"""
    if not query or len(query) < 2:
        return []
    
    users = db.query(models.User).filter(
        models.User.username.ilike(f"%{query}%")
    ).limit(10).all()
    
    return [{"username": u.username, "name": u.name} for u in users]

@app.get("/users/{username}")
def get_user_profile(username: str, db: Session = Depends(get_db)):
    """Get user profile by username"""
    user = db.query(models.User).filter(models.User.username == username).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "username": user.username,
        "name": user.name,
        "bio": user.bio,
        "created_at": user.created_at
    }

@app.delete("/auth/delete-account")
def delete_account(session_id: str, db: Session = Depends(get_db)):
    """Delete account"""
    user = get_current_user(session_id, db)
    db.delete(user)
    db.commit()
    
    # Clear session
    if session_id in user_sessions:
        del user_sessions[session_id]
    
    return {"message": "Account deleted successfully"}


@app.post("/auth/verify-email")
def verify_email_endpoint(token: str, db: Session = Depends(get_db)):
    """Verify email using token"""
    try:
        verify_email(db, token)
        return {"message": "Email verified successfully!"}
    except HTTPException as e:
        raise e