"""
Art authenticity detection using pre-trained CNN model
Detects whether visual artwork (Drawing/Photography) is AI-generated or human-made
"""

import tensorflow as tf
import numpy as np
from tensorflow.keras.models import load_model
from PIL import Image
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class CustomDenseLayers:
    """Custom layer wrapper for loading the pre-trained model with custom bias initialization"""
    
    @staticmethod
    def tf_wrapper(*args, **kwargs):
        config = kwargs.get('config', {})
        
        # Custom bias layer for class imbalance correction
        if kwargs.get('name', None) == "dense_1":
            return tf.keras.layers.Dense(
                units=config.get('units', 1),
                activation=config.get('activation', 'sigmoid'),
                use_bias=config.get('use_bias', True),
                kernel_initializer=tf.keras.initializers.get(config.get('kernel_initializer', 'GlorotUniform')),
                bias_initializer=tf.keras.initializers.Constant(value=0.8498341056885719),
                kernel_regularizer=tf.keras.regularizers.get(config.get('kernel_regularizer')),
                bias_regularizer=tf.keras.regularizers.get(config.get('bias_regularizer')),
                activity_regularizer=tf.keras.regularizers.get(config.get('activity_regularizer')),
                kernel_constraint=tf.keras.constraints.get(config.get('kernel_constraint')),
                bias_constraint=tf.keras.constraints.get(config.get('bias_constraint'))
            )
        # Regular dense layer
        else:
            return tf.keras.layers.Dense(
                units=config.get('units', 128),
                activation=config.get('activation', 'relu'),
                use_bias=config.get('use_bias', True),
                kernel_initializer=tf.keras.initializers.get(config.get('kernel_initializer', 'GlorotUniform')),
                bias_initializer=tf.keras.initializers.get(config.get('bias_initializer', 'Zeros')),
                kernel_regularizer=tf.keras.regularizers.get(config.get('kernel_regularizer')),
                bias_regularizer=tf.keras.regularizers.get(config.get('bias_regularizer')),
                activity_regularizer=tf.keras.regularizers.get(config.get('activity_regularizer')),
                kernel_constraint=tf.keras.constraints.get(config.get('kernel_constraint')),
                bias_constraint=tf.keras.constraints.get(config.get('bias_constraint'))
            )


class ArtAuthenticityDetector:
    
    def __init__(self, model_path: str):
        try:
            self.model = load_model(
                model_path,
                compile=False,
                custom_objects={"Dense": CustomDenseLayers.tf_wrapper}
            )
            logger.info("✅ Art authenticity detector loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load art detection model: {e}")
            self.model = None
    
    @staticmethod
    def process_image(image_path: str) -> np.ndarray:
        """
        Preprocess image for model inference
        - Converts to RGB
        - Resizes to 256x256
        - Uses raw pixel values (0-255)
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Preprocessed image array ready for inference
        """
        try:
            with Image.open(image_path) as img:
                img = img.convert('RGB')
                img = img.resize((256, 256))
                img_array = np.array(img)  # Raw pixel values (0-255)
                img_array = np.expand_dims(img_array, axis=0)
                return img_array
        except Exception as e:
            logger.error(f"Error processing image {image_path}: {e}")
            raise
    
    def analyze(self, image_path: str) -> dict:
        if not self.model:
            logger.warning("Model not available, cannot analyze image")
            return {
                "classification": "unknown",
                "ai_confidence": None,
                "human_confidence": None,
                "recommendation": "approve",  # Default to approve if model unavailable
                "error": "Model not loaded"
            }
        
        try:
            # Preprocess
            img_array = self.process_image(image_path)
            
            # Predict (model outputs probability of being human-made)
            prediction = self.model.predict(img_array, verbose=0)
            ai_confidence = float(prediction[0][0])
            human_confidence = 1.0 - ai_confidence
            
            # Classify based on confidence thresholds
            if ai_confidence > 0.65:
                classification = "ai"
                recommendation = "block"
            elif ai_confidence > 0.5:
                classification = "ai"
                recommendation = "flag"
            else:
                classification = "human"
                recommendation = "approve"
            
            logger.info(
                f"Art Analysis: {classification.upper()} "
                f"(AI confidence: {ai_confidence:.1%})"
            )
            
            return {
                "classification": classification,
                "ai_confidence": ai_confidence,
                "human_confidence": human_confidence,
                "recommendation": recommendation
            }
        
        except Exception as e:
            logger.error(f"Error analyzing image: {e}")
            return {
                "classification": "unknown",
                "ai_confidence": None,
                "human_confidence": None,
                "recommendation": "approve",
                "error": str(e)
            }