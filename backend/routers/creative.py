from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List
import models
from database import get_db
from schemas import CommentCreate, CreativePostResponse, ProgressPhotoResponse
from analysis import analyze_typing_pattern, get_analysis_summary
from auth import verify_access_token
import os
import secrets
from pathlib import Path
from storage_service import upload_image, delete_image
import json
from fastapi.security import HTTPBearer
import logging

router = APIRouter(prefix="/creative", tags=["creative"])
security = HTTPBearer()
logger = logging.getLogger(__name__)

hybrid_scorer = None
art_detector = None

def set_hybrid_scorer(scorer):
    """Called from main.py to set the hybrid_scorer"""
    global hybrid_scorer
    hybrid_scorer = scorer


def set_art_detector(detector):
    """Called from main.py to set the art_detector"""
    global art_detector
    art_detector = detector

# Image storage directory
UPLOAD_DIR = Path("uploads/creative")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def save_image(file: UploadFile) -> str:
    """Save uploaded image to Supabase Storage and return URL"""
    # Validate file type
    allowed_extensions = ['jpg', 'jpeg', 'png', 'webp']
    file_extension = file.filename.split(".")[-1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}")
    
    # Read file data
    file_data = file.file.read()
    
    # Upload to Supabase
    public_url = upload_image(file_data, file.filename)
    
    if not public_url:
        raise HTTPException(status_code=500, detail="Failed to upload image")
    
    return public_url

def get_current_user(credentials, db: Session):
    """Get current user from JWT token"""
    user_id = verify_access_token(credentials.credentials)
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
    paste_detected: Optional[str] = Form("false"),  # paste detection flag
    final_image: Optional[UploadFile] = File(None),  # For Drawing/Photography
    progress_photos: List[UploadFile] = File(default=[]),
    progress_captions: Optional[str] = Form(None),  # JSON array of captions
    credentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Create a new creative post with progress photos and BERT analysis for Writing"""
    user = get_current_user(credentials, db)

    # Validate title length
    if not title or len(title.strip()) == 0:
        raise HTTPException(status_code=400, detail="Title is required")
    if len(title) > 100:
        raise HTTPException(status_code=400, detail="Title must be 100 characters or less")
    
    # Validate description length
    if description and len(description) > 280:
        raise HTTPException(status_code=400, detail="Description must be 280 characters or less")
    
    # Validate captions length
    if progress_captions:
        try:
            captions_list = json.loads(progress_captions)
            for i, caption in enumerate(captions_list):
                if caption and len(caption) > 100:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Caption {i+1} must be 100 characters or less"
                    )
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid captions format")

    # Validate category
    if category not in ['Writing', 'Drawing', 'Photography']:
        raise HTTPException(status_code=400, detail="Invalid category")
    
    # Validate progress photos (must have 2-3)
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
    
    # Convert paste_detected from string to bool
    paste_detected_bool = paste_detected.lower() == "true"
    
    # Analyze typing pattern for writing (ONLY if paste isntt detected)
    analysis_result = None
    typing_data_dict = None
    
    if category == 'Writing' and typing_data and not paste_detected_bool:
        try:
            typing_data_dict = json.loads(typing_data)
            analysis_result = analyze_typing_pattern(
                typing_data=typing_data_dict,
                content_length=len(content),
                space="creative"
            )
            
            print(f"Creative Writing Analysis: {get_analysis_summary(analysis_result)}")
            
            # Block if typing analysis says to block
            if analysis_result.decision == "block":
                raise HTTPException(
                    status_code=400,
                    detail=analysis_result.reason
                )
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid typing data format")
    elif paste_detected_bool and category == 'Writing':
        print(f"Creative Writing (PASTE): Skipping typing analysis, going directly to BERT")
    
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
    
    # BERT ANALYSIS FOR WRITING
    if category == 'Writing' and hybrid_scorer:
        try:
            ml_analysis = hybrid_scorer.score_content(
                text=content,
                typing_metadata=typing_data_dict if typing_data_dict else None
            )
            
            # DEBUG
            print(f"\n🔍 CREATIVE BERT ANALYSIS:")
            print(f"  Content: {content[:50]}...")
            print(f"  Paste Detected: {paste_detected_bool}")
            print(f"  Hybrid Score: {ml_analysis['hybrid_score']}")
            print(f"  Classification: {ml_analysis['classification']}")
            print(f"  Recommendation: {ml_analysis['recommendation']}\n")
            
            # Store ML scores
            db_post.authenticity_score = ml_analysis['hybrid_score']
            db_post.classification = ml_analysis['classification']
            db_post.recommendation = ml_analysis['recommendation']
            db_post.bert_confidence = ml_analysis['bert_details']['human_probability']
            
            # bllock if AI-generated
            if ml_analysis['recommendation'] == 'block':
                db.rollback()
                raise HTTPException(
                    status_code=400,
                    detail=f"Content appears AI-generated (score: {ml_analysis['hybrid_score']:.1f}/100). Please rewrite with original content."
                )
            
            if ml_analysis['recommendation'] == 'flag':
                db_post.requires_review = True
            
            logger.info(f"Creative Writing ML Analysis - Classification: {ml_analysis['classification']}, Score: {ml_analysis['hybrid_score']:.1f}/100")
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"BERT analysis error in creative: {e}")
            # Continue without ML if it fails
    elif category == 'Writing':
        logger.warning("BERT model not available for Creative Writing")

    # ART ANALYSIS FOR DRAWING AND PHOTOGRAPHY
    if category in ['Drawing', 'Photography'] and final_image_url and art_detector:
        try:
            # Remove leading slash from URL to get file path
            image_file_path = final_image_url.lstrip('/')
            
            art_analysis = art_detector.analyze(image_file_path)
            
            # DEBUGging 
            print(f"\nCREATIVE ART ANALYSIS:")
            print(f"  Category: {category}")
            print(f"  Classification: {art_analysis['classification']}")
            print(f"  AI Confidence: {art_analysis['ai_confidence']:.1%}")
            print(f"  Recommendation: {art_analysis['recommendation']}\n")
            
            # Store art analysis
            db_post.art_classification = art_analysis['classification']
            db_post.art_ai_confidence = art_analysis['ai_confidence']
            db_post.art_analysis = art_analysis
            
            # Block if likely AI
            if art_analysis['recommendation'] == 'block':
                db.rollback()
                raise HTTPException(
                    status_code=400,
                    detail=f"Artwork appears AI-generated (confidence: {art_analysis['ai_confidence']:.1%}). Please upload original artwork."
                )
            
            if art_analysis['recommendation'] == 'flag':
                db_post.art_requires_review = True
            
            logger.info(f"Creative Art Analysis - Classification: {art_analysis['classification']}")
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Art detection analysis error in creative: {e}")
            
            # Continue without analysis if it fails
    elif category == 'Drawing':
        logger.warning("Art detector not available for Drawing")


    db.add(db_post)
    db.flush()
    
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
        analysis_decision=db_post.analysis_decision,
        art_ai_confidence=db_post.art_ai_confidence
    )

@router.get("", response_model=List[CreativePostResponse])
def get_creative_posts(
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get creative posts, optionally filtered by category"""
    query = db.query(models.CreativePost)
    
    # Filter by category
    if category and category != "all":
        if category not in ['Writing', 'Drawing', 'Photography']:
            raise HTTPException(status_code=400, detail="Invalid category")
        query = query.filter(models.CreativePost.category == category)
    
    posts = query.order_by(models.CreativePost.created_at.desc()).all()
    
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
            user_has_liked=False,
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
            analysis_decision=post.analysis_decision,
            art_ai_confidence=post.art_ai_confidence
        ) for post in posts
    ]

@router.get("/{post_id}", response_model=CreativePostResponse)
def get_creative_post(
    post_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific creative post"""
    post = db.query(models.CreativePost).filter(models.CreativePost.id == post_id).first()
    
    if not post:
        raise HTTPException(status_code=404, detail="Creative post not found")
    
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
        user_has_liked=False,
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
        analysis_decision=post.analysis_decision,
        art_ai_confidence=post.art_ai_confidence
    )

@router.post("/{post_id}/like")
def like_creative_post(
    post_id: int,
    credentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Like a creative post"""
    user = get_current_user(credentials, db)
    
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
    credentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Unlike a creative post"""
    user = get_current_user(credentials, db)
    
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
    credentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Delete own creative post"""
    user = get_current_user(credentials, db)
    
    post = db.query(models.CreativePost).filter(models.CreativePost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Creative post not found")
    
    # Check ownership
    if post.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
    
   # Delete associated images from Supabase
    if post.final_image_url:
        delete_image(post.final_image_url)
    
    for photo in post.progress_photos:
        delete_image(photo.image_url)
    
    db.delete(post)
    db.commit()
    
    return {"message": "Creative post deleted successfully"}


@router.post("/{post_id}/comments")
def create_creative_comment(
    post_id: int,
    comment: CommentCreate,
    credentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Create a comment on a creative post"""
    user = get_current_user(credentials, db)
    
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
    ).order_by(models.CreativeComment.created_at.desc()).all()
    
    return [
        {
            "id": comment.id,
            "content": comment.content,
            "author": comment.author.username,
            "created_at": comment.created_at
        } for comment in comments
    ]