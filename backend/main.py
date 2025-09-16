from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import create_tables, get_db
from schemas import UserCreate, UserResponse, LoginRequest
from auth import create_user, get_user_by_username, verify_password
import models

app = FastAPI(title="DeadInternet API", version="0.1.0")

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
    return {"message": "DeadInternet Backend v0.1 - The Last Living Network"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "0.1.0"}

@app.post("/auth/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    if get_user_by_username(db, user.username):
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )
    
    # Create user
    db_user = create_user(db, user)
    return db_user

@app.post("/auth/login")
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    # Get user
    user = get_user_by_username(db, credentials.username)
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    
    return {
        "message": "Login successful", 
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "name": user.name
        }
    }


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
    
    return {"message": "Username updated successfully"}