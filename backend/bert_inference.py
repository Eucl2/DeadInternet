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
            logger.info("Model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
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
    Combines BERT AI detection with typing pattern analysis.
    
    Creates a hybrid score (0-100) using:
    - Hybrid Score = (BERT Score × 0.7) + (Typing Score × 0.3)
    
    Final decision is binary:
    - >=60: approve
    - < 60: belock
    """
    
    def __init__(self, bert_inference: BERTInference):
        """Initialize hybrid scorer"""
        self.bert = bert_inference
    
    def score_content(
        self,
        text: str,
        typing_score: float = None,
        bert_weight: float = 0.7,
        typing_weight: float = 0.3
    ) -> Dict:
        
        #Score content using hybrid approach.

        # Get BERT score
        bert_result = self.bert.predict(text, return_confidence=True)
        
        # Convert BERT to authenticity score (human probability percentage)
        bert_score = bert_result['raw_scores']['human_probability']
        
        # Calculate hybrid score
        if typing_score is not None and bert_score is not None:
            hybrid_score = (
                bert_score * bert_weight + typing_score * typing_weight
            )
        else:
            hybrid_score = bert_score
        
        # Binary classification
        if hybrid_score >= 60:
            classification = 'human'
            recommendation = 'approve'
        else:
            classification = 'ai'
            recommendation = 'block'
        
        return {
            'hybrid_score': round(hybrid_score, 2),
            'classification': classification,
            'recommendation': recommendation,
            'bert_score': round(bert_score, 2),
            'typing_score': round(typing_score, 2) if typing_score is not None else None,
            'bert_details': bert_result['raw_scores']
        }


# FastAPI Integration

from fastapi import HTTPException
from pydantic import BaseModel


class ContentAnalysisRequest(BaseModel):
    """Request model for content analysis"""
    text: str
    typing_score: float = None


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