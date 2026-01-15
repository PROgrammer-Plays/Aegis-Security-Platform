# detector/test_ids_engine.py (Final Version)
import joblib
import numpy as np

print("--- Verifying IDS Engine ---")
try:
    model = joblib.load('ids_randomforest_final.joblib')
    benign_vector = np.loadtxt('ids_benign_vector.txt').reshape(1, -1)
    attack_vector = np.loadtxt('ids_attack_vector.txt').reshape(1, -1)
    print("✅ All necessary files loaded.")
except Exception as e:
    print(f"❌ ERROR: Could not load files: {e}"); exit()

def check_flow(vector, flow_type):
    print(f"\n-> Analyzing REAL {flow_type} flow (full vector)...")
    prediction = model.predict(vector)[0]
    proba = model.predict_proba(vector)[0]
    print(f"  - Prediction (0=Normal, 1=Attack): {prediction}")
    print(f"  - Confidence: Normal({proba[0]:.2%}) | Attack({proba[1]:.2%})")
    print("  - VERDICT: " + ("🚨 ATTACK DETECTED 🚨" if prediction == 1 else "✅ Normal ✅"))

check_flow(benign_vector, "NORMAL")
check_flow(attack_vector, "ATTACK")