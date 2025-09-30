from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
import re

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    name: str = None
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        if len(v) > 50:
            raise ValueError('Username must be less than 50 characters')
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username can only contain letters, numbers, and underscores')
        return v

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    name: str = None
    created_at: datetime

class AuthResponse(BaseModel):
    session_id: str
    user: UserResponse
    message: str = "Authentication successful"
    
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class PostCreate(BaseModel):
    content: str
    tag: str = "Thoughts"

class PostResponse(BaseModel):
    id: int
    content: str
    tag: str
    author: str  # username
    created_at: datetime
    like_count: int = 0
    user_has_liked: bool = False
    
    class Config:
        from_attributes = True