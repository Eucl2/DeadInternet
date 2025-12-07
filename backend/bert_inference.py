"""
DeadInternet BERT Inference Module
Integrates trained BERT model with FastAPI for real-time content authenticity scoring
"""

import torch
import numpy as np
from transformers import BertTokenizer, BertForSequenceClassification
from pathlib import Path
import logging
from typing import Dict, Tuple
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# Device configuration
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


class BERTInference:
    """BERT-based inference engine for content authenticity detection"""
    
    def __init__(self, model_path: str = 'deadinternet_bert_model'):
        """
        Initialize the inference engine
        
        Args:
            model_path: Path to saved BERT model
        """
        self.model_path = Path(model_path)
        self.tokenizer = None
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load pretrained BERT model and tokenizer"""
        try:
            logger.info(f"Loading model from {self.model_path}...")
            
            # Load tokenizer
            tokenizer_path = self.model_path / 'tokenizer'
            self.tokenizer = BertTokenizer.from_pretrained(str(tokenizer_path))
            
            # Load model
            model_path = self.model_path / 'model'
            self.model = BertForSequenceClassification.from_pretrained(
                str(model_path)
            ).to(device)
            
            self.model.eval()
            logger.info("✅ Model loaded successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")
            raise
    
    def predict(self, text: str, return_confidence: bool = True) -> Dict:
        """
        Predict if content is human-generated or AI-generated
        
        Args:
            text: The content text to analyze
            return_confidence: Whether to return confidence scores
        
        Returns:
            Dict with:
            - 'label': 0 (human) or 1 (AI-generated)
            - 'confidence': Confidence score (0-100)
            - 'is_human': Boolean indicating if content appears human-generated
            - 'raw_scores': Raw prediction scores if return_confidence=True
        """
        if not self.tokenizer or not self.model:
            raise ValueError("Model not loaded")
        
        try:
            # Tokenize
            encoding = self.tokenizer(
                text,
                add_special_tokens=True,
                max_length=128,
                return_token_type_ids=False,
                padding='max_length',
                truncation=True,
                return_tensors='pt'
            )
            
            input_ids = encoding['input_ids'].to(device)
            attention_mask = encoding['attention_mask'].to(device)
            
            # Inference
            with torch.no_grad():
                outputs = self.model(
                    input_ids=input_ids,
                    attention_mask=attention_mask
                )
                logits = outputs.logits
                probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
            
            # Get prediction
            predicted_label = np.argmax(probs)
            confidence = float(probs[predicted_label]) * 100
            
            # Format response
            result = {
                'label': int(predicted_label),  # 0=human, 1=AI
                'confidence': round(confidence, 2),
                'is_human': predicted_label == 0,
            }
            
            if return_confidence:
                result['raw_scores'] = {
                    'human_probability': round(float(probs[0]) * 100, 2),
                    'ai_probability': round(float(probs[1]) * 100, 2)
                }
            
            return result
        
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            raise
    
    def batch_predict(self, texts: list, return_confidence: bool = True) -> list:
        """
        Predict on multiple texts efficiently
        
        Args:
            texts: List of text strings
            return_confidence: Whether to return confidence scores
        
        Returns:
            List of prediction results
        """
        results = []
        for text in texts:
            results.append(self.predict(text, return_confidence))
        return results


class HybridContentScorer:
    """
    Combines BERT AI detection with typing pattern analysis
    Creates a hybrid score (0-100) where:
    - 0-40: Likely AI-generated
    - 40-85: Ambiguous (needs review)
    - 85-100: Likely human-generated
    """
    
    def __init__(self, bert_inference: BERTInference):
        """Initialize hybrid scorer"""
        self.bert = bert_inference
    
    def score_content(
        self,
        text: str,
        typing_metadata: Dict = None,
        bert_weight: float = 0.7,
        typing_weight: float = 0.3
    ) -> Dict:
        """
        Score content using hybrid approach
        
        Args:
            text: The content text
            typing_metadata: Optional dict with typing pattern data
                - 'typing_speed': chars per second
                - 'error_rate': typo percentage
                - 'pause_variance': variance in pause times
            bert_weight: Weight for BERT score (0-1)
            typing_weight: Weight for typing pattern score (0-1)
        
        Returns:
            Dict with:
            - 'hybrid_score': 0-100 authenticity score
            - 'classification': 'human', 'ambiguous', or 'ai'
            - 'bert_score': BERT model score
            - 'typing_score': Typing pattern score (if provided)
            - 'recommendation': 'approve', 'flag', or 'block'
        """
        # Get BERT score
        bert_result = self.bert.predict(text, return_confidence=True)
        
        # Convert BERT to authenticity score (inverse of AI probability)
        human_prob_percentage = bert_result['raw_scores']['human_probability']
        bert_score = human_prob_percentage
        
        # Initialize hybrid score
        hybrid_score = bert_score
        typing_score = None
        
        # Incorporate typing metrics if provided
        if typing_metadata:
            typing_score = self._calculate_typing_score(typing_metadata)
            # Weighted combination
            hybrid_score = (
                bert_score * bert_weight +
                typing_score * typing_weight
            )
        
        # Classify
        if hybrid_score >= 85:
            classification = 'human'
            recommendation = 'approve'
        elif 40 <= hybrid_score < 85:
            classification = 'ambiguous'
            recommendation = 'flag'
        else:
            classification = 'ai'
            recommendation = 'block'
        
        return {
            'hybrid_score': round(hybrid_score, 2),
            'classification': classification,
            'recommendation': recommendation,
            'bert_score': round(bert_score, 2),
            'typing_score': round(typing_score, 2) if typing_score else None,
            'bert_details': bert_result['raw_scores'],
            'reasoning': self._generate_reasoning(
                hybrid_score, bert_score, typing_score, classification
            )
        }
    
    def _calculate_typing_score(self, metadata: Dict) -> float:
        """
        Calculate typing authenticity score based on patterns
        
        Factors:
        - Too fast (>10 chars/sec) suggests copy-paste or bot: -20 points
        - Very slow (<2 chars/sec) suggests genuine composition: +10 points
        - Low error rate (<2%) with high speed: suspicious: -15 points
        - High pause variance: more human: +10 points
        """
        score = 50  # Neutral baseline
        
        typing_speed = metadata.get('typing_speed', 5)
        error_rate = metadata.get('error_rate', 2)
        pause_variance = metadata.get('pause_variance', 0.5)
        
        # Speed analysis
        if typing_speed > 10:
            score -= 20  # Suspiciously fast
        elif typing_speed < 2:
            score += 10  # Naturally slow
        elif 2 <= typing_speed <= 6:
            score += 5  # Normal range
        
        # Error analysis
        if error_rate < 0.5:
            score -= 15  # Too perfect
        elif 0.5 <= error_rate <= 5:
            score += 10  # Natural error rate
        
        # Pause variance (higher = more human-like)
        if pause_variance > 1.0:
            score += 15
        elif pause_variance > 0.5:
            score += 5
        
        # Clamp to 0-100
        return max(0, min(100, score))
    
    def _generate_reasoning(
        self,
        hybrid_score: float,
        bert_score: float,
        typing_score: float,
        classification: str
    ) -> str:
        """Generate human-readable reasoning for the classification"""
        reasons = []
        
        if bert_score < 50:
            reasons.append("BERT model detected AI-generated patterns")
        elif bert_score > 75:
            reasons.append("BERT model indicates human authorship")
        else:
            reasons.append("BERT inconclusive about content origin")
        
        if typing_score:
            if typing_score < 40:
                reasons.append("Typing patterns inconsistent with human input")
            elif typing_score > 70:
                reasons.append("Typing patterns consistent with human authorship")
        
        if classification == 'ambiguous':
            reasons.append("Recommend manual review for borderline cases")
        
        return "; ".join(reasons)

# FastAPI Integration

from fastapi import HTTPException
from pydantic import BaseModel


class ContentAnalysisRequest(BaseModel):
    """Request model for content analysis"""
    text: str
    include_typing_metrics: bool = False
    typing_metadata: Dict = None


class ContentAnalysisResponse(BaseModel):
    """Response model for content analysis"""
    hybrid_score: float
    classification: str
    recommendation: str
    bert_score: float
    typing_score: float = None


# Initialize inference engine (call this on app startup)
def init_inference_engine(model_path: str = 'deadinternet_bert_model') -> BERTInference:
    """Initialize the BERT inference engine"""
    try:
        bert = BERTInference(model_path=model_path)
        return bert
    except Exception as e:
        logger.error(f"Failed to initialize inference engine: {e}")
        raise


# FastAPI endpoints to add to your main.py:
"""
Add these to your FastAPI app:

from fastapi import APIRouter

router = APIRouter(prefix="/api/content", tags=["content-analysis"])

# Initialize on startup
bert_inference = None
hybrid_scorer = None

@app.on_event("startup")
async def startup_event():
    global bert_inference, hybrid_scorer
    bert_inference = init_inference_engine()
    hybrid_scorer = HybridContentScorer(bert_inference)

@router.post("/analyze", response_model=ContentAnalysisResponse)
async def analyze_content(request: ContentAnalysisRequest):
    '''
    Analyze content authenticity using hybrid BERT + typing pattern scoring
    
    Returns:
    - hybrid_score: 0-100 (0=AI, 100=human)
    - classification: 'human', 'ambiguous', or 'ai'
    - recommendation: 'approve', 'flag', or 'block'
    '''
    if not bert_inference or not hybrid_scorer:
        raise HTTPException(status_code=503, detail="Inference engine not ready")
    
    try:
        result = hybrid_scorer.score_content(
            text=request.text,
            typing_metadata=request.typing_metadata
        )
        return ContentAnalysisResponse(**result)
    except Exception as e:
        logger.error(f"Content analysis error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

app.include_router(router)
"""

if __name__ == "__main__":
    # Test inference
    bert = BERTInference()
    
    test_texts = [
        "Just finished an amazing coffee at the local cafe. The barista remembered my usual order!",
        "This product is the best ever and everyone should buy it because it will change your life forever",
        "Feeling grateful for another day. Sunshine and fresh air make everything better.",
    ]
    
    print("\n" + "="*60)
    print("BERT Inference Test")
    print("="*60 + "\n")
    
    for text in test_texts:
        result = bert.predict(text, return_confidence=True)
        print(f"Text: {text[:70]}...")
        print(f"Result: {result}\n")
