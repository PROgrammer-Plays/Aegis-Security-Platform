# test_data.py - Complete Test Data for All 5 Engines
"""Test data for detector validation and testing"""

import numpy as np
import os

# ============================================
# TRAFFIC ENGINE TEST DATA
# ============================================

# Normal flow for testing
NORMAL_FLOW = {
    'Protocol': 6.0, 
    'FlowDuration': 11.0, 
    'TotalFwdPackets': 1.0, 
    'TotalBackwardPackets': 1.0, 
    'FwdPacketsLengthTotal': 6.0, 
    'BwdPacketsLengthTotal': 6.0
}

# Guaranteed anomaly flow for testing
ANOMALY_FLOW = {
    'ACKFlagCount': 1.0, 'ActiveMax': 0.0, 'ActiveMean': 0.0, 'ActiveStd': 0.0, 
    'AvgBwdSegmentSize': 5800.5, 'AvgFwdSegmentSize': 6.5, 'AvgPacketSize': 1937.8333740234375, 
    'BwdAvgBulkRate': 0.0, 'BwdAvgBytesBulk': 0.0, 'BwdAvgPacketsBulk': 0.0, 'BwdHeaderLength': 40.0, 
    'BwdIATMax': 3090.0, 'BwdIATMean': 3090.0, 'BwdIATMin': 3090.0, 'BwdIATStd': 0.0, 
    'BwdIATTotal': 3090.0, 'BwdPSHFlags': 0.0, 'BwdPacketLengthMax': 11595.0, 
    'BwdPacketLengthMean': 5800.5, 'BwdPacketLengthMin': 6.0, 'BwdPacketLengthStd': 8194.66015625, 
    'BwdPacketsLengthTotal': 11601.0, 'BwdPacketss': 73.61331176757812, 'BwdURGFlags': 0.0, 
    'CWEFlagCount': 0.0, 'DownUpRatio': 0.0, 'ECEFlagCount': 0.0, 'FINFlagCount': 0.0, 
    'FlowBytess': 427950.9735, 'FlowDuration': 27169.0, 'FlowIATMax': 24009.0, 
    'FlowIATMean': 5433.7998046875, 'FlowIATMin': 0.0, 'FlowIATStd': 10468.4501953125, 
    'FlowPacketss': 220.8399279, 'FwdActDataPackets': 2.0, 'FwdAvgBulkRate': 0.0, 
    'FwdAvgBytesBulk': 0.0, 'FwdAvgPacketsBulk': 0.0, 'FwdHeaderLength': 104.0, 
    'FwdIATMax': 24009.0, 'FwdIATMean': 8004.0, 'FwdIATMin': 0.0, 'FwdIATStd': 13860.736328125, 
    'FwdIATTotal': 24012.0, 'FwdPSHFlags': 0.0, 'FwdPacketLengthMax': 20.0, 'FwdPacketLengthMean': 6.5, 
    'FwdPacketLengthMin': 0.0, 'FwdPacketLengthStd': 9.433980941772461, 'FwdPacketsLengthTotal': 26.0, 
    'FwdPacketss': 147.22662353515625, 'FwdSegSizeMin': 20.0, 'FwdURGFlags': 0.0, 'IdleMax': 0.0, 
    'IdleMean': 0.0, 'IdleMin': 0.0, 'IdleStd': 0.0, 'InitBwdWinBytes': 229.0, 
    'InitFwdWinBytes': 29200.0, 'PSHFlagCount': 1.0, 'PacketLengthMax': 11595.0, 
    'PacketLengthMean': 1661.0, 'PacketLengthMin': 0.0, 'PacketLengthStd': 4380.48779296875, 
    'PacketLengthVariance': 19200000.0, 'Protocol': 6.0, 'RSTFlagCount': 0.0, 'SYNFlagCount': 0.0, 
    'SubflowBwdBytes': 11601.0, 'SubflowBwdPackets': 2.0, 'SubflowFwdBytes': 26.0, 
    'SubflowFwdPackets': 4.0, 'TotalBackwardPackets': 2.0, 'TotalFwdPackets': 4.0, 'URGFlagCount': 0.0
}

# ============================================
# IDS ENGINE TEST DATA
# ============================================

# Simulated attack flow for IDS testing
ATTACK_FLOW = {
    'flow_duration': 4, 
    'fwd_pkts_tot': 100, 
    'flow_SYN_flag_count': 100
}

# Benign flow for IDS testing
BENIGN_FLOW = {}

# ============================================
# UEBA ENGINE TEST DATA
# ============================================

# Normal User Profile
NORMAL_USER = {
    'user_id': 'USR001',
    'avg_session_hours': 8.5,
    'after_hours_login_count': 5,
    'total_usb_connections': 2,
    'total_email_volume': 1.5e8,
    'total_http_volume': 5e6,
    'total_files_accessed': 200
}

# Subtle Insider (elevated USB and file access, but not extreme)
SUBTLE_INSIDER = {
    'user_id': 'USR042',
    'avg_session_hours': 8.2,
    'after_hours_login_count': 10,
    'total_usb_connections': 15,
    'total_email_volume': 1.4e8,
    'total_http_volume': 6e6,
    'total_files_accessed': 2500
}

# Obvious Attacker (extreme anomalies across multiple features)
OBVIOUS_ATTACKER = {
    'user_id': 'USR666',
    'avg_session_hours': 2.1,
    'after_hours_login_count': 150,
    'total_usb_connections': 85,
    'total_email_volume': 1e7,
    'total_http_volume': 5e8,
    'total_files_accessed': 13000
}

# ============================================
# THREAT INTELLIGENCE TEST DATA
# ============================================

# Known malicious IPs for testing (examples)
TEST_MALICIOUS_IPS = [
    "198.51.100.1",
    "203.0.113.1"
]

# Known benign IPs for testing
TEST_BENIGN_IPS = [
    "8.8.8.8",       # Google DNS
    "1.1.1.1"        # Cloudflare DNS
]

# ============================================
# ARTIFACT ENGINE TEST DATA
# ============================================

# Artifact engine uses numpy vectors loaded from files
# These are just metadata dictionaries
BENIGN_FILE_INFO = {
    'filename': 'legitimate_app.exe',
    'size': '1.2 MB',
    'hash': 'ABC123...',
    'file_type': 'PE Executable'
}

MALWARE_FILE_INFO = {
    'filename': 'suspicious.exe',
    'size': '850 KB',
    'hash': 'DEF456...',
    'file_type': 'PE Executable'
}

# ============================================
# VECTOR LOADING UTILITIES
# ============================================

def load_vector_from_file(filepath):
    """Load a feature vector from a text file"""
    try:
        if os.path.exists(filepath):
            return np.loadtxt(filepath).reshape(1, -1)
        else:
            print(f"Warning: Vector file not found: {filepath}")
            return None
    except Exception as e:
        print(f"Error loading vector from {filepath}: {e}")
        return None

# Paths to ground truth vectors
VECTOR_PATHS = {
    'ids_benign': 'tests/data/ids_benign_vector.txt',
    'ids_attack': 'tests/data/ids_attack_vector.txt',
    'traffic_benign': 'tests/data/traffic_benign_vector.txt',
    'traffic_attack': 'tests/data/traffic_attack_vector.txt',
    'artifact_benign': 'tests/data/real_benign_vector.txt',
    'artifact_malware': 'tests/data/real_malware_vector.txt',
    'ueba_normal': 'tests/data/ueba_normal_vector.txt',
    'ueba_anomaly': 'tests/data/ueba_anomaly_vector.txt'
}
