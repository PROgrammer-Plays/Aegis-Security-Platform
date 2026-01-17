# detector.py - 5-Engine Security Detector with Correlation Brain
# Place in: detector/detector.py

import requests
import json
import sys
import os
import logging
from pathlib import Path
from typing import Optional, Dict

# Import ModelManager and CorrelationBrain
from model_manager import ModelManager, load_all_engines, run_system_health_check
from correlation_engine import CorrelationBrain

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
    
    # Correlation settings
    CORRELATION_THRESHOLD = int(os.getenv("CORRELATION_THRESHOLD", "60"))
    CORRELATION_TIME_WINDOW = int(os.getenv("CORRELATION_TIME_WINDOW", "900"))  # 15 min
    
    # API Settings
    IPQS_FRAUD_THRESHOLD = 75
    VT_MALICIOUS_THRESHOLD = 1
    API_TIMEOUT = 5
    MAX_RETRIES = 3

# === INITIALIZATION ===
print("\n" + "="*70)
print("  🚀 INITIALIZING AEGIS SECURITY PLATFORM")
print("="*70)

# Load all engines using ModelManager
print("\n[1/3] Loading ML Engines...")
ENGINES = load_all_engines()

# Run health checks
print("\n[2/3] Running Health Checks...")
if ENGINES:
    system_healthy = run_system_health_check(ENGINES)
else:
    print("\n❌ NO ENGINES LOADED")
    sys.exit(1)

# Initialize Correlation Brain
print("\n[3/3] Initializing Correlation Brain...")
BRAIN = CorrelationBrain(
    threshold=Config.CORRELATION_THRESHOLD,
    time_window=Config.CORRELATION_TIME_WINDOW
)

print("\n" + "="*70)
print("  ✅ AEGIS PLATFORM READY")
print("="*70 + "\n")

# === TEST DATA ===
NORMAL_FLOW = {'Protocol': 6.0, 'FlowDuration': 11.0, 'TotalFwdPackets': 1.0}
ANOMALY_FLOW = {'Protocol': 6.0, 'FlowDuration': 27169.0, 'FlowBytess': 427950.97, 
                'TotalFwdPackets': 4.0, 'TotalBackwardPackets': 2.0, 'SourceIP': '192.168.1.100'}

NORMAL_USER = {'user_id': 'USR001', 'avg_session_hours': 8.5, 'after_hours_login_count': 5,
               'total_usb_connections': 2, 'total_email_volume': 1.5e8, 
               'total_http_volume': 5e6, 'total_files_accessed': 200}

OBVIOUS_ATTACKER = {'user_id': 'USR666', 'avg_session_hours': 2.1, 'after_hours_login_count': 150,
                    'total_usb_connections': 85, 'total_email_volume': 1e7, 
                    'total_http_volume': 5e8, 'total_files_accessed': 13000}

# === THREAT INTELLIGENCE ===
def query_ipqs(ip: str, api_key: Optional[str]) -> Optional[Dict]:
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
    print(f"\n{'='*70}")
    print(f"  🔍 THREAT INTELLIGENCE: {ip}")
    print(f"{'='*70}\n")
    
    ipqs_data = query_ipqs(ip, Config.IPQS_API_KEY)
    vt_data = query_virustotal(ip, Config.VIRUSTOTAL_API_KEY)
    
    threat_score = 0
    details = {"ip_address": ip, "sources": [], "raw_data": {}}
    threat_indicators = []
    
    if ipqs_data:
        fraud_score = ipqs_data.get('fraud_score', 0)
        if fraud_score >= Config.IPQS_FRAUD_THRESHOLD:
            threat_score += fraud_score
            threat_indicators.append(f"IPQS Fraud Score: {fraud_score}/100")
            details["sources"].append("IPQualityScore")
        details["raw_data"]["ipqs"] = {"fraud_score": fraud_score}
    
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
    
    if threat_score >= Config.IPQS_FRAUD_THRESHOLD:
        severity = "Critical" if threat_score > 150 else "High" if threat_score > 100 else "Medium"
        print(f"🚨 MALICIOUS IP DETECTED!")
        print(f"Severity: {severity}\n")
        
        return {
            "engine": "Threat Intelligence",
            "severity": severity,
            "alertType": "Malicious IP Detected",
            "details": details
        }
    else:
        print(f"✅ IP appears benign\n")
        return None

# === ENGINE ANALYZERS ===
def analyze_ids(flow_data: Dict) -> Optional[Dict]:
    if 'ids_engine' not in ENGINES:
        return None
    
    print(f"\n{'='*70}")
    print(f"  🛡️  IDS ENGINE")
    print(f"{'='*70}\n")
    
    try:
        result = ENGINES['ids_engine'].predict(flow_data)
        print(f"Verdict: {result['verdict']}\n")
        
        if result['is_anomaly']:
            print(f"🚨 INTRUSION DETECTED!\n")
            return {
                "engine": "IDS",
                "severity": "High",
                "alertType": "Network Intrusion Detected",
                "details": {
                    "flow_data": flow_data,
                    "verdict": result['verdict'],
                    "confidence": result.get('confidence', 0)
                }
            }
        else:
            print(f"✅ Benign\n")
            return None
    except Exception as e:
        logger.error(f"IDS error: {e}")
        return None

def analyze_traffic(flow_data: Dict) -> Optional[Dict]:
    if 'traffic_engine' not in ENGINES:
        return None
    
    print(f"\n{'='*70}")
    print(f"  📊 TRAFFIC ENGINE")
    print(f"{'='*70}\n")
    
    try:
        result = ENGINES['traffic_engine'].predict(flow_data)
        print(f"Error: {result['score']:.8f}\n")
        
        if result['is_anomaly']:
            print(f"🚨 ANOMALY DETECTED!\n")
            return {
                "engine": "Traffic Engine",
                "severity": "Medium",
                "alertType": "Anomalous Network Flow",
                "details": {
                    "reconstruction_error": result['score'],
                    "verdict": result['verdict'],
                    "source_ip": flow_data.get('SourceIP'),
                    "flow_data": flow_data
                }
            }
        else:
            print(f"✅ Normal\n")
            return None
    except Exception as e:
        logger.error(f"Traffic error: {e}")
        return None

def analyze_ueba(user_profile: Dict) -> Optional[Dict]:
    if 'ueba_engine' not in ENGINES:
        return None
    
    print(f"\n{'='*70}")
    print(f"  👤 UEBA ENGINE")
    print(f"{'='*70}\n")
    
    try:
        result = ENGINES['ueba_engine'].predict(user_profile)
        print(f"User: {user_profile.get('user_id')}")
        print(f"Verdict: {result['verdict']}\n")
        
        if result['is_anomaly']:
            print(f"🚨 INSIDER THREAT!\n")
            return {
                "engine": "UEBA",
                "severity": "Critical",
                "alertType": "Insider Threat Detected",
                "details": {
                    "user_profile": user_profile,
                    "verdict": result['verdict'],
                    "reconstruction_error": result['score']
                }
            }
        else:
            print(f"✅ Normal\n")
            return None
    except Exception as e:
        logger.error(f"UEBA error: {e}")
        return None

def analyze_artifact(file_info: Dict = None) -> Optional[Dict]:
    if 'artifact_engine' not in ENGINES:
        return None
    
    print(f"\n{'='*70}")
    print(f"  🦠 ARTIFACT ENGINE")
    print(f"{'='*70}\n")
    
    try:
        manager = ENGINES['artifact_engine']
        test_case = "attack" if file_info and file_info.get('is_test_malware') else "benign"
        test_input = manager.reference['test_cases'][test_case]['input']
        
        result = manager.predict(test_input)
        print(f"Verdict: {result['verdict']}\n")
        
        if result['is_anomaly']:
            print(f"🚨 MALWARE DETECTED!\n")
            
            details = {
                "verdict": result['verdict'],
                "confidence": result.get('confidence', 0),
                "source_ip": file_info.get('source_ip') if file_info else None
            }
            if file_info:
                details.update(file_info)
            
            return {
                "engine": "Artifact Engine",
                "severity": "Critical",
                "alertType": "Malicious File Detected",
                "details": details
            }
        else:
            print(f"✅ Benign\n")
            return None
    except Exception as e:
        logger.error(f"Artifact error: {e}")
        return None

# === CENTRAL ALERT PROCESSOR ===
def process_and_send(alert: Optional[Dict]):
    """
    Process alert through correlation brain and send to dashboard.
    
    This is the KEY integration point:
    1. Send individual alert to dashboard
    2. Feed alert into correlation brain
    3. If brain detects incident, send that too
    """
    if not alert:
        return
    
    # 1. Send individual alert
    print(f"[ALERT] Sending {alert['engine']} alert to dashboard...")
    try:
        response = requests.post(Config.BACKEND_API_URL, json=alert, timeout=Config.API_TIMEOUT)
        response.raise_for_status()
        print(f"   ✅ Alert sent\n")
    except Exception as e:
        logger.error(f"Failed to send alert: {e}")
        print(f"   ❌ Failed to send alert\n")
    
    # 2. Feed into correlation brain
    incident = BRAIN.ingest_alert(alert)
    
    # 3. If incident detected, send it!
    if incident:
        print(f"{'='*70}")
        print(f"🧠 [CORRELATION BRAIN] INCIDENT DETECTED!")
        print(f"{'='*70}")
        print(f"Type: {incident['alertType']}")
        print(f"Target: {incident['details']['target_entity']}")
        print(f"Risk Score: {incident['details']['risk_score']}")
        print(f"Engines: {', '.join(incident['details']['engines_involved'])}")
        print(f"{'='*70}\n")
        
        try:
            response = requests.post(Config.BACKEND_API_URL, json=incident, timeout=Config.API_TIMEOUT)
            response.raise_for_status()
            print(f"   ✅ Incident sent to dashboard\n")
        except Exception as e:
            logger.error(f"Failed to send incident: {e}")
            print(f"   ❌ Failed to send incident\n")

# === MAIN ===
if __name__ == "__main__":
    # Check for simulation mode
    if len(sys.argv) > 1 and sys.argv[1] == "simulation":
        print("\n" + "="*70)
        print("  🎭 RUNNING ATTACK SIMULATION")
        print("="*70)
        print("\nScenario: APT Attack Chain")
        print("1. Malware downloaded")
        print("2. C2 communication starts")
        print("3. Connection to known threat actor IP")
        print()
        
        target_ip = "192.168.1.100"
        
        # Step 1: Artifact detection
        print("Step 1: Malware Downloaded...")
        alert1 = analyze_artifact({'filename': 'invoice.exe', 'source_ip': target_ip, 'is_test_malware': True})
        if alert1:
            process_and_send(alert1)
        
        import time
        time.sleep(1)
        
        # Step 2: Traffic anomaly
        print("Step 2: C2 Beaconing Detected...")
        flow_with_ip = ANOMALY_FLOW.copy()
        flow_with_ip['SourceIP'] = target_ip
        alert2 = analyze_traffic(flow_with_ip)
        if alert2:
            process_and_send(alert2)
        
        time.sleep(1)
        
        # Step 3: Threat intelligence
        print("Step 3: Threat Intelligence Hit...")
        alert3 = {
            "engine": "Threat Intelligence",
            "severity": "High",
            "alertType": "Connection to C2 Server",
            "details": {
                "source_ip": target_ip,
                "destination_ip": "45.14.225.242",
                "threat_score": 95
            }
        }
        process_and_send(alert3)
        
        # Print statistics
        print("\n" + "="*70)
        print("  📊 SIMULATION COMPLETE")
        print("="*70)
        
        stats = BRAIN.get_statistics()
        print(f"\nCorrelation Statistics:")
        print(f"  Alerts Processed: {stats['total_alerts_processed']}")
        print(f"  Incidents Generated: {stats['incidents_generated']}")
        print(f"  Entities Tracked: {stats['entities_tracked']}")
        print("\nCheck your dashboard for the correlated incident!")
        print()
        
    else:
        # Normal mode
        if len(sys.argv) < 3:
            print("\n" + "="*70)
            print("  USAGE")
            print("="*70)
            print("\npython detector.py <mode> <indicator>")
            print("\nModes:")
            print("  traffic <anomaly|normal>")
            print("  ids <attack|benign>")
            print("  ueba <normal|obvious>")
            print("  artifact <benign|malware>")
            print("  threatintel <IP_ADDRESS>")
            print("  simulation                - Run APT attack simulation")
            print("\nExamples:")
            print("  python detector.py simulation")
            print("  python detector.py traffic anomaly")
            print("  python detector.py ueba obvious")
            print()
            sys.exit(1)
        
        mode = sys.argv[1].lower()
        indicator = sys.argv[2].lower()
        alert = None
        
        if mode == "traffic":
            flow = ANOMALY_FLOW if indicator == "anomaly" else NORMAL_FLOW
            alert = analyze_traffic(flow)
        
        elif mode == "ids":
            if 'ids_engine' in ENGINES:
                manager = ENGINES['ids_engine']
                test_case = "attack" if indicator == "attack" else "benign"
                test_input = manager.reference['test_cases'][test_case]['input']
                alert = analyze_ids(test_input)
        
        elif mode == "ueba":
            user = OBVIOUS_ATTACKER if indicator == "obvious" else NORMAL_USER
            alert = analyze_ueba(user)
        
        elif mode == "artifact":
            file_info = {
                "filename": "suspicious.exe" if indicator == "malware" else "legitimate_app.exe",
                "is_test_malware": indicator == "malware"
            }
            alert = analyze_artifact(file_info)
        
        elif mode == "threatintel":
            alert = analyze_threat_intelligence(indicator)
        
        else:
            print(f"❌ Unknown mode: {mode}")
            sys.exit(1)
        
        if alert:
            process_and_send(alert)
        else:
            print(f"{'='*70}")
            print(f"  ✅ NO THREATS DETECTED")
            print(f"{'='*70}\n")
