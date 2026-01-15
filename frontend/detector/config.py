# config.py (Enhanced Version with 4 Engines)
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuration management for the 4-engine detector system"""
    
    # Backend API Configuration
    BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:5000/api/alerts")
    
    # API Keys (Threat Intelligence)
    IPQS_API_KEY = os.getenv("IPQS_API_KEY")
    VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")
    
    # === MODEL PATHS (Organized Structure) ===
    
    # IDS Engine
    IDS_MODEL_PATH = os.getenv("IDS_MODEL_PATH", "models/ids/ids_randomforest_final.joblib")
    IDS_FEATURES_PATH = os.getenv("IDS_FEATURES_PATH", "models/ids/ids_model_features.json")
    
    # Traffic Engine
    TRAFFIC_MODEL_PATH = os.getenv("TRAFFIC_MODEL_PATH", "models/traffic/traffic_engine_autoencoder_final.h5")
    TRAFFIC_SCALER_PATH = os.getenv("TRAFFIC_SCALER_PATH", "models/traffic/traffic_engine_scaler_final.joblib")
    TRAFFIC_FEATURES_PATH = os.getenv("TRAFFIC_FEATURES_PATH", "models/traffic/traffic_engine_features.json")
    
    # UEBA Engine
    UEBA_MODEL_PATH = os.getenv("UEBA_MODEL_PATH", "models/ueba/insider_threat_model.h5")
    UEBA_SCALER_PATH = os.getenv("UEBA_SCALER_PATH", "models/ueba/ueba_scaler.joblib")
    UEBA_FEATURES_PATH = os.getenv("UEBA_FEATURES_PATH", "models/ueba/ueba_engine_features.json")
    
    # Artifact Engine (NEW)
    ARTIFACT_PIPELINE_PATH = os.getenv("ARTIFACT_PIPELINE_PATH", "models/artifact/artifact_engine_xgb_pipeline.joblib")
    ARTIFACT_FEATURES_PATH = os.getenv("ARTIFACT_FEATURES_PATH", "models/artifact/artifact_engine_features.json")
    
    # === DETECTION THRESHOLDS ===
    
    # Traffic Engine
    ANOMALY_THRESHOLD = float(os.getenv("ANOMALY_THRESHOLD", "0.00076731"))
    
    # UEBA Engine (3-Tier System)
    UEBA_SUSPICIOUS_THRESHOLD = float(os.getenv("UEBA_SUSPICIOUS_THRESHOLD", "0.005000"))
    UEBA_CRITICAL_THRESHOLD = float(os.getenv("UEBA_CRITICAL_THRESHOLD", "0.020000"))
    UEBA_ANOMALY_THRESHOLD = float(os.getenv("UEBA_ANOMALY_THRESHOLD", "0.10"))  # Backward compatibility
    
    # Threat Intelligence
    IPQS_FRAUD_THRESHOLD = int(os.getenv("IPQS_FRAUD_THRESHOLD", "75"))
    VT_MALICIOUS_THRESHOLD = int(os.getenv("VT_MALICIOUS_THRESHOLD", "1"))
    
    # === API SETTINGS ===
    API_TIMEOUT = int(os.getenv("API_TIMEOUT", "5"))
    MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
    
    # === LOGGING ===
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "detector.log")
    
    # === TEST DATA PATHS ===
    TEST_DATA_DIR = os.getenv("TEST_DATA_DIR", "tests/data")
    
    # IDS Test Vectors
    IDS_BENIGN_VECTOR = os.path.join(TEST_DATA_DIR, "ids_benign_vector.txt")
    IDS_ATTACK_VECTOR = os.path.join(TEST_DATA_DIR, "ids_attack_vector.txt")
    
    # Traffic Test Vectors
    TRAFFIC_BENIGN_VECTOR = os.path.join(TEST_DATA_DIR, "traffic_benign_vector.txt")
    TRAFFIC_ATTACK_VECTOR = os.path.join(TEST_DATA_DIR, "traffic_attack_vector.txt")
    
    # UEBA Test Vectors
    UEBA_NORMAL_VECTOR = os.path.join(TEST_DATA_DIR, "ueba_normal_vector.txt")
    UEBA_ANOMALY_VECTOR = os.path.join(TEST_DATA_DIR, "ueba_anomaly_vector.txt")
    
    # Artifact Test Vectors
    ARTIFACT_BENIGN_VECTOR = os.path.join(TEST_DATA_DIR, "real_benign_vector.txt")
    ARTIFACT_MALWARE_VECTOR = os.path.join(TEST_DATA_DIR, "real_malware_vector.txt")
