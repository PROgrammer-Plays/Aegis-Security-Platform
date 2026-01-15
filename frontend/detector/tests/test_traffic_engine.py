import os
import numpy as np
import joblib
import tensorflow as tf

# --- Configuration ---
MODEL_PATH = 'traffic_engine_autoencoder_final.h5'
SCALER_PATH = 'traffic_engine_scaler_final.joblib'
BENIGN_VECTOR_PATH = 'traffic_benign_vector.txt'
ATTACK_VECTOR_PATH = 'traffic_attack_vector.txt'

# This matches the 99.5th percentile threshold we calculated in Colab
ANOMALY_THRESHOLD = 0.00076731

def run_test():
    print("\n=======================================================")
    print("   TRAFFIC ENGINE STANDALONE PERFORMANCE TEST")
    print("=======================================================\n")

    # --- 1. Load Assets ---
    print("[1] Loading Model and Scaler...")
    try:
        model = tf.keras.models.load_model(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        print("   ✅ Assets loaded successfully.")
    except Exception as e:
        print(f"   ❌ FATAL ERROR: Could not load model or scaler: {e}")
        return

    # --- 2. Load Vectors ---
    print("\n[2] Loading Test Vectors (Ground Truth from Colab)...")
    try:
        # Load the text files and reshape them to (1, 77) so the model accepts them as a single sample
        benign_vec = np.loadtxt(BENIGN_VECTOR_PATH).reshape(1, -1)
        attack_vec = np.loadtxt(ATTACK_VECTOR_PATH).reshape(1, -1)
        print("   ✅ Vectors loaded successfully.")
    except Exception as e:
        print(f"   ❌ FATAL ERROR: Could not load vector text files: {e}")
        return

    # --- 3. Define Analysis Function ---
    def analyze_flow(vector, label):
        print(f"\n--- Testing {label} Flow ---")
        
        # A. Scale the raw data (CRITICAL STEP)
        # The autoencoder only understands data between 0 and 1
        scaled_vector = scaler.transform(vector)
        
        # B. Get the reconstruction
        reconstruction = model.predict(scaled_vector, verbose=0)
        
        # C. Calculate Mean Squared Error (MSE)
        # MSE = Average of (Original - Reconstruction)^2
        error = np.mean(np.power(scaled_vector - reconstruction, 2))
        
        print(f"   Reconstruction Error: {error:.8f}")
        print(f"   Anomaly Threshold:    {ANOMALY_THRESHOLD:.8f}")
        
        # D. Verdict
        if error > ANOMALY_THRESHOLD:
            print("   Verdict:              🚨 ANOMALY DETECTED")
            is_anomaly = True
        else:
            print("   Verdict:              ✅ NORMAL TRAFFIC")
            is_anomaly = False
            
        return error, is_anomaly

    # --- 4. Run Comparisons ---
    error_normal, result_normal = analyze_flow(benign_vec, "NORMAL (Median Benign)")
    error_attack, result_attack = analyze_flow(attack_vec, "ATTACK (Worst DDoS)")

    # --- 5. Final Report ---
    print("\n=======================================================")
    print("   FINAL DIAGNOSTIC REPORT")
    print("=======================================================")
    
    # Check Normal Logic
    if not result_normal:
        print("✅ NORMAL Logic: PASS (Correctly identified as benign)")
    else:
        print("❌ NORMAL Logic: FAIL (False Positive)")

    # Check Attack Logic
    if result_attack:
        print("✅ ATTACK Logic: PASS (Correctly identified as anomaly)")
    else:
        print("❌ ATTACK Logic: FAIL (False Negative)")

    # Calculate Separation
    if error_normal > 0:
        ratio = error_attack / error_normal
        print(f"\n📊 Separation Ratio: {ratio:.2f}x")
        if ratio > 100:
            print("   (Excellent separation. The model sees the attack clearly.)")
        else:
            print("   (Separation is weak. Check data.)")

if __name__ == "__main__":
    run_test()