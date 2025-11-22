from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List
import models
from database import get_db
from schemas import CommentCreate, CreativePostResponse, ProgressPhotoResponse
from analysis import analyze_typing_pattern, get_analysis_summary
import os
import secrets
from pathlib import Path
import json

router = APIRouter(prefix="/creative", tags=["creative"])

# Image storage directory
UPLOAD_DIR = Path("uploads/creative")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def save_image(file: UploadFile) -> str:
    """Save uploaded image and return URL"""
    # Validate file type
    allowed_extensions = ['jpg', 'jpeg', 'png', 'webp']
    file_extension = file.filename.split(".")[-1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}")
    
    # Generate unique filename
    unique_filename = f"{secrets.token_urlsafe(16)}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())
    
    return f"/uploads/creative/{unique_filename}"

def get_current_user(session_id: str, db: Session):
    """Get current user from session - imported from main to avoid circular import"""
    from main import user_sessions
    
    if not session_id or session_id not in user_sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user_sessions[session_id]
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("", response_model=CreativePostResponse)
async def create_creative_post(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: str = Form(...),
    content: Optional[str] = Form(None),  # For Writing
    typing_data: Optional[str] = Form(None),
    final_image: Optional[UploadFile] = File(None),  # For Drawing/Photography
    progress_photos: List[UploadFile] = File(default=[]),
    progress_captions: Optional[str] = Form(None),  # JSON array of captions
    session_id: str = Form(...),
    db: Session = Depends(get_db)
):
    """Create a new creative post with progress photos"""
    user = get_current_user(session_id, db)
    
    # Validate category
    if category not in ['Writing', 'Drawing', 'Photography']:
        raise HTTPException(status_code=400, detail="Invalid category")
    
    # Validate progress photos (must have 2-3) - to review
    if category != 'Writing':
        if len(progress_photos) < 2 or len(progress_photos) > 3:
            raise HTTPException(
                status_code=400,
                detail="Must provide 2-3 progress photos"
            )
    else:
        progress_photos = []
    
    if category == 'Writing':
        if not content:
            raise HTTPException(status_code=400, detail="Content required for Writing")
    else:
        if not final_image:
            raise HTTPException(status_code=400, detail="Final image required for Drawing/Photography")
    
    # Analyze typing pattern for writing
    analysis_result = None
    if category == 'Writing' and typing_data:
        try:
            typing_data_dict = json.loads(typing_data)
            analysis_result = analyze_typing_pattern(
                typing_data=typing_data_dict,
                content_length=len(content),
                space="creative"
            )
            
            print(f"Creative Writing Analysis: {get_analysis_summary(analysis_result)}")
            
            # Block if flagged
            if analysis_result.decision == "block":
                raise HTTPException(
                    status_code=400,
                    detail=analysis_result.reason
                )
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid typing data format")
    
    # Save final image if provided
    final_image_url = None
    if final_image:
        final_image_url = save_image(final_image)
    
    # Create creative post
    db_post = models.CreativePost(
        user_id=user.id,
        title=title,
        description=description,
        category=category,
        content=content,
        final_image_url=final_image_url
    )
    
    # Store typing analysis if available
    if analysis_result:
        db_post.typing_metrics = typing_data_dict
        db_post.human_score = analysis_result.human_score
        db_post.analysis_decision = analysis_result.decision
        db_post.analysis_flags = analysis_result.flags
        
        if analysis_result.decision == "flag":
            db_post.requires_review = True
    
    db.add(db_post)
    db.flush()  # Get the ID without committing
    
    # Parse progress captions
    captions_list = []
    if progress_captions:
        try:
            captions_list = json.loads(progress_captions)
        except json.JSONDecodeError:
            captions_list = []
    
    # Save progress photos
    if progress_photos:
        for i, photo in enumerate(progress_photos):
            image_url = save_image(photo)
            caption = captions_list[i] if i < len(captions_list) else None
            
            progress_photo = models.ProgressPhoto(
                creative_post_id=db_post.id,
                image_url=image_url,
                stage_order=i + 1,
                caption=caption
            )
            db.add(progress_photo)
    
    db.commit()
    db.refresh(db_post)
    
    return CreativePostResponse(
        id=db_post.id,
        title=db_post.title,
        description=db_post.description,
        category=db_post.category,
        content=db_post.content,
        final_image_url=db_post.final_image_url,
        author=user.username,
        author_id=user.id,
        created_at=db_post.created_at,
        like_count=db_post.like_count,
        comment_count=db_post.comment_count,
        user_has_liked=False,
        progress_photos=[
            ProgressPhotoResponse(
                id=p.id,
                image_url=p.image_url,
                stage_order=p.stage_order,
                caption=p.caption,
                created_at=p.created_at
            ) for p in db_post.progress_photos
        ],
        human_score=db_post.human_score,
        analysis_decision=db_post.analysis_decision
    )

@router.get("", response_model=List[CreativePostResponse])
def get_creative_posts(
    category: Optional[str] = None,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get creative posts, optionally filtered by category"""
    from main import user_sessions
    
    query = db.query(models.CreativePost)
    
    # Filter by category
    if category and category != "all":
        if category not in ['Writing', 'Drawing', 'Photography']:
            raise HTTPException(status_code=400, detail="Invalid category")
        query = query.filter(models.CreativePost.category == category)
    
    posts = query.order_by(models.CreativePost.created_at.desc()).all()
    
    # Check if user is authenticated to show like status
    current_user_id = None
    if session_id and session_id in user_sessions:
        current_user_id = user_sessions[session_id]
    
    return [
        CreativePostResponse(
            id=post.id,
            title=post.title,
            description=post.description,
            category=post.category,
            content=post.content,
            final_image_url=post.final_image_url,
            author=post.author.username,
            author_id=post.user_id,
            created_at=post.created_at,
            like_count=post.like_count,
            comment_count=post.comment_count,
            user_has_liked=any(like.user_id == current_user_id for like in post.likes) if current_user_id else False,
            progress_photos=[
                ProgressPhotoResponse(
                    id=p.id,
                    image_url=p.image_url,
                    stage_order=p.stage_order,
                    caption=p.caption,
                    created_at=p.created_at
                ) for p in post.progress_photos
            ],
            human_score=post.human_score,
            analysis_decision=post.analysis_decision
        ) for post in posts
    ]

@router.get("/{post_id}", response_model=CreativePostResponse)
def get_creative_post(
    post_id: int,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get a specific creative post"""
    from main import user_sessions
    
    post = db.query(models.CreativePost).filter(models.CreativePost.id == post_id).first()
    
    if not post:
        raise HTTPException(status_code=404, detail="Creative post not found")
    
    # Check if user liked
    current_user_id = None
    if session_id and session_id in user_sessions:
        current_user_id = user_sessions[session_id]
    
    return CreativePostResponse(
        id=post.id,
        title=post.title,
        description=post.description,
        category=post.category,
        content=post.content,
        final_image_url=post.final_image_url,
        author=post.author.username,
        author_id=post.user_id,
        created_at=post.created_at,
        like_count=post.like_count,
        comment_count=post.comment_count,
        user_has_liked=any(like.user_id == current_user_id for like in post.likes) if current_user_id else False,
        progress_photos=[
            ProgressPhotoResponse(
                id=p.id,
                image_url=p.image_url,
                stage_order=p.stage_order,
                caption=p.caption,
                created_at=p.created_at
            ) for p in post.progress_photos
        ],
        human_score=post.human_score,
        analysis_decision=post.analysis_decision
    )

@router.post("/{post_id}/like")
def like_creative_post(
    post_id: int,
    session_id: str,
    db: Session = Depends(get_db)
):
    """Like a creative post"""
    user = get_current_user(session_id, db)
    
    post = db.query(models.CreativePost).filter(models.CreativePost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Creative post not found")
    
    # Check if already liked
    existing_like = db.query(models.CreativeLike).filter(
        models.CreativeLike.user_id == user.id,
        models.CreativeLike.creative_post_id == post_id
    ).first()
    
    if existing_like:
        raise HTTPException(status_code=400, detail="Already liked")
    
    like = models.CreativeLike(user_id=user.id, creative_post_id=post_id)
    db.add(like)
    db.commit()
    
    db.refresh(post)
    return {"like_count": post.like_count}

@router.delete("/{post_id}/like")
def unlike_creative_post(
    post_id: int,
    session_id: str,
    db: Session = Depends(get_db)
):
    """Unlike a creative post"""
    user = get_current_user(session_id, db)
    
    like = db.query(models.CreativeLike).filter(
        models.CreativeLike.user_id == user.id,
        models.CreativeLike.creative_post_id == post_id
    ).first()
    
    if not like:
        raise HTTPException(status_code=404, detail="Like not found")
    
    db.delete(like)
    db.commit()
    
    post = db.query(models.CreativePost).filter(models.CreativePost.id == post_id).first()
    return {"like_count": post.like_count}

@router.delete("/{post_id}")
def delete_creative_post(
    post_id: int,
    session_id: str,
    db: Session = Depends(get_db)
):
    """Delete own creative post"""
    user = get_current_user(session_id, db)
    
    post = db.query(models.CreativePost).filter(models.CreativePost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Creative post not found")
    
    # Check ownership
    if post.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
    
    # Delete associated images from filesystem
    if post.final_image_url:
        try:
            file_path = post.final_image_url.lstrip('/')
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Error deleting final image: {e}")
    
    for photo in post.progress_photos:
        try:
            file_path = photo.image_url.lstrip('/')
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Error deleting progress photo: {e}")
    
    db.delete(post)
    db.commit()
    
    return {"message": "Creative post deleted successfully"}


@router.post("/{post_id}/comments")
def create_creative_comment(
    post_id: int,
    session_id: str,
    comment: CommentCreate,
    db: Session = Depends(get_db)
):
    """Create a comment on a creative post"""
    user = get_current_user(session_id, db)
    
    post = db.query(models.CreativePost).filter(models.CreativePost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Creative post not found")

    if len(comment.content) > 200:
        raise HTTPException(
            status_code=400, 
            detail="Comment must be 200 characters or less"
        )
    
    db_comment = models.CreativeComment(
        content=comment.content,
        creative_post_id=post_id,
        author_id=user.id
    )
    
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    return {
        "id": db_comment.id,
        "content": db_comment.content,
        "author": db_comment.author.username,
        "created_at": db_comment.created_at
    }

@router.get("/{post_id}/comments")
def get_creative_comments(post_id: int, db: Session = Depends(get_db)):
    """Get all comments for a creative post"""
    post = db.query(models.CreativePost).filter(models.CreativePost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Creative post not found")
    
    comments = db.query(models.CreativeComment).filter(
        models.CreativeComment.creative_post_id == post_id
    ).order_by(models.CreativeComment.created_at.asc()).all()
    
    return [
        {
            "id": comment.id,
            "content": comment.content,
            "author": comment.author.username,
            "created_at": comment.created_at
        } for comment in comments
    ]