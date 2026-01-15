# detector/test_artifact_engine.py (The Final, Full Vector Version)
import joblib
import numpy as np

PIPELINE_PATH = 'artifact_engine_xgb_pipeline.joblib'

print(f"Loading Artifact Engine XGBoost Pipeline from: {PIPELINE_PATH}")
try:
    # Load the entire pipeline object (scaler + model)
    artifact_pipeline = joblib.load(PIPELINE_PATH)
    print("✅ Pipeline loaded successfully.")
except Exception as e:
    print(f"❌ ERROR: Could not load pipeline: {e}"); exit()

# --- Load the FULL feature vectors from the text files ---
try:
    # np.loadtxt is the correct function for this file format.
    # .reshape(1, -1) is crucial to tell the model we are predicting on a single sample.
    real_benign_vector = np.loadtxt('real_benign_vector.txt').reshape(1, -1)
    real_malware_vector = np.loadtxt('real_malware_vector.txt').reshape(1, -1)
    print("✅ Real feature vectors loaded successfully.")
except Exception as e:
    print(f"❌ ERROR: Could not load vector files. Make sure they are in the 'detector' folder. Error: {e}"); exit()


# --- Analysis Function ---
def check_artifact(vector, artifact_type):
    """
    Takes a full 2381-feature vector and gets a prediction from the pipeline.
    """
    print("\n-----------------------------------------")
    print(f"Analyzing REAL {artifact_type} artifact (full vector)...")
    
    # The pipeline automatically handles scaling and prediction in one step.
    # We feed it the full vector directly. No more DataFrames or reindexing.
    prediction = artifact_pipeline.predict(vector)
    prediction_proba = artifact_pipeline.predict_proba(vector)
    result = int(prediction[0])
    
    print(f"  - Model Prediction (0=Benign, 1=Malware): {result}")
    print(f"  - Prediction Confidence: Benign({prediction_proba[0][0]:.2%}) | Malware({prediction_proba[0][1]:.2%})")
    if result == 1:
        print("  - VERDICT: 🚨 MALWARE DETECTED 🚨")
    else:
        print("  - VERDICT: ✅ Benign ✅")
    print("-----------------------------------------")

# --- Run the Final Tests ---
print("\n--- Running Final, Definitive Verification Test Suite ---")
check_artifact(real_benign_vector, "BENIGN")

check_artifact(real_malware_vector, "MALWARE")