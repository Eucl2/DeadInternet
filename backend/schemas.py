from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional
import re

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

class TypingData(BaseModel):
    totalTime: float
    thinkingTime: float
    averageSpeed: float
    backspaceCount: int
    pauseCount: int
    speedVariance: float

class PostCreate(BaseModel):
    content: str
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
    user_has_liked: bool = False
    human_score: Optional[float] = None
    analysis_decision: Optional[str] = None

    class Config:
        from_attributes = True