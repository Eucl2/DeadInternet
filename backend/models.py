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
    
    email_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True, unique=True)
    verification_token_expires = Column(DateTime, nullable=True)

    # Relationships
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    creative_posts = relationship("CreativePost", back_populates="author", cascade="all, delete-orphan")
    creative_likes = relationship("CreativeLike", back_populates="user", cascade="all, delete-orphan")

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
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")

    @property
    def like_count(self):
        return len(self.likes)
    
    @property
    def comment_count(self):
        return len(self.comments)
    

class Like(Base):
    __tablename__ = "likes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="likes")
    post = relationship("Post", back_populates="likes")
    
    __table_args__ = (UniqueConstraint('user_id', 'post_id', name='unique_user_post_like'),)

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")

#Creative Space Models
class CreativePost(Base):
    __tablename__ = "creative_posts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False)  # 'Writing', 'Drawing', 'Photography'
    
    content = Column(Text, nullable=True)  # For Writing
    final_image_url = Column(String(500), nullable=True)  # For Drawing and Photography
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Typing analysis (for Writing category)
    typing_metrics = Column(JSON, nullable=True)
    human_score = Column(Float, nullable=True)  # 0-100 score
    analysis_decision = Column(String(20), nullable=True)  # approve, flag, block
    analysis_flags = Column(JSON, nullable=True)  # List of red flags
    blocked_reason = Column(String(255), nullable=True)
    
    # Content analysis (for Writing category)
    content_analysis = Column(JSON, nullable=True)
    requires_review = Column(Boolean, default=False)
    
    # Relationships
    author = relationship("User", back_populates="creative_posts")
    progress_photos = relationship(
        "ProgressPhoto", 
        back_populates="creative_post", 
        cascade="all, delete-orphan", 
        order_by="ProgressPhoto.stage_order"
    )
    likes = relationship("CreativeLike", back_populates="creative_post", cascade="all, delete-orphan")
    comments = relationship("CreativeComment", back_populates="creative_post", cascade="all, delete-orphan")
    
    @property
    def like_count(self):
        return len(self.likes)
    
    @property
    def comment_count(self):
        return len(self.comments)


class ProgressPhoto(Base):
    __tablename__ = "progress_photos"
    
    id = Column(Integer, primary_key=True, index=True)
    creative_post_id = Column(Integer, ForeignKey("creative_posts.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    stage_order = Column(Integer, nullable=False)  # 1, 2, 3
    caption = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    creative_post = relationship("CreativePost", back_populates="progress_photos")


class CreativeLike(Base):
    __tablename__ = "creative_likes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    creative_post_id = Column(Integer, ForeignKey("creative_posts.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="creative_likes")
    creative_post = relationship("CreativePost", back_populates="likes")
    
    __table_args__ = (UniqueConstraint('user_id', 'creative_post_id', name='unique_user_creative_like'),)


class CreativeComment(Base):
    __tablename__ = "creative_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    creative_post_id = Column(Integer, ForeignKey("creative_posts.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    creative_post = relationship("CreativePost", back_populates="comments")
    author = relationship("User")