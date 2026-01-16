# detector.py - 5-Engine Security Detector with ModelManager
# Place in: detector/detector.py

import requests
import json
import sys
import os
import logging
from pathlib import Path
from typing import Optional, Dict

# Import our professional ModelManager
from model_manager import ModelManager, load_all_engines, run_system_health_check

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("detector.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# === CONFIGURATION ===
class Config:
    BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:5000/api/alerts")
    IPQS_API_KEY = os.getenv("IPQS_API_KEY")
    VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")
    
    # API Settings
    IPQS_FRAUD_THRESHOLD = 75
    VT_MALICIOUS_THRESHOLD = 1
    API_TIMEOUT = 5
    MAX_RETRIES = 3

# === GLOBAL ENGINE INSTANCES ===
print("\n" + "="*70)
print("  🚀 INITIALIZING 5-ENGINE DETECTION SYSTEM")
print("="*70)

# Load all engines using ModelManager
ENGINES = load_all_engines()

# Run health checks on startup
if ENGINES:
    print("\n" + "="*70)
    print("  🏥 RUNNING STARTUP HEALTH CHECKS")
    print("="*70)
    
    system_healthy = run_system_health_check(ENGINES)
    
    if system_healthy:
        print("\n" + "="*70)
        print("  ✅ SYSTEM READY FOR DETECTION")
        print("="*70 + "\n")
    else:
        print("\n" + "="*70)
        print("  ⚠️  SYSTEM STARTED WITH WARNINGS")
        print("="*70 + "\n")
else:
    print("\n❌ NO ENGINES LOADED - Check production_models/ directory\n")
    sys.exit(1)

# === TEST DATA ===
# Traffic Engine Test Data
NORMAL_FLOW = {
    'Protocol': 6.0,
    'FlowDuration': 11.0,
    'TotalFwdPackets': 1.0,
    'TotalBackwardPackets': 1.0
}

ANOMALY_FLOW = {
    'Protocol': 6.0,
    'FlowDuration': 27169.0,
    'TotalFwdPackets': 4.0,
    'TotalBackwardPackets': 2.0,
    'FlowBytess': 427950.97,
    'AvgPacketSize': 1937.83
}

# UEBA Test Data
NORMAL_USER = {
    'user_id': 'USR001',
    'avg_session_hours': 8.5,
    'after_hours_login_count': 5,
    'total_usb_connections': 2,
    'total_email_volume': 1.5e8,
    'total_http_volume': 5e6,
    'total_files_accessed': 200
}

OBVIOUS_ATTACKER = {
    'user_id': 'USR666',
    'avg_session_hours': 2.1,
    'after_hours_login_count': 150,
    'total_usb_connections': 85,
    'total_email_volume': 1e7,
    'total_http_volume': 5e8,
    'total_files_accessed': 13000
}

# === THREAT INTELLIGENCE ===
def query_ipqs(ip: str, api_key: Optional[str]) -> Optional[Dict]:
    """Query IPQualityScore API"""
    if not api_key:
        return None
    
    url = f"https://www.ipqualityscore.com/api/json/ip/{api_key}/{ip}"
    try:
        response = requests.get(url, timeout=Config.API_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        return data if data.get('success') else None
    except Exception as e:
        logger.error(f"IPQS query failed: {e}")
        return None

def query_virustotal(ip: str, api_key: Optional[str]) -> Optional[Dict]:
    """Query VirusTotal API"""
    if not api_key:
        return None
    
    url = f"https://www.virustotal.com/api/v3/ip_addresses/{ip}"
    headers = {'x-apikey': api_key}
    try:
        response = requests.get(url, headers=headers, timeout=Config.API_TIMEOUT)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"VirusTotal query failed: {e}")
        return None

def analyze_threat_intelligence(ip: str) -> Optional[Dict]:
    """Analyze IP using threat intelligence sources"""
    print(f"\n{'='*70}")
    print(f"  🔍 THREAT INTELLIGENCE: {ip}")
    print(f"{'='*70}\n")
    
    ipqs_data = query_ipqs(ip, Config.IPQS_API_KEY)
    vt_data = query_virustotal(ip, Config.VIRUSTOTAL_API_KEY)
    
    threat_score = 0
    details = {"ip_address": ip, "sources": [], "raw_data": {}}
    threat_indicators = []
    
    # Analyze IPQS data
    if ipqs_data:
        fraud_score = ipqs_data.get('fraud_score', 0)
        if fraud_score >= Config.IPQS_FRAUD_THRESHOLD:
            threat_score += fraud_score
            threat_indicators.append(f"IPQS Fraud Score: {fraud_score}/100")
            details["sources"].append("IPQualityScore")
        details["raw_data"]["ipqs"] = {"fraud_score": fraud_score}
    
    # Analyze VirusTotal data
    if vt_data:
        try:
            stats = vt_data.get('data', {}).get('attributes', {}).get('last_analysis_stats', {})
            malicious = stats.get('malicious', 0)
            if malicious >= Config.VT_MALICIOUS_THRESHOLD:
                threat_score += malicious * 20
                threat_indicators.append(f"VirusTotal: {malicious} engines flagged")
                details["sources"].append("VirusTotal")
        except Exception as e:
            logger.warning(f"Could not parse VirusTotal data: {e}")
    
    details["threat_score"] = threat_score
    details["threat_indicators"] = threat_indicators
    
    # Determine if threat
    if threat_score >= Config.IPQS_FRAUD_THRESHOLD:
        severity = "Critical" if threat_score > 150 else "High" if threat_score > 100 else "Medium"
        print(f"🚨 MALICIOUS IP DETECTED!")
        print(f"Threat Score: {threat_score}")
        print(f"Severity: {severity}")
        print(f"Indicators: {', '.join(threat_indicators)}\n")
        
        return {
            "engine": "Threat Intelligence",
            "severity": severity,
            "alertType": "Malicious IP Detected",
            "details": details
        }
    else:
        print(f"✅ IP appears benign (Score: {threat_score})\n")
        return None

# === IDS ENGINE ===
def analyze_ids(flow_data: Dict) -> Optional[Dict]:
    """Analyze network flow using IDS engine"""
    if 'ids_engine' not in ENGINES:
        print("⚠️  IDS Engine not available")
        return None
    
    print(f"\n{'='*70}")
    print(f"  🛡️  IDS ENGINE (RandomForest)")
    print(f"{'='*70}\n")
    
    try:
        manager = ENGINES['ids_engine']
        result = manager.predict(flow_data)
        
        print(f"Verdict: {result['verdict']}")
        print(f"Confidence: {result.get('confidence', 0):.2%}")
        print(f"Is Anomaly: {result['is_anomaly']}\n")
        
        if result['is_anomaly']:
            print(f"🚨 NETWORK INTRUSION DETECTED!\n")
            return {
                "engine": "IDS",
                "severity": "High",
                "alertType": "Network Intrusion Detected",
                "details": {
                    "flow_data": flow_data,
                    "verdict": result['verdict'],
                    "confidence": result.get('confidence', 0),
                    "score": result.get('score', 0)
                }
            }
        else:
            print(f"✅ Flow is benign\n")
            return None
            
    except Exception as e:
        logger.error(f"IDS Engine error: {e}")
        return None

# === TRAFFIC ENGINE ===
def analyze_traffic(flow_data: Dict) -> Optional[Dict]:
    """Analyze network flow using Traffic engine (Autoencoder)"""
    if 'traffic_engine' not in ENGINES:
        print("⚠️  Traffic Engine not available")
        return None
    
    print(f"\n{'='*70}")
    print(f"  📊 TRAFFIC ENGINE (Autoencoder)")
    print(f"{'='*70}\n")
    
    try:
        manager = ENGINES['traffic_engine']
        result = manager.predict(flow_data)
        
        print(f"Reconstruction Error: {result['score']:.8f}")
        print(f"Threshold: {result['threshold']:.8f}")
        print(f"Confidence: {result.get('confidence', 0):.2f}x\n")
        
        if result['is_anomaly']:
            print(f"🚨 TRAFFIC ANOMALY DETECTED!\n")
            severity = "High" if result['score'] > result['threshold'] * 10 else "Medium"
            
            return {
                "engine": "Traffic Engine",
                "severity": severity,
                "alertType": "Anomalous Network Flow",
                "details": {
                    "reconstruction_error": result['score'],
                    "anomaly_threshold": result['threshold'],
                    "separation_ratio": result.get('confidence', 0),
                    "verdict": result['verdict'],
                    "flow_details": flow_data
                }
            }
        else:
            print(f"✅ Flow is normal\n")
            return None
            
    except Exception as e:
        logger.error(f"Traffic Engine error: {e}")
        return None

# === UEBA ENGINE ===
def analyze_ueba(user_profile: Dict) -> Optional[Dict]:
    """Analyze user behavior using UEBA engine"""
    if 'ueba_engine' not in ENGINES:
        print("⚠️  UEBA Engine not available")
        return None
    
    print(f"\n{'='*70}")
    print(f"  👤 UEBA ENGINE (Autoencoder)")
    print(f"{'='*70}\n")
    
    try:
        manager = ENGINES['ueba_engine']
        result = manager.predict(user_profile)
        
        print(f"User: {user_profile.get('user_id', 'Unknown')}")
        print(f"Reconstruction Error: {result['score']:.8f}")
        print(f"Threshold: {result['threshold']:.8f}")
        print(f"Verdict: {result['verdict']}\n")
        
        if result['is_anomaly']:
            severity = "Critical" if result['score'] > result['threshold'] * 2 else "High"
            print(f"🚨 INSIDER THREAT DETECTED! (Severity: {severity})\n")
            
            return {
                "engine": "UEBA",
                "severity": severity,
                "alertType": "Insider Threat Detected",
                "details": {
                    "user_profile": user_profile,
                    "reconstruction_error": result['score'],
                    "anomaly_threshold": result['threshold'],
                    "verdict": result['verdict'],
                    "confidence": result.get('confidence', 0)
                }
            }
        else:
            print(f"✅ User behavior is normal\n")
            return None
            
    except Exception as e:
        logger.error(f"UEBA Engine error: {e}")
        return None

# === ARTIFACT ENGINE ===
def analyze_artifact(file_info: Dict = None) -> Optional[Dict]:
    """Analyze file using Artifact engine (uses reference data for testing)"""
    if 'artifact_engine' not in ENGINES:
        print("⚠️  Artifact Engine not available")
        return None
    
    print(f"\n{'='*70}")
    print(f"  🦠 ARTIFACT ENGINE (XGBoost)")
    print(f"{'='*70}\n")
    
    try:
        manager = ENGINES['artifact_engine']
        
        # For testing, use reference data
        # In real use, you'd load actual file features
        test_case = "attack" if file_info and file_info.get('is_test_malware') else "benign"
        test_input = manager.reference['test_cases'][test_case]['input']
        
        result = manager.predict(test_input)
        
        filename = file_info.get('filename', 'unknown.exe') if file_info else 'test_file.exe'
        
        print(f"File: {filename}")
        print(f"Verdict: {result['verdict']}")
        print(f"Confidence: {result.get('confidence', 0):.2%}\n")
        
        if result['is_anomaly']:
            severity = "Critical" if result.get('confidence', 0) > 0.95 else "High"
            print(f"🚨 MALWARE DETECTED! (Severity: {severity})\n")
            
            details = {
                "verdict": result['verdict'],
                "confidence": result.get('confidence', 0),
                "malware_probability": result.get('confidence', 0),
                "score": result.get('score', 0)
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
            print(f"✅ File is benign\n")
            return None
            
    except Exception as e:
        logger.error(f"Artifact Engine error: {e}")
        return None

# === SEND ALERT ===
def send_alert(payload: Dict, retry_count: int = 0) -> bool:
    """Send alert to backend dashboard"""
    try:
        response = requests.post(
            Config.BACKEND_API_URL,
            json=payload,
            timeout=Config.API_TIMEOUT
        )
        response.raise_for_status()
        
        print(f"{'='*70}")
        print(f"  ✅ ALERT SENT TO DASHBOARD")
        print(f"{'='*70}\n")
        return True
        
    except Exception as e:
        if retry_count < Config.MAX_RETRIES:
            logger.warning(f"Alert send failed, retrying... ({retry_count + 1}/{Config.MAX_RETRIES})")
            return send_alert(payload, retry_count + 1)
        else:
            logger.error(f"Failed to send alert after {Config.MAX_RETRIES} attempts: {e}")
            print(f"❌ Failed to send alert to dashboard\n")
            return False

# === MAIN ===
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("\n" + "="*70)
        print("  USAGE")
        print("="*70)
        print("\npython detector.py <mode> <indicator>\n")
        print("Modes:")
        print("  traffic <anomaly|normal>     - Test Traffic Engine")
        print("  ids <attack|benign>          - Test IDS Engine")
        print("  ueba <normal|obvious>        - Test UEBA Engine")
        print("  artifact <benign|malware>    - Test Artifact Engine")
        print("  threatintel <IP_ADDRESS>     - Test Threat Intelligence")
        print("\nExamples:")
        print("  python detector.py traffic anomaly")
        print("  python detector.py ueba obvious")
        print("  python detector.py artifact malware")
        print("  python detector.py threatintel 8.8.8.8")
        print()
        sys.exit(1)
    
    mode = sys.argv[1].lower()
    indicator = sys.argv[2].lower()
    alert = None
    
    # Route to appropriate engine
    if mode == "traffic":
        flow = ANOMALY_FLOW if indicator == "anomaly" else NORMAL_FLOW
        alert = analyze_traffic(flow)
    
    elif mode == "ids":
        # Use reference data for testing
        if 'ids_engine' in ENGINES:
            manager = ENGINES['ids_engine']
            test_case = "attack" if indicator == "attack" else "benign"
            test_input = manager.reference['test_cases'][test_case]['input']
            alert = analyze_ids(test_input)
        else:
            print("❌ IDS Engine not available")
    
    elif mode == "ueba":
        user = OBVIOUS_ATTACKER if indicator == "obvious" else NORMAL_USER
        alert = analyze_ueba(user)
    
    elif mode == "artifact":
        file_info = {
            "filename": "suspicious.exe" if indicator == "malware" else "legitimate_app.exe",
            "size": "850 KB" if indicator == "malware" else "1.2 MB",
            "is_test_malware": indicator == "malware"
        }
        alert = analyze_artifact(file_info)
    
    elif mode == "threatintel":
        ip_address = indicator
        alert = analyze_threat_intelligence(ip_address)
    
    else:
        print(f"❌ Unknown mode: {mode}")
        print("   Valid modes: traffic, ids, ueba, artifact, threatintel")
        sys.exit(1)
    
    # Send alert if detected
    if alert:
        send_alert(alert)
    else:
        print(f"{'='*70}")
        print(f"  ✅ NO THREATS DETECTED")
        print(f"{'='*70}\n")
