# detector/test_ueba_engine.py (3-Tier Classification Version)
import tensorflow as tf
import numpy as np
import joblib
import json
import os

# --- Configuration ---
MODEL_PATH = 'insider_threat_model.h5'
SCALER_PATH = 'ueba_scaler.joblib'
NORMAL_VEC_PATH = 'ueba_normal_vector.txt'
ANOMALY_VEC_PATH = 'ueba_anomaly_vector.txt'

# ** UPDATE THESE WITH VALUES FROM COLAB **
THRESH_SUSPICIOUS = 0.005000 # Example value - REPLACE ME
THRESH_CRITICAL = 0.020000   # Example value - REPLACE ME

print("\n=======================================================")
print("   UEBA ENGINE 3-TIER PERFORMANCE TEST")
print("=======================================================\n")

# --- 1. Load Assets ---
print("[1] Loading Model and Scaler...")
try:
    model = tf.keras.models.load_model(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    print("   ✅ Assets loaded successfully.")
except Exception as e:
    print(f"   ❌ FATAL ERROR: {e}"); exit()

# --- 2. Load Vectors ---
print("\n[2] Loading Test Vectors...")
try:
    normal_vec = np.loadtxt(NORMAL_VEC_PATH).reshape(1, -1)
    anomaly_vec = np.loadtxt(ANOMALY_VEC_PATH).reshape(1, -1)
    print("   ✅ Vectors loaded successfully.")
except Exception as e:
    print(f"   ❌ FATAL ERROR: {e}"); exit()

# --- 3. Analysis Function ---
def analyze_user(vector, label):
    print(f"\n--- Testing {label} Profile ---")
    
    # Scale & Predict
    scaled_vec = scaler.transform(vector)
    reconstruction = model.predict(scaled_vec, verbose=0)
    error = np.mean(np.power(scaled_vec - reconstruction, 2))
    
    print(f"   Reconstruction Error: {error:.8f}")
    
    # 3-Tier Logic
    if error > THRESH_CRITICAL:
        print(f"   Verdict:              🔴 PROBABLE THREAT (Critical > {THRESH_CRITICAL})")
        return "Critical"
    elif error > THRESH_SUSPICIOUS:
        print(f"   Verdict:              🟡 SUSPICIOUS (Warning > {THRESH_SUSPICIOUS})")
        return "High"
    else:
        print(f"   Verdict:              🟢 NORMAL USER")
        return "Low"

# --- 4. Run Tests ---
# We test the Median Normal (should be Green)
res1 = analyze_user(normal_vec, "MEDIAN NORMAL")

# We test the Worst Anomaly (should be Red)
res2 = analyze_user(anomaly_vec, "WORST ANOMALY")

# Let's create a fake "Suspicious" user to test the Yellow zone
# We do this by averaging the normal and anomaly vectors
middle_vec = (normal_vec + anomaly_vec) / 4 # Closer to normal, but weird enough
res3 = analyze_user(middle_vec, "SIMULATED SUSPICIOUS")