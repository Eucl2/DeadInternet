from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    name: str = None

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