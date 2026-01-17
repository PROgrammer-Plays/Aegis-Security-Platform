# correlation_engine.py - Multi-Engine Correlation Brain
# Place in: detector/correlation_engine.py

import time
from collections import defaultdict
from typing import Dict, List, Optional

class CorrelationBrain:
    """
    Stateful Logic Engine for Multi-Vector Attack Detection
    
    This is NOT another ML model. It's a smart memory system that:
    1. Remembers recent alerts from all 5 engines
    2. Links alerts by common entities (IP addresses, users)
    3. Detects attack chains across multiple engines
    4. Generates CRITICAL INCIDENTS when patterns emerge
    """
    
    def __init__(self, threshold=60, time_window=900):
        """
        Initialize the correlation brain.
        
        Args:
            threshold: Risk score needed to trigger incident (default: 60)
            time_window: How long to remember alerts in seconds (default: 900 = 15 min)
        """
        self.time_window = time_window  # 15 minutes memory
        self.threshold = threshold      # Score needed for incident
        
        # Memory storage: {entity: [alerts]}
        # Entity can be IP address, user ID, etc.
        self.memory = defaultdict(list)
        
        # Cooldown to prevent spam: {entity: last_incident_time}
        self.cooldowns = {}
        
        # Statistics
        self.total_alerts_processed = 0
        self.incidents_generated = 0
        
        print(f"\n🧠 Correlation Brain initialized")
        print(f"   Threshold: {threshold} points")
        print(f"   Time Window: {time_window}s ({time_window/60:.0f} minutes)")
    
    def _clean_old_memory(self):
        """Remove alerts older than the time window"""
        current_time = time.time()
        
        for entity in list(self.memory.keys()):
            # Keep only recent alerts
            self.memory[entity] = [
                alert for alert in self.memory[entity]
                if (current_time - alert['timestamp']) < self.time_window
            ]
            
            # Remove empty entries
            if not self.memory[entity]:
                del self.memory[entity]
    
    def _extract_entities(self, alert) -> List[str]:
        """
        Extract entities (IPs, users) from an alert.
        
        Entities are the "targets" or "actors" we're tracking.
        """
        entities = []
        details = alert.get('details', {})
        
        # Extract IP Addresses
        ip_fields = [
            'ip_address', 'source_ip', 'destination_ip', 'SourceIP',
            'DestinationIP', 'target_ip', 'attacker_ip'
        ]
        for field in ip_fields:
            if field in details and details[field]:
                entities.append(str(details[field]))
        
        # Extract from flow_data if present
        if 'flow_data' in details:
            flow = details['flow_data']
            for field in ip_fields:
                if field in flow and flow[field]:
                    entities.append(str(flow[field]))
        
        # Extract Users
        user_fields = ['user_id', 'username', 'email']
        for field in user_fields:
            if field in details and details[field]:
                entities.append(f"USER:{details[field]}")
        
        # Extract from user_profile if present
        if 'user_profile' in details:
            profile = details['user_profile']
            for field in user_fields:
                if field in profile and profile[field]:
                    entities.append(f"USER:{profile[field]}")
        
        # Extract file hashes (for artifact correlation)
        if 'file_hash' in details and details['file_hash']:
            entities.append(f"HASH:{details['file_hash']}")
        
        if 'filename' in details and details['filename']:
            entities.append(f"FILE:{details['filename']}")
        
        # Remove duplicates
        return list(set(entities))
    
    def _calculate_risk_score(self, alerts: List[Dict]) -> tuple:
        """
        Calculate total risk score based on multiple factors.
        
        Returns:
            (risk_score, engines_involved, severity_breakdown)
        """
        score = 0
        engines_involved = set()
        severity_counts = {'Critical': 0, 'High': 0, 'Medium': 0, 'Low': 0}
        
        for alert in alerts:
            engine = alert.get('engine', 'Unknown')
            severity = alert.get('severity', 'Low')
            
            engines_involved.add(engine)
            severity_counts[severity] += 1
            
            # Base scores by severity
            if severity == 'Critical':
                score += 40
            elif severity == 'High':
                score += 20
            elif severity == 'Medium':
                score += 10
            else:
                score += 5
        
        # CORRELATION MULTIPLIER - The key insight!
        # Multiple engines seeing the same target = Much more serious
        num_engines = len(engines_involved)
        
        if num_engines == 2:
            score = int(score * 1.5)  # 50% bonus
        elif num_engines == 3:
            score = int(score * 2.0)  # 100% bonus
        elif num_engines >= 4:
            score = int(score * 2.5)  # 150% bonus - VERY SERIOUS!
        
        return score, list(engines_involved), severity_counts
    
    def _detect_attack_patterns(self, alerts: List[Dict]) -> List[str]:
        """
        Detect known attack chain patterns.
        
        Returns list of detected patterns.
        """
        patterns = []
        engines = {alert.get('engine') for alert in alerts}
        
        # Pattern 1: APT Chain (Artifact → Traffic → Threat Intel)
        if {'Artifact Engine', 'Traffic Engine', 'Threat Intelligence'}.issubset(engines):
            patterns.append("APT_CHAIN: Malware → C2 Communication → Known Threat")
        
        # Pattern 2: Insider Threat Chain (UEBA → Traffic/Artifact)
        if 'UEBA' in engines and ('Traffic Engine' in engines or 'Artifact Engine' in engines):
            patterns.append("INSIDER_THREAT: Suspicious User + Data Exfiltration")
        
        # Pattern 3: Network Intrusion Chain (IDS → Traffic)
        if {'IDS', 'Traffic Engine'}.issubset(engines):
            patterns.append("NETWORK_ATTACK: Intrusion Attempt + Anomalous Traffic")
        
        # Pattern 4: Malware Outbreak (Artifact → Multiple IPs/Users)
        artifact_alerts = [a for a in alerts if a.get('engine') == 'Artifact Engine']
        if len(artifact_alerts) >= 2:
            patterns.append("MALWARE_OUTBREAK: Multiple Malicious Files Detected")
        
        # Pattern 5: Multi-Stage Attack (4+ engines)
        if len(engines) >= 4:
            patterns.append("MULTI_STAGE_ATTACK: Coordinated Attack Across Multiple Vectors")
        
        return patterns
    
    def ingest_alert(self, alert: Dict) -> Optional[Dict]:
        """
        Main entry point: Ingest an alert and check for incidents.
        
        Args:
            alert: Alert from any of the 5 engines
            
        Returns:
            Incident dict if correlation detected, None otherwise
        """
        self._clean_old_memory()
        self.total_alerts_processed += 1
        
        # Add timestamp for tracking
        alert['timestamp'] = time.time()
        
        # Extract entities (IPs, users, etc.) from this alert
        entities = self._extract_entities(alert)
        
        if not entities:
            # No entities to correlate - just a standalone alert
            return None
        
        incident_generated = None
        
        for entity in entities:
            # Add alert to this entity's history
            self.memory[entity].append(alert)
            
            # Analyze all alerts for this entity
            entity_alerts = self.memory[entity]
            risk_score, engines, severity_counts = self._calculate_risk_score(entity_alerts)
            
            # Check if threshold exceeded
            if risk_score >= self.threshold:
                # Check cooldown (don't spam same incident)
                if entity in self.cooldowns:
                    time_since_last = time.time() - self.cooldowns[entity]
                    if time_since_last < 60:  # 1 minute cooldown
                        continue
                
                # INCIDENT DETECTED! 🚨
                self.cooldowns[entity] = time.time()
                self.incidents_generated += 1
                
                # Detect attack patterns
                patterns = self._detect_attack_patterns(entity_alerts)
                
                # Build incident timeline
                timeline = []
                for idx, a in enumerate(entity_alerts, 1):
                    engine = a.get('engine', 'Unknown')
                    alert_type = a.get('alertType', 'Unknown')
                    severity = a.get('severity', 'Low')
                    timeline.append(f"{idx}. [{engine}] {alert_type} ({severity})")
                
                incident_generated = {
                    "engine": "CORRELATION BRAIN",
                    "severity": "Critical",
                    "alertType": "Multi-Vector Attack Incident",
                    "details": {
                        "target_entity": entity,
                        "risk_score": risk_score,
                        "engines_involved": engines,
                        "engine_count": len(engines),
                        "alert_count": len(entity_alerts),
                        "severity_breakdown": severity_counts,
                        "attack_patterns": patterns,
                        "timeline": timeline,
                        "window_start": min(a['timestamp'] for a in entity_alerts),
                        "window_end": max(a['timestamp'] for a in entity_alerts),
                        "attack_duration": max(a['timestamp'] for a in entity_alerts) - min(a['timestamp'] for a in entity_alerts)
                    }
                }
                
                print(f"\n{'='*70}")
                print(f"🧠 CORRELATION BRAIN - INCIDENT DETECTED!")
                print(f"{'='*70}")
                print(f"Target: {entity}")
                print(f"Risk Score: {risk_score} (threshold: {self.threshold})")
                print(f"Engines Involved: {', '.join(engines)}")
                print(f"Alert Count: {len(entity_alerts)}")
                if patterns:
                    print(f"Attack Patterns: {', '.join(patterns)}")
                print(f"{'='*70}\n")
                
                # Optional: Clear memory to prevent re-triggering
                # Uncomment if you want one-shot incidents
                # self.memory[entity] = []
                
                return incident_generated
        
        return None
    
    def get_statistics(self) -> Dict:
        """Get correlation engine statistics"""
        return {
            "total_alerts_processed": self.total_alerts_processed,
            "incidents_generated": self.incidents_generated,
            "entities_tracked": len(self.memory),
            "active_entities": [
                {
                    "entity": entity,
                    "alert_count": len(alerts),
                    "engines": list({a.get('engine') for a in alerts})
                }
                for entity, alerts in self.memory.items()
            ]
        }
    
    def reset(self):
        """Reset the correlation brain (useful for testing)"""
        self.memory.clear()
        self.cooldowns.clear()
        self.total_alerts_processed = 0
        self.incidents_generated = 0
        print("\n🧠 Correlation Brain reset")


# === Predefined Attack Chain Detectors ===

class AttackChainDetector:
    """
    Specialized detectors for known attack patterns.
    Can be extended with more sophisticated logic.
    """
    
    @staticmethod
    def detect_apt_chain(alerts: List[Dict]) -> bool:
        """
        Detect Advanced Persistent Threat pattern:
        Artifact (malware) → Traffic (C2 beacon) → Threat Intel (known bad IP)
        """
        engines = {a.get('engine') for a in alerts}
        required = {'Artifact Engine', 'Traffic Engine', 'Threat Intelligence'}
        return required.issubset(engines)
    
    @staticmethod
    def detect_insider_threat(alerts: List[Dict]) -> bool:
        """
        Detect Insider Threat pattern:
        UEBA (suspicious behavior) + (Traffic or Artifact)
        """
        engines = {a.get('engine') for a in alerts}
        return ('UEBA' in engines and 
                ('Traffic Engine' in engines or 'Artifact Engine' in engines))
    
    @staticmethod
    def detect_network_attack(alerts: List[Dict]) -> bool:
        """
        Detect Network Attack pattern:
        IDS (intrusion) + Traffic (anomaly)
        """
        engines = {a.get('engine') for a in alerts}
        return {'IDS', 'Traffic Engine'}.issubset(engines)
    
    @staticmethod
    def detect_lateral_movement(alerts: List[Dict]) -> bool:
        """
        Detect Lateral Movement:
        Multiple IPs with UEBA or IDS alerts
        """
        ips = set()
        for alert in alerts:
            details = alert.get('details', {})
            if 'ip_address' in details:
                ips.add(details['ip_address'])
            if 'source_ip' in details:
                ips.add(details['source_ip'])
        
        engines = {a.get('engine') for a in alerts}
        return len(ips) >= 2 and ('UEBA' in engines or 'IDS' in engines)


# === Helper Functions ===

def create_correlation_brain(threshold=60, time_window=900):
    """Factory function to create a CorrelationBrain instance"""
    return CorrelationBrain(threshold=threshold, time_window=time_window)


if __name__ == "__main__":
    # Test the correlation brain
    print("\n" + "="*70)
    print("  🧪 TESTING CORRELATION BRAIN")
    print("="*70)
    
    brain = CorrelationBrain(threshold=50, time_window=900)
    
    # Simulate attack chain
    test_ip = "192.168.1.100"
    
    print("\n1️⃣ Simulating malware detection...")
    alert1 = {
        "engine": "Artifact Engine",
        "severity": "Critical",
        "alertType": "Malware Detected",
        "details": {"source_ip": test_ip, "filename": "malware.exe"}
    }
    incident = brain.ingest_alert(alert1)
    print(f"   Incident generated: {incident is not None}")
    
    print("\n2️⃣ Simulating C2 traffic...")
    alert2 = {
        "engine": "Traffic Engine",
        "severity": "Medium",
        "alertType": "Anomalous Traffic",
        "details": {"source_ip": test_ip, "error": 0.05}
    }
    incident = brain.ingest_alert(alert2)
    print(f"   Incident generated: {incident is not None}")
    
    print("\n3️⃣ Simulating threat intelligence hit...")
    alert3 = {
        "engine": "Threat Intelligence",
        "severity": "High",
        "alertType": "Malicious IP",
        "details": {"source_ip": test_ip, "threat_score": 95}
    }
    incident = brain.ingest_alert(alert3)
    print(f"   Incident generated: {incident is not None}")
    
    if incident:
        print(f"\n🎯 INCIDENT DETAILS:")
        print(f"   Risk Score: {incident['details']['risk_score']}")
        print(f"   Engines: {incident['details']['engines_involved']}")
        print(f"   Patterns: {incident['details']['attack_patterns']}")
    
    # Print statistics
    stats = brain.get_statistics()
    print(f"\n📊 STATISTICS:")
    print(f"   Alerts Processed: {stats['total_alerts_processed']}")
    print(f"   Incidents Generated: {stats['incidents_generated']}")
    print(f"   Entities Tracked: {stats['entities_tracked']}")
    
    print("\n" + "="*70 + "\n")
