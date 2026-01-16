# model_manager.py - Professional Model Management with Self-Testing
# Place in: detector/model_manager.py

import os
import json
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from pathlib import Path

class ModelManager:
    """
    Professional ML model manager with built-in self-testing.
    
    This class implements the MLOps best practice of packaging models
    with their configuration, test data, and self-validation capability.
    """
    
    def __init__(self, engine_name, base_path=None):
        """
        Initialize model manager for a specific engine.
        
        Args:
            engine_name: Name of the engine (e.g., 'ids_engine')
            base_path: Path to production_models folder (auto-detected if None)
        """
        self.engine_name = engine_name
        
        # Auto-detect base path
        if base_path is None:
            base_path = Path(__file__).parent / "production_models"
        
        self.path = Path(base_path) / engine_name
        
        # Assets
        self.model = None
        self.scaler = None
        self.config = {}
        self.reference = {}
        
        # Load everything
        self.load_assets()
    
    def load_assets(self):
        """Load model, scaler, config, and reference data"""
        print(f"\n[{self.engine_name}] Loading assets...")
        
        try:
            # 1. Load Config
            config_path = self.path / "config.json"
            with open(config_path, 'r') as f:
                self.config = json.load(f)
            
            print(f"[{self.engine_name}] ✅ Config loaded")
            print(f"   Algorithm: {self.config['metadata']['algorithm']}")
            print(f"   Features: {self.config['model']['feature_count']}")
            
            # 2. Load Reference Test Cases
            ref_path = self.path / "reference.json"
            with open(ref_path, 'r') as f:
                self.reference = json.load(f)
            
            print(f"[{self.engine_name}] ✅ Reference loaded")
            print(f"   Test cases: {len(self.reference['test_cases'])}")
            
            # 3. Load Model
            engine_type = self.config['model']['engine_type']
            
            if engine_type == 'tensorflow':
                model_path = self.path / "model.h5"
                self.model = tf.keras.models.load_model(model_path)
                print(f"[{self.engine_name}] ✅ TensorFlow model loaded")
            
            elif engine_type in ['sklearn', 'sklearn_pipeline']:
                model_path = self.path / "model.joblib"
                self.model = joblib.load(model_path)
                print(f"[{self.engine_name}] ✅ Sklearn model loaded")
            
            else:
                raise ValueError(f"Unknown engine type: {engine_type}")
            
            # 4. Load Scaler (if applicable)
            scaler_path = self.path / "scaler.joblib"
            if scaler_path.exists():
                self.scaler = joblib.load(scaler_path)
                print(f"[{self.engine_name}] ✅ Scaler loaded")
            else:
                print(f"[{self.engine_name}] ℹ️  No scaler (not required)")
            
            print(f"[{self.engine_name}] 🎉 All assets loaded successfully\n")
            
        except Exception as e:
            print(f"[{self.engine_name}] ❌ Error loading: {e}\n")
            raise
    
    def predict(self, input_data):
        """
        Run prediction with automatic scaling and formatting.
        
        Args:
            input_data: Dict with feature names as keys
            
        Returns:
            Dict with prediction results
        """
        if not self.model:
            raise RuntimeError(f"{self.engine_name}: Model not loaded")
        
        # Get feature list from config
        features = self.config['model']['input_features']
        
        # Create DataFrame with correct feature order
        df = pd.DataFrame([input_data])
        df = df.reindex(columns=features, fill_value=0)
        
        # Apply scaling if needed
        if self.scaler:
            data_to_predict = self.scaler.transform(df)
        else:
            data_to_predict = df.values
        
        # Predict based on engine type
        engine_type = self.config['model']['engine_type']
        
        if engine_type == 'tensorflow':
            # Autoencoder: compute reconstruction error
            reconstruction = self.model.predict(data_to_predict, verbose=0)
            error = np.mean(np.power(data_to_predict - reconstruction, 2), axis=1)[0]
            
            threshold = self.config['model']['threshold']
            is_anomaly = error > threshold
            
            return {
                "score": float(error),
                "threshold": threshold,
                "is_anomaly": bool(is_anomaly),
                "verdict": self.config['model']['labels']['1'] if is_anomaly else self.config['model']['labels']['0'],
                "confidence": float(error / threshold) if threshold else 1.0
            }
        
        else:
            # Classifier: get class prediction
            prediction = self.model.predict(data_to_predict)[0]
            
            # Get probabilities if available
            if hasattr(self.model, 'predict_proba'):
                probabilities = self.model.predict_proba(data_to_predict)[0]
                confidence = float(probabilities[int(prediction)])
            else:
                confidence = 1.0
            
            return {
                "score": int(prediction),
                "is_anomaly": prediction == 1,
                "verdict": self.config['model']['labels'][str(int(prediction))],
                "confidence": confidence
            }
    
    def run_health_check(self):
        """
        Run self-test using reference test cases.
        
        Returns:
            bool: True if all tests pass
        """
        print(f"\n[{self.engine_name}] 🔍 Running Health Check...")
        print(f"{'='*60}")
        
        test_results = []
        
        for test_name, test_case in self.reference['test_cases'].items():
            print(f"\nTest: {test_name}")
            print(f"Description: {test_case['description']}")
            
            # Run prediction
            result = self.predict(test_case['input'])
            
            # Check if result matches expectation
            expected_anomaly = test_case['expected_is_anomaly']
            actual_anomaly = result['is_anomaly']
            
            passed = (expected_anomaly == actual_anomaly)
            test_results.append(passed)
            
            if passed:
                print(f"✅ PASS")
                print(f"   Expected: {test_case['expected_label']}")
                print(f"   Got: {result['verdict']}")
                print(f"   Confidence: {result.get('confidence', 'N/A')}")
            else:
                print(f"❌ FAIL")
                print(f"   Expected: {test_case['expected_label']} (anomaly={expected_anomaly})")
                print(f"   Got: {result['verdict']} (anomaly={actual_anomaly})")
                print(f"   Score: {result.get('score', 'N/A')}")
        
        print(f"\n{'='*60}")
        
        if all(test_results):
            print(f"[{self.engine_name}] ✅ HEALTH CHECK PASSED ({len(test_results)}/{len(test_results)})")
            return True
        else:
            passed = sum(test_results)
            total = len(test_results)
            print(f"[{self.engine_name}] ❌ HEALTH CHECK FAILED ({passed}/{total})")
            return False


# === Convenience Functions ===

def load_all_engines(base_path=None):
    """
    Load all 4 engines and run health checks.
    
    Returns:
        dict: Loaded ModelManager instances by engine name
    """
    engines = {}
    engine_names = ['ids_engine', 'traffic_engine', 'ueba_engine', 'artifact_engine']
    
    print("\n" + "="*70)
    print("  🚀 LOADING ALL ENGINES")
    print("="*70)
    
    for name in engine_names:
        try:
            manager = ModelManager(name, base_path)
            engines[name] = manager
        except Exception as e:
            print(f"[{name}] ❌ Failed to load: {e}\n")
    
    return engines


def run_system_health_check(engines):
    """
    Run health checks on all loaded engines.
    
    Args:
        engines: Dict of ModelManager instances
        
    Returns:
        bool: True if all engines pass
    """
    print("\n" + "="*70)
    print("  🏥 SYSTEM HEALTH CHECK")
    print("="*70)
    
    results = {}
    for name, manager in engines.items():
        results[name] = manager.run_health_check()
    
    print("\n" + "="*70)
    print("  📊 HEALTH CHECK SUMMARY")
    print("="*70 + "\n")
    
    for name, passed in results.items():
        status = "✅ HEALTHY" if passed else "❌ UNHEALTHY"
        print(f"{status}: {name}")
    
    passed_count = sum(results.values())
    total_count = len(results)
    
    print(f"\n{passed_count}/{total_count} engines healthy")
    
    if all(results.values()):
        print("\n🎉 SYSTEM IS FULLY OPERATIONAL!\n")
        return True
    else:
        print("\n⚠️  SYSTEM HAS ISSUES - Check failed engines\n")
        return False


# === Main Test ===
if __name__ == "__main__":
    # Load all engines
    engines = load_all_engines()
    
    # Run system health check
    if engines:
        run_system_health_check(engines)
    else:
        print("\n❌ No engines loaded - run standardize_models.py first\n")
