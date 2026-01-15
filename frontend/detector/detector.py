# detector/detector.py (ULTIMATE 5-ENGINE VERSION - Phase 1 Complete)
import requests
import json
import sys
import os
import joblib
import pandas as pd
import numpy as np
import tensorflow as tf
import logging
from typing import Optional, Dict, Any

# Import configuration and test data
from config import Config
from test_data import (NORMAL_FLOW, ANOMALY_FLOW, ATTACK_FLOW, BENIGN_FLOW,
                       NORMAL_USER, SUBTLE_INSIDER, OBVIOUS_ATTACKER)

# --- Setup Logging ---
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(Config.LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# --- Global Variables for Models ---
IDS_MODEL = None
IDS_MODEL_FEATURES = None
TRAFFIC_MODEL = None
TRAFFIC_SCALER = None
TRAFFIC_FEATURES = None
UEBA_MODEL = None
UEBA_SCALER = None
UEBA_FEATURES = ['avg_session_hours', 'after_hours_login_count', 'total_usb_connections', 
                 'total_email_volume', 'total_http_volume', 'total_files_accessed']
ARTIFACT_PIPELINE = None
ARTIFACT_FEATURES = None

# --- 1. Load All 5 Models ---
def load_models():
    """Load all 5 ML models at startup"""
    global IDS_MODEL, IDS_MODEL_FEATURES, TRAFFIC_MODEL, TRAFFIC_SCALER, TRAFFIC_FEATURES
    global UEBA_MODEL, UEBA_SCALER, ARTIFACT_PIPELINE, ARTIFACT_FEATURES
    
    print("\n" + "="*60)
    print("  INITIALIZING 5-ENGINE DETECTION SYSTEM")
    print("="*60 + "\n")
    
    # 1. Load IDS Model (RandomForest)
    try:
        IDS_MODEL = joblib.load(Config.IDS_MODEL_PATH)
        with open(Config.IDS_FEATURES_PATH, 'r') as f:
            IDS_MODEL_FEATURES = json.load(f)
        logger.info("[OK] IDS Engine (RandomForest) loaded successfully.")
        print(f"✅ [1/5] IDS Engine loaded ({len(IDS_MODEL_FEATURES)} features)")
    except Exception as e:
        logger.warning(f"⚠️ IDS Engine not found: {e}")
        print(f"⚠️ [1/5] IDS Engine not found")
    
    # 2. Load Traffic Engine (Autoencoder)
    try:
        TRAFFIC_MODEL = tf.keras.models.load_model(Config.TRAFFIC_MODEL_PATH)
        TRAFFIC_SCALER = joblib.load(Config.TRAFFIC_SCALER_PATH)
        with open(Config.TRAFFIC_FEATURES_PATH, 'r') as f:
            TRAFFIC_FEATURES = json.load(f)
        logger.info("[OK] Traffic Engine (Autoencoder) loaded successfully.")
        print(f"✅ [2/5] Traffic Engine loaded ({len(TRAFFIC_FEATURES)} features)")
    except Exception as e:
        logger.warning(f"⚠️ Traffic Engine not found: {e}")
        print(f"⚠️ [2/5] Traffic Engine not found")
    
    # 3. Load UEBA Engine (Autoencoder)
    try:
        UEBA_MODEL = tf.keras.models.load_model(Config.UEBA_MODEL_PATH)
        UEBA_SCALER = joblib.load(Config.UEBA_SCALER_PATH)
        logger.info("[OK] UEBA Engine (Autoencoder) loaded successfully.")
        print(f"✅ [3/5] UEBA Engine loaded ({len(UEBA_FEATURES)} features)")
    except Exception as e:
        logger.warning(f"⚠️ UEBA Engine not found: {e}")
        print(f"⚠️ [3/5] UEBA Engine not found")
    
    # 4. Load Artifact Engine (XGBoost Pipeline)
    try:
        ARTIFACT_PIPELINE = joblib.load(Config.ARTIFACT_PIPELINE_PATH)
        with open(Config.ARTIFACT_FEATURES_PATH, 'r') as f:
            ARTIFACT_FEATURES = json.load(f)
        logger.info("[OK] Artifact Engine (XGBoost) loaded successfully.")
        print(f"✅ [4/5] Artifact Engine loaded ({len(ARTIFACT_FEATURES)} features)")
    except Exception as e:
        logger.warning(f"⚠️ Artifact Engine not found: {e}")
        print(f"⚠️ [4/5] Artifact Engine not found")
    
    print(f"✅ [5/5] Threat Intelligence ready (API-based)")
    print("\n" + "="*60)
    print("  SYSTEM READY - All Engines Online")
    print("="*60 + "\n")

# --- 2. Threat Intelligence (API-based) ---
def query_ipqs(ip: str, api_key: Optional[str]) -> Optional[Dict[str, Any]]:
    """Query IPQualityScore API for IP reputation"""
    if not api_key:
        return None
    url = f"https://www.ipqualityscore.com/api/json/ip/{api_key}/{ip}"
    try:
        response = requests.get(url, timeout=Config.API_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        return data if data.get('success') else None
    except Exception:
        return None

def query_virustotal(ip: str, api_key: Optional[str]) -> Optional[Dict[str, Any]]:
    """Query VirusTotal API for IP reputation"""
    if not api_key:
        return None
    url = f"https://www.virustotal.com/api/v3/ip_addresses/{ip}"
    headers = {'x-apikey': api_key}
    try:
        response = requests.get(url, headers=headers, timeout=Config.API_TIMEOUT)
        response.raise_for_status()
        return response.json()
    except Exception:
        return None

def get_fused_threat_intelligence(ip: str, api_keys: Dict[str, str]) -> Optional[Dict[str, Any]]:
    """Query multiple threat intelligence sources and fuse results"""
    logger.info(f"--- Analyzing IP with Threat Intelligence: {ip} ---")
    print(f"\n{'='*60}")
    print(f"  THREAT INTELLIGENCE ANALYSIS: {ip}")
    print(f"{'='*60}")
    
    ipqs_data = query_ipqs(ip, api_keys.get('ipqs'))
    vt_data = query_virustotal(ip, api_keys.get('vt'))
    
    threat_score = 0
    details = {"ip_address": ip, "sources": [], "raw_data": {}}
    threat_indicators = []
    
    if ipqs_data:
        fraud_score = ipqs_data.get('fraud_score', 0)
        is_proxy = ipqs_data.get('proxy', False)
        is_vpn = ipqs_data.get('vpn', False)
        is_tor = ipqs_data.get('tor', False)
        
        details["raw_data"]["ipqs"] = {
            "fraud_score": fraud_score,
            "proxy": is_proxy,
            "vpn": is_vpn,
            "tor": is_tor
        }
        
        if fraud_score >= Config.IPQS_FRAUD_THRESHOLD:
            threat_score += fraud_score
            threat_indicators.append(f"IPQS Fraud Score: {fraud_score}/100")
            details["sources"].append("IPQualityScore")
        
        if is_proxy or is_vpn or is_tor:
            threat_indicators.append(f"Anonymization: Proxy={is_proxy}, VPN={is_vpn}, Tor={is_tor}")
    
    if vt_data:
        try:
            stats = vt_data.get('data', {}).get('attributes', {}).get('last_analysis_stats', {})
            malicious = stats.get('malicious', 0)
            suspicious = stats.get('suspicious', 0)
            
            details["raw_data"]["virustotal"] = {
                "malicious": malicious,
                "suspicious": suspicious
            }
            
            if malicious >= Config.VT_MALICIOUS_THRESHOLD:
                threat_score += malicious * 20
                threat_indicators.append(f"VirusTotal: {malicious} engines flagged malicious")
                details["sources"].append("VirusTotal")
        except Exception as e:
            logger.error(f"Error parsing VirusTotal data: {e}")
    
    details["threat_indicators"] = threat_indicators
    details["threat_score"] = threat_score
    
    if threat_score >= Config.IPQS_FRAUD_THRESHOLD:
        severity = "Critical" if threat_score > 150 else "High" if threat_score > 100 else "Medium"
        print(f"  🚨 MALICIOUS IP DETECTED!")
        print(f"  Threat Score: {threat_score}")
        print(f"  Severity: {severity}")
        print(f"  Indicators: {', '.join(threat_indicators)}")
        
        return {
            "engine": "Threat Intelligence",
            "severity": severity,
            "alertType": "Malicious IP Detected",
            "details": details
        }
    else:
        print(f"  ✅ IP appears benign (Score: {threat_score})")
        return None

# --- 3. IDS Engine (RandomForest) ---
def analyze_network_flow_ids(flow_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Analyze network flow using IDS RandomForest model"""
    if not IDS_MODEL or not IDS_MODEL_FEATURES:
        print("  ⚠️ IDS Engine not loaded.")
        return None
    
    print(f"\n{'='*60}")
    print(f"  IDS ENGINE ANALYSIS (RandomForest)")
    print(f"{'='*60}")
    
    try:
        flow_df = pd.DataFrame([flow_data]).reindex(columns=IDS_MODEL_FEATURES, fill_value=0)
        prediction = IDS_MODEL.predict(flow_df)
        probabilities = IDS_MODEL.predict_proba(flow_df)[0]
        
        print(f"  Prediction: {'ATTACK' if prediction[0] == 1 else 'BENIGN'}")
        print(f"  Confidence: Normal={probabilities[0]:.2%}, Attack={probabilities[1]:.2%}")
        
        if prediction[0] == 1:
            print(f"  🚨 NETWORK INTRUSION DETECTED!")
            return {
                "engine": "IDS",
                "severity": "High",
                "alertType": "Network Intrusion Detected",
                "details": {
                    **flow_data,
                    "confidence": float(probabilities[1]),
                    "attack_probability": float(probabilities[1])
                }
            }
        else:
            print(f"  ✅ Flow is benign")
            return None
    except Exception as e:
        logger.error(f"Error in IDS analysis: {e}")
        return None

# --- 4. Traffic Engine (Autoencoder) ---
def analyze_network_flow_traffic(flow_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Analyze network flow using Traffic Autoencoder model"""
    if not TRAFFIC_MODEL or not TRAFFIC_SCALER:
        print("  ⚠️ Traffic Engine not loaded.")
        return None
    
    print(f"\n{'='*60}")
    print(f"  TRAFFIC ENGINE ANALYSIS (Autoencoder)")
    print(f"{'='*60}")
    
    try:
        flow_df = pd.DataFrame([flow_data]).reindex(columns=TRAFFIC_FEATURES, fill_value=0)
        scaled_flow = TRAFFIC_SCALER.transform(flow_df)
        reconstruction = TRAFFIC_MODEL.predict(scaled_flow, verbose=0)
        error = np.mean(np.power(scaled_flow - reconstruction, 2))
        
        print(f"  Reconstruction Error: {error:.8f}")
        print(f"  Anomaly Threshold: {Config.ANOMALY_THRESHOLD:.8f}")
        print(f"  Separation: {error / Config.ANOMALY_THRESHOLD:.2f}x threshold")
        
        if error > Config.ANOMALY_THRESHOLD:
            print(f"  🚨 TRAFFIC ANOMALY DETECTED!")
            return {
                "engine": "Traffic Engine",
                "severity": "High" if error > Config.ANOMALY_THRESHOLD * 10 else "Medium",
                "alertType": "Anomalous Network Flow",
                "details": {
                    "reconstruction_error": float(error),
                    "anomaly_threshold": Config.ANOMALY_THRESHOLD,
                    "separation_ratio": float(error / Config.ANOMALY_THRESHOLD),
                    "flow_details": flow_data
                }
            }
        else:
            print(f"  ✅ Flow is normal")
            return None
    except Exception as e:
        logger.error(f"Error in Traffic Engine: {e}")
        return None

# --- 5. UEBA Engine (Autoencoder) ---
def analyze_user_behavior(user_profile_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Analyze user behavior using UEBA Autoencoder model"""
    if not UEBA_MODEL or not UEBA_SCALER:
        print("  ⚠️ UEBA Engine not loaded.")
        return None
    
    print(f"\n{'='*60}")
    print(f"  UEBA ENGINE ANALYSIS (Autoencoder)")
    print(f"{'='*60}")
    
    try:
        user_df = pd.DataFrame([user_profile_data]).reindex(columns=UEBA_FEATURES, fill_value=0)
        scaled_user = UEBA_SCALER.transform(user_df)
        reconstruction = UEBA_MODEL.predict(scaled_user, verbose=0)
        error = np.mean(np.power(scaled_user - reconstruction, 2))
        
        print(f"  User: {user_profile_data.get('user_id', 'Unknown')}")
        print(f"  Reconstruction Error: {error:.8f}")
        print(f"  Anomaly Threshold: {Config.UEBA_ANOMALY_THRESHOLD:.8f}")
        
        if error > Config.UEBA_ANOMALY_THRESHOLD:
            severity = "Critical" if error > Config.UEBA_ANOMALY_THRESHOLD * 2 else "High"
            print(f"  🚨 INSIDER THREAT DETECTED! (Severity: {severity})")
            
            # Feature contribution analysis
            feature_contributions = {}
            for i, feature in enumerate(UEBA_FEATURES):
                original = scaled_user[0][i]
                reconstructed = reconstruction[0][i]
                deviation = abs(original - reconstructed)
                feature_contributions[feature] = {
                    "original": float(original),
                    "reconstructed": float(reconstructed),
                    "deviation": float(deviation)
                }
            
            top_anomalies = sorted(feature_contributions.items(), 
                                  key=lambda x: x[1]['deviation'], reverse=True)[:3]
            
            print(f"  Top Anomalous Features:")
            for feature, stats in top_anomalies:
                print(f"    - {feature}: deviation={stats['deviation']:.4f}")
            
            return {
                "engine": "UEBA",
                "severity": severity,
                "alertType": "Insider Threat Detected",
                "details": {
                    "user_profile": user_profile_data,
                    "reconstruction_error": float(error),
                    "anomaly_threshold": Config.UEBA_ANOMALY_THRESHOLD,
                    "feature_contributions": feature_contributions,
                    "top_anomalous_features": [f[0] for f in top_anomalies]
                }
            }
        else:
            print(f"  ✅ User behavior is normal")
            return None
    except Exception as e:
        logger.error(f"Error in UEBA analysis: {e}")
        return None

# --- 6. Artifact Engine (XGBoost) - NEW! ---
def analyze_artifact(artifact_vector: np.ndarray, file_info: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
    """Analyze file artifact using XGBoost malware classifier"""
    if not ARTIFACT_PIPELINE:
        print("  ⚠️ Artifact Engine not loaded.")
        return None
    
    print(f"\n{'='*60}")
    print(f"  ARTIFACT ENGINE ANALYSIS (XGBoost)")
    print(f"{'='*60}")
    
    try:
        # Ensure vector is 2D
        if artifact_vector.ndim == 1:
            artifact_vector = artifact_vector.reshape(1, -1)
        
        # Pipeline handles scaling automatically
        prediction = ARTIFACT_PIPELINE.predict(artifact_vector)
        probabilities = ARTIFACT_PIPELINE.predict_proba(artifact_vector)[0]
        
        result = int(prediction[0])
        benign_prob = probabilities[0]
        malware_prob = probabilities[1]
        
        print(f"  Prediction: {'MALWARE' if result == 1 else 'BENIGN'}")
        print(f"  Confidence: Benign={benign_prob:.2%}, Malware={malware_prob:.2%}")
        
        if result == 1:
            severity = "Critical" if malware_prob > 0.95 else "High"
            print(f"  🚨 MALWARE DETECTED! (Severity: {severity})")
            
            details = {
                "verdict": "Malware",
                "confidence": float(malware_prob),
                "benign_probability": float(benign_prob),
                "malware_probability": float(malware_prob),
                "feature_count": len(ARTIFACT_FEATURES)
            }
            
            if file_info:
                details.update(file_info)
            
            return {
                "engine": "Artifact Engine",
                "severity": severity,
                "alertType": "Malicious File Detected",
                "details": details
            }
        else:
            print(f"  ✅ File is benign")
            return None
    except Exception as e:
        logger.error(f"Error in Artifact Engine: {e}")
        return None

# --- 7. Alert Sending ---
def send_alert(payload: Dict[str, Any], retry_count: int = 0):
    """Send alert to backend API with retry logic"""
    try:
        response = requests.post(Config.BACKEND_API_URL, json=payload, timeout=Config.API_TIMEOUT)
        response.raise_for_status()
        print(f"\n{'='*60}")
        print(f"  ✅ ALERT SENT TO DASHBOARD")
        print(f"{'='*60}\n")
        return True
    except Exception as e:
        if retry_count < Config.MAX_RETRIES:
            return send_alert(payload, retry_count + 1)
        else:
            print(f"\n❌ Failed to send alert: {e}\n")
            return False

# --- 8. Main Execution ---
if __name__ == "__main__":
    load_models()
    
    if len(sys.argv) < 3:
        print("\nUsage: python detector.py <mode> <indicator>")
        print("\nAvailable Modes:")
        print("  traffic <anomaly|normal>     - Traffic Engine test")
        print("  ids <attack|benign>          - IDS Engine test")
        print("  ueba <normal|subtle|obvious> - UEBA Engine test")
        print("  artifact <benign|malware>    - Artifact Engine test")
        print("  threatintel <IP_ADDRESS>     - Threat Intelligence test")
        sys.exit(1)
    
    mode = sys.argv[1]
    indicator = sys.argv[2]
    final_alert = None
    
    if mode == "traffic":
        flow = ANOMALY_FLOW if indicator == "anomaly" else NORMAL_FLOW
        print(f"\nTesting TRAFFIC ENGINE with {indicator.upper()} flow...")
        final_alert = analyze_network_flow_traffic(flow)
    
    elif mode == "ids":
        flow = ATTACK_FLOW if indicator == "attack" else BENIGN_FLOW
        print(f"\nTesting IDS ENGINE with {indicator.upper()} flow...")
        final_alert = analyze_network_flow_ids(flow)
    
    elif mode == "ueba":
        users = {"normal": NORMAL_USER, "subtle": SUBTLE_INSIDER, "obvious": OBVIOUS_ATTACKER}
        user = users.get(indicator, NORMAL_USER)
        print(f"\nTesting UEBA ENGINE with {indicator.upper()} user...")
        final_alert = analyze_user_behavior(user)
    
    elif mode == "artifact":
        if indicator == "benign":
            vector_path = "real_benign_vector.txt"
            file_info = {"filename": "legitimate_app.exe", "size": "1.2 MB", "hash": "ABC123..."}
        else:
            vector_path = "real_malware_vector.txt"
            file_info = {"filename": "suspicious.exe", "size": "850 KB", "hash": "DEF456..."}
        
        try:
            vector = np.loadtxt(vector_path).reshape(1, -1)
            print(f"\nTesting ARTIFACT ENGINE with {indicator.upper()} file...")
            final_alert = analyze_artifact(vector, file_info)
        except Exception as e:
            print(f"❌ Could not load artifact vector: {e}")
    
    elif mode == "threatintel":
        api_keys = {"ipqs": Config.IPQS_API_KEY, "vt": Config.VIRUSTOTAL_API_KEY}
        print(f"\nTesting THREAT INTELLIGENCE with IP: {indicator}...")
        final_alert = get_fused_threat_intelligence(indicator, api_keys)
    
    else:
        print(f"Unknown mode: {mode}")
        sys.exit(1)
    
    if final_alert:
        send_alert(final_alert)
    else:
        print(f"\n{'='*60}")
        print(f"  ✅ NO THREATS DETECTED - All Clear")
        print(f"{'='*60}\n")
