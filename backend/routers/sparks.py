from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from datetime import date
from database import get_db
from models import Spark, SparkResponse, User
from schemas import SparkRead, SparkResponseCreate, SparkResponseRead
from auth import get_current_user

security = HTTPBearer()

router = APIRouter(prefix="/sparks", tags=["sparks"])

@router.get("/daily", response_model=SparkRead)
def get_daily_spark(
    credentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get today's spark question with statistics"""
    user = get_current_user(credentials, db)
    today = str(date.today())
    
    spark = db.query(Spark).filter(Spark.date == today).first()
    
    if not spark:
        spark = Spark(
            question="What brings you joy today?",
            date=today
        )
        db.add(spark)
        db.commit()
        db.refresh(spark)
    
    # Verifica se user já respondeu
    user_response = db.query(SparkResponse).filter(
        SparkResponse.spark_id == spark.id,
        SparkResponse.user_id == user.id
    ).first()
    
    # Calcula stats
    total_responses = len(spark.responses)
    avg_length = 0
    most_common = None
    
    if total_responses > 0:
        avg_length = sum(len(r.content) for r in spark.responses) // total_responses
        
        # Find most common response
        from collections import Counter
        content_counts = Counter(r.content for r in spark.responses)
        if content_counts:
            most_common_content, count = content_counts.most_common(1)[0]
            if count > 1:
                most_common = {
                    "content": most_common_content,
                    "count": count
                }
    
    spark_data = SparkRead(
        id=spark.id,
        question=spark.question,
        date=spark.date,
        created_at=spark.created_at,
        responses=spark.responses,
        total_responses=total_responses,
        user_has_responded=user_response is not None,
        stats={
            "total_responses": total_responses,
            "average_length": avg_length,
            "most_common_response": most_common
        }
    )
    
    return spark_data


@router.post("/daily/responses", response_model=SparkResponseRead)
def create_spark_response(
    response: SparkResponseCreate,
    credentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Submit an anonymous response to today's spark"""
    user = get_current_user(credentials, db)
    today = str(date.today())
    
    spark = db.query(Spark).filter(Spark.date == today).first()
    if not spark:
        raise HTTPException(status_code=404, detail="No spark available today")
    
    existing = db.query(SparkResponse).filter(
        SparkResponse.spark_id == spark.id,
        SparkResponse.user_id == user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You've already responded to today's spark")
    
    db_response = SparkResponse(
        spark_id=spark.id,
        user_id=user.id,
        content=response.content
    )
    
    db.add(db_response)
    db.commit()
    db.refresh(db_response)
    
    return db_response