from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional, List
import re


# User schemas
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: Optional[str] = None
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username can only contain letters, numbers, and underscores')
        return v

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    name: Optional[str] = None
    bio: str = ""
    created_at: datetime
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class AuthResponse(BaseModel):
    session_id: str
    user: UserResponse



# Pulse Schemas
class TypingData(BaseModel):
    totalTime: float
    thinkingTime: float
    backspaceCount: int
    pauseCount: int
    intervals: List[int]

class PostCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=280)
    tag: str = "Thoughts"
    typing_data: Optional[TypingData] = None
    space: str = "pulse"

class PostResponse(BaseModel):
    id: int
    content: str
    tag: str
    author: str
    created_at: datetime
    like_count: int = 0
    comment_count: int = 0
    user_has_liked: bool = False
    human_score: Optional[float] = None
    analysis_decision: Optional[str] = None

    class Config:
        from_attributes = True


# Creative Schemas
class ProgressPhotoResponse(BaseModel):
    id: int
    image_url: str
    stage_order: int
    caption: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class CreativePostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: str
    content: Optional[str] = None  # For Writing
    typing_data: Optional[TypingData] = None  # For Writing category
    
    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        allowed = ['Writing', 'Drawing', 'Photography']
        if v not in allowed:
            raise ValueError(f'Category must be one of: {", ".join(allowed)}')
        return v
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v, info):
        category = info.data.get('category')
        if category == 'Writing' and not v:
            raise ValueError('Content required for Writing category')
        return v

class CreativePostResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: str
    content: Optional[str] = None  # For Writing
    final_image_url: Optional[str] = None  # For Drawing/Photography
    author: str  # username
    author_id: int
    created_at: datetime
    like_count: int = 0
    comment_count: int = 0
    user_has_liked: bool = False
    progress_photos: List[ProgressPhotoResponse] = []
    human_score: Optional[float] = None  # For Writing
    analysis_decision: Optional[str] = None  # For Writing
    
class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=280)

class CommentResponse(BaseModel):
    id: int
    content: str
    author: str
    created_at: datetime
    
    class Config:
        from_attributes = True



# Sparks Schemas
# Sparks Schemas
class SparkResponseCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=280)

class SparkResponseRead(BaseModel):
    id: int
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class SparkRead(BaseModel):
    id: int
    question: str
    date: str
    created_at: datetime
    responses: List[SparkResponseRead] = []
    total_responses: int = 0
    user_has_responded: bool = False
    stats: Optional[dict] = None
    
    class Config:
        from_attributes = True
    
    class Config:
        from_attributes = True