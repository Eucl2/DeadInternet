from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, UniqueConstraint, JSON, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    bio = Column(String(100), nullable=True, default="")
    
    posts = relationship("Post", back_populates="author")
    likes = relationship("Like", back_populates="user")

class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    tag = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    author_id = Column(Integer, ForeignKey("users.id"))
    
    #Typing analysis
    space = Column(String(20), default="pulse")  # "pulse", "creative", "sparks"
    typing_metrics = Column(JSON, nullable=True)
    human_score = Column(Float, nullable=True)  # 0-100 score
    analysis_decision = Column(String(20), nullable=True)  # "approve", "flag", "block"
    analysis_flags = Column(JSON, nullable=True)  # List of red flags
    blocked_reason = Column(String(255), nullable=True)
    
    #Content analysis
    content_analysis = Column(JSON, nullable=True)
    requires_review = Column(Boolean, default=False)  # Flagged for block orreview
    
    author = relationship("User", back_populates="posts")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")
    
    @property
    def like_count(self):
        return len(self.likes)
    

class Like(Base):
    __tablename__ = "likes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="likes")
    post = relationship("Post", back_populates="likes")
    
    __table_args__ = (UniqueConstraint('user_id', 'post_id', name='unique_user_post_like'),)