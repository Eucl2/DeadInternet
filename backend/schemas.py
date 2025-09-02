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
    
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str